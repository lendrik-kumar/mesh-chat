# AGENTS.md

## Repo Map (actual code)
- `blebla/`: Expo React Native app (single JS package, npm + `package-lock.json`).
- `nativeModule-ios/`: iOS bridge code consumed by Expo prebuild/Xcode.
- `daemon/`: C/C++ mesh core library plus standalone test executables.

## High-Value Entry Points
- App/provider wiring: `blebla/app/_layout.tsx`.
- JS bridge API: `blebla/services/MeshBridgeService.ts`.
- RN native method exports: `nativeModule-ios/MeshBridge/MeshBridge.m`.
- RN native implementation: `nativeModule-ios/MeshBridge/MeshBridge.swift`.
- Only ObjC file that imports C API: `nativeModule-ios/MeshCore/MeshCore.m`.
- Public C API contract: `daemon/include/meshcore.h`.

## Commands (verified)
- Install app deps: `cd blebla && npm install`
- Start dev server: `cd blebla && npm run start`
- Lint app: `cd blebla && npm run lint`
- Typecheck app: `cd blebla && npx tsc --noEmit`
- Configure/build C++ core + tests: `cmake -S daemon -B daemon/build && cmake --build daemon/build`
- Run C++ tests (direct executables, not `ctest`):
  - `./daemon/build/daemon_test`
  - `./daemon/build/loopback_test`
  - `./daemon/build/meshcore_c_test`
- Build one C++ test target: `cmake --build daemon/build --target meshcore_c_test`

## Critical Gotchas
- Do **not** run `cd blebla && npm run reset-project` unless intentional; it moves/deletes core app folders.
- `blebla/ios` and `blebla/android` are generated and gitignored. Regenerate native projects with `cd blebla && npx expo prebuild --platform ios` (or `npm run ios`).
- Expo Go (or any runtime without `NativeModules.MeshBridge`) uses mock mode in `MeshBridgeService`; BLE features from `useBLE` require the iOS native module.
- When adding/changing a RN native method, update all required layers together: TS API usage, `MeshBridge.m` export, `MeshBridge.swift` implementation, and `MeshCore`/`meshcore` if it crosses into ObjC/C.
- If you add new source files under `nativeModule-ios/` or `daemon/src/`, also update `blebla/plugins/withMeshBridge.js`; prebuild only wires files listed there.
- `connectToPeer`/`disconnectFromPeer` native APIs expect a peripheral UUID string (parsed via `UUID(uuidString:)`), not numeric `peerId`.

## Architecture Notes That Prevent Wrong Fixes
- There are two separate messaging paths:
  - Mesh daemon path: `ChatContext` -> `MeshBridgeService.sendMessage` -> `MeshCore` -> `meshcore` C API -> C++ daemon.
  - BLE P2P path: `useBLE`/`ble-chat.tsx` -> BLE methods on `MeshBridge` -> `BLEManager` (CoreBluetooth), bypassing daemon queue.
- Keep C headers out of bridging headers; `meshcore.h` should stay isolated to `nativeModule-ios/MeshCore/MeshCore.m`.
- Some prose docs are stale (for example, old C API naming). Prefer executable truth in code/config over README text for native contracts.

## Generated/Do-Not-Edit Outputs
- `daemon/build/`
- `blebla/dist/`
- `blebla/ios/`
- `blebla/android/`
