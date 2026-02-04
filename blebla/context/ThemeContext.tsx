import { DarkTheme, LightTheme, ThemeColors } from "@/constants/colors";
import { createContext, ReactNode, useContext, useState } from "react";
import {
  ColorSchemeName,
  useColorScheme as useSystemColorScheme,
} from "react-native";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function AppThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  const getEffectiveTheme = (): ColorSchemeName => {
    if (themeMode === "system") {
      return systemColorScheme;
    }
    return themeMode;
  };

  const effectiveTheme = getEffectiveTheme();
  const isDark = effectiveTheme === "dark";
  const theme = isDark ? DarkTheme : LightTheme;

  const toggleTheme = () => {
    if (themeMode === "system") {
      setThemeMode(isDark ? "light" : "dark");
    } else if (themeMode === "light") {
      setThemeMode("dark");
    } else {
      setThemeMode("light");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        themeMode,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useAppTheme must be used within an AppThemeProvider");
  }
  return context;
}
