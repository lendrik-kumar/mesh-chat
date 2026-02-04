# Mesh Chat - iOS Native Bridge Architecture

A complete communication pipeline between React Native and a mock C++ daemon for mesh networking.

## Project Structure

```
mesh_chat/
├── blebla/                    # React Native UI (Expo)
│   ├── app/                   # App screens and navigation
│   ├── components/            # Reusable UI components
│   ├── context/               # React Context providers
│   │   └── ChatContext.tsx    # Chat state with MeshBridge integration
│   ├── hooks/                 # Custom React hooks
│   │   └── use-mesh-bridge.ts # Hook for MeshBridge
│   ├── services/              # Service layer
│   │   └── MeshBridgeService.ts # TypeScript wrapper for native module
│   └── plugins/               # Expo config plugins
│       └── withMeshBridge.js  # Xcode project configuration
│
├── daemon/                    # C++ Daemon
│   ├── include/
│   │   └── daemon.h           # Public C API (contract)
│   ├── src/
│   │   └── daemon.cpp         # Mock implementation
│   ├── CMakeLists.txt         # Build configuration
│   └── README.md              # Daemon documentation
│
└── nativeModule-ios/          # iOS Native Bridge
    ├── MeshBridge.swift       # Main native module
    ├── MeshBridge.m           # Objective-C exports
    ├── MeshBridge-Bridging-Header.h
    └── README.md              # Module documentation
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native (TypeScript)                    │
│                                                                  │
│  ┌──────────────────┐    ┌─────────────────────┐                │
│  │   ChatContext    │◄───│  MeshBridgeService  │                │
│  │  (State + Logic) │    │   (NativeModules)   │                │
│  └──────────────────┘    └──────────┬──────────┘                │
│                                     │                            │
└─────────────────────────────────────┼────────────────────────────┘
                                      │ JS ↔ Native Bridge
┌─────────────────────────────────────┼────────────────────────────┐
│                     iOS Native (Swift)                           │
│                                     │                            │
│  ┌──────────────────────────────────▼──────────────────────────┐ │
│  │                    MeshBridge.swift                          │ │
│  │              (RCTEventEmitter subclass)                      │ │
│  │                                                              │ │
│  │  • Translate JS calls → C calls                              │ │
│  │  • Translate C callbacks → JS events                         │ │
│  │  • Manage daemon lifecycle                                   │ │
│  └──────────────────────────────────┬──────────────────────────┘ │
│                                     │                            │
└─────────────────────────────────────┼────────────────────────────┘
                                      │ Swift ↔ C (extern "C")
┌─────────────────────────────────────┼────────────────────────────┐
│                     C++ Daemon                                   │
│                                     │                            │
│  ┌──────────────────────────────────▼──────────────────────────┐ │
│  │                     daemon.cpp                               │ │
│  │                                                              │ │
│  │  • daemon_start() / daemon_stop()                            │ │
│  │  • daemon_send_message(to_uid, message)                      │ │
│  │  • daemon_register_message_callback(cb)                      │ │
│  │  • Background thread for async responses                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Sending a Message

```
1. User taps "Send" in React Native UI
         ↓
2. ChatContext.sendMessage(chatId, text)
         ↓
3. MeshBridgeService.sendMessage(toUid, message)
         ↓
4. NativeModules.MeshBridge.sendMessage()
         ↓
5. MeshBridge.swift: sendMessage(_:message:resolve:reject:)
         ↓
6. c_daemon_send_message(toUid, message)
         ↓
7. daemon.cpp: daemon_send_message() - logs & queues response
         ↓
8. Promise resolves back up the chain
```

### Receiving a Message

```
1. daemon.cpp: Worker thread delivers mock response
         ↓
2. daemon.cpp: Invokes registered callback
         ↓
3. MeshBridge.swift: messageCallback (C function)
         ↓
4. MeshBridge.swift: handleIncomingMessage() → sendEvent()
         ↓
5. MeshBridgeService.ts: NativeEventEmitter listener
         ↓
6. ChatContext.tsx: handleIncomingMessage()
         ↓
