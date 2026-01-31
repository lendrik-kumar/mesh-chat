import { Chat, currentUser, Message, mockChats, User } from "@/data/mock-data";
import React, { createContext, ReactNode, useContext, useState } from "react";

interface ChatContextType {
  chats: Chat[];
  currentUser: User;
  selectedChat: Chat | null;
  setSelectedChat: (chat: Chat | null) => void;
  sendMessage: (chatId: string, text: string) => void;
  addContact: (contact: User) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  const sendMessage = (chatId: string, text: string) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: "self",
      text,
      timestamp: new Date(),
      status: "sent",
    };

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === chatId) {
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
  };

  const addContact = (contact: User) => {
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      contact,
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentUser,
        selectedChat,
        setSelectedChat,
        sendMessage,
        addContact,
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
