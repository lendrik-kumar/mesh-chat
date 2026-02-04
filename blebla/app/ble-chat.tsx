/**
 * BLE P2P Chat Screen
 * 
 * This screen handles:
 * - BLE device discovery
 * - Peer connection management
 * - Real-time P2P messaging
 */

import { AppBar, AppBarAction, ChatBubble, MessageInput } from "@/components/chat";
import { BorderRadius } from "@/constants/colors";
import { useAppTheme } from "@/context/ThemeContext";
import { useBLE, BLEPeer, BLEMessage } from "@/hooks";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Message format for display
interface DisplayMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  isSent: boolean;
}

export default function BLEChatScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  
  // BLE Hook
  const {
    isRunning,
    isLoading,
    localUID,
    error,
    discoveredPeers,
    connectedPeers,
    messages: bleMessages,
    startBLE,
    stopBLE,
    sendMessage,
    connectToPeer,
    disconnectFromPeer,
    refreshPeers,
    clearMessages,
  } = useBLE({
    onMessage: (msg) => {
      console.log("[BLEChat] Received message:", msg);
    },
    onPeerDiscovered: (peer) => {
      console.log("[BLEChat] Discovered peer:", peer);
    },
    onPeerUpdated: (peer) => {
      console.log("[BLEChat] Peer updated:", peer);
    },
    onError: (err) => {
      console.error("[BLEChat] Error:", err);
      Alert.alert("BLE Error", err);
    },
  });

  // Local state
  const [viewMode, setViewMode] = useState<"peers" | "chat">("peers");
  const [selectedPeer, setSelectedPeer] = useState<BLEPeer | null>(null);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Convert BLE messages to display format
  useEffect(() => {
    const formatted: DisplayMessage[] = bleMessages.map((msg, index) => ({
      id: `msg-${index}-${msg.timestamp}`,
      content: msg.message,
      senderId: msg.fromUid,
      timestamp: new Date(msg.timestamp),
      isSent: msg.fromUid === localUID,
    }));
    setDisplayMessages(formatted.reverse()); // Oldest first for FlatList
  }, [bleMessages, localUID]);

  // Auto-start BLE with a generated UID
  useEffect(() => {
    const uid = `User-${Math.random().toString(36).substring(2, 8)}`;
    startBLE(uid);
    
    return () => {
      stopBLE();
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (displayMessages.length > 0 && viewMode === "chat") {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [displayMessages.length, viewMode]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPeers();
    setRefreshing(false);
  }, [refreshPeers]);

  const handlePeerPress = (peer: BLEPeer) => {
    if (peer.connected) {
      // If connected, open chat
      setSelectedPeer(peer);
      setViewMode("chat");
    } else {
      // If not connected, try to connect
      Alert.alert(
        "Connect to Peer",
        `Connect to ${peer.uid || "Unknown"}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Connect",
            onPress: () => {
              connectToPeer(peer.peerId.toString());
            },
          },
        ]
      );
    }
  };

  const handleDisconnect = () => {
    if (selectedPeer) {
      disconnectFromPeer(selectedPeer.peerId.toString());
      setSelectedPeer(null);
      setViewMode("peers");
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedPeer?.uid) {
      Alert.alert("Error", "No peer selected");
      return;
    }
    
    try {
      await sendMessage(selectedPeer.uid, text);
      
      // Add sent message to display (optimistic update)
      const sentMessage: DisplayMessage = {
        id: `sent-${Date.now()}`,
        content: text,
        senderId: localUID || "me",
        timestamp: new Date(),
        isSent: true,
      };
      setDisplayMessages(prev => [...prev, sentMessage]);
    } catch (err) {
      Alert.alert("Send Error", "Failed to send message");
    }
  };

  const handleBackPress = () => {
    if (viewMode === "chat") {
      setViewMode("peers");
      setSelectedPeer(null);
    } else {
      router.back();
    }
  };

  const toggleBLE = async () => {
    if (isRunning) {
      await stopBLE();
    } else {
      const uid = `User-${Math.random().toString(36).substring(2, 8)}`;
      await startBLE(uid);
    }
  };

  // Render peer item
  const renderPeerItem = ({ item }: { item: BLEPeer }) => (
    <Pressable
      style={[
        styles.peerItem,
        { backgroundColor: theme.surface },
        item.connected && { borderLeftColor: theme.primary, borderLeftWidth: 4 },
      ]}
      onPress={() => handlePeerPress(item)}
      android_ripple={{ color: `${theme.primary}20` }}
    >
      <View style={[styles.peerAvatar, { backgroundColor: item.connected ? theme.primary : theme.surfaceVariant }]}>
        <Ionicons
          name={item.connected ? "bluetooth-sharp" : "bluetooth-outline"}
          size={24}
          color={item.connected ? theme.fabIcon : theme.textSecondary}
        />
      </View>
      <View style={styles.peerInfo}>
        <Text style={[styles.peerName, { color: theme.text }]}>
          {item.uid || `Device ${item.peerId.toString().slice(-4)}`}
        </Text>
        <Text style={[styles.peerStatus, { color: item.connected ? theme.primary : theme.textSecondary }]}>
          {item.connected ? "Connected - Tap to chat" : "Tap to connect"}
        </Text>
      </View>
      <Ionicons
        name={item.connected ? "chatbubble" : "chevron-forward"}
        size={20}
        color={item.connected ? theme.primary : theme.textSecondary}
      />
    </Pressable>
  );

  // Render empty state
  const renderEmptyPeers = () => (
    <View style={styles.emptyContainer}>
      {isLoading ? (
        <>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Scanning for nearby devices...
          </Text>
        </>
      ) : (
        <>
          <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="bluetooth-outline" size={48} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No devices found
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Make sure Bluetooth is enabled and{"\n"}other devices are running this app
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={handleRefresh}
          >
            <Text style={[styles.retryText, { color: theme.fabIcon }]}>
              Scan Again
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );

  // PEERS VIEW
  if (viewMode === "peers") {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <AppBar
          title="BLE Chat"
          subtitle={localUID ? `You: ${localUID}` : undefined}
          showBack
          onBackPress={handleBackPress}
          rightActions={
            <>
              <AppBarAction
                icon={isRunning ? "bluetooth" : "bluetooth-outline"}
                onPress={toggleBLE}
              />
              <AppBarAction icon="refresh" onPress={handleRefresh} />
            </>
          }
        />
        
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: isRunning ? theme.primaryContainer : `${theme.error}15` }]}>
          <Ionicons
            name={isRunning ? "checkmark-circle" : "warning"}
            size={18}
            color={isRunning ? theme.primary : theme.error}
          />
          <Text style={[styles.statusText, { color: isRunning ? theme.primary : theme.error }]}>
            {isRunning ? `BLE Active • ${discoveredPeers.length} devices nearby` : "BLE is off - Tap Bluetooth icon to start"}
          </Text>
        </View>

        {/* Connected Peers Section */}
        {connectedPeers.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              CONNECTED ({connectedPeers.length})
            </Text>
            {connectedPeers.map(peer => (
              <View key={peer.peerId}>
                {renderPeerItem({ item: peer })}
              </View>
            ))}
          </View>
        )}

        {/* Discovered Peers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            NEARBY DEVICES ({discoveredPeers.filter(p => !p.connected).length})
          </Text>
        </View>

        <FlatList
          data={discoveredPeers.filter(p => !p.connected)}
          keyExtractor={(item) => item.peerId.toString()}
          renderItem={renderPeerItem}
          ListEmptyComponent={renderEmptyPeers}
          contentContainerStyle={styles.peerList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        />

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: `${theme.error}15` }]}>
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          </View>
        )}
      </View>
    );
  }

  // CHAT VIEW
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppBar
        title={selectedPeer?.uid || "Chat"}
        subtitle="Connected via BLE"
        showBack
        onBackPress={handleBackPress}
        rightActions={
          <AppBarAction icon="exit-outline" onPress={handleDisconnect} />
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const showTimestamp =
              index === 0 ||
              item.timestamp.getTime() - displayMessages[index - 1].timestamp.getTime() > 5 * 60 * 1000;

            return (
              <ChatBubble
                message={{
                  id: item.id,
                  text: item.content,
                  senderId: item.senderId,
                  timestamp: item.timestamp,
                  status: "sent",
                }}
                isSent={item.isSent}
                showTimestamp={showTimestamp}
              />
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyChatContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyChatText, { color: theme.textSecondary }]}>
                No messages yet{"\n"}Send a message to start chatting!
              </Text>
            </View>
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  peerList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  peerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
    gap: 12,
  },
  peerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  peerInfo: {
    flex: 1,
  },
  peerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  peerStatus: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorBanner: {
    padding: 12,
    margin: 16,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
  },
  messageList: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  emptyChatContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyChatText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
});
