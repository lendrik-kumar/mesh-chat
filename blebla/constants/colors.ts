/**
 * GDG-themed Material Design 3 color palette
 * Follows Google's Material Design guidelines
 * Enhanced with smooth animations and curvy design
 */

// Animation configuration for smooth, Google-like motion
export const AnimationConfig = {
  spring: {
    damping: 15,
    mass: 1,
    stiffness: 150,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  timing: {
    fast: 200,
    normal: 300,
    slow: 450,
    verySlow: 600,
  },
};

// Border radius constants for curvy design
export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
  bubble: 28,
  card: 24,
  button: 16,
  avatar: 9999,
  fab: 20,
  input: 28,
  chip: 20,
};

export const GDGColors = {
  // Google brand colors (more vibrant)
  googleBlue: "#1A73E8",
  googleGreen: "#1E8E3E",
  googleYellow: "#F9AB00",
  googleRed: "#D93025",

  // Primary palette (Google Blue based - more vibrant)
  primary: {
    main: "#1A73E8",
    light: "#4285F4",
    dark: "#1557B0",
    container: "#E8F0FE",
    onContainer: "#041E49",
  },

  // Secondary palette (Google Green based)
  secondary: {
    main: "#34A853",
    light: "#5BB974",
    dark: "#1E8E3E",
    container: "#CEEAD6",
    onContainer: "#0D3E1D",
  },

  // Tertiary palette
  tertiary: {
    main: "#9334E6",
    light: "#A95EEA",
    dark: "#7627BB",
    container: "#E9DDFF",
    onContainer: "#3D0066",
  },

  // Surface colors (enhanced for depth)
  surface: {
    light: "#FFFFFF",
    lightVariant: "#F8FAFF",
    lightElevated: "#EEF3FC",
    dark: "#121212",
    darkVariant: "#1E1E1E",
    darkElevated: "#2A2A2A",
  },

  // Text colors
  text: {
    primaryLight: "#202124",
    secondaryLight: "#5F6368",
    tertiaryLight: "#80868B",
    primaryDark: "#E8EAED",
    secondaryDark: "#9AA0A6",
    tertiaryDark: "#80868B",
  },

  // Neutral colors
  neutral: {
    0: "#000000",
    10: "#1F1F1F",
    20: "#2D2D2D",
    30: "#3C3C3C",
    40: "#5F6368",
    50: "#80868B",
    60: "#9AA0A6",
    70: "#BDC1C6",
    80: "#DADCE0",
    90: "#E8EAED",
    95: "#F1F3F4",
    99: "#F8F9FA",
    100: "#FFFFFF",
  },

  // Status colors
  error: {
    main: "#D93025",
    light: "#F28B82",
    dark: "#B31412",
    container: "#FCE8E6",
    onContainer: "#5C0011",
  },

  success: {
    main: "#1E8E3E",
    light: "#81C995",
    dark: "#137333",
    container: "#E6F4EA",
    onContainer: "#0D3E1D",
  },

  warning: {
    main: "#F9AB00",
    light: "#FDD663",
    dark: "#E37400",
    container: "#FEF7E0",
    onContainer: "#533D00",
  },
};

export const LightTheme = {
  background: GDGColors.surface.lightVariant,
  surface: GDGColors.surface.light,
  surfaceVariant: GDGColors.surface.lightElevated,
  primary: GDGColors.primary.main,
  primaryLight: GDGColors.primary.light,
  primaryContainer: GDGColors.primary.container,
  onPrimaryContainer: GDGColors.primary.onContainer,
  secondary: GDGColors.secondary.main,
  secondaryContainer: GDGColors.secondary.container,
  onSecondaryContainer: GDGColors.secondary.onContainer,
  tertiary: GDGColors.tertiary.main,
  tertiaryContainer: GDGColors.tertiary.container,
  onTertiaryContainer: GDGColors.tertiary.onContainer,
  text: GDGColors.text.primaryLight,
  textSecondary: GDGColors.text.secondaryLight,
  textTertiary: GDGColors.text.tertiaryLight,
  border: GDGColors.neutral[90],
  divider: GDGColors.neutral[95],
  icon: GDGColors.text.secondaryLight,
  error: GDGColors.error.main,
  success: GDGColors.success.main,
  warning: GDGColors.warning.main,
  // Google brand accent
  googleBlue: GDGColors.googleBlue,
  googleGreen: GDGColors.googleGreen,
  googleYellow: GDGColors.googleYellow,
  googleRed: GDGColors.googleRed,
  // Chat specific (more modern gradients possible)
  sentBubble: GDGColors.primary.main,
  sentBubbleText: "#FFFFFF",
  receivedBubble: GDGColors.surface.lightElevated,
  receivedBubbleText: GDGColors.text.primaryLight,
  inputBackground: GDGColors.surface.light,
  fab: GDGColors.primary.main,
  fabIcon: "#FFFFFF",
  // Card shadows
  shadow: "rgba(0, 0, 0, 0.08)",
  shadowMedium: "rgba(0, 0, 0, 0.12)",
  shadowStrong: "rgba(0, 0, 0, 0.16)",
};

export const DarkTheme = {
  background: GDGColors.surface.dark,
  surface: GDGColors.surface.darkVariant,
  surfaceVariant: GDGColors.surface.darkElevated,
  primary: GDGColors.primary.light,
  primaryLight: GDGColors.primary.main,
  primaryContainer: GDGColors.primary.dark,
  onPrimaryContainer: GDGColors.primary.container,
  secondary: GDGColors.secondary.light,
  secondaryContainer: GDGColors.secondary.dark,
  onSecondaryContainer: GDGColors.secondary.container,
  tertiary: GDGColors.tertiary.light,
  tertiaryContainer: GDGColors.tertiary.dark,
  onTertiaryContainer: GDGColors.tertiary.container,
  text: GDGColors.text.primaryDark,
  textSecondary: GDGColors.text.secondaryDark,
  textTertiary: GDGColors.text.tertiaryDark,
  border: GDGColors.neutral[30],
  divider: GDGColors.neutral[20],
  icon: GDGColors.text.secondaryDark,
  error: GDGColors.error.light,
  success: GDGColors.success.light,
  warning: GDGColors.warning.light,
  // Google brand accent
  googleBlue: GDGColors.googleBlue,
  googleGreen: GDGColors.googleGreen,
  googleYellow: GDGColors.googleYellow,
  googleRed: GDGColors.googleRed,
  // Chat specific
  sentBubble: GDGColors.primary.light,
  sentBubbleText: "#FFFFFF",
  receivedBubble: GDGColors.surface.darkElevated,
  receivedBubbleText: GDGColors.text.primaryDark,
  inputBackground: GDGColors.surface.darkVariant,
  fab: GDGColors.primary.light,
  fabIcon: "#121212",
  // Card shadows (softer for dark mode)
  shadow: "rgba(0, 0, 0, 0.3)",
  shadowMedium: "rgba(0, 0, 0, 0.4)",
  shadowStrong: "rgba(0, 0, 0, 0.5)",
};

export type ThemeColors = typeof LightTheme;
