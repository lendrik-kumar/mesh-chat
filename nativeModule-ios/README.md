# iOS Native Module - Refactored Architecture

This module provides a clean, layered architecture for bridging React Native with the C core.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    JavaScript Layer                                  │
│                 (MeshBridgeService.ts)                              │
│         - Type-safe TypeScript API                                  │
│         - Event subscriptions                                        │
│         - Mock fallback for Expo Go                                 │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ NativeModules
┌─────────────────────────────────▼───────────────────────────────────┐
│              React Native Bridge Layer                               │
│                (MeshBridge/MeshBridge.swift)                        │
│         - RCTEventEmitter subclass                                   │
│         - MeshCoreDelegate implementation                           │
│         - Promise-based API for JavaScript                          │
│         - NO direct C function calls                                │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ MeshCoreDelegate + API
┌─────────────────────────────────▼───────────────────────────────────┐
│              Native Wrapper Layer                                    │
│               (MeshCore/MeshCore.h/.m)                              │
│         - Thread-safe Objective-C singleton                         │
│         - GCD-based async operations                                │
│         - Delegate pattern for callbacks                            │
│         - Memory boundary management                                │
│         - ONLY layer that imports C header                          │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ C ABI (internal only)
┌─────────────────────────────────▼───────────────────────────────────┐
│                    C Core Layer                                      │
│                (daemon/include/daemon.h)                            │
│                (daemon/src/daemon.cpp)                              │
│         - Pure C/C++ logic                                          │
│         - No iOS APIs                                               │
│         - Compiled as static library                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
nativeModule-ios/
├── MeshBridge-Bridging-Header.h   # Clean bridging header (NO C imports)
├── MeshCore/                       # Native Wrapper Layer
│   ├── MeshCore.h                 # Public Objective-C interface
│   └── MeshCore.m                 # Implementation (imports daemon.h)
├── MeshBridge/                     # React Native Bridge Layer
│   ├── MeshBridge.swift           # Swift implementation
│   └── MeshBridge.m               # ObjC exports for RN
└── README.md
```

## Layer Responsibilities

### 1. C Core Layer (`daemon/`)

**Responsibility:** Pure business logic, no platform dependencies

- Self-contained C/C++ code
- `extern "C"` interface for stability
- Thread-safe implementation
- No iOS/macOS/React Native dependencies
- Can be unit tested independently

### 2. Native Wrapper Layer (`MeshCore/`)

**Responsibility:** Bridge C to Objective-C safely

- **ONLY** layer that imports `daemon.h`
- Converts C types ↔ Objective-C types
- Thread safety via GCD serial queue
- Memory ownership at boundary
- Delegate pattern for async callbacks
- iOS-friendly naming (no "daemon")

**Key Features:**

```objc
// Thread-safe singleton
MeshCore *core = [MeshCore sharedInstance];

// Delegate for callbacks (always main thread)
core.delegate = self;

// Async API with completion handlers
[core startWithCompletion:^(BOOL success, NSError *error) { ... }];
[core sendMessage:@"Hello" to:@"user123" completion:^(BOOL success, MeshCoreError error) { ... }];
```

### 3. React Native Bridge Layer (`MeshBridge/`)

**Responsibility:** Bridge MeshCore to JavaScript

- `RCTEventEmitter` subclass
- Implements `MeshCoreDelegate`
- Promise-based API for JS
- Event emission to JS
- **NO** direct C function calls

### 4. JavaScript Layer (`blebla/services/`)

**Responsibility:** TypeScript interface for app

- Type-safe API
- Event subscriptions
- Mock implementation for Expo Go
- No knowledge of native internals

## Threading Model

```
┌──────────────────────────────────────────────────────────────┐
│ Main Thread (UI)                                              │
│  • React Native bridge methods                               │
│  • MeshCoreDelegate callbacks                                │
│  • Event emission to JS                                      │
└──────────────────────────────────────────────────────────────┘
              │                              ▲
              │ dispatch_async               │ dispatch_async
              ▼                              │ (main queue)
┌──────────────────────────────────────────────────────────────┐
│ MeshCore Work Queue (serial)                                  │
│  • C function calls                                          │
│  • Thread-safe operations                                    │
└──────────────────────────────────────────────────────────────┘
              │                              ▲
              │ C callback                   │
              ▼                              │
┌──────────────────────────────────────────────────────────────┐
│ C Core Background Thread                                      │
│  • Worker thread for async operations                        │
│  • Invokes registered callbacks                              │
└──────────────────────────────────────────────────────────────┘
```

**Guarantees:**

- All delegate methods called on main thread
- No blocking operations on main thread
- C callbacks safely routed to main thread

## iOS Compliance

### ✅ App Store Safe

- No "daemon" processes
- No background services outside iOS APIs
- Runs entirely in app sandbox
- Clean initialization/shutdown lifecycle

### ✅ Memory Safe

- ARC for Objective-C objects
- C strings copied immediately at boundary
- No C pointers escape MeshCore layer
- Weak references for callbacks

### ✅ Thread Safe

- Serial queue for all C operations
- Main thread dispatch for callbacks
- No race conditions

## Bridging Header Rules

The bridging header (`MeshBridge-Bridging-Header.h`) contains **ONLY**:

```objc
// React Native headers
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTLog.h>

// Native wrapper (NOT the C header)
#import "MeshCore/MeshCore.h"
```

**Never include:**

- `daemon.h` or any C core headers
- Business logic headers
- Internal implementation headers

## Xcode Integration

### Build Phases

1. **Compile C++ Core:**
   - Add `daemon/src/daemon.cpp` to target
   - Set C++ Language Dialect to C++17

2. **Compile Objective-C Wrapper:**
   - Add `MeshCore/MeshCore.m` to target

3. **Compile Swift Bridge:**
   - Add `MeshBridge/MeshBridge.swift` to target

### Build Settings

```
// Bridging Header
SWIFT_OBJC_BRIDGING_HEADER = $(SRCROOT)/../nativeModule-ios/MeshBridge-Bridging-Header.h

// Header Search Paths (for MeshCore.m to find daemon.h)
HEADER_SEARCH_PATHS = $(SRCROOT)/../daemon/include
```

## Migration Notes

### Changes from Previous Architecture

| Before                           | After                        |
| -------------------------------- | ---------------------------- |
| `@_silgen_name` C calls in Swift | MeshCore Objective-C wrapper |
| C header in bridging header      | MeshCore.h only              |
| Global C callback functions      | Delegate pattern             |
| Direct thread management         | GCD serial queue             |
| "daemon" terminology             | "MeshCore" (iOS-friendly)    |

### Why These Changes?

1. **No `@_silgen_name`:** Fragile, undocumented, can break with Swift updates
2. **No C in bridging header:** Clean separation, easier maintenance
3. **Delegate pattern:** Standard iOS, testable, type-safe
4. **GCD:** iOS-native threading, well-understood
5. **MeshCore naming:** Avoids App Store review concerns
