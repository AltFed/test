import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initDatabase } from '@/db/database';
import { theme, colors } from '@/theme';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider
        theme={theme}
        settings={{
          icon: (props) => (
            <MaterialCommunityIcons
              name={props.name as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
              size={props.size}
              color={props.color}
            />
          ),
        }}
      >
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            contentStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="esame/[id]" options={{ title: 'Dettaglio Esame', headerBackTitle: '' }} />
          <Stack.Screen name="impostazioni" options={{ title: 'Impostazioni', headerBackTitle: '' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
