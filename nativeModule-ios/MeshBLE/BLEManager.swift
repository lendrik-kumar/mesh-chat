/**
 * BLEManager - CoreBluetooth Manager for Peer-to-Peer Messaging
 *
 * This class handles all BLE operations:
 * - Acts as BOTH Central (scanner) AND Peripheral (advertiser) simultaneously
 * - Discovers nearby peers running the same app
 * - Establishes connections for messaging
 * - Sends/receives messages over BLE
 *
 * Architecture:
 *   ┌─────────────────────────────────────────┐
 *   │            BLEManager                   │
 *   │  ┌─────────────┐  ┌─────────────────┐  │
 *   │  │   Central   │  │   Peripheral    │  │
 *   │  │  (Scanner)  │  │  (Advertiser)   │  │
 *   │  └──────┬──────┘  └────────┬────────┘  │
 *   │         │                  │           │
 *   │    Discovers &        Accepts          │
 *   │    Connects to        Connections      │
 *   │    Other Peers        From Peers       │
 *   └─────────────────────────────────────────┘
 *
 * Threading:
 *   - All CB callbacks are on a dedicated BLE queue
 *   - Delegate callbacks are dispatched to main thread
 */

import Foundation
import CoreBluetooth

// MARK: - Logger

private enum BLELogger {
    static let prefix = "[BLE]"
    
    static func log(_ message: String) {
        print("\(prefix) \(message)")
    }
    
    static func error(_ message: String) {
        print("\(prefix) ERROR: \(message)")
    }
}

// MARK: - Delegate Protocol

@objc protocol BLEManagerDelegate: AnyObject {
    
    /// Called when a new peer is discovered
    @objc optional func bleManager(_ manager: BLEManager, didDiscoverPeer peer: BLEPeer)
    
    /// Called when a peer's state changes (connected, disconnected, etc.)
    @objc optional func bleManager(_ manager: BLEManager, didUpdatePeer peer: BLEPeer)
    
    /// Called when a message is received from a peer
    @objc optional func bleManager(_ manager: BLEManager, didReceiveMessage message: String, from peer: BLEPeer)
    
    /// Called when BLE state changes
    @objc optional func bleManager(_ manager: BLEManager, didUpdateState state: CBManagerState)
    
    /// Called when an error occurs
    @objc optional func bleManager(_ manager: BLEManager, didEncounterError error: Error)
}

// MARK: - BLEManager Class

@objc class BLEManager: NSObject {
    
    // MARK: - Singleton
    
    @objc static let shared = BLEManager()
    
    // MARK: - Properties
    
    @objc weak var delegate: BLEManagerDelegate?
    
    /// Our local UID (set before starting)
    @objc var localUID: String = "unknown"
    
    /// Whether we're currently scanning/advertising
    @objc private(set) var isRunning: Bool = false
    
    /// All discovered peers (keyed by peripheral identifier)
    private var peers: [UUID: BLEPeer] = [:]
    private let peersLock = NSLock()
    
    // MARK: - CoreBluetooth Objects
    
    private var centralManager: CBCentralManager!
    private var peripheralManager: CBPeripheralManager!
    private let bleQueue = DispatchQueue(label: "com.meshchat.ble", qos: .userInitiated)
    
    // MARK: - Peripheral Mode Properties
    
    private var meshService: CBMutableService?
    private var messageCharacteristic: CBMutableCharacteristic?
    private var identityCharacteristic: CBMutableCharacteristic?
    private var subscribedCentrals: [CBCentral] = []
    
    // MARK: - Initialization
    
    private override init() {
        super.init()
        BLELogger.log("BLEManager initialized")
    }
    
    // MARK: - Public API
    
    /// Start BLE scanning and advertising
    @objc func start(withUID uid: String) {
        BLELogger.log("Starting BLE with UID: \(uid)")
        
        localUID = uid
        
        // Initialize managers (this triggers state callbacks)
        centralManager = CBCentralManager(delegate: self, queue: bleQueue)
        peripheralManager = CBPeripheralManager(delegate: self, queue: bleQueue)
        
        isRunning = true
    }
    
