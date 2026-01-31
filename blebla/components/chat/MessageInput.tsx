import { AnimationConfig, BorderRadius } from "@/constants/colors";
import { useAppTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MessageInputProps {
  onSend: (text: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const { theme } = useAppTheme();
  const [message, setMessage] = useState("");
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      onSend(trimmedMessage);
      setMessage("");
    }
  };

  const handleSendPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      damping: 15,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  };

  const handleSendPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 12,
      stiffness: AnimationConfig.spring.stiffness,
      useNativeDriver: true,
    }).start();
  };

  const canSend = message.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.divider,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.surfaceVariant },
          ]}
        >
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Message"
            placeholderTextColor={theme.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
        </View>
        <Pressable
          onPress={handleSend}
          onPressIn={handleSendPressIn}
          onPressOut={handleSendPressOut}
          disabled={!canSend}
        >
          <Animated.View
            style={[
              styles.sendButton,
              {
                backgroundColor: canSend ? theme.primary : theme.surfaceVariant,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Ionicons
              name="send"
              size={22}
              color={canSend ? "#FFFFFF" : theme.textTertiary}
            />
          </Animated.View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputContainer: {
    flex: 1,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 10,
    maxHeight: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 100,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.button,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A73E8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
