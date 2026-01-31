/**
 * Mock data for the Mesh Chat application
 * Used for UI development and testing
 */

export interface User {
  id: string;
  name: string;
  uid: string;
  publicKey: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  status: "sent" | "delivered" | "read";
}

export interface Chat {
  id: string;
  contact: User;
  messages: Message[];
  lastMessage?: Message;
}

// Current user (self)
export const currentUser: User = {
  id: "self",
  name: "Alex Developer",
  uid: "a3x7k9",
  publicKey:
    "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr5xLR2vG8eCKRJTp8nMH7WpQYbFz9kXmNq4cHJhZR7vW8sLm2T3qX6uFpJ4kRwN9gH5tMbP2cVdL3mQeK7YfN4wS8jP1rU2hVxC6wB3oT9m5nKpL2jF8qE4rY6sH1fN0vW7iX3cMdJ5kQ9pT2gR8nL4bZ6yU0wS1aO7vF3kN9mH2cXbJ4oQ5rT7pL8gE1wK6nR9vF4sD3mY2kX5hJ7qZ0oN8uP1tL3wG6bR9vS4mE2cK7nT8hJ5qF0oX1pL6gD9wR4sV2mN3kY7bZ0oJ5qT8hL1gE6wP9sV4mD2cN7kR8hJ5qF0oX1pL6gB9wT4sV2mK7nR8hJ5qF0oX1pL6gD9wR4sV",
};

// Mock contacts
export const contacts: User[] = [
  {
    id: "user1",
    name: "Sarah Chen",
    uid: "s4r4h7",
    publicKey:
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs7x2P3vG8eCKRJTp8nMH...",
  },
  {
    id: "user2",
    name: "Marcus Rivera",
    uid: "m4rc5x",
    publicKey:
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm7y2P3vG8eCKRJTp8nMH...",
  },
  {
    id: "user3",
    name: "Priya Sharma",
    uid: "pr1y4k",
    publicKey:
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp7z2P3vG8eCKRJTp8nMH...",
  },
  {
    id: "user4",
    name: "David Kim",
    uid: "d4v1dk",
    publicKey:
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAd7a2P3vG8eCKRJTp8nMH...",
  },
  {
    id: "user5",
    name: "Emma Wilson",
    uid: "3mm4w5",
    publicKey:
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAe7b2P3vG8eCKRJTp8nMH...",
  },
];

// Mock messages for each chat
const sarahMessages: Message[] = [
  {
    id: "msg1",
    senderId: "user1",
    text: "Hey! Are you coming to the GDG meetup tomorrow?",
    timestamp: new Date("2026-01-30T14:30:00"),
    status: "read",
  },
  {
    id: "msg2",
    senderId: "self",
    text: "Yes! I'm excited about the mesh networking talk.",
    timestamp: new Date("2026-01-30T14:32:00"),
    status: "read",
  },
  {
    id: "msg3",
    senderId: "user1",
    text: "Same! It's going to be amazing. See you there! 🎉",
    timestamp: new Date("2026-01-30T14:33:00"),
    status: "read",
  },
  {
    id: "msg4",
    senderId: "self",
    text: "Can't wait! Should we grab coffee before?",
    timestamp: new Date("2026-01-30T14:35:00"),
    status: "delivered",
  },
];

const marcusMessages: Message[] = [
  {
    id: "msg5",
    senderId: "self",
    text: "Did you see the new Go mesh routing implementation?",
    timestamp: new Date("2026-01-29T10:15:00"),
    status: "read",
  },
  {
    id: "msg6",
    senderId: "user2",
    text: "Yes! The DHT-based discovery is clever.",
    timestamp: new Date("2026-01-29T10:20:00"),
    status: "read",
  },
  {
    id: "msg7",
    senderId: "user2",
    text: "Want to collaborate on the Bluetooth module?",
    timestamp: new Date("2026-01-29T10:22:00"),
    status: "read",
  },
  {
    id: "msg8",
    senderId: "self",
    text: "Absolutely! Let's sync up this weekend.",
    timestamp: new Date("2026-01-29T10:25:00"),
    status: "delivered",
  },
];

const priyaMessages: Message[] = [
  {
    id: "msg9",
    senderId: "user3",
    text: "The encryption layer is working perfectly now!",
    timestamp: new Date("2026-01-28T16:45:00"),
    status: "read",
  },
  {
    id: "msg10",
    senderId: "self",
    text: "Awesome! X25519 key exchange?",
    timestamp: new Date("2026-01-28T16:47:00"),
    status: "read",
  },
  {
    id: "msg11",
    senderId: "user3",
    text: "Yep, with ChaCha20-Poly1305 for messages.",
    timestamp: new Date("2026-01-28T16:48:00"),
    status: "read",
  },
];

const davidMessages: Message[] = [
  {
    id: "msg12",
    senderId: "user4",
    text: "Thanks for helping with the QR code flow!",
    timestamp: new Date("2026-01-27T11:30:00"),
    status: "read",
  },
  {
    id: "msg13",
    senderId: "self",
    text: "Happy to help! The UX is much smoother now.",
    timestamp: new Date("2026-01-27T11:32:00"),
    status: "read",
  },
];

const emmaMessages: Message[] = [
  {
    id: "msg14",
    senderId: "self",
    text: "Hey Emma! Welcome to MeshChat!",
    timestamp: new Date("2026-01-31T09:00:00"),
    status: "delivered",
  },
];

// Compiled chats
export const mockChats: Chat[] = [
  {
    id: "chat1",
    contact: contacts[0],
    messages: sarahMessages,
    lastMessage: sarahMessages[sarahMessages.length - 1],
  },
  {
    id: "chat2",
    contact: contacts[1],
    messages: marcusMessages,
    lastMessage: marcusMessages[marcusMessages.length - 1],
  },
  {
    id: "chat3",
    contact: contacts[2],
    messages: priyaMessages,
    lastMessage: priyaMessages[priyaMessages.length - 1],
  },
  {
    id: "chat4",
    contact: contacts[3],
    messages: davidMessages,
    lastMessage: davidMessages[davidMessages.length - 1],
  },
  {
    id: "chat5",
    contact: contacts[4],
    messages: emmaMessages,
    lastMessage: emmaMessages[emmaMessages.length - 1],
  },
];

// Helper function to format timestamp
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

// Helper to format message time
export function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper to shorten UID for display
export function shortenUid(uid: string): string {
  return `#${uid}`;
}

// Helper to mask public key
export function maskPublicKey(key: string): string {
  if (key.length <= 20) return key;
  return `${key.substring(0, 10)}...${key.substring(key.length - 10)}`;
}

// Generate QR data string
export function generateQRData(user: User): string {
  return JSON.stringify({
    name: user.name,
    uid: user.uid,
    publicKey: user.publicKey,
  });
}