    /// Stop all BLE operations
    @objc func stop() {
        BLELogger.log("Stopping BLE")
        
        isRunning = false
        
        // Stop scanning
        if centralManager?.state == .poweredOn {
            centralManager.stopScan()
        }
        
        // Stop advertising
        if peripheralManager?.state == .poweredOn {
            peripheralManager.stopAdvertising()
            if let service = meshService {
                peripheralManager.remove(service)
            }
        }
        
        // Disconnect all peers
        peersLock.lock()
        for peer in peers.values {
            if let peripheral = peer.peripheral {
                centralManager?.cancelPeripheralConnection(peripheral)
            }
        }
        peers.removeAll()
        peersLock.unlock()
        
        subscribedCentrals.removeAll()
    }
    
    /// Get all discovered peers
    @objc func getDiscoveredPeers() -> [BLEPeer] {
        peersLock.lock()
        defer { peersLock.unlock() }
        return Array(peers.values)
    }
    
    /// Get connected peers only
    @objc func getConnectedPeers() -> [BLEPeer] {
        peersLock.lock()
        defer { peersLock.unlock() }
        return peers.values.filter { $0.state == .connected }
    }
    
    /// Connect to a specific peer by UUID
    @objc func connect(to peerIdentifier: UUID) {
        peersLock.lock()
        guard let peer = peers[peerIdentifier], let peripheral = peer.peripheral else {
            peersLock.unlock()
            BLELogger.error("Peer not found: \(peerIdentifier)")
            return
        }
        peersLock.unlock()
        
        BLELogger.log("Connecting to peer: \(peer.displayName)")
        peer.state = .connecting
        centralManager.connect(peripheral, options: nil)
        
        notifyPeerUpdate(peer)
    }
    
    /// Connect to a peer by identifier string (for React Native)
    @objc func connectToPeer(_ identifierString: String) {
        guard let uuid = UUID(uuidString: identifierString) else {
            BLELogger.error("Invalid UUID string: \(identifierString)")
            return
        }
        connect(to: uuid)
    }
    
    /// Disconnect from a peer by UUID
    @objc func disconnect(from peerIdentifier: UUID) {
        peersLock.lock()
        guard let peer = peers[peerIdentifier], let peripheral = peer.peripheral else {
            peersLock.unlock()
            return
        }
        peersLock.unlock()
        
        BLELogger.log("Disconnecting from peer: \(peer.displayName)")
        centralManager.cancelPeripheralConnection(peripheral)
    }
    
    /// Disconnect from a peer by identifier string (for React Native)
    @objc func disconnectFromPeer(_ identifierString: String) {
        guard let uuid = UUID(uuidString: identifierString) else {
            BLELogger.error("Invalid UUID string: \(identifierString)")
            return
        }
        disconnect(from: uuid)
    }
    
    /// Send a message to a connected peer
    @objc func sendMessage(_ message: String, to peerIdentifier: UUID) -> Bool {
        peersLock.lock()
        guard let peer = peers[peerIdentifier] else {
            peersLock.unlock()
            BLELogger.error("Peer not found: \(peerIdentifier)")
            return false
        }
        
        guard peer.state == .connected else {
            peersLock.unlock()
            BLELogger.error("Peer not connected: \(peer.displayName)")
            return false
        }
        
        guard let peripheral = peer.peripheral,
              let characteristic = peer.messageCharacteristic else {
            peersLock.unlock()
            BLELogger.error("Peer has no message characteristic")
            return false
        }
        peersLock.unlock()
        
        // Create packet
        let packet = BLEPacket.textMessage(message)
        let data = packet.toData()
        
        guard data.count <= BLEConstants.maxMessageSize else {
            BLELogger.error("Message too large: \(data.count) bytes")
            return false
        }
        
        BLELogger.log("Sending message to \(peer.displayName): \(message)")
        
        // Write to peripheral's characteristic (as Central)
        peripheral.writeValue(data, for: characteristic, type: .withResponse)
        
        return true
    }
    
