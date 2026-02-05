/**
 * MeshCore - Objective-C Wrapper Implementation
 *
 * This is the ONLY file that imports the C header.
 * All C-to-Objective-C bridging happens here.
 *
 * Uses the meshcore.h C API:
 * - meshcore_create()
 * - meshcore_destroy()
 * - meshcore_is_running()
 * - meshcore_get_version()
 * - meshcore_set_callbacks()
 * - meshcore_send_message()
 * - meshcore_send_message_to_uid()
 * - meshcore_get_peer_count()
 * - meshcore_simulate_peer_connect()
 * - meshcore_simulate_message()
 *
 * BLE Integration:
 * - Uses BLEManager.swift for CoreBluetooth operations
 * - BLEManagerDelegate callbacks route to MeshCoreDelegate
 *
 * Thread Safety:
 * - All public methods dispatch to a serial queue
 * - Callbacks are always delivered on the main thread
 * - No blocking operations on the main thread
 *
 * Memory Management:
 * - C strings are copied to NSString immediately
 * - No C pointers escape this file
 * - ARC handles all Objective-C objects
 */

#import "MeshCore.h"

// Internal import - C header is ONLY visible here
// Path is relative to the ios/blebla/MeshCore/ directory after Expo prebuild copies files
#import "../Daemon/meshcore.h"

// Swift/ObjC bridging - BLEManager is in Swift
// This imports the auto-generated Swift header
#if __has_include("blebla-Swift.h")
    #import "blebla-Swift.h"
#endif

#pragma mark - Logging

#define MESHCORE_LOG_PREFIX @"[MeshCore]"

static void MeshCoreLog(NSString *format, ...) {
    va_list args;
    va_start(args, format);
    NSString *message = [[NSString alloc] initWithFormat:format arguments:args];
    va_end(args);
    NSLog(@"%@ INFO: %@", MESHCORE_LOG_PREFIX, message);
}

static void MeshCoreLogError(NSString *format, ...) {
    va_list args;
    va_start(args, format);
    NSString *message = [[NSString alloc] initWithFormat:format arguments:args];
    va_end(args);
    NSLog(@"%@ ERROR: %@", MESHCORE_LOG_PREFIX, message);
}

#pragma mark - MeshMessage Implementation

@implementation MeshMessage

- (instancetype)initWithFromUid:(NSString *)fromUid
                     fromPeerId:(uint64_t)peerId
                        content:(NSString *)content
                      timestamp:(int64_t)timestamp {
    self = [super init];
    if (self) {
        _fromUid = [fromUid copy] ?: @"";
        _fromPeerId = peerId;
        _content = [content copy];
        _timestamp = timestamp;
    }
    return self;
}

- (instancetype)initWithFromUid:(NSString *)fromUid
                        content:(NSString *)content
                      timestamp:(int64_t)timestamp {
    return [self initWithFromUid:fromUid fromPeerId:0 content:content timestamp:timestamp];
}

- (NSString *)description {
    return [NSString stringWithFormat:@"<MeshMessage from:%@ (peer:%llu) content:%@ timestamp:%lld>",
            self.fromUid, self.fromPeerId, self.content, self.timestamp];
}

@end

#pragma mark - MeshPeer Implementation

@implementation MeshPeer

- (instancetype)initWithPeerId:(uint64_t)peerId
                           uid:(NSString *)uid
                     connected:(BOOL)connected {
    self = [super init];
    if (self) {
        _peerId = peerId;
        _uid = [uid copy] ?: @"";
        _connected = connected;
    }
    return self;
}

- (NSString *)description {
    return [NSString stringWithFormat:@"<MeshPeer id:%llu uid:%@ connected:%@>",
            self.peerId, self.uid, self.connected ? @"YES" : @"NO"];
}

@end

#pragma mark - MeshCore Implementation

@interface MeshCore () <BLEManagerDelegate>

/// Serial queue for thread-safe operations
@property (nonatomic, strong) dispatch_queue_t workQueue;

/// Pointer to the C meshcore instance
@property (nonatomic, assign) meshcore *coreInstance;

