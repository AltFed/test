import { MD3DarkTheme } from 'react-native-paper';

export const colors = {
  primary: '#7C4DFF',
  secondary: '#00BCD4',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#FF5252',
  background: '#0D0D0D',
  surface: '#1A1A1A',
  card: '#1E1E1E',
  border: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#555555',
} as const;

export const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    primaryContainer: '#1E1040',
    secondary: colors.secondary,
    secondaryContainer: '#003640',
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: '#242424',
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    error: colors.error,
  },
} as const;