    /// Send a message to a peer by UID
    @objc func sendMessage(_ message: String, toUID uid: String) -> Bool {
        peersLock.lock()
        let peer = peers.values.first { $0.uid == uid && $0.state == .connected }
        peersLock.unlock()
        
        guard let foundPeer = peer else {
            BLELogger.error("No connected peer with UID: \(uid)")
            return false
        }
        
        return sendMessage(message, to: foundPeer.identifier)
    }
    
    /// Broadcast a message to all subscribed centrals (Peripheral mode)
    @objc func broadcastMessage(_ message: String) {
        guard let characteristic = messageCharacteristic else {
            BLELogger.error("Message characteristic not available")
            return
        }
        
        let packet = BLEPacket.textMessage(message)
        let data = packet.toData()
        
        BLELogger.log("Broadcasting message to \(subscribedCentrals.count) subscribers")
        
        peripheralManager.updateValue(data, for: characteristic, onSubscribedCentrals: nil)
    }
    
    // MARK: - Private Helpers
    
    private func setupPeripheralService() {
        BLELogger.log("Setting up GATT service")
        
        // Message characteristic (read, write, notify)
        messageCharacteristic = CBMutableCharacteristic(
            type: BLEConstants.messageCharacteristicUUID,
            properties: [.write, .notify, .writeWithoutResponse],
            value: nil,
            permissions: [.writeable]
        )
        
        // Identity characteristic (read only)
        let identityData = localUID.data(using: .utf8)
        identityCharacteristic = CBMutableCharacteristic(
            type: BLEConstants.identityCharacteristicUUID,
            properties: [.read],
            value: identityData,
            permissions: [.readable]
        )
        
        // Create service
        meshService = CBMutableService(type: BLEConstants.meshServiceUUID, primary: true)
        meshService?.characteristics = [messageCharacteristic!, identityCharacteristic!]
        
        // Add service
        peripheralManager.add(meshService!)
    }
    
    private func startAdvertising() {
        guard peripheralManager.state == .poweredOn else { return }
        
        let advertisementData: [String: Any] = [
            CBAdvertisementDataServiceUUIDsKey: [BLEConstants.meshServiceUUID],
            CBAdvertisementDataLocalNameKey: BLEConstants.localNamePrefix + localUID.prefix(8)
        ]
        
        BLELogger.log("Starting to advertise")
        peripheralManager.startAdvertising(advertisementData)
    }
    
    private func startScanning() {
        guard centralManager.state == .poweredOn else { return }
        
        BLELogger.log("Starting to scan for peers")
        centralManager.scanForPeripherals(
            withServices: [BLEConstants.meshServiceUUID],
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )
    }
    
    private func notifyPeerDiscovered(_ peer: BLEPeer) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.bleManager?(self, didDiscoverPeer: peer)
        }
    }
    
    private func notifyPeerUpdate(_ peer: BLEPeer) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.bleManager?(self, didUpdatePeer: peer)
        }
    }
    
    private func notifyMessageReceived(_ message: String, from peer: BLEPeer) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.bleManager?(self, didReceiveMessage: message, from: peer)
        }
    }
    
    private func handleReceivedData(_ data: Data, from peer: BLEPeer) {
        guard let packet = BLEPacket(data: data) else {
            BLELogger.error("Invalid packet received")
            return
        }
        
        switch packet.type {
        case .identity:
            if let uid = String(data: packet.payload, encoding: .utf8) {
                BLELogger.log("Received identity from \(peer.identifier): \(uid)")
                peer.uid = uid
                notifyPeerUpdate(peer)
            }
            
        case .textMessage:
            if let message = String(data: packet.payload, encoding: .utf8) {
                BLELogger.log("Received message from \(peer.displayName): \(message)")
                notifyMessageReceived(message, from: peer)
            }
            
        case .ack:
            BLELogger.log("Received ACK from \(peer.displayName)")
        }
    }
}

