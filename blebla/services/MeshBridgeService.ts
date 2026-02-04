/**
 * Mesh Bridge Service - React Native Integration
 *
 * This service provides a clean TypeScript interface to the native MeshBridge module.
 * It handles:
 * - Native module access
 * - Event subscription management
 * - Type-safe API
 *
 * Architecture Rules:
 * - This layer does NOT know about C++ or Swift internals
 * - It only communicates via the React Native bridge
 * - All daemon logic is opaque to this layer
 */

import { NativeModules, NativeEventEmitter, Platform } from "react-native";

// MARK: - Logging

const LOG_PREFIX = "[JS MeshBridge]";

// Log callbacks for UI display (e.g., toast notifications)
// Separate callbacks for mock daemon (purple toasts) and native daemon (green toasts)
type LogCallback = (message: string) => void;
let mockLogCallback: LogCallback | null = null;
let nativeLogCallback: LogCallback | null = null;

/**
 * Register a callback to receive MOCK daemon log messages (purple toasts)
 */
export function registerLogCallback(callback: LogCallback): () => void {
  mockLogCallback = callback;
  return () => {
    mockLogCallback = null;
  };
}

/**
 * Register a callback to receive NATIVE daemon log messages (green toasts)
 * These come from the real C++ daemon via iOS native bridge
 */
export function registerNativeLogCallback(callback: LogCallback): () => void {
  nativeLogCallback = callback;
  return () => {
    nativeLogCallback = null;
  };
}

const logger = {
  log: (message: string, ...args: unknown[]) => {
    const fullMessage = `${LOG_PREFIX} INFO: ${message}`;
    console.log(fullMessage, ...args);
    if (mockLogCallback) mockLogCallback(fullMessage);
  },
  error: (message: string, ...args: unknown[]) => {
    const fullMessage = `${LOG_PREFIX} ERROR: ${message}`;
    console.error(fullMessage, ...args);
    if (mockLogCallback) mockLogCallback(fullMessage);
  },
  warn: (message: string, ...args: unknown[]) => {
    const fullMessage = `${LOG_PREFIX} WARN: ${message}`;
    console.warn(fullMessage, ...args);
    if (mockLogCallback) mockLogCallback(fullMessage);
  },
};

// Helper to emit MOCK daemon logs to UI (purple toasts)
const emitDaemonLog = (message: string) => {
  console.log(message);
  if (mockLogCallback) mockLogCallback(message);
};

// Helper to emit NATIVE daemon logs to UI (green toasts)
const emitNativeDaemonLog = (message: string) => {
  console.log(message);
  if (nativeLogCallback) nativeLogCallback(message);
};
// MARK: - Types

export interface MeshMessage {
  fromUid: string;
  message: string;
  timestamp: number;
}

export interface MeshStatus {
  status: number;
  message: string;
  isRunning: boolean;
}

export interface MeshError {
  error: string;
}

export type MessageCallback = (message: MeshMessage) => void;
export type StatusCallback = (status: MeshStatus) => void;
export type ErrorCallback = (error: MeshError) => void;

interface MeshBridgeNativeModule {
  startDaemon(): Promise<{ success: boolean; message: string }>;
  stopDaemon(): Promise<{ success: boolean; message: string }>;
  sendMessage(
    toUid: string,
    message: string,
  ): Promise<{ success: boolean; message: string }>;
  isRunning(): Promise<boolean>;
  getVersion(): Promise<string>;
}

// MARK: - Native Module Access

const { MeshBridge: NativeMeshBridge } = NativeModules;

// Check if native module is available
const isNativeModuleAvailable = (): boolean => {
  if (!NativeMeshBridge) {
    logger.warn(
      "MeshBridge native module not available. Running in mock mode.",
    );
    return false;
  }
  return true;
};

// Create event emitter only if native module exists
let eventEmitter: NativeEventEmitter | null = null;

const getEventEmitter = (): NativeEventEmitter | null => {
  if (Platform.OS !== "ios") {
    logger.warn("MeshBridge is only available on iOS");
    return null;
  }

  if (!isNativeModuleAvailable()) {
    return null;
  }

  if (!eventEmitter) {
    eventEmitter = new NativeEventEmitter(NativeMeshBridge);
    logger.log("NativeEventEmitter created");
  }

  return eventEmitter;
};

// MARK: - Event Names

const Events = {
  onMessageReceived: "onMessageReceived",
  onStatusChanged: "onStatusChanged",
  onError: "onError",
} as const;

// MARK: - Subscription Management