/// BLE manager reference
@property (nonatomic, strong) BLEManager *bleManager;

/// Track BLE running state
@property (nonatomic, assign) BOOL bleRunningInternal;

/// Local UID storage
@property (nonatomic, copy) NSString *localUIDInternal;

/// Cache for discovered peers (from BLE)
@property (nonatomic, strong) NSMutableDictionary<NSString *, MeshPeer *> *discoveredPeersCache;

/// Cache for connected peers (from BLE)
@property (nonatomic, strong) NSMutableDictionary<NSString *, MeshPeer *> *connectedPeersCache;

@end

// Weak reference to shared instance for C callbacks
static __weak MeshCore *g_sharedInstance = nil;

#pragma mark - C Callback Trampolines

/**
 * Called from C when a message is received
 * Runs on the daemon's worker thread - must dispatch to main
 */
static void meshcore_on_message(
    void* user_data,
    uint64_t peer_id,
    const char* peer_uid,
    const char* message,
    size_t message_len,
    int64_t timestamp
) {
    MeshCore *core = g_sharedInstance;
    if (!core) return;
    
    // Copy data immediately (pointers only valid during callback)
    NSString *uidStr = peer_uid ? [NSString stringWithUTF8String:peer_uid] : @"";
    NSString *contentStr = message ? [[NSString alloc] initWithBytes:message 
                                                              length:message_len 
                                                            encoding:NSUTF8StringEncoding] : @"";
    
    MeshCoreLog(@"Callback: message from peer %llu (%@): %@", peer_id, uidStr, contentStr);
    
    // Dispatch to main thread
    dispatch_async(dispatch_get_main_queue(), ^{
        if (core.delegate && [core.delegate respondsToSelector:@selector(meshCoreDidReceiveMessage:)]) {
            MeshMessage *msg = [[MeshMessage alloc] initWithFromUid:uidStr
                                                         fromPeerId:peer_id
                                                            content:contentStr
                                                          timestamp:timestamp];
            [core.delegate meshCoreDidReceiveMessage:msg];
        }
    });
}

/**
 * Called from C when status changes
 */
static void meshcore_on_status(void* user_data, int status, const char* message) {
    MeshCore *core = g_sharedInstance;
    if (!core) return;
    
    NSString *msgStr = message ? [NSString stringWithUTF8String:message] : @"";
    MeshCoreLog(@"Callback: status changed to %d: %@", status, msgStr);
    
    dispatch_async(dispatch_get_main_queue(), ^{
        if (core.delegate && [core.delegate respondsToSelector:@selector(meshCoreDidChangeStatus:message:)]) {
            MeshCoreStatus coreStatus;
            if (status == 1) {
                coreStatus = MeshCoreStatusRunning;
            } else if (status == 0) {
                coreStatus = MeshCoreStatusStopped;
            } else {
                coreStatus = MeshCoreStatusError;
            }
            [core.delegate meshCoreDidChangeStatus:coreStatus message:msgStr];
        }
    });
}

/**
 * Called from C when a peer connects or disconnects
 */
static void meshcore_on_peer(void* user_data, uint64_t peer_id, const char* peer_uid, bool connected) {
    MeshCore *core = g_sharedInstance;
    if (!core) return;
    
    NSString *uidStr = peer_uid ? [NSString stringWithUTF8String:peer_uid] : @"";
    MeshCoreLog(@"Callback: peer %llu (%@) %@", peer_id, uidStr, connected ? @"connected" : @"disconnected");
    
    dispatch_async(dispatch_get_main_queue(), ^{
        if (core.delegate && [core.delegate respondsToSelector:@selector(meshCoreDidUpdatePeer:)]) {
            MeshPeer *peer = [[MeshPeer alloc] initWithPeerId:peer_id uid:uidStr connected:connected];
            [core.delegate meshCoreDidUpdatePeer:peer];
        }
    });
}

@implementation MeshCore

#pragma mark - Singleton

+ (instancetype)sharedInstance {
    static MeshCore *instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[MeshCore alloc] initPrivate];
    });
    return instance;
}

