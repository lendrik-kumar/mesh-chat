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
 * Copy files from source to destination
 */
function copyFileSync(source, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(source, dest);
}

/**
 * Copy native module files to iOS project
 */
function withMeshBridgeCopyFiles(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const projectName = config.modRequest.projectName;
      const iosPath = path.join(projectRoot, "ios", projectName);

      // Source paths (relative to workspace root, which is parent of blebla)
      const nativeModulePath = path.resolve(projectRoot, "../nativeModule-ios");
      const daemonPath = path.resolve(projectRoot, "../daemon");

      // Destination paths inside iOS project
      const meshBridgeDest = path.join(iosPath, "MeshBridge");
      const meshCoreDest = path.join(iosPath, "MeshCore");
      const meshBLEDest = path.join(iosPath, "MeshBLE");
      const daemonDest = path.join(iosPath, "Daemon");

      console.log("[withMeshBridge] Copying native module files...");
      console.log("[withMeshBridge] Source:", nativeModulePath);
      console.log("[withMeshBridge] Destination:", iosPath);

      // Copy MeshBridge files
      copyFileSync(
        path.join(nativeModulePath, "MeshBridge/MeshBridge.swift"),
        path.join(meshBridgeDest, "MeshBridge.swift")
      );
      copyFileSync(
        path.join(nativeModulePath, "MeshBridge/MeshBridge.m"),
        path.join(meshBridgeDest, "MeshBridge.m")
      );

      // Copy MeshCore files
      copyFileSync(
        path.join(nativeModulePath, "MeshCore/MeshCore.h"),
        path.join(meshCoreDest, "MeshCore.h")
      );
      copyFileSync(
        path.join(nativeModulePath, "MeshCore/MeshCore.m"),
        path.join(meshCoreDest, "MeshCore.m")
      );

      // Copy MeshBLE files
      copyFileSync(
        path.join(nativeModulePath, "MeshBLE/BLEConstants.swift"),
        path.join(meshBLEDest, "BLEConstants.swift")
      );
      copyFileSync(
        path.join(nativeModulePath, "MeshBLE/BLEManager.swift"),
        path.join(meshBLEDest, "BLEManager.swift")
      );

      // Copy Daemon files
      copyFileSync(
        path.join(daemonPath, "include/meshcore.h"),
        path.join(daemonDest, "meshcore.h")
      );
      copyFileSync(
        path.join(daemonPath, "src/daemon.cpp"),
        path.join(daemonDest, "daemon.cpp")
      );
      copyFileSync(
        path.join(daemonPath, "src/daemon.h"),
        path.join(daemonDest, "daemon.h")
      );
      copyFileSync(
        path.join(daemonPath, "src/meshcore_impl.cpp"),
        path.join(daemonDest, "meshcore_impl.cpp")
      );
      copyFileSync(
        path.join(daemonPath, "src/meshcore_impl.h"),
        path.join(daemonDest, "meshcore_impl.h")
      );
      copyFileSync(
        path.join(daemonPath, "src/meshcore_bridge.c"),
        path.join(daemonDest, "meshcore_bridge.c")
      );
      copyFileSync(
        path.join(daemonPath, "src/loopback_transport.cpp"),
        path.join(daemonDest, "loopback_transport.cpp")
      );
      copyFileSync(
        path.join(daemonPath, "src/loopback_transport.h"),
        path.join(daemonDest, "loopback_transport.h")
      );
      copyFileSync(
        path.join(daemonPath, "src/transport.h"),
        path.join(daemonDest, "transport.h")
      );

      // Update bridging header
      const bridgingHeaderContent = `//
// Bridging header for MeshBridge
// This header bridges Swift code with Objective-C and C++ daemon
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Import the MeshCore Objective-C wrapper
#import "MeshCore/MeshCore.h"
`;

      const bridgingHeaderPath = path.join(iosPath, "blebla-Bridging-Header.h");
      fs.writeFileSync(bridgingHeaderPath, bridgingHeaderContent);
      
      console.log("[withMeshBridge] Files copied successfully");

      return config;
    },
  ]);
}

/**
 * Add source files to the Xcode project build phase
 */
function withMeshBridgeXcodeProject(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName;

    // Get the main target
    const targetUuid = xcodeProject.getFirstTarget().uuid;

    console.log("[withMeshBridge] Adding source files to Xcode project...");
    console.log("[withMeshBridge] Project name:", projectName);

    // Find the app's source group (same name as project)
    let appGroupUuid = null;
    const pbxGroupSection = xcodeProject.hash.project.objects['PBXGroup'];
    for (const key in pbxGroupSection) {
      const group = pbxGroupSection[key];
      if (group && group.name === projectName && group.path === projectName) {
        appGroupUuid = key;
        break;
      }
    }
    
    const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
    if (!appGroupUuid) {
      console.log("[withMeshBridge] Could not find app group, using main group");
      appGroupUuid = mainGroup;
    } else {
      console.log("[withMeshBridge] Found app group:", appGroupUuid);
    }

    // Helper to add source file directly to build phase without group path issues
    const addFileToBuild = (filePath) => {
      try {
        // Use the full path relative to ios/
        xcodeProject.addSourceFile(filePath, { target: targetUuid }, mainGroup);
        console.log(`[withMeshBridge] Added: ${filePath}`);
      } catch (e) {
        console.log(`[withMeshBridge] Warning: ${filePath} - ${e.message}`);
      }
    };

    // Add build settings to allow non-modular includes (needed for Swift + React Native)
    const buildConfigurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in buildConfigurations) {
      const buildConfig = buildConfigurations[key];
      if (typeof buildConfig === 'object' && buildConfig.buildSettings) {
        // Allow non-modular includes in framework modules
        buildConfig.buildSettings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES';
        // Disable Swift strict concurrency (to avoid warnings becoming errors)
        buildConfig.buildSettings['SWIFT_STRICT_CONCURRENCY'] = 'minimal';
      }
    }
    console.log("[withMeshBridge] Added build settings for Swift/React Native compatibility");

    // Add source files directly - paths are relative to the ios/ folder
    // MeshBridge files
    addFileToBuild(`${projectName}/MeshBridge/MeshBridge.swift`);
    addFileToBuild(`${projectName}/MeshBridge/MeshBridge.m`);

    // MeshCore files
    addFileToBuild(`${projectName}/MeshCore/MeshCore.m`);

    // MeshBLE files
    addFileToBuild(`${projectName}/MeshBLE/BLEConstants.swift`);
    addFileToBuild(`${projectName}/MeshBLE/BLEManager.swift`);

    // Daemon files (C++ files)
    addFileToBuild(`${projectName}/Daemon/daemon.cpp`);
    addFileToBuild(`${projectName}/Daemon/meshcore_impl.cpp`);
    addFileToBuild(`${projectName}/Daemon/meshcore_bridge.c`);
    addFileToBuild(`${projectName}/Daemon/loopback_transport.cpp`);

    console.log("[withMeshBridge] Xcode project updated");

    return config;
  });
}

/**
 * Main plugin function
 */
function withMeshBridge(config) {
  // First copy files, then update Xcode project
  config = withMeshBridgeCopyFiles(config);
  config = withMeshBridgeXcodeProject(config);
  return config;
}

module.exports = withMeshBridge;
