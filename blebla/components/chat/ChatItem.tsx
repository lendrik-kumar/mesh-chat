import { AnimationConfig, BorderRadius } from "@/constants/colors";
import { useAppTheme } from "@/context/ThemeContext";
import { Chat, formatTimestamp, shortenUid } from "@/data/mock-data";
import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

interface ChatItemProps {
  chat: Chat;
  onPress: () => void;
}

export function ChatItem({ chat, onPress }: ChatItemProps) {
  const { theme } = useAppTheme();
  const { contact, lastMessage } = chat;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      damping: AnimationConfig.spring.damping,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: AnimationConfig.spring.damping,
      stiffness: AnimationConfig.spring.stiffness,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.surface,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Avatar */}
        <View
          style={[styles.avatar, { backgroundColor: theme.primaryContainer }]}
        >
          <Text style={[styles.avatarText, { color: theme.primary }]}>
            {contact.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[styles.name, { color: theme.text }]}
              numberOfLines={1}
            >
              {contact.name}
            </Text>
            {lastMessage && (
              <Text style={[styles.timestamp, { color: theme.textTertiary }]}>
                {formatTimestamp(lastMessage.timestamp)}
              </Text>
            )}
          </View>
          <View style={styles.subHeader}>
            <View
              style={[
                styles.uidBadge,
                { backgroundColor: theme.surfaceVariant },
              ]}
            >
              <Text style={[styles.uid, { color: theme.primary }]}>
                {shortenUid(contact.uid)}
              </Text>
            </View>
          </View>
          {lastMessage && (
            <Text
              style={[styles.preview, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {lastMessage.senderId === "self" ? "You: " : ""}
              {lastMessage.text}
            </Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.avatar,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
  },
  subHeader: {
    marginBottom: 6,
    flexDirection: "row",
  },
  uidBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.chip,
  },
  uid: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "500",
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
  },
});