7. React state update → UI re-render
```

## Key Files

### React Native Layer

**[ChatContext.tsx](blebla/context/ChatContext.tsx)**

- Manages chat state
- Integrates with MeshBridge on mount
- Handles incoming messages and updates state

**[MeshBridgeService.ts](blebla/services/MeshBridgeService.ts)**

- TypeScript wrapper for the native module
- Provides type-safe API
- Includes mock fallback for development

**[use-mesh-bridge.ts](blebla/hooks/use-mesh-bridge.ts)**

- React hook for MeshBridge
- Manages subscriptions and cleanup
- Provides simple API for components

### iOS Native Layer

**[MeshBridge.swift](nativeModule-ios/MeshBridge.swift)**

- Subclass of RCTEventEmitter
- Exports methods to React Native
- Registers C callbacks and routes to JS events

**[MeshBridge.m](nativeModule-ios/MeshBridge.m)**

- Objective-C macro declarations
- Exports Swift methods to React Native

### C++ Daemon Layer

**[daemon.h](daemon/include/daemon.h)**

- Public C API contract
- Only primitive types and function pointers
- Thread-safe interface

**[daemon.cpp](daemon/src/daemon.cpp)**

- Mock implementation
- Simulates async message delivery
- Comprehensive logging

## Building for iOS

### Prerequisites

1. Xcode 15+
2. Node.js 18+
3. CocoaPods

### Development (Expo Go - Mock Only)

```bash
cd blebla
npm install
npx expo start --ios
```

Note: With Expo Go, the native module is not available. The MeshBridgeService automatically falls back to mock mode.

### Production (Native Build)

```bash
cd blebla
npx expo prebuild --platform ios
cd ios
pod install
open blebla.xcworkspace
```

Then in Xcode:

1. Add the `nativeModule-ios/` files to the project
2. Add the `daemon/` files to the project
3. Configure the bridging header
4. Build and run

## Logging

All layers log with distinctive prefixes:

```
[JS MeshBridge]    - React Native service layer
[useMeshBridge]    - React hook
[ChatContext]      - Chat state management
[Swift Bridge]     - iOS native module
[C++ Daemon]       - C++ daemon layer
```

Example full round-trip log:

```
[ChatContext] sendMessage called - chatId: chat_1, text: Hello
[JS MeshBridge] sendMessage() called - toUid: s4r4h7, message: Hello
[Swift Bridge] sendMessage() called from JS - toUid: s4r4h7, message: Hello
[C++ Daemon] daemon_send_message() called: to_uid=s4r4h7 message=Hello
[C++ Daemon] Message queued for sending to: s4r4h7
[C++ Daemon] Mock response scheduled for delivery in 1 second
[Swift Bridge] Message sent successfully
[JS MeshBridge] Message sent: { success: true, message: "Message sent" }
... 1 second later ...
[C++ Daemon] Delivering mock response from: s4r4h7
[C++ Daemon] Invoking message callback from: s4r4h7
[Swift Bridge] C callback received: messageCallback
[Swift Bridge] Message from: s4r4h7, content: [MOCK REPLY] Echo: Hello, timestamp: 1706745600000
[Swift Bridge] Emitting onMessageReceived event to JS
[JS MeshBridge] Message received event: { fromUid: "s4r4h7", message: "[MOCK REPLY] Echo: Hello", timestamp: 1706745600000 }
[ChatContext] Message event received: { fromUid: "s4r4h7", ... }
[ChatContext] Adding message to chat: chat_1
```

## Architecture Rules

1. **React Native MUST NOT know C++ exists**
   - Only communicates via NativeModules

2. **C++ MUST NOT know React Native exists**
   - Only exposes C functions and callbacks

3. **Swift is the ONLY translator**
   - Bridges JS calls to C calls
   - Bridges C callbacks to JS events

4. **No shared state across layers**
   - Each layer maintains its own state
   - Communication is explicit via function calls/events

5. **No logic duplication**
   - Business logic lives in one place
   - Other layers only translate/transport

## Future Enhancements

This mock infrastructure will be replaced with:

- [ ] Real BLE/WiFi-Direct mesh networking
- [ ] End-to-end encryption (libsodium)
- [ ] Local message persistence (SQLite)
- [ ] Peer discovery and routing
- [ ] Offline message queue with retry

## Testing

### Unit Tests

```bash
cd blebla
npm test
```

### Integration Tests

1. Run on iOS simulator
2. Open chat with mock contact
3. Send a message
4. Verify mock reply appears after ~1 second
5. Check logs for full round-trip

## License

MIT