// MARK: - CBCentralManagerDelegate (Scanner)

extension BLEManager: CBCentralManagerDelegate {
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        BLELogger.log("Central state: \(central.state.rawValue)")
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.bleManager?(self, didUpdateState: central.state)
        }
        
        if central.state == .poweredOn && isRunning {
            startScanning()
        }
    }
    
    func centralManager(_ central: CBCentralManager,
                        didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any],
                        rssi RSSI: NSNumber) {
        
        let identifier = peripheral.identifier
        
        peersLock.lock()
        if peers[identifier] == nil {
            // New peer discovered
            let peer = BLEPeer(identifier: identifier, peripheral: peripheral)
            peer.rssi = RSSI.intValue
            peer.state = .discovered
            
            // Try to get name from advertisement
            if let name = advertisementData[CBAdvertisementDataLocalNameKey] as? String {
                if name.hasPrefix(BLEConstants.localNamePrefix) {
                    peer.uid = String(name.dropFirst(BLEConstants.localNamePrefix.count))
                }
            }
            
            peers[identifier] = peer
            peersLock.unlock()
            
            BLELogger.log("Discovered peer: \(peer.displayName) (RSSI: \(RSSI))")
            notifyPeerDiscovered(peer)
            
            // Auto-connect to discovered peers
            connect(to: identifier)
        } else {
            // Update existing peer
            peers[identifier]?.rssi = RSSI.intValue
            peers[identifier]?.lastSeen = Date()
            peersLock.unlock()
        }
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        let identifier = peripheral.identifier
        
        peersLock.lock()
        guard let peer = peers[identifier] else {
            peersLock.unlock()
            return
        }
        peersLock.unlock()
        
        BLELogger.log("Connected to peer: \(peer.displayName)")
        
        peer.state = .connected
        peripheral.delegate = self
        
        // Discover services
        peripheral.discoverServices([BLEConstants.meshServiceUUID])
        
        notifyPeerUpdate(peer)
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        let identifier = peripheral.identifier
        
        peersLock.lock()
        guard let peer = peers[identifier] else {
            peersLock.unlock()
            return
        }
        peersLock.unlock()
        
        BLELogger.error("Failed to connect to \(peer.displayName): \(error?.localizedDescription ?? "unknown")")
        
        peer.state = .failed
        notifyPeerUpdate(peer)
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        let identifier = peripheral.identifier
        
        peersLock.lock()
        guard let peer = peers[identifier] else {
            peersLock.unlock()
            return
        }
        peersLock.unlock()
        
        BLELogger.log("Disconnected from peer: \(peer.displayName)")
        
        peer.state = .disconnected
        peer.messageCharacteristic = nil
        notifyPeerUpdate(peer)
        
        // Try to reconnect if still running
        if isRunning {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
                self?.connect(to: identifier)
            }
        }
    }
}

// MARK: - CBPeripheralDelegate (For connected peripherals)

