import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, VT323_400Regular } from '@expo-google-fonts/vt323';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { initDatabase } from '@/db/database';
import { usePaperTheme, useColors, fonts } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ VT323_400Regular, SpaceMono_400Regular });
  const paperTheme = usePaperTheme();
  const C = useColors();

  useEffect(() => {
    initDatabase();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider
          theme={paperTheme}
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
              headerStyle: { backgroundColor: C.background },
              headerTintColor: C.textPrimary,
              contentStyle: { backgroundColor: C.background },
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: fonts.mono, fontSize: 15 },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="esame/[id]" options={{ title: 'Dettaglio Esame', headerBackTitle: '' }} />
            <Stack.Screen name="impostazioni" options={{ title: 'Impostazioni', headerBackTitle: '' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
