import {
  AppBar,
  CameraScannerPlaceholder,
  QRCodePlaceholder,
} from "@/components/chat";
import { BorderRadius } from "@/constants/colors";
import { useChat } from "@/context/ChatContext";
import { useAppTheme } from "@/context/ThemeContext";
import { generateQRData } from "@/data/mock-data";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabType = "generate" | "scan";

export default function QRExchangeScreen() {
  const { theme } = useAppTheme();
  const { currentUser } = useChat();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("generate");
  const [copied, setCopied] = useState(false);

  const qrData = generateQRData(currentUser);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(qrData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Handle error silently
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <Pressable
      onPress={() => setActiveTab(tab)}
      style={[
        styles.tabButton,
        activeTab === tab && { backgroundColor: theme.primary },
      ]}
    >
      <Text
        style={[
          styles.tabText,
          { color: activeTab === tab ? "#FFFFFF" : theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppBar title="Add Contact" showBack onBackPress={handleBackPress} />

      {/* Tab Selector */}
      <View
        style={[styles.tabContainer, { backgroundColor: theme.surfaceVariant }]}
      >
        <TabButton tab="generate" label="My QR Code" />
        <TabButton tab="scan" label="Scan QR" />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {activeTab === "generate" ? (
          <View style={styles.generateContainer}>
            {/* QR Code Display */}
            <View
              style={[
                styles.qrCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.divider,
                },
              ]}
            >
              <QRCodePlaceholder data={qrData} size={240} />

              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>
                  {currentUser.name}
                </Text>
                <Text style={[styles.userUid, { color: theme.primary }]}>
                  #{currentUser.uid}
                </Text>
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructionContainer}>
              <Ionicons
                name="information-circle"
                size={24}
                color={theme.primary}
              />
              <Text
                style={[styles.instructionText, { color: theme.textSecondary }]}
              >
                Share this QR code with a contact to exchange public keys and
                start a secure chat
              </Text>
            </View>

            {/* Raw Data Section */}
            <View
              style={[
                styles.dataCard,
                {
                  backgroundColor: theme.surfaceVariant,
                  borderColor: theme.divider,
                },
              ]}
            >
              <View style={styles.dataHeader}>
                <Text style={[styles.dataTitle, { color: theme.text }]}>
                  QR Data
                </Text>
                <Pressable
                  onPress={handleCopy}
                  style={[
                    styles.copyButton,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy-outline"}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.copyText}>
                    {copied ? "Copied!" : "Copy"}
                  </Text>
                </Pressable>
              </View>
              <Text
                style={[styles.dataText, { color: theme.textSecondary }]}
                numberOfLines={3}
              >
                {qrData}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.scanContainer}>
            {/* Camera Scanner Placeholder */}
            <View style={styles.scannerWrapper}>
              <CameraScannerPlaceholder size={300} />
            </View>

            {/* Scan Instructions */}
            <View style={styles.scanInstructions}>
              <Text style={[styles.scanTitle, { color: theme.text }]}>
                Scan peer QR code
              </Text>
              <Text
                style={[styles.scanSubtitle, { color: theme.textSecondary }]}
              >
                Point your camera at a contact's QR code to exchange keys and
                establish a secure connection
              </Text>
            </View>

            {/* Permission Notice */}
            <View
              style={[
                styles.permissionCard,
                {
                  backgroundColor: theme.surfaceVariant,
                  borderColor: theme.divider,
                },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={28}
                color={theme.textSecondary}
              />
              <Text
                style={[styles.permissionText, { color: theme.textSecondary }]}
              >
                Camera permission required for scanning
              </Text>
            </View>

            {/* Placeholder Action Button */}
            <Pressable
              style={[styles.enableButton, { backgroundColor: theme.primary }]}
              onPress={() => {}}
            >
              <Ionicons name="camera" size={22} color="#FFFFFF" />
              <Text style={styles.enableButtonText}>Enable Camera</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    margin: 16,
    borderRadius: BorderRadius.lg,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  generateContainer: {
    alignItems: "center",
  },
  qrCard: {
    alignItems: "center",
    padding: 28,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    marginBottom: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    alignItems: "center",
    marginTop: 24,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  userUid: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "monospace",
  },
  instructionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  dataCard: {
    width: "100%",
    padding: 18,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  dataHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dataTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.chip,
    gap: 6,
  },
  copyText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  dataText: {
    fontSize: 13,
    fontFamily: "monospace",
    lineHeight: 20,
  },
  scanContainer: {
    alignItems: "center",
    paddingTop: 16,
  },
  scannerWrapper: {
    marginBottom: 24,
  },
  scanInstructions: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  scanTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  scanSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    marginBottom: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  permissionText: {
    marginLeft: 12,
    fontSize: 15,
  },
  enableButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
    gap: 10,
    shadowColor: "#1A73E8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  enableButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
