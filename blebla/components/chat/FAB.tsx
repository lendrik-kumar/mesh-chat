import { AnimationConfig, BorderRadius } from "@/constants/colors";
import { useAppTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FAB({ onPress, icon = "qr-code" }: FABProps) {
  const { theme } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        damping: AnimationConfig.spring.damping,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 1,
        damping: AnimationConfig.spring.damping,
        stiffness: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 12,
        stiffness: AnimationConfig.spring.stiffness,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        damping: AnimationConfig.spring.damping,
        stiffness: AnimationConfig.spring.stiffness,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "15deg"],
  });

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
            backgroundColor: theme.fab,
            transform: [{ scale: scaleAnim }, { rotate: rotation }],
          },
        ]}
      >
        <Ionicons name={icon} size={26} color={theme.fabIcon} />
      </Animated.View>
    </Pressable>
  );
}

interface ExtendedFABProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export function ExtendedFAB({ onPress, icon, label }: ExtendedFABProps) {
  const { theme } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      damping: AnimationConfig.spring.damping,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 12,
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
          styles.extendedContainer,
          {
            backgroundColor: theme.fab,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={theme.fabIcon} />
        <Text style={[styles.label, { color: theme.fabIcon }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: BorderRadius.fab,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#1A73E8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  extendedContainer: {
    position: "absolute",
    right: 20,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: BorderRadius.fab,
    elevation: 8,
    shadowColor: "#1A73E8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 12,
    letterSpacing: 0.1,
  },
});