- (instancetype)init {
    // Prevent direct instantiation
    @throw [NSException exceptionWithName:NSInternalInconsistencyException
                                   reason:@"Use [MeshCore sharedInstance] instead"
                                 userInfo:nil];
}

- (instancetype)initPrivate {
    self = [super init];
    if (self) {
        _workQueue = dispatch_queue_create("com.meshchat.meshcore", DISPATCH_QUEUE_SERIAL);
        _coreInstance = NULL;
        _bleRunningInternal = NO;
        _localUIDInternal = @"";
        _discoveredPeersCache = [NSMutableDictionary new];
        _connectedPeersCache = [NSMutableDictionary new];
        
        // Initialize BLE Manager
        _bleManager = [BLEManager shared];
        _bleManager.delegate = self;
        
        // Set weak reference for callbacks
        g_sharedInstance = self;
        
        MeshCoreLog(@"MeshCore initialized with BLE support");
    }
    return self;
}

- (void)dealloc {
    MeshCoreLog(@"MeshCore deallocating");
    
    // Destroy C instance if exists
    if (_coreInstance) {
        meshcore_destroy(_coreInstance);
        _coreInstance = NULL;
    }
    
    // Clear weak reference
    if (g_sharedInstance == self) {
        g_sharedInstance = nil;
    }
}

#pragma mark - Properties

- (BOOL)isRunning {
    __block BOOL running = NO;
    dispatch_sync(self.workQueue, ^{
        if (self.coreInstance) {
            running = meshcore_is_running(self.coreInstance);
        }
    });
    return running;
}

- (NSString *)version {
    const char *ver = meshcore_get_version();
    return ver ? [NSString stringWithUTF8String:ver] : @"0.0.0";
}

- (uint32_t)peerCount {
    __block uint32_t count = 0;
    dispatch_sync(self.workQueue, ^{
        if (self.coreInstance) {
            count = meshcore_get_peer_count(self.coreInstance);
        }
    });
    return count;
}

- (BOOL)isBLERunning {
    return self.bleRunningInternal;
}

- (NSString *)localUID {
    return self.localUIDInternal;
}

- (void)setLocalUID:(NSString *)uid {
    self.localUIDInternal = [uid copy];
    self.bleManager.localUID = uid;
}

#pragma mark - Lifecycle

- (void)startWithCompletion:(void (^)(BOOL, NSError *))completion {
    MeshCoreLog(@"startWithCompletion called");
    
    dispatch_async(self.workQueue, ^{
        // Check if already running
        if (self.coreInstance && meshcore_is_running(self.coreInstance)) {
            MeshCoreLog(@"Already running");
            if (completion) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    completion(YES, nil);
                });
            }
            return;
        }
        
        // Destroy old instance if exists
        if (self.coreInstance) {
            meshcore_destroy(self.coreInstance);
            self.coreInstance = NULL;
        }
        
        // Create new meshcore instance
        self.coreInstance = meshcore_create();
        
        if (self.coreInstance) {
            MeshCoreLog(@"meshcore_create() succeeded");
            
            // Register callbacks
            meshcore_callbacks callbacks = {
                .on_message = meshcore_on_message,
                .on_status = meshcore_on_status,
                .on_peer = meshcore_on_peer,
                .user_data = (__bridge void *)self
            };
            meshcore_set_callbacks(self.coreInstance, &callbacks);
            
            // Notify delegate of status change
            dispatch_async(dispatch_get_main_queue(), ^{
                if (self.delegate && [self.delegate respondsToSelector:@selector(meshCoreDidChangeStatus:message:)]) {
                    [self.delegate meshCoreDidChangeStatus:MeshCoreStatusRunning message:@"MeshCore started"];
                }
            });
            
            if (completion) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    completion(YES, nil);
                });
            }
        } else {
            MeshCoreLogError(@"meshcore_create() failed");
            
            NSError *error = [NSError errorWithDomain:@"MeshCoreErrorDomain"
                                                 code:-1
                                             userInfo:@{NSLocalizedDescriptionKey: @"Failed to create MeshCore instance"}];
            
            // Notify delegate of error
            dispatch_async(dispatch_get_main_queue(), ^{
                if (self.delegate && [self.delegate respondsToSelector:@selector(meshCoreDidEncounterError:message:)]) {
                    [self.delegate meshCoreDidEncounterError:MeshCoreErrorUnknown message:@"Failed to create MeshCore"];
                }
            });
            
            if (completion) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    completion(NO, error);
                });
            }
        }
    });
}

