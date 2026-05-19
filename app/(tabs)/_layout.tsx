import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, fonts } from '@/theme';

type IconProps = { color: string; size: number };

export default function TabLayout() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.background,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.mono,
          fontSize: 10,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="esami"
        options={{
          title: 'Esami',
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="school-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
          title: 'Studio',
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="timer-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orario"
        options={{
          title: 'Orario',
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="calendar-week-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="simulatore"
        options={{
          title: 'Sim.',
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="chart-line" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
