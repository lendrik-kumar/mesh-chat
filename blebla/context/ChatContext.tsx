import { Chat, currentUser, Message, mockChats, User } from "@/data/mock-data";
import MeshBridgeService, {
  MeshMessage,
  MeshStatus,
  MeshError,
  registerLogCallback,
  registerNativeLogCallback,
} from "@/services/MeshBridgeService";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useToast } from "./ToastContext";

const LOG_PREFIX = "[ChatContext]";

interface ChatContextType {
  chats: Chat[];
  currentUser: User;
  selectedChat: Chat | null;
  setSelectedChat: (chat: Chat | null) => void;
  sendMessage: (chatId: string, text: string) => void;
  addContact: (contact: User) => void;
  // MeshBridge state
  isDaemonRunning: boolean;
  daemonVersion: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  // MeshBridge state
  const [isDaemonRunning, setIsDaemonRunning] = useState(false);
  const [daemonVersion, setDaemonVersion] = useState<string | null>(null);

  // Ref to track if we've initialized
  const initializedRef = useRef(false);

  // Toast for daemon logs
  const { showDaemonLog, showNativeDaemonLog } = useToast();

  // Handle incoming messages from the daemon
  const handleIncomingMessage = useCallback((meshMessage: MeshMessage) => {
    console.log(`${LOG_PREFIX} Received message from daemon:`, meshMessage);

    // Convert MeshMessage to our Message format
    const newMessage: Message = {
      id: `msg_${meshMessage.timestamp}`,
      senderId: meshMessage.fromUid,
      text: meshMessage.message,
      timestamp: new Date(meshMessage.timestamp),
      status: "delivered",
    };

    // Find the chat with this contact and add the message
    setChats((prevChats) =>
      prevChats.map((chat) => {
        // Match by contact id or uid
        if (
          chat.contact.id === meshMessage.fromUid ||
          chat.contact.uid === meshMessage.fromUid
        ) {
          console.log(`${LOG_PREFIX} Adding message to chat: ${chat.id}`);
          const updatedMessages = [...chat.messages, newMessage];
          return {
            ...chat,
            messages: updatedMessages,
            lastMessage: newMessage,
          };
        }
        return chat;
      }),
    );

    // Update selected chat if it matches
    setSelectedChat((prev) => {
      if (!prev) return null;
      if (
        prev.contact.id === meshMessage.fromUid ||
        prev.contact.uid === meshMessage.fromUid
      ) {
        console.log(`${LOG_PREFIX} Updating selected chat with new message`);
        const updatedMessages = [...prev.messages, newMessage];
        return {
          ...prev,
          messages: updatedMessages,
          lastMessage: newMessage,
        };
      }
      return prev;
    });
  }, []);

  // Initialize MeshBridge
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log(`${LOG_PREFIX} Initializing MeshBridge...`);

    // Register log callback to display MOCK daemon logs in UI (purple toasts)
    const unregisterLogCallback = registerLogCallback((message: string) => {
      showDaemonLog(message);
    });

    // Register log callback to display NATIVE daemon logs in UI (green toasts)
    const unregisterNativeLogCallback = registerNativeLogCallback(
      (message: string) => {
        showNativeDaemonLog(message);
      },
    );

    const initDaemon = async () => {
      try {
        // Start the daemon
        await MeshBridgeService.startDaemon();
        console.log(`${LOG_PREFIX} Daemon started`);

        // Check status
        const running = await MeshBridgeService.isDaemonRunning();
        setIsDaemonRunning(running);
        console.log(`${LOG_PREFIX} Daemon running: ${running}`);

        // Get version
        const version = await MeshBridgeService.getDaemonVersion();
        setDaemonVersion(version);
        console.log(`${LOG_PREFIX} Daemon version: ${version}`);
      } catch (error) {
        console.error(`${LOG_PREFIX} Failed to initialize daemon:`, error);
      }
    };

    // Subscribe to events
    const messageSub = MeshBridgeService.subscribeToMessages(
      (msg: MeshMessage) => {
        console.log(`${LOG_PREFIX} Message event received:`, msg);
        handleIncomingMessage(msg);
      },
    );

    const statusSub = MeshBridgeService.subscribeToStatus(
      (status: MeshStatus) => {
        console.log(`${LOG_PREFIX} Status event received:`, status);
        setIsDaemonRunning(status.isRunning);
      },
    );

    const errorSub = MeshBridgeService.subscribeToErrors((error: MeshError) => {
      console.error(`${LOG_PREFIX} Error event received:`, error);
    });

    // Start daemon
    initDaemon();

    // Cleanup on unmount
    return () => {
      console.log(`${LOG_PREFIX} Cleaning up MeshBridge...`);
      messageSub.remove();
      statusSub.remove();
      errorSub.remove();
      unregisterLogCallback();
      unregisterNativeLogCallback();

      MeshBridgeService.stopDaemon().catch((err: unknown) => {
        console.error(`${LOG_PREFIX} Error stopping daemon:`, err);
      });
    };
  }, [handleIncomingMessage, showDaemonLog, showNativeDaemonLog]);

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      console.log(
        `${LOG_PREFIX} sendMessage called - chatId: ${chatId}, text: ${text}`,
      );

      // Create local message immediately for UI responsiveness
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        senderId: "self",
        text,
        timestamp: new Date(),
        status: "sent",
      };

      // Find the chat to get the recipient uid
      const chat = chats.find((c) => c.id === chatId);
      const recipientUid = chat?.contact.uid || chat?.contact.id || chatId;

      // Update local state
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === chatId) {
            const updatedMessages = [...c.messages, newMessage];
            return {
              ...c,
              messages: updatedMessages,
              lastMessage: newMessage,
            };
          }
          return c;
        }),
      );

      // Also update selected chat if it's the same
      if (selectedChat?.id === chatId) {
        setSelectedChat((prev) => {
          if (!prev) return null;
          const updatedMessages = [...prev.messages, newMessage];
          return {
            ...prev,
            messages: updatedMessages,
            lastMessage: newMessage,
          };
        });
      }

      // Send via MeshBridge
      try {
        console.log(`${LOG_PREFIX} Sending via MeshBridge to: ${recipientUid}`);
        await MeshBridgeService.sendMessage(recipientUid, text);
        console.log(`${LOG_PREFIX} Message sent via MeshBridge`);
      } catch (error) {
        console.error(`${LOG_PREFIX} Failed to send via MeshBridge:`, error);
        // Message is still shown locally, but we could mark it as failed
      }
    },
    [chats, selectedChat],
  );

  const addContact = useCallback((contact: User) => {
    console.log(`${LOG_PREFIX} Adding contact:`, contact);
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      contact,
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentUser,
        selectedChat,
        setSelectedChat,
        sendMessage,
        addContact,
        isDaemonRunning,
        daemonVersion,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
