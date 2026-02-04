/**
 * MeshBridge - React Native Bridge Layer
 *
 * This Swift class bridges React Native with MeshCore.
 * It does NOT know about the C layer - only the Objective-C wrapper.
 *
 * Layer Responsibilities:
 * - Translate JS calls → MeshCore calls
 * - Translate MeshCore delegate → JS events
 * - Handle React Native lifecycle
 * - Provide Promise-based API to JavaScript
 *
 * Architecture Rules:
 * - NO direct C function calls
 * - NO @_silgen_name declarations
 * - Uses MeshCore Objective-C API exclusively
 * - All operations are non-blocking
 *
 * Threading:
 * - MeshCore guarantees callbacks on main thread
 * - React Native bridge methods are on main thread
 * - No additional thread management needed here
 *
 * Connection Flow:
 *   React Native (JS) 
 *       ↓ (Native Modules)
 *   MeshBridge.swift (this file)
 *       ↓ (Objective-C calls)
 *   MeshCore.m (Objective-C wrapper)
 *       ↓ (C function calls)
 *   meshcore.h → meshcore_bridge.c
 *       ↓ (impl functions)
 *   meshcore_impl.cpp (C++ wrapper)
 *       ↓ (C++ method calls)
 *   Daemon.cpp (event processing)
 */

import Foundation
import React

// MARK: - Logger

private enum MeshBridgeLogger {
    static let prefix = "[MeshBridge]"
    
    static func log(_ message: String) {
        print("\(prefix) INFO: \(message)")
    }
    
    static func error(_ message: String) {
        print("\(prefix) ERROR: \(message)")
    }
}

// MARK: - MeshBridge Class

@objc(MeshBridge)
class MeshBridge: RCTEventEmitter {
    
    // MARK: - Constants
    
    private enum Events {
        static let onMessageReceived = "onMessageReceived"
        static let onStatusChanged = "onStatusChanged"
        static let onError = "onError"
        static let onPeerUpdated = "onPeerUpdated"
        static let onPeerDiscovered = "onPeerDiscovered"
        static let onBLEStateChanged = "onBLEStateChanged"
    }
    
    // MARK: - Properties
    
    /// Whether JS is listening for events
    private var hasListeners = false
    
    /// Reference to the mesh core
    private var meshCore: MeshCore {
        return MeshCore.sharedInstance()
    }
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        MeshBridgeLogger.log("MeshBridge initialized")
        
