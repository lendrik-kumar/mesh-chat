# MeshCore Architecture & Integration Guide

## 📐 Current Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              React Native (JS)                              │
│                                   blebla/                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  services/MeshBridgeService.ts                                       │   │
│  │  - useMeshBridge() hook                                              │   │
│  │  - Event listeners                                                   │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │ Native Modules
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Swift Bridge Layer                                │
│                         nativeModule-ios/MeshBridge/                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  MeshBridge.swift                                                    │   │
│  │  - RCTEventEmitter subclass                                          │   │
│  │  - Implements MeshCoreDelegate                                       │   │
│  │  - Translates JS calls → ObjC calls                                  │   │
│  │  - Emits events: onMessageReceived, onStatusChanged, onPeerUpdated  │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  MeshBridge.m                                                        │   │
│  │  - RCT_EXTERN_MODULE / RCT_EXTERN_METHOD macros                     │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │ Objective-C method calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Objective-C Wrapper Layer                           │
│                          nativeModule-ios/MeshCore/                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  MeshCore.h / MeshCore.m                                             │   │
│  │  - Singleton pattern                                                 │   │
│  │  - Thread-safe via GCD serial queue                                  │   │
│  │  - Owns the meshcore* C pointer                                      │   │
│  │  - Registers C callbacks → dispatches to main thread                │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │ C function calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              C API Layer                                    │
│                             daemon/include/                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  meshcore.h (PUBLIC API)                                             │   │
│  │  - meshcore_create/destroy                                           │   │
│  │  - meshcore_set_callbacks                                            │   │
│  │  - meshcore_send_message / meshcore_send_message_to_uid             │   │
│  │  - meshcore_get_peer_count                                           │   │
│  │  - meshcore_simulate_* (test helpers)                                │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  meshcore_bridge.c                                                   │   │
│  │  - Pure C implementation of meshcore.h                               │   │
│  │  - Delegates to *_impl() functions                                   │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │ impl function calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          C++ Implementation Layer                           │
│                               daemon/src/                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  meshcore_impl.cpp                                                   │   │
│  │  - Manages MeshCore struct (contains Daemon*)                        │   │
│  │  - Adapts C callbacks → C++ std::function                           │   │
│  │  - Creates/owns Loopback_transport for testing                       │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  daemon.h / daemon.cpp                                               │   │
│  │  - Worker thread with event queue                                    │   │
│  │  - Event types: PeerConnected, PeerDisconnected, DataReceived, etc. │   │
│  │  - Peer management (add/remove/lookup)                               │   │
│  │  - DaemonCallbacks (std::function based)                             │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  transport.h (interface)                                             │   │
│  │  loopback_transport.h/.cpp (test implementation)                     │   │
│  │  - Abstract send() method                                            │   │
│  │  - Loopback echoes messages back as DataReceived events              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ What's Implemented

### Daemon Layer (C++)

| Component             | Status      | Description                                                |
| --------------------- | ----------- | ---------------------------------------------------------- |
| `Daemon` class        | ✅ Complete | Thread-safe worker with event queue                        |
| `DaemonCallbacks`     | ✅ Complete | std::function based callbacks                              |
| `Event` types         | ✅ Complete | PeerConnected, PeerDisconnected, DataReceived, SendMessage |
| Peer management       | ✅ Complete | add/remove/has_peer, get_peer_count                        |
| `Transport` interface | ✅ Complete | Abstract base class                                        |
| `Loopback_transport`  | ✅ Complete | Echo transport for testing                                 |

### C API Layer

| Function                           | Status      | Description                   |
| ---------------------------------- | ----------- | ----------------------------- |
| `meshcore_create()`                | ✅ Complete | Creates and starts the daemon |
| `meshcore_destroy()`               | ✅ Complete | Stops and cleans up           |
| `meshcore_is_running()`            | ✅ Complete | Checks running state          |
| `meshcore_get_version()`           | ✅ Complete | Returns "0.2.0"               |
| `meshcore_set_callbacks()`         | ✅ Complete | Registers event handlers      |
| `meshcore_send_message()`          | ✅ Complete | Send by peer ID               |
| `meshcore_send_message_to_uid()`   | ✅ Complete | Send by UID string            |
| `meshcore_get_peer_count()`        | ✅ Complete | Returns connected peers       |
| `meshcore_simulate_peer_connect()` | ✅ Complete | Test helper                   |
| `meshcore_simulate_message()`      | ✅ Complete | Test helper                   |

### iOS Layer

| Component            | Status      | Description                        |
| -------------------- | ----------- | ---------------------------------- |
| `MeshCore.h/.m`      | ✅ Complete | ObjC wrapper with delegate pattern |
| `MeshBridge.swift`   | ✅ Complete | RN bridge with event emitter       |
| `MeshBridge.m`       | ✅ Complete | RN method exports                  |
| Callback integration | ✅ Complete | C → ObjC → Swift → JS              |

