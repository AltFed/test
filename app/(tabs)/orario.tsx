import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { getAllLezioniConEsame, deleteLezione } from '@/db/database';
import type { LezioneConEsame } from '@/db/types';

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export default function OrarioScreen() {
  const [lezioni, setLezioni] = useState<LezioneConEsame[]>([]);

  const load = useCallback(() => {
    setLezioni(getAllLezioniConEsame());
  }, []);

  useFocusEffect(load);

  const perGiorno: Record<number, LezioneConEsame[]> = {};
  lezioni.forEach((l) => {
    if (!perGiorno[l.giorno]) perGiorno[l.giorno] = [];
    perGiorno[l.giorno].push(l);
  });

  function elimina(id: number) {
    Alert.alert('Elimina lezione', 'Rimuovere questa lezione dall\'orario?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => { deleteLezione(id); load(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Orario Lezioni</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          {lezioni.length > 0
            ? `${String(lezioni.length)} lezioni — gestiscile dal dettaglio esame`
            : 'Aggiungi lezioni dal dettaglio di ogni esame'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {lezioni.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>Nessuna lezione</Text>
            <Text style={styles.emptyHint}>
              Vai al dettaglio di un esame e aggiungi le lezioni dalla sezione Orario.
            </Text>
          </View>
        )}

        {GIORNI.map((nomeGiorno, idx) => {
          const lez = perGiorno[idx];
          if (!lez || lez.length === 0) return null;
          return (
            <View key={idx} style={styles.giornoSection}>
              <Text style={styles.giornoLabel}>{nomeGiorno.toUpperCase()}</Text>
              {lez.map((l) => (
                <View key={l.id} style={[styles.card, { borderLeftColor: l.colore }]}>
                  <View style={styles.cardContent}>
                    <View style={styles.orarioCol}>
                      <Text style={[styles.ora, { color: l.colore }]}>{l.ora_inizio}</Text>
                      <Text style={styles.oraSep}>↓</Text>
                      <Text style={styles.oraFine}>{l.ora_fine}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text variant="titleSmall" style={styles.nomeEsame} numberOfLines={1}>
                        {l.nome_esame}
                      </Text>
                      {l.professore ? (
                        <Text style={styles.professore} numberOfLines={1}>
                          {l.professore}
                        </Text>
                      ) : null}
                      <View style={[styles.aulaTag, { backgroundColor: l.colore + '22' }]}>
                        <Text style={[styles.aulaText, { color: l.colore }]}>{l.aula}</Text>
                      </View>
                    </View>
                  </View>
                  <IconButton
                    icon="trash-can-outline"
                    size={18}
                    iconColor={colors.textMuted}
                    onPress={() => elimina(l.id)}
                  />
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { color: colors.textPrimary, fontWeight: '800' },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: colors.textSecondary, fontSize: 16, fontWeight: '700' },
  emptyHint: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  giornoSection: { marginBottom: 24 },
  giornoLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 14 },
  orarioCol: { alignItems: 'center', minWidth: 52 },
  ora: { fontSize: 15, fontWeight: '800' },
  oraSep: { color: colors.textMuted, fontSize: 10, lineHeight: 14 },
  oraFine: { color: colors.textSecondary, fontSize: 13 },
  infoCol: { flex: 1, gap: 3 },
  nomeEsame: { color: colors.textPrimary, fontWeight: '700' },
  professore: { color: colors.textSecondary, fontSize: 12 },
  aulaTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  aulaText: { fontSize: 11, fontWeight: '700' },
});
