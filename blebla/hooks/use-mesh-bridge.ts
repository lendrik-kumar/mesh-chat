/**
 * useMeshBridge Hook
 *
 * A React hook that provides easy access to the MeshBridge service.
 * Handles lifecycle management (start/stop) and event subscriptions.
 *
 * Usage:
 * ```tsx
 * const { isRunning, sendMessage, messages } = useMeshBridge();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import MeshBridgeService, {
  MeshMessage,
  MeshStatus,
  MeshError,
} from "@/services/MeshBridgeService";

const LOG_PREFIX = "[useMeshBridge]";

interface UseMeshBridgeOptions {
  /** Automatically start the daemon when the hook mounts */
  autoStart?: boolean;
  /** Automatically stop the daemon when the hook unmounts */
  autoStop?: boolean;
  /** Callback for received messages */
  onMessage?: (message: MeshMessage) => void;
  /** Callback for status changes */
  onStatusChange?: (status: MeshStatus) => void;
  /** Callback for errors */
  onError?: (error: MeshError) => void;
}

interface UseMeshBridgeResult {
  /** Whether the daemon is currently running */
  isRunning: boolean;
  /** Whether the daemon is starting/stopping */
  isLoading: boolean;
  /** Last error that occurred */
  error: string | null;
  /** List of received messages (most recent first) */
  messages: MeshMessage[];
  /** Daemon version string */
  version: string | null;
  /** Start the daemon */
  start: () => Promise<void>;
  /** Stop the daemon */
  stop: () => Promise<void>;
  /** Send a message */
  sendMessage: (toUid: string, message: string) => Promise<void>;
  /** Clear all received messages */
  clearMessages: () => void;
}

export function useMeshBridge(
  options: UseMeshBridgeOptions = {},
): UseMeshBridgeResult {
  const {
    autoStart = false,
    autoStop = false,
    onMessage,
    onStatusChange,
    onError,
  } = options;

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MeshMessage[]>([]);
  const [version, setVersion] = useState<string | null>(null);

  // Refs for callbacks (to avoid stale closures)
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Start the daemon
  const start = useCallback(async () => {
    console.log(`${LOG_PREFIX} Starting daemon...`);
    setIsLoading(true);
    setError(null);

    try {
      await MeshBridgeService.startDaemon();
      const running = await MeshBridgeService.isDaemonRunning();
      setIsRunning(running);

      const ver = await MeshBridgeService.getDaemonVersion();
      setVersion(ver);

      console.log(`${LOG_PREFIX} Daemon started, version: ${ver}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start daemon";
      console.error(`${LOG_PREFIX} Start error:`, errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop the daemon
  const stop = useCallback(async () => {
    console.log(`${LOG_PREFIX} Stopping daemon...`);
    setIsLoading(true);
    setError(null);

    try {
      await MeshBridgeService.stopDaemon();
      setIsRunning(false);
      console.log(`${LOG_PREFIX} Daemon stopped`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to stop daemon";
      console.error(`${LOG_PREFIX} Stop error:`, errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (toUid: string, message: string) => {
    console.log(`${LOG_PREFIX} Sending message to ${toUid}: ${message}`);
    setError(null);

    try {
      await MeshBridgeService.sendMessage(toUid, message);
      console.log(`${LOG_PREFIX} Message sent successfully`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      console.error(`${LOG_PREFIX} Send error:`, errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    console.log(`${LOG_PREFIX} Clearing messages`);
    setMessages([]);
  }, []);

  // Setup event subscriptions
  useEffect(() => {
    console.log(`${LOG_PREFIX} Setting up event subscriptions`);

    // Subscribe to messages
    const messageSub = MeshBridgeService.subscribeToMessages(
      (msg: MeshMessage) => {
        console.log(`${LOG_PREFIX} Message received:`, msg);
        setMessages((prev: MeshMessage[]) => [msg, ...prev]);
        onMessageRef.current?.(msg);
      },
    );

    // Subscribe to status changes
    const statusSub = MeshBridgeService.subscribeToStatus(
      (status: MeshStatus) => {
        console.log(`${LOG_PREFIX} Status changed:`, status);
        setIsRunning(status.isRunning);
        onStatusChangeRef.current?.(status);
      },
    );

    // Subscribe to errors
    const errorSub = MeshBridgeService.subscribeToErrors((err: MeshError) => {
      console.error(`${LOG_PREFIX} Error received:`, err);
      setError(err.error);
      onErrorRef.current?.(err);
    });

    // Cleanup
    return () => {
      console.log(`${LOG_PREFIX} Cleaning up subscriptions`);
      messageSub.remove();
      statusSub.remove();
      errorSub.remove();
    };
  }, []);

  // Auto-start
  useEffect(() => {
    if (autoStart) {
      console.log(`${LOG_PREFIX} Auto-starting daemon`);
      start();
    }
  }, [autoStart, start]);

  // Auto-stop on unmount
  useEffect(() => {
    return () => {
      if (autoStop && isRunning) {
        console.log(`${LOG_PREFIX} Auto-stopping daemon on unmount`);
        MeshBridgeService.stopDaemon().catch((err: unknown) => {
          console.error(`${LOG_PREFIX} Auto-stop error:`, err);
        });
      }
    };
  }, [autoStop, isRunning]);

  return {
    isRunning,
    isLoading,
    error,
    messages,
    version,
    start,
    stop,
    sendMessage,
    clearMessages,
  };
}

export default useMeshBridge;