- (void)stopWithCompletion:(void (^)(void))completion {
    MeshCoreLog(@"stopWithCompletion called");
    
    // Also stop BLE if running
    [self stopBLE];
    
    dispatch_async(self.workQueue, ^{
        if (self.coreInstance) {
            meshcore_destroy(self.coreInstance);
            self.coreInstance = NULL;
            MeshCoreLog(@"meshcore_destroy() called");
        } else {
            MeshCoreLog(@"Not running, nothing to stop");
        }
        
        // Notify delegate of status change
        dispatch_async(dispatch_get_main_queue(), ^{
            if (self.delegate && [self.delegate respondsToSelector:@selector(meshCoreDidChangeStatus:message:)]) {
                [self.delegate meshCoreDidChangeStatus:MeshCoreStatusStopped message:@"MeshCore stopped"];
            }
        });
        
        if (completion) {
            dispatch_async(dispatch_get_main_queue(), ^{
                completion();
            });
        }
    });
}

#pragma mark - Messaging

- (void)sendMessage:(NSString *)message
                 to:(NSString *)recipientUid
         completion:(void (^)(BOOL, MeshCoreError))completion {
    
    MeshCoreLog(@"sendMessage called - to: %@, message: %@", recipientUid, message);
    
    // Validate parameters on calling thread (fail fast)
    if (!message || message.length == 0) {
        MeshCoreLogError(@"Invalid message parameter");
        if (completion) {
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(NO, MeshCoreErrorInvalidParameter);
            });
        }
        return;
    }
    
    if (!recipientUid || recipientUid.length == 0) {
        MeshCoreLogError(@"Invalid recipientUid parameter");
        if (completion) {
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(NO, MeshCoreErrorInvalidParameter);
            });
        }
        return;
    }
    
    // Copy strings for async block (ARC safety)
    NSString *messageCopy = [message copy];
    NSString *uidCopy = [recipientUid copy];
    
    dispatch_async(self.workQueue, ^{
        // Check if running
        if (!self.coreInstance || !meshcore_is_running(self.coreInstance)) {
            MeshCoreLogError(@"MeshCore is not running");
            if (completion) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    completion(NO, MeshCoreErrorNotRunning);
                });
            }
            return;
        }
        
        // Convert to C strings
        const char *cMessage = [messageCopy UTF8String];
        const char *cUid = [uidCopy UTF8String];
        size_t messageLen = strlen(cMessage);
        
        // Call C API
        meshcore_error result = meshcore_send_message_to_uid(
            self.coreInstance,
            cUid,
            cMessage,
            messageLen
        );
        
        MeshCoreLog(@"meshcore_send_message_to_uid returned: %d", result);
        
        if (completion) {
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(result == MESHCORE_OK, (MeshCoreError)result);
            });
        }
    });
}

- (void)sendMessage:(NSString *)message
           toPeerId:(uint64_t)peerId
         completion:(void (^)(BOOL, MeshCoreError))completion {
    
    MeshCoreLog(@"sendMessage called - to peer: %llu, message: %@", peerId, message);
    
    if (!message || message.length == 0) {
        MeshCoreLogError(@"Invalid message parameter");
        if (completion) {
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(NO, MeshCoreErrorInvalidParameter);
            });
        }
        return;
    }
    
    NSString *messageCopy = [message copy];
    
    dispatch_async(self.workQueue, ^{
        if (!self.coreInstance || !meshcore_is_running(self.coreInstance)) {
            MeshCoreLogError(@"MeshCore is not running");
            if (completion) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    completion(NO, MeshCoreErrorNotRunning);
                });
            }
            return;
        }
        
        const char *cMessage = [messageCopy UTF8String];
        size_t messageLen = strlen(cMessage);
        
        meshcore_error result = meshcore_send_message(
            self.coreInstance,
            peerId,
            cMessage,
            messageLen
        );
        
        MeshCoreLog(@"meshcore_send_message returned: %d", result);
        
        if (completion) {
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(result == MESHCORE_OK, (MeshCoreError)result);
            });
        }
    });
}

