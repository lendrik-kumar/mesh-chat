import { AnimationConfig, BorderRadius } from "@/constants/colors";
import { useAppTheme } from "@/context/ThemeContext";
import { Message, formatMessageTime } from "@/data/mock-data";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface ChatBubbleProps {
  message: Message;
  isSent: boolean;
  showTimestamp?: boolean;
}

export function ChatBubble({
  message,
  isSent,
  showTimestamp = true,
}: ChatBubbleProps) {
  const { theme } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Smooth spring entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: AnimationConfig.spring.damping,
        stiffness: AnimationConfig.spring.stiffness,
        mass: AnimationConfig.spring.mass,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: AnimationConfig.timing.fast,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        damping: AnimationConfig.spring.damping,
        stiffness: AnimationConfig.spring.stiffness,
        mass: AnimationConfig.spring.mass,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const bubbleStyle = isSent
    ? {
        backgroundColor: theme.sentBubble,
        alignSelf: "flex-end" as const,
        borderBottomRightRadius: 6,
        borderTopLeftRadius: BorderRadius.bubble,
        borderTopRightRadius: BorderRadius.bubble,
        borderBottomLeftRadius: BorderRadius.bubble,
      }
    : {
        backgroundColor: theme.receivedBubble,
        alignSelf: "flex-start" as const,
        borderBottomLeftRadius: 6,
        borderTopLeftRadius: BorderRadius.bubble,
        borderTopRightRadius: BorderRadius.bubble,
        borderBottomRightRadius: BorderRadius.bubble,
      };

  const textColor = isSent ? theme.sentBubbleText : theme.receivedBubbleText;

  const getStatusIcon = () => {
    switch (message.status) {
      case "sent":
        return "checkmark";
      case "delivered":
        return "checkmark-done";
      case "read":
        return "checkmark-done";
      default:
        return "time";
    }
  };

  const statusColor =
    message.status === "read" ? theme.googleGreen : theme.sentBubbleText;

  return (
    <Animated.View
      style={[
        styles.container,
        isSent ? styles.sentContainer : styles.receivedContainer,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
        },
      ]}
    >
      <View style={[styles.bubble, bubbleStyle]}>
        <Text style={[styles.messageText, { color: textColor }]}>
          {message.text}
        </Text>
        <View style={styles.metaContainer}>
          {showTimestamp && (
            <Text
              style={[
                styles.timestamp,
                {
                  color: isSent ? "rgba(255,255,255,0.75)" : theme.textTertiary,
                },
              ]}
            >
              {formatMessageTime(message.timestamp)}
            </Text>
          )}
          {isSent && (
            <Ionicons
              name={getStatusIcon()}
              size={14}
              color={statusColor}
              style={styles.statusIcon}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 3,
  },
  sentContainer: {
    alignItems: "flex-end",
  },
  receivedContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  statusIcon: {
    marginLeft: 4,
  },
});
