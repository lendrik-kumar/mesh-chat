# MeshChat - GDG Theme 🌐

A decentralized mesh-based chat application UI built with React Native and Expo, following Google Developer Groups (GDG) branding and Material Design 3 principles.

![React Native](https://img.shields.io/badge/React_Native-0.81-blue?logo=react)
![Expo](https://img.shields.io/badge/Expo-54-black?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)

## 📱 Features

- **Splash Screen** - GDG-styled animated loader with mesh network branding
- **Chat List** - Material Design 3 styled conversation list
- **1-to-1 Messaging** - Beautiful chat bubbles with timestamps and delivery status
- **QR Exchange** - UI for identity/key exchange (Generate QR & Scan QR tabs)
- **Profile Screen** - User identity display with expandable public key
- **Theme Support** - System-aware Light & Dark mode with manual toggle

## 🎨 Design System

- **Material Design 3** - Following Google's latest design guidelines
- **GDG Colors** - Google Blue, Red, Yellow, Green accents
- **Typography** - Clean, modern font styling
- **Animations** - Smooth screen transitions and button feedback

## 📂 Project Structure

```
app/
├── _layout.tsx          # Root navigation & providers
├── index.tsx            # Splash screen
├── home.tsx             # Chat list screen
├── profile.tsx          # User profile screen
├── qr-exchange.tsx      # QR code exchange screen
└── chat/
    └── [id].tsx         # Individual chat screen

components/
└── chat/
    ├── AppBar.tsx       # Material-styled app bar
    ├── ChatItem.tsx     # Chat list item
    ├── ChatBubble.tsx   # Message bubble
    ├── MessageInput.tsx # Text input with send button
    ├── FAB.tsx          # Floating action button
    └── QRComponents.tsx # QR code placeholders

context/
├── ThemeContext.tsx     # Theme state management
└── ChatContext.tsx      # Chat data management

constants/
└── colors.ts            # GDG color palette

data/
└── mock-data.ts         # Static mock data
```

## 🚀 Get Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the app**

   ```bash
   npx expo start
   ```

3. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app

## 🛠 Tech Stack

| Technology    | Purpose               |
| ------------- | --------------------- |
| React Native  | UI Framework          |
| Expo Router   | File-based Navigation |
| TypeScript    | Type Safety           |
| React Context | State Management      |

## ⚠️ Note

This is a **UI-only** implementation. All networking, mesh routing, encryption, Bluetooth, and backend logic are out of scope. Mock data is used for demonstration purposes.

## 📄 License

MIT License - Built with ❤️ by GDG

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