#pragma mark - BLE Control

- (void)startWithUID:(NSString *)uid completion:(void (^)(BOOL, NSError * _Nullable))completion {
    MeshCoreLog(@"startWithUID called: %@", uid);
    
    self.localUID = uid ?: @"user";
    
    // Start daemon first
    [self startWithCompletion:^(BOOL success, NSError *error) {
        if (success) {
            // Then start BLE
            [self startBLE];
        }
        if (completion) {
            completion(success, error);
        }
    }];
}

- (void)startBLE {
    MeshCoreLog(@"startBLE called");
    
    if (self.bleRunningInternal) {
        MeshCoreLog(@"BLE already running");
        return;
    }
    
    // Ensure UID is set
    if (self.localUIDInternal.length == 0) {
        self.localUIDInternal = [[NSUUID UUID] UUIDString];
    }
    
    self.bleManager.localUID = self.localUIDInternal;
    [self.bleManager startWithUID:self.localUIDInternal];
    self.bleRunningInternal = YES;
    
    MeshCoreLog(@"BLE started with UID: %@", self.localUIDInternal);
}

- (void)stopBLE {
    MeshCoreLog(@"stopBLE called");
    
    if (!self.bleRunningInternal) {
        MeshCoreLog(@"BLE not running");
        return;
    }
    
    [self.bleManager stop];
    self.bleRunningInternal = NO;
    
    // Clear caches
    [self.discoveredPeersCache removeAllObjects];
    [self.connectedPeersCache removeAllObjects];
    
    MeshCoreLog(@"BLE stopped");
}

- (NSArray<MeshPeer *> *)getDiscoveredPeers {
    @synchronized (self.discoveredPeersCache) {
        return [self.discoveredPeersCache allValues];
    }
}

- (NSArray<MeshPeer *> *)getConnectedPeers {
    @synchronized (self.connectedPeersCache) {
        return [self.connectedPeersCache allValues];
    }
}

- (void)connectToPeer:(NSString *)peerIdentifier {
    MeshCoreLog(@"connectToPeer: %@", peerIdentifier);
    [self.bleManager connectToPeer:peerIdentifier];
}

- (void)disconnectFromPeer:(NSString *)peerIdentifier {
    MeshCoreLog(@"disconnectFromPeer: %@", peerIdentifier);
    [self.bleManager disconnectFromPeer:peerIdentifier];
}

#pragma mark - BLEManagerDelegate

- (void)bleManager:(BLEManager *)manager didDiscoverPeer:(BLEPeer *)peer {
    MeshCoreLog(@"BLE discovered peer: %@ (%@)", peer.uid, peer.identifier.UUIDString);
    
    NSString *key = peer.identifier.UUIDString;
    MeshPeer *meshPeer = [[MeshPeer alloc] initWithPeerId:(uint64_t)[peer.identifier hash]
                                                      uid:peer.uid
                                                connected:NO];
    
    @synchronized (self.discoveredPeersCache) {
        self.discoveredPeersCache[key] = meshPeer;
    }
    
    // Notify delegate on main thread
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.delegate && [self.delegate respondsToSelector:@selector(meshCoreDidUpdatePeer:)]) {
            [self.delegate meshCoreDidUpdatePeer:meshPeer];
        }
    });
}

