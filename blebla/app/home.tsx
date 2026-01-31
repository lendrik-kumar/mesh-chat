import { AppBar, AppBarAction, ChatItem, FAB } from "@/components/chat";
import { AnimationConfig, BorderRadius } from "@/constants/colors";
import { useChat } from "@/context/ChatContext";
import { useAppTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { chats, setSelectedChat } = useChat();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Smooth entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: AnimationConfig.timing.normal,
        useNativeDriver: true,
      }),
      Animated.spring(translateAnim, {
        toValue: 0,
        damping: AnimationConfig.spring.damping,
        stiffness: AnimationConfig.spring.stiffness,
        mass: AnimationConfig.spring.mass,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleChatPress = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setSelectedChat(chat);
      router.push(`/chat/${chatId}`);
    }
  };

  const handleQRPress = () => {
    router.push("/qr-exchange");
  };

  const handleProfilePress = () => {
    router.push("/profile");
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[styles.emptyIcon, { backgroundColor: theme.primaryContainer }]}
      >
        <Ionicons name="chatbubbles-outline" size={56} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No conversations yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Tap the QR button to add a new contact{"\n"}and start a secure mesh chat
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppBar
        title="MeshChat"
        rightActions={
          <>
            <AppBarAction
              icon={isDark ? "sunny" : "moon"}
              onPress={toggleTheme}
            />
            <AppBarAction
              icon="person-circle-outline"
              onPress={handleProfilePress}
            />
          </>
        }
      />

      <Animated.View
        style={[
          styles.listWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateAnim }],
          },
        ]}
      >
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatItem chat={item} onPress={() => handleChatPress(item.id)} />
          )}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                {
                  backgroundColor: theme.divider,
                  marginLeft: 88,
                  marginRight: 16,
                },
              ]}
            />
          )}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            chats.length === 0 && styles.emptyList,
          ]}
          scrollEnabled={chats.length > 0}
        />
      </Animated.View>

      <FAB onPress={handleQRPress} icon="qr-code" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 4,
  },
  emptyList: {
    justifyContent: "center",
  },
  separator: {
    height: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.avatar,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
