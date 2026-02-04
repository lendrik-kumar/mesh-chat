/**
 * Expo Config Plugin for MeshBridge Native Module
 *
 * This plugin configures the iOS build to include the MeshBridge native module
 * and the C++ daemon when running `expo prebuild`.
 *
 * Usage: Add to app.json plugins array:
 * {
 *   "plugins": ["./plugins/withMeshBridge"]
 * }
 */

const {
  withXcodeProject,
  withDangerousMod,
  IOSConfig,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Add source files to the Xcode project
 */
function withMeshBridgeXcodeProject(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;

    // Paths to source files (relative to workspace root)
    const nativeModulePath = path.resolve(projectRoot, "../nativeModule-ios");
    const daemonPath = path.resolve(projectRoot, "../daemon");

    // Get the main group
    const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;

    // Add MeshBridge group (Swift/ObjC bridge files)
    const meshBridgeGroup = xcodeProject.addPbxGroup(
      [
        path.join(nativeModulePath, "MeshBridge/MeshBridge.swift"),
        path.join(nativeModulePath, "MeshBridge/MeshBridge.m"),
      ],
      "MeshBridge",
      path.join(nativeModulePath, "MeshBridge"),
    );

    // Add MeshCore group (ObjC wrapper for C daemon)
    const meshCoreGroup = xcodeProject.addPbxGroup(
      [
        path.join(nativeModulePath, "MeshCore/MeshCore.h"),
        path.join(nativeModulePath, "MeshCore/MeshCore.m"),
      ],
      "MeshCore",
      path.join(nativeModulePath, "MeshCore"),
    );

    // Add MeshBLE group (CoreBluetooth BLE layer)
    const meshBLEGroup = xcodeProject.addPbxGroup(
      [
        path.join(nativeModulePath, "MeshBLE/BLEConstants.swift"),
        path.join(nativeModulePath, "MeshBLE/BLEManager.swift"),
      ],
      "MeshBLE",
      path.join(nativeModulePath, "MeshBLE"),
    );

    // Add Daemon group (C++ daemon source)
    const daemonGroup = xcodeProject.addPbxGroup(
      [
        path.join(daemonPath, "include/meshcore.h"),
        path.join(daemonPath, "src/daemon.cpp"),
        path.join(daemonPath, "src/daemon.h"),
        path.join(daemonPath, "src/meshcore_impl.cpp"),
        path.join(daemonPath, "src/meshcore_bridge.c"),
        path.join(daemonPath, "src/loopback_transport.cpp"),
      ],
      "Daemon",
      daemonPath,
    );

    // Add groups to main group
    xcodeProject.addToPbxGroup(meshBridgeGroup.uuid, mainGroup);
    xcodeProject.addToPbxGroup(meshCoreGroup.uuid, mainGroup);
    xcodeProject.addToPbxGroup(meshBLEGroup.uuid, mainGroup);
    xcodeProject.addToPbxGroup(daemonGroup.uuid, mainGroup);

    // Add source files to build phase
    const targetUuid = xcodeProject.getFirstTarget().uuid;

    // Add MeshBridge Swift file
    xcodeProject.addSourceFile(
      path.join(nativeModulePath, "MeshBridge/MeshBridge.swift"),
      { target: targetUuid },
      meshBridgeGroup.uuid,
    );

    // Add MeshBridge Objective-C file
    xcodeProject.addSourceFile(
      path.join(nativeModulePath, "MeshBridge/MeshBridge.m"),
      { target: targetUuid },
      meshBridgeGroup.uuid,
    );

    // Add MeshCore Objective-C file (wrapper for C daemon)
    xcodeProject.addSourceFile(
      path.join(nativeModulePath, "MeshCore/MeshCore.m"),
      { target: targetUuid },
      meshCoreGroup.uuid,
    );

    // Add BLE Swift files
    xcodeProject.addSourceFile(
      path.join(nativeModulePath, "MeshBLE/BLEConstants.swift"),
      { target: targetUuid },
      meshBLEGroup.uuid,
    );
    xcodeProject.addSourceFile(
      path.join(nativeModulePath, "MeshBLE/BLEManager.swift"),
      { target: targetUuid },
      meshBLEGroup.uuid,
    );

    // Add C++ daemon file
    xcodeProject.addSourceFile(
      path.join(daemonPath, "src/daemon.cpp"),
      { target: targetUuid },
      daemonGroup.uuid,
    );

    // Add meshcore implementation files
    xcodeProject.addSourceFile(
      path.join(daemonPath, "src/meshcore_impl.cpp"),
      { target: targetUuid },
      daemonGroup.uuid,
    );
    xcodeProject.addSourceFile(
      path.join(daemonPath, "src/meshcore_bridge.c"),
      { target: targetUuid },
      daemonGroup.uuid,
    );
    xcodeProject.addSourceFile(
      path.join(daemonPath, "src/loopback_transport.cpp"),
      { target: targetUuid },
      daemonGroup.uuid,
    );

    return config;
  });
}

/**
 * Configure build settings for the native module
 */
function withMeshBridgeBuildSettings(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosPath = path.join(projectRoot, "ios");

      // Create bridging header reference
      const bridgingHeaderContent = `//
//  Bridging header for MeshBridge
//  This header bridges Swift code with Objective-C and C++ daemon
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Import the MeshCore Objective-C wrapper
#import "../../../nativeModule-ios/MeshCore/MeshCore.h"

// Import the original bridging header
#import "../../../nativeModule-ios/MeshBridge-Bridging-Header.h"
`;

      const bridgingHeaderPath = path.join(
        iosPath,
        config.modRequest.projectName,
        "MeshBridge-Bridging-Header.h",
      );

      // Ensure directory exists
      const dir = path.dirname(bridgingHeaderPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write bridging header
      fs.writeFileSync(bridgingHeaderPath, bridgingHeaderContent);

      return config;
    },
  ]);
}

/**
 * Main plugin function
 */
function withMeshBridge(config) {
  config = withMeshBridgeXcodeProject(config);
  config = withMeshBridgeBuildSettings(config);
  return config;
}

module.exports = withMeshBridge;
