import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const darkColors = {
  background: '#000000',
  surface: '#0A0A0A',
  card: '#111111',
  border: '#1C1C1C',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#444444',
  accent: '#FFE600',
  accentDim: '#2A2600',
  destructive: '#FF3B30',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF3B30',
  // legacy aliases
  primary: '#FFE600',
  secondary: '#30D158',
};

const lightColors = {
  background: '#FFFFFF',
  surface: '#F2F2F7',
  card: '#FFFFFF',
  border: '#E5E5EA',
  textPrimary: '#000000',
  textSecondary: '#6C6C70',
  textMuted: '#AEAEB2',
  accent: '#B8A000',
  accentDim: '#FFF8C0',
  destructive: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  primary: '#B8A000',
  secondary: '#34C759',
};

export type AppColors = typeof darkColors;

export const fonts = {
  dot: 'VT323_400Regular',
  mono: 'SpaceMono_400Regular',
} as const;

export function useColors(): AppColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

export const colors = darkColors;

const darkPaper = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.accent,
    primaryContainer: darkColors.accentDim,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceVariant: darkColors.card,
    onSurface: darkColors.textPrimary,
    onSurfaceVariant: darkColors.textSecondary,
    outline: darkColors.border,
    error: darkColors.error,
  },
};

const lightPaper = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.accent,
    primaryContainer: lightColors.accentDim,
    background: lightColors.background,
    surface: lightColors.surface,
    surfaceVariant: lightColors.card,
    onSurface: lightColors.textPrimary,
    onSurfaceVariant: lightColors.textSecondary,
    outline: lightColors.border,
    error: lightColors.error,
  },
};

export const theme = darkPaper;

export function usePaperTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkPaper : lightPaper;
}