interface Subscription {
  remove: () => void;
}

const subscriptions: Subscription[] = [];

// MARK: - Mock Implementation (for development/testing)

const MOCK_LOG_PREFIX = "[MOCK C++ Daemon]";

const mockDaemon = {
  isRunning: false,
  messageCallbacks: [] as MessageCallback[],

  async start(): Promise<{ success: boolean; message: string }> {
    emitDaemonLog(`${MOCK_LOG_PREFIX} daemon_start() called`);
    emitDaemonLog(`${MOCK_LOG_PREFIX} INFO: Worker thread started`);
    this.isRunning = true;
    emitDaemonLog(`${MOCK_LOG_PREFIX} INFO: Daemon started successfully`);
    return { success: true, message: "Mock daemon started" };
  },

  async stop(): Promise<{ success: boolean; message: string }> {
    emitDaemonLog(`${MOCK_LOG_PREFIX} daemon_stop() called`);
    emitDaemonLog(`${MOCK_LOG_PREFIX} INFO: Worker thread stopped`);
    this.isRunning = false;
    emitDaemonLog(`${MOCK_LOG_PREFIX} INFO: Daemon stopped successfully`);
    return { success: true, message: "Mock daemon stopped" };
  },

  async sendMessage(
    toUid: string,
    message: string,
  ): Promise<{ success: boolean; message: string }> {
    emitDaemonLog(
      `${MOCK_LOG_PREFIX} daemon_send_message() called: to=${toUid}`,
    );
    emitDaemonLog(`${MOCK_LOG_PREFIX} INFO: Message queued for: ${toUid}`);
    emitDaemonLog(`${MOCK_LOG_PREFIX} INFO: Mock response scheduled in 1s`);

    // Simulate async response after 1 second
    setTimeout(() => {
      const mockResponse: MeshMessage = {
        fromUid: toUid,
        message: `[MOCK REPLY] Echo: ${message}`,
        timestamp: Date.now(),
      };
      emitDaemonLog(
        `${MOCK_LOG_PREFIX} INFO: Delivering response from: ${toUid}`,
      );
      emitDaemonLog(`${MOCK_LOG_PREFIX} INFO: Invoking message callback`);
      this.messageCallbacks.forEach((cb) => cb(mockResponse));
    }, 1000);

    return { success: true, message: "Mock message sent" };
  },

  subscribeToMessages(callback: MessageCallback): Subscription {
    this.messageCallbacks.push(callback);
    return {
      remove: () => {
        const index = this.messageCallbacks.indexOf(callback);
        if (index > -1) {
          this.messageCallbacks.splice(index, 1);
        }
      },
    };
  },
};

// MARK: - Public API

/**
 * Start the mesh daemon
 * Must be called before sending/receiving messages
 */
export async function startDaemon(): Promise<{
  success: boolean;
  message: string;
}> {
  logger.log("startDaemon() called");

  if (!isNativeModuleAvailable()) {
    return mockDaemon.start();
  }

  try {
    emitNativeDaemonLog(`[NATIVE C++ Daemon] startDaemon() called`);
    const result = await (
      NativeMeshBridge as MeshBridgeNativeModule
    ).startDaemon();
    emitNativeDaemonLog(
      `[NATIVE C++ Daemon] INFO: Daemon started successfully`,
    );
    logger.log("Daemon started:", result);
    return result;
  } catch (error) {
    logger.error("Failed to start daemon:", error);
    throw error;
  }
}

/**
 * Stop the mesh daemon
 * Should be called when the app is terminating
 */
export async function stopDaemon(): Promise<{
  success: boolean;
  message: string;
}> {
  logger.log("stopDaemon() called");

  if (!isNativeModuleAvailable()) {
    return mockDaemon.stop();
  }

  try {
    emitNativeDaemonLog(`[NATIVE C++ Daemon] stopDaemon() called`);
    const result = await (
      NativeMeshBridge as MeshBridgeNativeModule
    ).stopDaemon();
    emitNativeDaemonLog(
      `[NATIVE C++ Daemon] INFO: Daemon stopped successfully`,
    );
    logger.log("Daemon stopped:", result);
    return result;
  } catch (error) {
    logger.error("Failed to stop daemon:", error);
    throw error;
  }
}

/**
 * Send a message to another user via the mesh network
 *
 * @param toUid - The recipient's unique identifier
 * @param message - The message content
 */
