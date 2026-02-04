/**
 * MeshCore - Objective-C Wrapper for C Core
 *
 * This class provides a clean, thread-safe Objective-C interface
 * to the underlying C core. It:
 *
 * 1. Encapsulates all C function calls (no C headers exposed publicly)
 * 2. Manages memory ownership at the boundary
 * 3. Provides thread-safe access via GCD
 * 4. Uses iOS-friendly naming (no "daemon" terminology)
 * 5. Handles lifecycle safely within iOS constraints
 *
 * Architecture Rules:
 * - This is the ONLY class that imports the C header
 * - All C callbacks are routed through this class
 * - Callers receive Objective-C objects, not C pointers
 * - Thread safety is guaranteed at this layer
 *
 * iOS Compliance:
 * - No long-running background threads
 * - No daemon-like behavior
 * - Works within iOS sandbox
 * - Clean init/shutdown lifecycle
 *
 * Connection to Daemon:
 * - Uses meshcore.h C API
 * - Callbacks registered via meshcore_set_callbacks()
 * - Messages sent via meshcore_send_message_to_uid()
 */

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#pragma mark - Data Types

/**
 * Represents an incoming mesh message
 */
@interface MeshMessage : NSObject

@property (nonatomic, copy, readonly) NSString *fromUid;
@property (nonatomic, assign, readonly) uint64_t fromPeerId;
@property (nonatomic, copy, readonly) NSString *content;
@property (nonatomic, assign, readonly) int64_t timestamp;

- (instancetype)initWithFromUid:(NSString *)fromUid
                     fromPeerId:(uint64_t)peerId
                        content:(NSString *)content
                      timestamp:(int64_t)timestamp;

// Legacy initializer for compatibility
- (instancetype)initWithFromUid:(NSString *)fromUid
                        content:(NSString *)content
                      timestamp:(int64_t)timestamp;

@end

/**
 * Represents a connected peer
 */
@interface MeshPeer : NSObject

@property (nonatomic, assign, readonly) uint64_t peerId;
@property (nonatomic, copy, readonly) NSString *uid;
@property (nonatomic, assign, readonly) BOOL connected;

- (instancetype)initWithPeerId:(uint64_t)peerId
                           uid:(NSString *)uid
                     connected:(BOOL)connected;

@end

/**
 * Status codes for MeshCore
 */
typedef NS_ENUM(NSInteger, MeshCoreStatus) {
    MeshCoreStatusStopped = 0,
    MeshCoreStatusRunning = 1,
    MeshCoreStatusError = -1
};

/**
 * Error codes for MeshCore operations
 * Maps directly to C meshcore_error enum
 */
typedef NS_ENUM(NSInteger, MeshCoreError) {
    MeshCoreErrorNone = 0,
    MeshCoreErrorNotRunning = -1,
    MeshCoreErrorInvalidParameter = -2,
    MeshCoreErrorMessageTooLong = -3,
    MeshCoreErrorPeerNotFound = -4,
    MeshCoreErrorQueueFull = -5,
    MeshCoreErrorUnknown = -99
};

#pragma mark - Delegate Protocol

/**
 * Delegate protocol for receiving MeshCore events
 *
 * All delegate methods are called on the main thread.
 */
@protocol MeshCoreDelegate <NSObject>

@optional

/**
 * Called when a message is received from the mesh network
 *
 * @param message The received message
 */
- (void)meshCoreDidReceiveMessage:(MeshMessage *)message;

/**
 * Called when the core status changes
 *
 * @param status The new status
 * @param statusMessage Human-readable status description
 */
- (void)meshCoreDidChangeStatus:(MeshCoreStatus)status
                        message:(NSString *)statusMessage;

/**
 * Called when an error occurs
 *
 * @param error The error that occurred
 * @param errorMessage Human-readable error description
 */
- (void)meshCoreDidEncounterError:(MeshCoreError)error
                          message:(NSString *)errorMessage;

/**
 * Called when a peer connects or disconnects
 *
 * @param peer The peer that changed state
 */
- (void)meshCoreDidUpdatePeer:(MeshPeer *)peer;

@end

#pragma mark - MeshCore Interface