---

## 🔴 What's NOT Implemented (Next Steps)

### Priority 1: Real Network Transport

```
Currently: Loopback_transport echoes messages back (testing only)
Needed:    BLE_transport for actual mesh networking
```

**Files to create:**

- `daemon/src/ble_transport.h`
- `daemon/src/ble_transport.cpp` (or `.mm` for iOS)

**Implementation:**

```cpp
class BLE_transport : public Transport {
public:
    void send(uint64_t peer_id, const std::string& data) override;

    // BLE specific
    void start_scanning();
    void stop_scanning();
    void connect_to_peer(const std::string& peripheral_id);
    void disconnect_from_peer(uint64_t peer_id);

private:
    // iOS: Use CoreBluetooth via ObjC++
    // Android: Use JNI to call Android BLE APIs
};
```

### Priority 2: Peer Discovery

```
Currently: Peers are manually simulated
Needed:    Automatic peer discovery via BLE advertising
```

**C API additions needed:**

```c
// Start advertising this device
void meshcore_start_advertising(meshcore* core, const char* local_uid);
void meshcore_stop_advertising(meshcore* core);

// Start scanning for peers
void meshcore_start_scanning(meshcore* core);
void meshcore_stop_scanning(meshcore* core);
```

### Priority 3: Message Persistence

```
Currently: Messages exist only in memory
Needed:    SQLite storage for message history
```

**Files to create:**

- `daemon/src/message_store.h`
- `daemon/src/message_store.cpp`

### Priority 4: Encryption

```
Currently: Messages are plaintext
Needed:    End-to-end encryption
```

**Implementation options:**

- libsodium for crypto primitives
- Signal Protocol for proper E2E

### Priority 5: Multi-hop Routing

```
Currently: Direct peer-to-peer only
Needed:    Mesh routing for indirect delivery
```

---

## 🏗️ Build Instructions

### Build the Daemon Library

```bash
cd daemon
mkdir build && cd build
cmake ..
make

# Run tests
./daemon_test
./meshcore_c_test
```

### Build iOS App

```bash
cd blebla/ios
pod install
open blebla.xcworkspace
# Build in Xcode
```

---

## 📋 Development Roadmap

### Phase 1: BLE Transport (2-3 weeks)

1. Create `BLE_transport` class with CoreBluetooth
2. Implement peripheral scanning
3. Implement GATT service for mesh protocol
4. Wire up to MeshCore via new C API functions

### Phase 2: Peer Discovery (1-2 weeks)

1. Add advertising support
2. Implement peer handshake protocol
3. Exchange UIDs over BLE
4. Update peer list on connect/disconnect

### Phase 3: Reliable Messaging (1-2 weeks)

1. Add message acknowledgments
2. Implement retry logic
3. Add message deduplication
4. Handle out-of-order delivery

### Phase 4: Persistence (1 week)

1. Add SQLite dependency
2. Create message schema
3. Persist sent/received messages
4. Load history on startup

### Phase 5: Security (2-3 weeks)

1. Generate device keypair
2. Implement key exchange
3. Encrypt messages
4. Verify message signatures

### Phase 6: Mesh Routing (3-4 weeks)

1. Design routing protocol
2. Implement hop counting
3. Handle message forwarding
4. Optimize for battery life

---

## 🧪 Testing

### Unit Tests (C++)

```bash
cd daemon/build
./daemon_test      # Tests Daemon class
./loopback_test    # Tests loopback transport
./meshcore_c_test  # Tests C API with callbacks
```

### Integration Tests (iOS Simulator)

1. Start app in simulator
2. Call `simulatePeerConnect(42, "test-peer")`
3. Call `simulateMessageReceived("Hello!", 42)`
4. Verify events appear in React Native

### Manual Testing (Real Devices)

- Requires 2+ iOS devices
- BLE transport implementation needed first

---

## 📁 File Reference

```
daemon/
├── include/
│   └── meshcore.h          # Public C API (the only header users import)
├── src/
│   ├── daemon.h/.cpp       # Core event loop
│   ├── transport.h         # Transport interface
│   ├── loopback_transport.h/.cpp  # Test transport
│   ├── meshcore_impl.h/.cpp       # C++ implementation
│   └── meshcore_bridge.c          # C ABI bridge
└── test/
    ├── daemon_test.cpp
    ├── loopback_test.cpp
    └── meshcore_c_test.c

nativeModule-ios/
├── MeshBridge/
│   ├── MeshBridge.swift    # RN bridge (calls MeshCore)
│   └── MeshBridge.m        # RN exports
└── MeshCore/
    ├── MeshCore.h          # ObjC interface
    └── MeshCore.m          # ObjC implementation (calls C API)

blebla/
├── services/
│   └── MeshBridgeService.ts  # JS service using native module
└── hooks/
    └── use-mesh-bridge.ts    # React hook for mesh
```