export async function sendMessage(
  toUid: string,
  message: string,
): Promise<{ success: boolean; message: string }> {
  logger.log(`sendMessage() called - toUid: ${toUid}, message: ${message}`);

  if (!toUid || !message) {
    throw new Error("toUid and message are required");
  }

  if (!isNativeModuleAvailable()) {
    return mockDaemon.sendMessage(toUid, message);
  }

  try {
    emitNativeDaemonLog(`[NATIVE C++ Daemon] sendMessage() to: ${toUid}`);
    const result = await (
      NativeMeshBridge as MeshBridgeNativeModule
    ).sendMessage(toUid, message);
    emitNativeDaemonLog(`[NATIVE C++ Daemon] INFO: Message sent successfully`);
    logger.log("Message sent:", result);
    return result;
  } catch (error) {
    logger.error("Failed to send message:", error);
    throw error;
  }
}

/**
 * Check if the daemon is currently running
 */
export async function isDaemonRunning(): Promise<boolean> {
  logger.log("isDaemonRunning() called");

  if (!isNativeModuleAvailable()) {
    return mockDaemon.isRunning;
  }

  try {
    const running = await (
      NativeMeshBridge as MeshBridgeNativeModule
    ).isRunning();
    logger.log("Daemon running:", running);
    return running;
  } catch (error) {
    logger.error("Failed to check daemon status:", error);
    throw error;
  }
}

/**
 * Get the daemon version string
 */
export async function getDaemonVersion(): Promise<string> {
  logger.log("getDaemonVersion() called");

  if (!isNativeModuleAvailable()) {
    return "1.0.0-mock";
  }

  try {
    const version = await (
      NativeMeshBridge as MeshBridgeNativeModule
    ).getVersion();
    logger.log("Daemon version:", version);
    return version;
  } catch (error) {
    logger.error("Failed to get daemon version:", error);
    throw error;
  }
}

/**
 * Subscribe to incoming messages
 *
 * @param callback - Function to call when a message is received
 * @returns Subscription object with remove() method
 */
export function subscribeToMessages(callback: MessageCallback): Subscription {
  logger.log("subscribeToMessages() called");

  if (!isNativeModuleAvailable()) {
    return mockDaemon.subscribeToMessages(callback);
  }

  const emitter = getEventEmitter();
  if (!emitter) {
    logger.warn("Event emitter not available, using mock");
    return mockDaemon.subscribeToMessages(callback);
  }

  const subscription = emitter.addListener(
    Events.onMessageReceived,
    (event: MeshMessage) => {
      emitNativeDaemonLog(
        `[NATIVE C++ Daemon] Message received from: ${event.fromUid}`,
      );
      logger.log("Message received event:", event);
      callback(event);
    },
  );

  subscriptions.push(subscription);
  return subscription;
}

/**
 * Subscribe to daemon status changes
 *
 * @param callback - Function to call when status changes
 * @returns Subscription object with remove() method
 */
export function subscribeToStatus(callback: StatusCallback): Subscription {
  logger.log("subscribeToStatus() called");

  const emitter = getEventEmitter();
  if (!emitter) {
    logger.warn("Event emitter not available for status");
    return { remove: () => {} };
  }

  const subscription = emitter.addListener(
    Events.onStatusChanged,
    (event: MeshStatus) => {
      logger.log("Status changed event:", event);
      callback(event);
    },
  );

  subscriptions.push(subscription);
  return subscription;
}

/**
 * Subscribe to daemon errors
 *
 * @param callback - Function to call when an error occurs
 * @returns Subscription object with remove() method
 */
export function subscribeToErrors(callback: ErrorCallback): Subscription {
  logger.log("subscribeToErrors() called");

  const emitter = getEventEmitter();
  if (!emitter) {
    logger.warn("Event emitter not available for errors");
    return { remove: () => {} };
  }

  const subscription = emitter.addListener(
    Events.onError,
    (event: MeshError) => {
      logger.error("Error event:", event);
      callback(event);
    },
  );

  subscriptions.push(subscription);
  return subscription;
}

/**
 * Remove all event subscriptions
 * Should be called when cleaning up
 */
export function removeAllSubscriptions(): void {
  logger.log("removeAllSubscriptions() called");
  subscriptions.forEach((sub) => sub.remove());
  subscriptions.length = 0;
}

// MARK: - Default Export

const MeshBridgeService = {
  startDaemon,
  stopDaemon,
  sendMessage,
  isDaemonRunning,
  getDaemonVersion,
  subscribeToMessages,
  subscribeToStatus,
  subscribeToErrors,
  removeAllSubscriptions,
};

export default MeshBridgeService;
