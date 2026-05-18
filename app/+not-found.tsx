import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '@/theme';

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.text}>Schermata non trovata</Text>
      <Button mode="contained" onPress={() => router.replace('/')}>
        Torna alla Dashboard
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  text: { color: colors.textSecondary },
});
