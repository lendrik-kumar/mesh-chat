import {
  AppBar,
  AppBarAction,
  ChatBubble,
  MessageInput,
} from "@/components/chat";
import { useChat } from "@/context/ChatContext";
import { useAppTheme } from "@/context/ThemeContext";
import { shortenUid } from "@/data/mock-data";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();
  const { chats, selectedChat, setSelectedChat, sendMessage } = useChat();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  // Find the chat if not already selected
  const chat =
    selectedChat?.id === id ? selectedChat : chats.find((c) => c.id === id);

  useEffect(() => {
    if (chat && chat.id !== selectedChat?.id) {
      setSelectedChat(chat);
    }
  }, [chat?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chat?.messages.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chat?.messages.length]);

  const handleBackPress = () => {
    setSelectedChat(null);
    router.back();
  };

  const handleSendMessage = (text: string) => {
    if (chat) {
      sendMessage(chat.id, text);
    }
  };

  if (!chat) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <AppBar title="Chat" showBack onBackPress={handleBackPress} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppBar
        title={chat.contact.name}
        subtitle={shortenUid(chat.contact.uid)}
        showBack
        onBackPress={handleBackPress}
        rightActions={
          <AppBarAction icon="information-circle-outline" onPress={() => {}} />
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={chat.messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const showTimestamp =
              index === 0 ||
              item.timestamp.getTime() -
                chat.messages[index - 1].timestamp.getTime() >
                5 * 60 * 1000;

            return (
              <ChatBubble
                message={item}
                isSent={item.senderId === "self"}
                showTimestamp={showTimestamp}
              />
            );
          }}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        <MessageInput onSend={handleSendMessage} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 16,
  },
});