        // Set ourselves as the delegate
        meshCore.delegate = self
    }
    
    deinit {
        MeshBridgeLogger.log("MeshBridge deinitializing")
        
        // Clear delegate if we're still set
        if meshCore.delegate === self {
            meshCore.delegate = nil
        }
    }
    
    // MARK: - RCTEventEmitter Overrides
    
    override static func moduleName() -> String! {
        return "MeshBridge"
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return [
            Events.onMessageReceived,
            Events.onStatusChanged,
            Events.onError,
            Events.onPeerUpdated,
            Events.onPeerDiscovered,
            Events.onBLEStateChanged
        ]
    }
    
    override func startObserving() {
        MeshBridgeLogger.log("JS started observing events")
        hasListeners = true
    }
    
    override func stopObserving() {
        MeshBridgeLogger.log("JS stopped observing events")
        hasListeners = false
    }
    
    // MARK: - Private Helpers
    
    private func emitError(_ error: String) {
        MeshBridgeLogger.error(error)
        
        guard hasListeners else { return }
        
        sendEvent(withName: Events.onError, body: ["error": error])
    }
    
    // MARK: - Exported Methods
    
    @objc
    func startDaemon(_ resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("startDaemon() called from JS")
        
        meshCore.start { [weak self] success, error in
            if success {
                MeshBridgeLogger.log("MeshCore started successfully")
                resolve(["success": true, "message": "MeshCore started"])
            } else {
                let errorMessage = error?.localizedDescription ?? "Unknown error"
                MeshBridgeLogger.error("Failed to start MeshCore: \(errorMessage)")
                reject("START_ERROR", errorMessage, error)
            }
        }
    }
    
    @objc
    func stopDaemon(_ resolve: @escaping RCTPromiseResolveBlock,
                    reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("stopDaemon() called from JS")
        
        meshCore.stop {
            MeshBridgeLogger.log("MeshCore stopped successfully")
            resolve(["success": true, "message": "MeshCore stopped"])
        }
    }
    
    @objc
    func sendMessage(_ toUid: String,
                     message: String,
                     resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("sendMessage() called from JS - toUid: \(toUid), message: \(message)")
        
        // Validate parameters
        guard !toUid.isEmpty else {
            MeshBridgeLogger.error("Invalid toUid parameter")
            reject("INVALID_PARAM", "toUid cannot be empty", nil)
            return
        }
        
        guard !message.isEmpty else {
            MeshBridgeLogger.error("Invalid message parameter")
            reject("INVALID_PARAM", "message cannot be empty", nil)
            return
        }
        
        meshCore.sendMessage(message, to: toUid) { success, errorCode in
            if success {
                MeshBridgeLogger.log("Message sent successfully")
                resolve(["success": true, "message": "Message sent"])
            } else {
                let errorMessage: String
                switch errorCode {
                case .notRunning:
                    errorMessage = "MeshCore is not running"
                case .invalidParameter:
                    errorMessage = "Invalid parameters"
                case .messageTooLong:
                    errorMessage = "Message exceeds maximum length"
                default:
                    errorMessage = "Unknown error"
                }
                MeshBridgeLogger.error("Failed to send message: \(errorMessage)")
                reject("SEND_ERROR", errorMessage, nil)
            }
        }
    }
    
    @objc
    func isRunning(_ resolve: @escaping RCTPromiseResolveBlock,
                   reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("isRunning() called from JS")
        
        let running = meshCore.isRunning
        MeshBridgeLogger.log("MeshCore running: \(running)")
        resolve(running)
    }
    
    @objc
    func getVersion(_ resolve: @escaping RCTPromiseResolveBlock,
                    reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("getVersion() called from JS")
        
        let version = meshCore.version
        MeshBridgeLogger.log("MeshCore version: \(version)")
        resolve(version)
    }
    
    @objc
    func getPeerCount(_ resolve: @escaping RCTPromiseResolveBlock,
                      reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("getPeerCount() called from JS")
        
        let count = meshCore.peerCount
        MeshBridgeLogger.log("Peer count: \(count)")
        resolve(count)
    }
    
    // MARK: - BLE Methods
    
    @objc
    func startBLE(_ uid: String,
                  resolve: @escaping RCTPromiseResolveBlock,
                  reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("startBLE() called from JS - uid: \(uid)")
        
        meshCore.localUID = uid.isEmpty ? UUID().uuidString : uid
        meshCore.startBLE()
        
        resolve(["success": true, "message": "BLE started", "uid": meshCore.localUID])
    }
    
    @objc
    func stopBLE(_ resolve: @escaping RCTPromiseResolveBlock,
                 reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("stopBLE() called from JS")
        
        meshCore.stopBLE()
        
        resolve(["success": true, "message": "BLE stopped"])
    }
    
    @objc
    func isBLERunning(_ resolve: @escaping RCTPromiseResolveBlock,
                      reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("isBLERunning() called from JS")
        
        let running = meshCore.isBLERunning
        MeshBridgeLogger.log("BLE running: \(running)")
        resolve(running)
    }
    
    @objc
    func getDiscoveredPeers(_ resolve: @escaping RCTPromiseResolveBlock,
                            reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("getDiscoveredPeers() called from JS")
        
        let peers = meshCore.getDiscoveredPeers()
        let peersArray = peers.map { peer -> [String: Any] in
            return [
                "peerId": NSNumber(value: peer.peerId),
                "uid": peer.uid,
                "connected": peer.connected
            ]
        }
        
        MeshBridgeLogger.log("Found \(peersArray.count) discovered peers")
        resolve(peersArray)
    }
    
    @objc
    func getConnectedPeers(_ resolve: @escaping RCTPromiseResolveBlock,
                           reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("getConnectedPeers() called from JS")
        
        let peers = meshCore.getConnectedPeers()
        let peersArray = peers.map { peer -> [String: Any] in
            return [
                "peerId": NSNumber(value: peer.peerId),
                "uid": peer.uid,
                "connected": peer.connected
            ]
        }
        
        MeshBridgeLogger.log("Found \(peersArray.count) connected peers")
        resolve(peersArray)
    }
    
    @objc
    func connectToPeer(_ peerIdentifier: String,
                       resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("connectToPeer() called from JS - peerIdentifier: \(peerIdentifier)")
        
        guard !peerIdentifier.isEmpty else {
            MeshBridgeLogger.error("Invalid peerIdentifier parameter")
            reject("INVALID_PARAM", "peerIdentifier cannot be empty", nil)
            return
        }
        
        meshCore.connect(toPeer: peerIdentifier)
        resolve(["success": true, "message": "Connection initiated"])
    }
    
    @objc
    func disconnectFromPeer(_ peerIdentifier: String,
                            resolve: @escaping RCTPromiseResolveBlock,
                            reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("disconnectFromPeer() called from JS - peerIdentifier: \(peerIdentifier)")
        
        guard !peerIdentifier.isEmpty else {
            MeshBridgeLogger.error("Invalid peerIdentifier parameter")
            reject("INVALID_PARAM", "peerIdentifier cannot be empty", nil)
            return
        }
        
        meshCore.disconnect(fromPeer: peerIdentifier)
        resolve(["success": true, "message": "Disconnection initiated"])
    }
    
    @objc
    func sendBLEMessage(_ toUid: String,
                        message: String,
                        resolve: @escaping RCTPromiseResolveBlock,
                        reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("sendBLEMessage() called from JS - toUid: \(toUid), message: \(message)")
        
        guard !toUid.isEmpty else {
            MeshBridgeLogger.error("Invalid toUid parameter")
            reject("INVALID_PARAM", "toUid cannot be empty", nil)
            return
        }
        
        guard !message.isEmpty else {
            MeshBridgeLogger.error("Invalid message parameter")
            reject("INVALID_PARAM", "message cannot be empty", nil)
            return
        }
        
        // Send via BLE Manager directly
        let bleManager = BLEManager.shared
        let sent = bleManager.sendMessage(message, toUID: toUid)
        
        if sent {
            MeshBridgeLogger.log("BLE message sent successfully")
            resolve(["success": true, "message": "Message sent"])
        } else {
            MeshBridgeLogger.error("Failed to send BLE message")
            reject("SEND_ERROR", "Failed to send message - peer may not be connected", nil)
        }
    }
    
    @objc
    func getLocalUID(_ resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("getLocalUID() called from JS")
        
        let uid = meshCore.localUID ?? ""
        MeshBridgeLogger.log("Local UID: \(uid)")
        resolve(uid)
    }
    
    // MARK: - Testing Methods
    
    @objc
    func simulatePeerConnect(_ peerId: NSNumber,
                             uid: String,
                             resolve: @escaping RCTPromiseResolveBlock,
                             reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("simulatePeerConnect() called - peerId: \(peerId), uid: \(uid)")
        
        meshCore.simulatePeerConnect(withId: peerId.uint64Value, uid: uid.isEmpty ? nil : uid)
        resolve(["success": true, "message": "Peer connection simulated"])
    }
    
    @objc
    func simulateMessageReceived(_ message: String,
                                 fromPeerId peerId: NSNumber,
                                 resolve: @escaping RCTPromiseResolveBlock,
                                 reject: @escaping RCTPromiseRejectBlock) {
        MeshBridgeLogger.log("simulateMessageReceived() called - message: \(message), from: \(peerId)")
        
        guard !message.isEmpty else {
            reject("INVALID_PARAM", "message cannot be empty", nil)
            return
        }
        
        meshCore.simulateMessageReceived(message, fromPeerId: peerId.uint64Value)
        resolve(["success": true, "message": "Message simulated"])
    }
}

