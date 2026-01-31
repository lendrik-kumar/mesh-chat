import { useAppTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
}

export function AppBar({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightActions,
}: AppBarProps) {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          paddingTop: insets.top,
          borderBottomColor: theme.divider,
        },
      ]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.surface}
      />
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showBack && (
            <Pressable
              onPress={onBackPress}
              style={({ pressed }) => [
                styles.backButton,
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </Pressable>
          )}
          <View style={styles.titleContainer}>
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[styles.subtitle, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {rightActions && (
          <View style={styles.rightSection}>{rightActions}</View>
        )}
      </View>
    </View>
  );
}

interface AppBarActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
}

export function AppBarAction({ icon, onPress, color }: AppBarActionProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && { opacity: 0.6 },
      ]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name={icon} size={24} color={color || theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 58,
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});
