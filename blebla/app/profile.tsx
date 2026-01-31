import { AppBar, QRCodePlaceholder } from "@/components/chat";
import { BorderRadius } from "@/constants/colors";
import { useChat } from "@/context/ChatContext";
import { useAppTheme } from "@/context/ThemeContext";
import { generateQRData, maskPublicKey, shortenUid } from "@/data/mock-data";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme, themeMode, setThemeMode } = useAppTheme();
  const { currentUser } = useChat();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showFullKey, setShowFullKey] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleBackPress = () => {
    router.back();
  };

  const handleCopy = async (text: string, type: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      // Handle error silently
    }
  };

  const InfoRow = ({
    icon,
    label,
    value,
    copyable = false,
    expandable = false,
    expanded = false,
    onExpand,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    copyable?: boolean;
    expandable?: boolean;
    expanded?: boolean;
    onExpand?: () => void;
  }) => (
    <View
      style={[
        styles.infoRow,
        {
          backgroundColor: theme.surface,
          borderColor: theme.divider,
        },
      ]}
    >
      <View style={styles.infoLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.primaryContainer },
          ]}
        >
          <Ionicons name={icon} size={20} color={theme.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
            {label}
          </Text>
          <Text
            style={[
              styles.infoValue,
              { color: theme.text },
              label === "Public Key" && styles.monospace,
            ]}
            numberOfLines={expanded ? undefined : 1}
          >
            {value}
          </Text>
        </View>
      </View>
      <View style={styles.infoActions}>
        {expandable && (
          <Pressable onPress={onExpand} style={styles.actionButton}>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        )}
        {copyable && (
          <Pressable
            onPress={() => handleCopy(value, label)}
            style={styles.actionButton}
          >
            <Ionicons
              name={copied === label ? "checkmark" : "copy-outline"}
              size={18}
              color={copied === label ? theme.googleGreen : theme.textSecondary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );

  const ThemeOption = ({
    mode,
    label,
    icon,
  }: {
    mode: "light" | "dark" | "system";
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => (
    <Pressable
      onPress={() => setThemeMode(mode)}
      style={[
        styles.themeOption,
        {
          backgroundColor:
            themeMode === mode ? theme.primaryContainer : theme.surface,
          borderColor: themeMode === mode ? theme.primary : theme.divider,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={themeMode === mode ? theme.primary : theme.textSecondary}
      />
      <Text
        style={[
          styles.themeLabel,
          {
            color: themeMode === mode ? theme.primary : theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppBar title="Profile" showBack onBackPress={handleBackPress} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {currentUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.userName, { color: theme.text }]}>
            {currentUser.name}
          </Text>
          <Text style={[styles.userUid, { color: theme.primary }]}>
            {shortenUid(currentUser.uid)}
          </Text>
        </View>

        {/* Identity Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Identity
          </Text>

          <InfoRow
            icon="person-outline"
            label="Display Name"
            value={currentUser.name}
            copyable
          />

          <InfoRow
            icon="finger-print-outline"
            label="User ID"
            value={currentUser.uid}
            copyable
          />

          <InfoRow
            icon="key-outline"
            label="Public Key"
            value={
              showFullKey
                ? currentUser.publicKey
                : maskPublicKey(currentUser.publicKey)
            }
            copyable
            expandable
            expanded={showFullKey}
            onExpand={() => setShowFullKey(!showFullKey)}
          />
        </View>

        {/* QR Code Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Share Identity
          </Text>

          <Pressable
            onPress={() => setShowQR(!showQR)}
            style={[
              styles.qrToggle,
              {
                backgroundColor: theme.surface,
                borderColor: theme.divider,
              },
            ]}
          >
            <View style={styles.qrToggleContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primaryContainer },
                ]}
              >
                <Ionicons name="qr-code" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.qrToggleText, { color: theme.text }]}>
                {showQR ? "Hide my QR code" : "Show my QR code"}
              </Text>
            </View>
            <Ionicons
              name={showQR ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>

          {showQR && (
            <View
              style={[
                styles.qrContainer,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.divider,
                },
              ]}
            >
              <QRCodePlaceholder
                data={generateQRData(currentUser)}
                size={200}
              />
              <Text style={[styles.qrHint, { color: theme.textSecondary }]}>
                Others can scan this to add you as a contact
              </Text>
            </View>
          )}
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Appearance
          </Text>

          <View style={styles.themeOptions}>
            <ThemeOption mode="light" label="Light" icon="sunny-outline" />
            <ThemeOption mode="dark" label="Dark" icon="moon-outline" />
            <ThemeOption
              mode="system"
              label="System"
              icon="phone-portrait-outline"
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            About
          </Text>

          <View
            style={[
              styles.aboutCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.divider,
              },
            ]}
          >
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>
                App Version
              </Text>
              <Text style={[styles.aboutValue, { color: theme.text }]}>
                1.0.0 (Build 1)
              </Text>
            </View>
            <View
              style={[styles.divider, { backgroundColor: theme.divider }]}
            />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>
                Protocol
              </Text>
              <Text style={[styles.aboutValue, { color: theme.text }]}>
                Mesh v0.1
              </Text>
            </View>
            <View
              style={[styles.divider, { backgroundColor: theme.divider }]}
            />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>
                Encryption
              </Text>
              <Text style={[styles.aboutValue, { color: theme.text }]}>
                X25519 + ChaCha20
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>
            Built with ❤️ by GDG
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.avatar,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#1A73E8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "700",
  },
  userName: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 4,
  },
  userUid: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "monospace",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 3,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  monospace: {
    fontFamily: "monospace",
    fontSize: 13,
  },
  infoActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
  },
  qrToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  qrToggleContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  qrToggleText: {
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 12,
  },
  qrContainer: {
    alignItems: "center",
    padding: 28,
    marginTop: 8,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  qrHint: {
    fontSize: 13,
    marginTop: 18,
    textAlign: "center",
    lineHeight: 18,
  },
  themeOptions: {
    flexDirection: "row",
    gap: 10,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  aboutCard: {
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  aboutLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
  },
});
