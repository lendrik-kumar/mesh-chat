/**
 * Bridging Header for MeshBridge Native Module
 *
 * ARCHITECTURE RULES:
 * - This header must ONLY contain React Native and system imports
 * - NO C/C++ headers (daemon.h, etc.)
 * - NO business logic headers
 * - The MeshCore.h wrapper is imported here as it's pure Objective-C
 *
 * The C core is abstracted behind MeshCore, which handles all
 * C-to-Objective-C bridging internally.
 */

#ifndef MeshBridge_Bridging_Header_h
#define MeshBridge_Bridging_Header_h

// =============================================================================
// React Native Headers
// =============================================================================

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTLog.h>

// =============================================================================
// Native Wrapper Layer (Objective-C interface to C core)
// =============================================================================

// MeshCore provides a clean Objective-C API to the underlying C core.
// The C header (meshcore.h) is ONLY imported inside MeshCore.m, not here.
#import "MeshCore/MeshCore.h"

#endif /* MeshBridge_Bridging_Header_h */
