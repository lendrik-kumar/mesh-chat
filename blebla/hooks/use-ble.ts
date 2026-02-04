/**
 * useBLE Hook
 *
 * A React hook that provides BLE (Bluetooth Low Energy) peer-to-peer messaging
 * functionality. This is for direct device-to-device communication without mesh.
 *
 * Usage:
 * ```tsx
 * const {
 *   isRunning,
 *   localUID,
 *   discoveredPeers,
 *   connectedPeers,
 *   startBLE,
 *   stopBLE,
 *   sendMessage,
 *   connectToPeer,
 *   messages
 * } = useBLE({ autoStart: true });
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const LOG_PREFIX = "[useBLE]";

// =============================================================================
// Types
// =============================================================================

export interface BLEPeer {
  /** Unique numeric ID for the peer (hash of identifier) */
  peerId: number;
  /** User ID advertised by the peer */
  uid: string;
  /** Whether currently connected */
  connected: boolean;
  /** Peripheral identifier (UUID string) */
  identifier?: string;
}

export interface BLEMessage {
  /** Sender's UID */
  fromUid: string;
  /** Sender's peer ID */
  fromPeerId: number;
  /** Message content */
  message: string;
  /** Timestamp in milliseconds */
  timestamp: number;
}

export interface BLEStatus {
  /** Status code */
  status: number;
  /** Human-readable status message */
  message: string;
  /** Whether BLE is running */
  isRunning: boolean;
}

interface UseBLEOptions {
  /** Automatically start BLE when the hook mounts */
  autoStart?: boolean;
  /** User ID to advertise (auto-generated if not provided) */
  userUID?: string;
  /** Callback for received messages */
  onMessage?: (message: BLEMessage) => void;
  /** Callback when a peer is discovered */
  onPeerDiscovered?: (peer: BLEPeer) => void;
  /** Callback when a peer's state changes */
  onPeerUpdated?: (peer: BLEPeer) => void;
  /** Callback for errors */
  onError?: (error: string) => void;
}

interface UseBLEResult {
  /** Whether BLE is currently running */
  isRunning: boolean;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Local UID being advertised */
  localUID: string | null;
  /** Last error that occurred */
  error: string | null;
  /** All discovered peers */
  discoveredPeers: BLEPeer[];
  /** Currently connected peers */
  connectedPeers: BLEPeer[];
  /** Received messages (most recent first) */
  messages: BLEMessage[];
  /** Start BLE scanning and advertising */
  startBLE: (uid?: string) => Promise<void>;
  /** Stop BLE */
  stopBLE: () => Promise<void>;
  /** Send a message to a peer by UID */
  sendMessage: (toUid: string, message: string) => Promise<void>;
  /** Connect to a discovered peer */
  connectToPeer: (peerIdentifier: string) => Promise<void>;
  /** Disconnect from a peer */
  disconnectFromPeer: (peerIdentifier: string) => Promise<void>;
  /** Refresh the peer lists */
  refreshPeers: () => Promise<void>;
  /** Clear all messages */
  clearMessages: () => void;
}

// =============================================================================
// Native Module Access
// =============================================================================

const { MeshBridge: NativeMeshBridge } = NativeModules;

interface BLENativeModule {
  startBLE(
    uid: string,
  ): Promise<{ success: boolean; message: string; uid: string }>;
  stopBLE(): Promise<{ success: boolean; message: string }>;
  isBLERunning(): Promise<boolean>;
  getDiscoveredPeers(): Promise<BLEPeer[]>;
  getConnectedPeers(): Promise<BLEPeer[]>;
  connectToPeer(
    peerIdentifier: string,
  ): Promise<{ success: boolean; message: string }>;
  disconnectFromPeer(
    peerIdentifier: string,
  ): Promise<{ success: boolean; message: string }>;
  sendBLEMessage(
    toUid: string,
    message: string,
  ): Promise<{ success: boolean; message: string }>;
  getLocalUID(): Promise<string>;
}

const isNativeModuleAvailable = (): boolean => {
  if (Platform.OS !== "ios") {
    console.warn(`${LOG_PREFIX} BLE is only available on iOS`);
    return false;
  }
  if (!NativeMeshBridge) {
    console.warn(`${LOG_PREFIX} MeshBridge native module not available`);
    return false;
  }
  return true;
};

