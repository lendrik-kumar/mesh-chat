/**
 * BLEConstants - UUIDs and Configuration for Mesh BLE
 *
 * Defines the GATT service and characteristics used for mesh messaging.
 * Both devices act as Central AND Peripheral simultaneously.
 */

import CoreBluetooth

// MARK: - Service & Characteristic UUIDs

enum BLEConstants {
    
    /// Main mesh service UUID - devices scan for this
    static let meshServiceUUID = CBUUID(string: "12345678-1234-5678-1234-56789ABCDEF0")
    
    /// Characteristic for sending/receiving messages
    /// - Supports: Write, Notify
    static let messageCharacteristicUUID = CBUUID(string: "12345678-1234-5678-1234-56789ABCDEF1")
    
    /// Characteristic for device identity (UID)
    /// - Supports: Read
    static let identityCharacteristicUUID = CBUUID(string: "12345678-1234-5678-1234-56789ABCDEF2")
    
    // MARK: - Configuration
    
    /// Maximum message size (BLE MTU typically 512 - overhead)
    static let maxMessageSize = 500
    
    /// Scan timeout in seconds
    static let scanTimeout: TimeInterval = 30.0
    
    /// Connection timeout in seconds
    static let connectionTimeout: TimeInterval = 10.0
    
    /// Time between scan restarts
    static let scanRestartInterval: TimeInterval = 5.0
    
    /// Local name prefix for advertising
    static let localNamePrefix = "MeshChat-"
}

// MARK: - Peer State

@objc enum BLEPeerState: Int {
    case discovered = 0
    case connecting = 1
    case connected = 2
    case disconnected = 3
    case failed = 4
    
    var stringValue: String {
        switch self {
        case .discovered: return "discovered"
        case .connecting: return "connecting"
        case .connected: return "connected"
        case .disconnected: return "disconnected"
        case .failed: return "failed"
        }
    }
}

// MARK: - BLE Peer Info

@objc class BLEPeer: NSObject {
    @objc let identifier: UUID          // CoreBluetooth peripheral identifier
    @objc var uid: String = ""           // Mesh UID (read from identity characteristic)
    @objc var peripheral: CBPeripheral?
    @objc var state: BLEPeerState = .discovered
    @objc var rssi: Int = 0
    @objc var lastSeen: Date = Date()
    var messageCharacteristic: CBCharacteristic?
    
    @objc init(identifier: UUID, peripheral: CBPeripheral? = nil) {
        self.identifier = identifier
        self.peripheral = peripheral
        super.init()
    }
    
    @objc var displayName: String {
        return uid.isEmpty ? "Unknown-\(identifier.uuidString.prefix(8))" : uid
    }
    
    @objc var identifierString: String {
        return identifier.uuidString
    }
}

// MARK: - Message Packet

/**
 * Simple message format for BLE transmission
 * Format: [1 byte type][variable payload]
 */
enum BLEMessageType: UInt8 {
    case identity = 0x01      // Payload: UTF-8 UID string
    case textMessage = 0x02   // Payload: UTF-8 message string
    case ack = 0x03           // Payload: 4-byte message ID
}

struct BLEPacket {
    let type: BLEMessageType
    let payload: Data
    
    init(type: BLEMessageType, payload: Data) {
        self.type = type
        self.payload = payload
    }
    
    init?(data: Data) {
        guard data.count >= 1 else { return nil }
        guard let type = BLEMessageType(rawValue: data[0]) else { return nil }
        self.type = type
        self.payload = data.count > 1 ? data.subdata(in: 1..<data.count) : Data()
    }
    
    func toData() -> Data {
        var result = Data([type.rawValue])
        result.append(payload)
        return result
    }
    
    // Convenience initializers
    static func identity(uid: String) -> BLEPacket {
        return BLEPacket(type: .identity, payload: uid.data(using: .utf8) ?? Data())
    }
    
    static func textMessage(_ message: String) -> BLEPacket {
        return BLEPacket(type: .textMessage, payload: message.data(using: .utf8) ?? Data())
    }
}
