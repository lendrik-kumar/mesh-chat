/**
 * Toast Context - Display daemon logs and notifications in UI
 *
 * Provides a toast notification system to visualize the
 * communication pipeline between JS and the daemon.
 */

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// MARK: - Types

// daemon = mock JS daemon (purple)
// native = real C++ daemon via native bridge (green)
export type ToastType = "info" | "success" | "error" | "daemon" | "native";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  showDaemonLog: (message: string) => void;
  showNativeDaemonLog: (message: string) => void;
  clearToasts: () => void;
}

// MARK: - Context

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// MARK: - Toast Item Component

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useState(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 3 seconds
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss(toast.id);
      });
    }, 3000);

    return () => clearTimeout(timeout);
  });

  const getBackgroundColor = () => {
    switch (toast.type) {
      case "success":
        return "#10B981";
      case "error":
        return "#EF4444";
      case "daemon":
        return "#8B5CF6"; // Purple for mock daemon
      case "native":
        return "#059669"; // Emerald green for REAL native C++ daemon
      default:
        return "#3B82F6";
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "daemon":
        return "⚙"; // Gear for mock
      case "native":
        return "🔗"; // Link for native bridge
      default:
        return "ℹ";
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: getBackgroundColor(),
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.toastIcon}>{getIcon()}</Text>
      <Text style={styles.toastText} numberOfLines={2}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

// MARK: - Toast Container Component

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.container, { top: insets.top + 10 }]}
      pointerEvents="box-none"
    >
      {toasts.slice(-5).map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

// MARK: - Provider

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const newToast: Toast = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp: Date.now(),
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const showDaemonLog = useCallback(
    (message: string) => {
      showToast(message, "daemon");
    },
    [showToast],
  );

  const showNativeDaemonLog = useCallback(
    (message: string) => {
      showToast(message, "native");
    },
    [showToast],
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        showDaemonLog,
        showNativeDaemonLog,
        clearToasts,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// MARK: - Hook

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// MARK: - Styles

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: width - 32,
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  toastIcon: {
    fontSize: 16,
    marginRight: 10,
    color: "#FFFFFF",
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});

export default ToastProvider;
