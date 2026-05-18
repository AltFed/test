import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, ProgressBar, IconButton, Surface } from 'react-native-paper';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { getSetting, getAllEsami, getMediaPonderata, getCfuAcquisiti } from '@/db/database';
import type { Esame } from '@/db/types';

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function Dashboard() {
  const [dataLaurea, setDataLaurea] = useState<string | null>(null);
  const [cfuTotali, setCfuTotali] = useState(180);
  const [cfuAcquisiti, setCfuAcquisiti] = useState(0);
  const [media, setMedia] = useState(0);
  const [esami, setEsami] = useState<Esame[]>([]);

  useFocusEffect(
    useCallback(() => {
      setDataLaurea(getSetting('data_laurea'));
      setCfuTotali(parseInt(getSetting('cfu_totali') ?? '180', 10));
      setCfuAcquisiti(getCfuAcquisiti());
      setMedia(getMediaPonderata());
      setEsami(getAllEsami());
    }, [])
  );

  const giorni = dataLaurea ? daysUntil(dataLaurea) : null;
  const cfuProgress = Math.min(cfuAcquisiti / cfuTotali, 1);
  const daSuperare = esami.filter((e) => !e.superato);
  const superati = esami.filter((e) => e.superato);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title}>UniVersal</Text>
          <IconButton
            icon="cog-outline"
            iconColor={colors.textSecondary}
            size={22}
            onPress={() => router.push('/impostazioni')}
          />
        </View>

        {/* Countdown */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>TARGET LAUREA</Text>
            {giorni !== null ? (
              <View style={styles.countdownRow}>
                <Text style={styles.countdownNum}>{giorni}</Text>
                <Text variant="bodyLarge" style={styles.countdownSuffix}>
                  {giorni === 1 ? 'giorno' : 'giorni'} alla sessione
                </Text>
              </View>
            ) : (
              <Text variant="bodyMedium" style={styles.muted}>
                Imposta la data laurea nelle impostazioni →
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* CFU */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.label}>CFU ACQUISITI</Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {cfuAcquisiti} / {cfuTotali}
              </Text>
            </View>
            <ProgressBar
              progress={cfuProgress}
              color={colors.primary}
              style={styles.bar}
            />
            <Text variant="bodySmall" style={styles.muted}>
              {cfuTotali - cfuAcquisiti} CFU rimanenti ({Math.round(cfuProgress * 100)}%)
            </Text>
          </Card.Content>
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Surface style={styles.stat} elevation={0}>
            <Text style={styles.label}>MEDIA</Text>
            <Text style={[styles.statNum, { color: colors.secondary }]}>
              {media > 0 ? media.toFixed(2) : '—'}
            </Text>
          </Surface>
          <Surface style={styles.stat} elevation={0}>
            <Text style={styles.label}>SUPERATI</Text>
            <Text style={[styles.statNum, { color: colors.success }]}>
              {superati.length}
            </Text>
          </Surface>
          <Surface style={styles.stat} elevation={0}>
            <Text style={styles.label}>IN SOSPESO</Text>
            <Text style={[styles.statNum, { color: colors.warning }]}>
              {daSuperare.length}
            </Text>
          </Surface>
        </View>

        {/* Radar operativo */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>RADAR OPERATIVO</Text>
            {daSuperare.length === 0 ? (
              <Text variant="bodyMedium" style={styles.muted}>
                Nessun esame in sospeso. Ottimo.
              </Text>
            ) : (
              daSuperare.slice(0, 6).map((esame) => (
                <View key={esame.id} style={styles.radarRow}>
                  <View style={styles.dot} />
                  <Text
                    variant="bodyMedium"
                    style={styles.radarNome}
                    numberOfLines={1}
                  >
                    {esame.nome}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {esame.cfu} CFU
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { color: colors.textPrimary, fontWeight: '800', letterSpacing: -0.5 },
  card: { backgroundColor: colors.card, borderRadius: 16 },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  countdownRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  countdownNum: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 80,
  },
  countdownSuffix: { color: colors.textSecondary },
  muted: { color: colors.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { marginVertical: 10, height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statNum: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  radarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  radarNome: { flex: 1, color: colors.textPrimary },
});