- (void)bleManager:(BLEManager *)manager didUpdatePeer:(BLEPeer *)peer {
    MeshCoreLog(@"BLE peer updated: %@ (%@) state=%ld",
                peer.uid, peer.identifier.UUIDString, (long)peer.state);
    
    NSString *key = peer.identifier.UUIDString;
    BOOL connected = (peer.state == BLEPeerStateConnected);
    
    MeshPeer *meshPeer = [[MeshPeer alloc] initWithPeerId:(uint64_t)[peer.identifier hash]
                                                      uid:peer.uid
                                                connected:connected];
    
    @synchronized (self.discoveredPeersCache) {
        self.discoveredPeersCache[key] = meshPeer;
    }
    
    @synchronized (self.connectedPeersCache) {
        if (connected) {
            self.connectedPeersCache[key] = meshPeer;
        } else {
            [self.connectedPeersCache removeObjectForKey:key];
        }
    }
    
    // Notify delegate on main thread
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.delegate && [self.delegate respondsToSelector:@selector(meshCoreDidUpdatePeer:)]) {
            [self.delegate meshCoreDidUpdatePeer:meshPeer];
        }
    });
}

- (void)bleManager:(BLEManager *)manager didReceiveMessage:(NSString *)message from:(BLEPeer *)peer {
    MeshCoreLog(@"BLE received message from %@: %@", peer.uid, message);
    
    // Notify delegate on main thread
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.delegate && [self.delegate respondsToSelector:@selector(meshCoreDidReceiveMessage:)]) {
            MeshMessage *msg = [[MeshMessage alloc] initWithFromUid:peer.uid
                                                         fromPeerId:(uint64_t)[peer.identifier hash]
                                                            content:message
                                                          timestamp:(int64_t)[[NSDate date] timeIntervalSince1970] * 1000];
            [self.delegate meshCoreDidReceiveMessage:msg];
        }
    });
}

- (void)bleManager:(BLEManager *)manager didUpdateState:(CBManagerState)state {
    MeshCoreLog(@"BLE state changed: %ld", (long)state);
    
    // Map BLE state to MeshCore status
    MeshCoreStatus status;
    NSString *statusMessage;
    
    switch (state) {
        case CBManagerStatePoweredOn:
            status = MeshCoreStatusRunning;
            statusMessage = @"Bluetooth is on";
            break;
        case CBManagerStatePoweredOff:
            status = MeshCoreStatusStopped;
            statusMessage = @"Bluetooth is off";
            self.bleRunningInternal = NO;
            break;
        case CBManagerStateUnauthorized:
            status = MeshCoreStatusError;
            statusMessage = @"Bluetooth permission denied";
            self.bleRunningInternal = NO;
            break;
        case CBManagerStateUnsupported:
            status = MeshCoreStatusError;
            statusMessage = @"Bluetooth not supported";
            self.bleRunningInternal = NO;
            break;
        default:
            status = MeshCoreStatusStopped;
            statusMessage = @"Bluetooth unavailable";
            break;
    }
    
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.delegate && [self.delegate respondsToSelector:@selector(meshCoreDidChangeStatus:message:)]) {
            [self.delegate meshCoreDidChangeStatus:status message:statusMessage];
        }
    });
}

- (void)bleManager:(BLEManager *)manager didEncounterError:(NSError *)error {
    MeshCoreLogError(@"BLE error: %@", error.localizedDescription);
    
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.delegate && [self.delegate respondsToSelector:@selector(meshCoreDidEncounterError:message:)]) {
            [self.delegate meshCoreDidEncounterError:MeshCoreErrorUnknown message:error.localizedDescription];
        }
    });
}

#pragma mark - Testing Helpers

- (void)simulatePeerConnectWithId:(uint64_t)peerId uid:(NSString *)uid {
    MeshCoreLog(@"simulatePeerConnect - id: %llu, uid: %@", peerId, uid);
    
    dispatch_async(self.workQueue, ^{
        if (self.coreInstance) {
            const char *cUid = uid ? [uid UTF8String] : NULL;
            meshcore_simulate_peer_connect(self.coreInstance, peerId, cUid);
        }
    });
}

- (void)simulateMessageReceived:(NSString *)message fromPeerId:(uint64_t)peerId {
    MeshCoreLog(@"simulateMessageReceived - from: %llu, message: %@", peerId, message);
    
    if (!message) return;
    
    NSString *msgCopy = [message copy];
    
    dispatch_async(self.workQueue, ^{
        if (self.coreInstance) {
            const char *cMsg = [msgCopy UTF8String];
            meshcore_simulate_message(self.coreInstance, peerId, cMsg, strlen(cMsg));
        }
    });
}

@end