extension BLEManager: CBPeripheralDelegate {
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            BLELogger.error("Service discovery error: \(error)")
            return
        }
        
        guard let service = peripheral.services?.first(where: { $0.uuid == BLEConstants.meshServiceUUID }) else {
            BLELogger.error("Mesh service not found")
            return
        }
        
        BLELogger.log("Discovered mesh service, discovering characteristics...")
        peripheral.discoverCharacteristics(
            [BLEConstants.messageCharacteristicUUID, BLEConstants.identityCharacteristicUUID],
            for: service
        )
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error {
            BLELogger.error("Characteristic discovery error: \(error)")
            return
        }
        
        let identifier = peripheral.identifier
        
        peersLock.lock()
        guard let peer = peers[identifier] else {
            peersLock.unlock()
            return
        }
        
        for characteristic in service.characteristics ?? [] {
            if characteristic.uuid == BLEConstants.messageCharacteristicUUID {
                peer.messageCharacteristic = characteristic
                
                // Subscribe to notifications
                peripheral.setNotifyValue(true, for: characteristic)
                BLELogger.log("Subscribed to message characteristic")
            }
            else if characteristic.uuid == BLEConstants.identityCharacteristicUUID {
                // Read identity
                peripheral.readValue(for: characteristic)
            }
        }
        peersLock.unlock()
        
        // Send our identity
        if let msgChar = peer.messageCharacteristic {
            let packet = BLEPacket.identity(uid: localUID)
            peripheral.writeValue(packet.toData(), for: msgChar, type: .withResponse)
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            BLELogger.error("Value update error: \(error)")
            return
        }
        
        guard let data = characteristic.value else { return }
        
        let identifier = peripheral.identifier
        
        peersLock.lock()
        guard let peer = peers[identifier] else {
            peersLock.unlock()
            return
        }
        peersLock.unlock()
        
        if characteristic.uuid == BLEConstants.identityCharacteristicUUID {
            // Direct identity read
            if let uid = String(data: data, encoding: .utf8) {
                peer.uid = uid
                BLELogger.log("Read identity for \(peer.identifier): \(uid)")
                notifyPeerUpdate(peer)
            }
        } else if characteristic.uuid == BLEConstants.messageCharacteristicUUID {
            // Message notification
            handleReceivedData(data, from: peer)
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            BLELogger.error("Write error: \(error)")
        } else {
            BLELogger.log("Write successful to \(peripheral.identifier)")
        }
    }
}

// MARK: - CBPeripheralManagerDelegate (Advertiser)

extension BLEManager: CBPeripheralManagerDelegate {
    
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        BLELogger.log("Peripheral state: \(peripheral.state.rawValue)")
        
        if peripheral.state == .poweredOn && isRunning {
            setupPeripheralService()
        }
    }
    
    func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
        if let error = error {
            BLELogger.error("Failed to add service: \(error)")
            return
        }
        
        BLELogger.log("Service added successfully")
        startAdvertising()
    }
    
    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        if let error = error {
            BLELogger.error("Failed to start advertising: \(error)")
        } else {
            BLELogger.log("Advertising started")
        }
    }
    
    func peripheralManager(_ peripheral: CBPeripheralManager,
                          central: CBCentral,
                          didSubscribeTo characteristic: CBCharacteristic) {
        BLELogger.log("Central subscribed: \(central.identifier)")
        
        if !subscribedCentrals.contains(where: { $0.identifier == central.identifier }) {
            subscribedCentrals.append(central)
        }
    }
    
    func peripheralManager(_ peripheral: CBPeripheralManager,
                          central: CBCentral,
                          didUnsubscribeFrom characteristic: CBCharacteristic) {
        BLELogger.log("Central unsubscribed: \(central.identifier)")
        subscribedCentrals.removeAll { $0.identifier == central.identifier }
    }
    
    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for request in requests {
            if request.characteristic.uuid == BLEConstants.messageCharacteristicUUID,
               let data = request.value {
                
                BLELogger.log("Received write from central: \(request.central.identifier)")
                
                // Create a virtual peer for the central
                let centralId = request.central.identifier
                
                peersLock.lock()
                var peer = peers[centralId]
                if peer == nil {
                    peer = BLEPeer(identifier: centralId)
                    peer?.state = .connected
                    peers[centralId] = peer
                }
                peersLock.unlock()
                
                if let peer = peer {
                    handleReceivedData(data, from: peer)
                }
                
                // Respond to write request
                peripheralManager.respond(to: request, withResult: .success)
            }
        }
    }
    
    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        if request.characteristic.uuid == BLEConstants.identityCharacteristicUUID {
            if let data = localUID.data(using: .utf8) {
                request.value = data
                peripheralManager.respond(to: request, withResult: .success)
            } else {
                peripheralManager.respond(to: request, withResult: .invalidAttributeValueLength)
            }
        }
    }
}
