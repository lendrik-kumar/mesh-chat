import { useAppTheme } from "@/context/ThemeContext";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface QRCodePlaceholderProps {
  data: string;
  size?: number;
}

export function QRCodePlaceholder({
  data,
  size = 200,
}: QRCodePlaceholderProps) {
  const { theme, isDark } = useAppTheme();

  // Generate a simple pattern based on data hash
  const generatePattern = () => {
    const rows = [];
    const gridSize = 15;

    // Simple hash function for consistent pattern
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data.charCodeAt(i);
      hash = hash & hash;
    }

    for (let row = 0; row < gridSize; row++) {
      const cols = [];
      for (let col = 0; col < gridSize; col++) {
        // Always fill corners for QR finder patterns
        const isCorner =
          (row < 3 && col < 3) ||
          (row < 3 && col >= gridSize - 3) ||
          (row >= gridSize - 3 && col < 3);

        // Generate pseudo-random fill based on position and hash
        const fillValue = (hash + row * gridSize + col) % 7;
        const isFilled = isCorner || fillValue < 3;

        cols.push(
          <View
            key={`${row}-${col}`}
            style={[
              styles.cell,
              {
                backgroundColor: isFilled
                  ? isDark
                    ? "#FFFFFF"
                    : "#000000"
                  : "transparent",
              },
            ]}
          />,
        );
      }
      rows.push(
        <View key={row} style={styles.row}>
          {cols}
        </View>,
      );
    }
    return rows;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.qrContainer,
          {
            backgroundColor: isDark ? "#1F1F1F" : "#FFFFFF",
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.pattern}>{generatePattern()}</View>
      </View>
      <View style={styles.overlay}>
        <View style={[styles.logo, { backgroundColor: theme.primary }]}>
          <Text style={styles.logoText}>M</Text>
        </View>
      </View>
    </View>
  );
}

interface CameraScannerPlaceholderProps {
  size?: number;
}

export function CameraScannerPlaceholder({
  size = 280,
}: CameraScannerPlaceholderProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.scannerContainer, { width: size, height: size }]}>
      {/* Camera background simulation */}
      <View style={[styles.cameraPreview, { backgroundColor: "#1A1A1A" }]}>
        {/* Scan frame corners */}
        <View
          style={[
            styles.corner,
            styles.topLeft,
            { borderColor: theme.primary },
          ]}
        />
        <View
          style={[
            styles.corner,
            styles.topRight,
            { borderColor: theme.primary },
          ]}
        />
        <View
          style={[
            styles.corner,
            styles.bottomLeft,
            { borderColor: theme.primary },
          ]}
        />
        <View
          style={[
            styles.corner,
            styles.bottomRight,
            { borderColor: theme.primary },
          ]}
        />

        {/* Scan line animation placeholder */}
        <View style={[styles.scanLine, { backgroundColor: theme.primary }]} />

        {/* Center frame */}
        <View
          style={[styles.scanFrame, { borderColor: "rgba(255,255,255,0.3)" }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  qrContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  pattern: {
    flexDirection: "column",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 10,
    height: 10,
    margin: 0.5,
  },
  overlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  scannerContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cameraPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  topLeft: {
    top: 20,
    left: 20,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 20,
    right: 20,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 20,
    left: 20,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 20,
    right: 20,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    width: "60%",
    height: 2,
    opacity: 0.8,
  },
  scanFrame: {
    position: "absolute",
    width: "70%",
    height: "70%",
    borderWidth: 1,
    borderRadius: 4,
  },
});