// Event names from native
const Events = {
  onMessageReceived: "onMessageReceived",
  onPeerUpdated: "onPeerUpdated",
  onPeerDiscovered: "onPeerDiscovered",
  onStatusChanged: "onStatusChanged",
  onBLEStateChanged: "onBLEStateChanged",
  onError: "onError",
} as const;

// =============================================================================
// Hook Implementation
// =============================================================================

export function useBLE(options: UseBLEOptions = {}): UseBLEResult {
  const {
    autoStart = false,
    userUID,
    onMessage,
    onPeerDiscovered,
    onPeerUpdated,
    onError,
  } = options;

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localUID, setLocalUID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discoveredPeers, setDiscoveredPeers] = useState<BLEPeer[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<BLEPeer[]>([]);
  const [messages, setMessages] = useState<BLEMessage[]>([]);

  // Refs for callbacks
  const onMessageRef = useRef(onMessage);
  const onPeerDiscoveredRef = useRef(onPeerDiscovered);
  const onPeerUpdatedRef = useRef(onPeerUpdated);
  const onErrorRef = useRef(onError);

  // Update refs
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  useEffect(() => {
    onPeerDiscoveredRef.current = onPeerDiscovered;
  }, [onPeerDiscovered]);
  useEffect(() => {
    onPeerUpdatedRef.current = onPeerUpdated;
  }, [onPeerUpdated]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Start BLE
  const startBLE = useCallback(
    async (uid?: string) => {
      console.log(`${LOG_PREFIX} Starting BLE...`);
      setIsLoading(true);
      setError(null);

      if (!isNativeModuleAvailable()) {
        setError("BLE not available on this platform");
        setIsLoading(false);
        return;
      }

      try {
        const uidToUse = uid || userUID || "";
        const result = await (NativeMeshBridge as BLENativeModule).startBLE(
          uidToUse,
        );

        if (result.success) {
          setIsRunning(true);
          setLocalUID(result.uid);
          console.log(`${LOG_PREFIX} BLE started with UID: ${result.uid}`);
        } else {
          setError(result.message);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to start BLE";
        console.error(`${LOG_PREFIX} Start error:`, errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [userUID],
  );

  // Stop BLE
  const stopBLE = useCallback(async () => {
    console.log(`${LOG_PREFIX} Stopping BLE...`);
    setIsLoading(true);
    setError(null);

    if (!isNativeModuleAvailable()) {
      setIsLoading(false);
      return;
    }

    try {
      await (NativeMeshBridge as BLENativeModule).stopBLE();
      setIsRunning(false);
      setDiscoveredPeers([]);
      setConnectedPeers([]);
      console.log(`${LOG_PREFIX} BLE stopped`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to stop BLE";
      console.error(`${LOG_PREFIX} Stop error:`, errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (toUid: string, message: string) => {
    console.log(`${LOG_PREFIX} Sending message to ${toUid}: ${message}`);
    setError(null);

    if (!isNativeModuleAvailable()) {
      setError("BLE not available");
      throw new Error("BLE not available");
    }

    try {
      const result = await (NativeMeshBridge as BLENativeModule).sendBLEMessage(
        toUid,
        message,
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      console.log(`${LOG_PREFIX} Message sent successfully`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      console.error(`${LOG_PREFIX} Send error:`, errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Connect to peer
  const connectToPeer = useCallback(async (peerIdentifier: string) => {
    console.log(`${LOG_PREFIX} Connecting to peer: ${peerIdentifier}`);
    setError(null);

    if (!isNativeModuleAvailable()) {
      setError("BLE not available");
      return;
    }

    try {
      await (NativeMeshBridge as BLENativeModule).connectToPeer(peerIdentifier);
      console.log(`${LOG_PREFIX} Connection initiated`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect";
      console.error(`${LOG_PREFIX} Connect error:`, errorMessage);
      setError(errorMessage);
    }
  }, []);

  // Disconnect from peer
  const disconnectFromPeer = useCallback(async (peerIdentifier: string) => {
    console.log(`${LOG_PREFIX} Disconnecting from peer: ${peerIdentifier}`);
    setError(null);

    if (!isNativeModuleAvailable()) {
      return;
    }

    try {
      await (NativeMeshBridge as BLENativeModule).disconnectFromPeer(
        peerIdentifier,
      );
      console.log(`${LOG_PREFIX} Disconnection initiated`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to disconnect";
      console.error(`${LOG_PREFIX} Disconnect error:`, errorMessage);
      setError(errorMessage);
    }
  }, []);

  // Refresh peer lists
  const refreshPeers = useCallback(async () => {
    if (!isNativeModuleAvailable()) return;

    try {
      const [discovered, connected] = await Promise.all([
        (NativeMeshBridge as BLENativeModule).getDiscoveredPeers(),
        (NativeMeshBridge as BLENativeModule).getConnectedPeers(),
      ]);

      setDiscoveredPeers(discovered);
      setConnectedPeers(connected);
      console.log(
        `${LOG_PREFIX} Refreshed peers: ${discovered.length} discovered, ${connected.length} connected`,
      );
    } catch (err) {
      console.error(`${LOG_PREFIX} Refresh error:`, err);
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    console.log(`${LOG_PREFIX} Clearing messages`);
    setMessages([]);
  }, []);

  // Setup event subscriptions
  useEffect(() => {
    if (!isNativeModuleAvailable()) return;

    console.log(`${LOG_PREFIX} Setting up event subscriptions`);

    const emitter = new NativeEventEmitter(NativeMeshBridge);

    // Message received
    const messageSub = emitter.addListener(
      Events.onMessageReceived,
      (event: BLEMessage) => {
        console.log(`${LOG_PREFIX} Message received:`, event);
        setMessages((prev) => [event, ...prev]);
        onMessageRef.current?.(event);
      },
    );

    // Peer updated (connection state changed)
    const peerUpdateSub = emitter.addListener(
      Events.onPeerUpdated,
      (event: BLEPeer) => {
        console.log(`${LOG_PREFIX} Peer updated:`, event);

        // Update discovered peers
        setDiscoveredPeers((prev) => {
          const index = prev.findIndex((p) => p.peerId === event.peerId);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = event;
            return updated;
          }
          return [...prev, event];
        });

        // Update connected peers
        setConnectedPeers((prev) => {
          if (event.connected) {
            if (!prev.find((p) => p.peerId === event.peerId)) {
              return [...prev, event];
            }
            return prev.map((p) => (p.peerId === event.peerId ? event : p));
          } else {
            return prev.filter((p) => p.peerId !== event.peerId);
          }
        });

        onPeerUpdatedRef.current?.(event);
      },
    );

    // Peer discovered
    const peerDiscoverSub = emitter.addListener(
      Events.onPeerDiscovered,
      (event: BLEPeer) => {
        console.log(`${LOG_PREFIX} Peer discovered:`, event);

        setDiscoveredPeers((prev) => {
          if (!prev.find((p) => p.peerId === event.peerId)) {
            return [...prev, event];
          }
          return prev;
        });

        onPeerDiscoveredRef.current?.(event);
      },
    );

    // Status changed
    const statusSub = emitter.addListener(
      Events.onStatusChanged,
      (event: BLEStatus) => {
        console.log(`${LOG_PREFIX} Status changed:`, event);
        setIsRunning(event.isRunning);
      },
    );

    // BLE state changed
    const bleSub = emitter.addListener(
      Events.onBLEStateChanged,
      (event: BLEStatus) => {
        console.log(`${LOG_PREFIX} BLE state changed:`, event);
        if (!event.isRunning) {
          setIsRunning(false);
        }
      },
    );

    // Error
    const errorSub = emitter.addListener(
      Events.onError,
      (event: { error: string }) => {
        console.error(`${LOG_PREFIX} Error:`, event);
        setError(event.error);
        onErrorRef.current?.(event.error);
      },
    );

    // Cleanup
    return () => {
      console.log(`${LOG_PREFIX} Cleaning up subscriptions`);
      messageSub.remove();
      peerUpdateSub.remove();
      peerDiscoverSub.remove();
      statusSub.remove();
      bleSub.remove();
      errorSub.remove();
    };
  }, []);

  // Auto-start
  useEffect(() => {
    if (autoStart) {
      console.log(`${LOG_PREFIX} Auto-starting BLE`);
      startBLE();
    }
  }, [autoStart, startBLE]);

  // Periodic peer refresh while running
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(refreshPeers, 5000);
    return () => clearInterval(interval);
  }, [isRunning, refreshPeers]);

  return {
    isRunning,
    isLoading,
    localUID,
    error,
    discoveredPeers,
    connectedPeers,
    messages,
    startBLE,
    stopBLE,
    sendMessage,
    connectToPeer,
    disconnectFromPeer,
    refreshPeers,
    clearMessages,
  };
}

export default useBLE;
