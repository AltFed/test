import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { Text, Card, Button, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { getSetting, setSetting } from '@/db/database';

export default function Impostazioni() {
  const [dataLaurea, setDataLaurea] = useState('');
  const [cfuTotali, setCfuTotali] = useState('180');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDataLaurea(getSetting('data_laurea') ?? '');
    setCfuTotali(getSetting('cfu_totali') ?? '180');
  }, []);

  function salva() {
    if (dataLaurea) setSetting('data_laurea', dataLaurea);
    if (cfuTotali) setSetting('cfu_totali', cfuTotali);
    setSaved(true);
    setTimeout(() => {
      router.back();
    }, 600);
  }

  function isDataValida(): boolean {
    if (!dataLaurea) return false;
    const d = new Date(dataLaurea);
    return !isNaN(d.getTime());
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>Impostazioni</Text>

        <Card style={styles.card}>
          <Card.Content style={{ gap: 16 }}>
            <View>
              <Text style={styles.label}>DATA SESSIONE DI LAUREA</Text>
              <Text style={styles.hint}>Formato: YYYY-MM-DD (es. 2027-03-15)</Text>
              <TextInput
                value={dataLaurea}
                onChangeText={setDataLaurea}
                placeholder="2027-03-15"
                placeholderTextColor={colors.textMuted}
                mode="outlined"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                style={styles.input}
                error={dataLaurea.length > 0 && !isDataValida()}
              />
              {dataLaurea.length > 0 && isDataValida() && (
                <Text style={styles.preview}>
                  {new Date(dataLaurea).toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              )}
            </View>

            <View>
              <Text style={styles.label}>CFU TOTALI DEL CORSO</Text>
              <TextInput
                value={cfuTotali}
                onChangeText={setCfuTotali}
                keyboardType="numeric"
                mode="outlined"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                style={styles.input}
              />
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={salva}
          style={styles.btn}
          labelStyle={{ fontSize: 16, fontWeight: '700' }}
          icon={saved ? 'check' : 'content-save'}
        >
          {saved ? 'Salvato!' : 'Salva impostazioni'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  title: { color: colors.textPrimary, fontWeight: '800', marginBottom: 4 },
  card: { backgroundColor: colors.card, borderRadius: 16 },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  hint: { color: colors.textMuted, fontSize: 11, marginBottom: 8 },
  input: { backgroundColor: colors.card },
  preview: { color: colors.primary, fontSize: 13, marginTop: 6 },
  btn: {
    borderRadius: 14,
    paddingVertical: 4,
    backgroundColor: colors.primary,
  },
});