/**
 * MeshCore - Thread-safe wrapper for mesh networking core
 *
 * Usage:
 *   MeshCore *core = [MeshCore sharedInstance];
 *   core.delegate = self;
 *   [core startWithCompletion:^(BOOL success, NSError *error) { ... }];
 */
@interface MeshCore : NSObject

#pragma mark - Singleton

/**
 * Shared instance (thread-safe)
 */
+ (instancetype)sharedInstance;

#pragma mark - Properties

/**
 * Delegate for receiving events
 * Set to nil to stop receiving callbacks
 */
@property (nonatomic, weak, nullable) id<MeshCoreDelegate> delegate;

/**
 * Whether the core is currently running
 */
@property (nonatomic, assign, readonly, getter=isRunning) BOOL running;

/**
 * Whether BLE is currently active
 */
@property (nonatomic, assign, readonly, getter=isBLERunning) BOOL bleRunning;

/**
 * Version string of the core library
 */
@property (nonatomic, copy, readonly) NSString *version;

/**
 * Number of connected peers
 */
@property (nonatomic, assign, readonly) uint32_t peerCount;

/**
 * Local user ID (set before starting BLE)
 */
@property (nonatomic, copy) NSString *localUID;

#pragma mark - Lifecycle

/**
 * Start the mesh core with BLE
 *
 * @param uid Local user identifier for BLE advertising
 * @param completion Called when start completes (success/failure)
 */
- (void)startWithUID:(NSString *)uid
          completion:(nullable void (^)(BOOL success, NSError * _Nullable error))completion;

/**
 * Start the mesh core (legacy - uses default UID)
 *
 * Safe to call multiple times (no-op if already running).
 * Completion is called on the main thread.
 *
 * @param completion Called when start completes (success/failure)
 */
- (void)startWithCompletion:(nullable void (^)(BOOL success, NSError * _Nullable error))completion;

/**
 * Stop the mesh core
 *
 * Safe to call multiple times (no-op if already stopped).
 * Completion is called on the main thread.
 *
 * @param completion Called when stop completes
 */
- (void)stopWithCompletion:(nullable void (^)(void))completion;

#pragma mark - BLE Control

/**
 * Start BLE scanning and advertising
 */
- (void)startBLE;

/**
 * Stop BLE operations
 */
- (void)stopBLE;

/**
 * Get all discovered BLE peers
 */
- (NSArray<MeshPeer *> *)getDiscoveredPeers;

/**
 * Get connected BLE peers only
 */
- (NSArray<MeshPeer *> *)getConnectedPeers;

/**
 * Connect to a specific peer by identifier string
 */
- (void)connectToPeer:(NSString *)peerIdentifier;

/**
 * Disconnect from a peer
 */
- (void)disconnectFromPeer:(NSString *)peerIdentifier;

#pragma mark - Messaging

/**
 * Send a message to a peer by UID
 *
 * This is non-blocking. The message is queued for delivery.
 * Completion is called on the main thread.
 *
 * @param message The message content (max 4096 bytes)
 * @param recipientUid The recipient's unique identifier
 * @param completion Called with result (success/error)
 */
- (void)sendMessage:(NSString *)message
                 to:(NSString *)recipientUid
         completion:(nullable void (^)(BOOL success, MeshCoreError error))completion;

/**
 * Send a message to a peer by peer ID
 *
 * @param message The message content
 * @param peerId The peer's numeric ID
 * @param completion Called with result
 */
- (void)sendMessage:(NSString *)message
           toPeerId:(uint64_t)peerId
         completion:(nullable void (^)(BOOL success, MeshCoreError error))completion;

#pragma mark - Testing Helpers

/**
 * Simulate a peer connection (for testing without network)
 *
 * @param peerId Numeric peer ID
 * @param uid Optional string UID
 */
- (void)simulatePeerConnectWithId:(uint64_t)peerId uid:(nullable NSString *)uid;

/**
 * Simulate receiving a message (for testing without network)
 *
 * @param message The message content
 * @param peerId The peer ID it's "from"
 */
- (void)simulateMessageReceived:(NSString *)message fromPeerId:(uint64_t)peerId;

@end

NS_ASSUME_NONNULL_END