// MARK: - MeshCoreDelegate

extension MeshBridge: MeshCoreDelegate {
    
    func meshCoreDidReceiveMessage(_ message: MeshMessage) {
        MeshBridgeLogger.log("Received message from: \(message.fromUid) (peer: \(message.fromPeerId))")
        
        guard hasListeners else {
            MeshBridgeLogger.log("No listeners, message dropped")
            return
        }
        
        let eventBody: [String: Any] = [
            "fromUid": message.fromUid,
            "fromPeerId": NSNumber(value: message.fromPeerId),
            "message": message.content,
            "timestamp": NSNumber(value: message.timestamp)
        ]
        
        MeshBridgeLogger.log("Emitting onMessageReceived event to JS")
        sendEvent(withName: Events.onMessageReceived, body: eventBody)
    }
    
    func meshCoreDidChangeStatus(_ status: MeshCoreStatus, message: String) {
        MeshBridgeLogger.log("Status changed: \(status.rawValue), message: \(message)")
        
        guard hasListeners else {
            MeshBridgeLogger.log("No listeners, status change dropped")
            return
        }
        
        let eventBody: [String: Any] = [
            "status": status.rawValue,
            "message": message,
            "isRunning": status == .running
        ]
        
        MeshBridgeLogger.log("Emitting onStatusChanged event to JS")
        sendEvent(withName: Events.onStatusChanged, body: eventBody)
    }
    
    func meshCoreDidEncounterError(_ error: MeshCoreError, message: String) {
        MeshBridgeLogger.error("Error: \(error.rawValue), message: \(message)")
        
        guard hasListeners else { return }
        
        sendEvent(withName: Events.onError, body: [
            "error": message,
            "code": error.rawValue
        ])
    }
    
    func meshCoreDidUpdatePeer(_ peer: MeshPeer) {
        MeshBridgeLogger.log("Peer updated: \(peer.peerId) (\(peer.uid)) - connected: \(peer.connected)")
        
        guard hasListeners else {
            MeshBridgeLogger.log("No listeners, peer update dropped")
            return
        }
        
        let eventBody: [String: Any] = [
            "peerId": NSNumber(value: peer.peerId),
            "uid": peer.uid,
            "connected": peer.connected
        ]
        
        MeshBridgeLogger.log("Emitting onPeerUpdated event to JS")
        sendEvent(withName: Events.onPeerUpdated, body: eventBody)
    }
}
