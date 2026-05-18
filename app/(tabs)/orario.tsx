import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors, fonts } from '@/theme';
import { SwipeableRow } from '@/components/SwipeableRow';
import { getAllLezioniConEsame, deleteLezione } from '@/db/database';
import type { LezioneConEsame } from '@/db/types';

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export default function OrarioScreen() {
  const C = useColors();
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

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <View style={s.header}>
        <Text style={[s.title, { color: C.textPrimary, fontFamily: fonts.dot }]}>Orario</Text>
        <Text style={[s.subtitle, { color: C.textMuted, fontFamily: fonts.mono }]}>
          {lezioni.length > 0
            ? `${String(lezioni.length)} lezioni — gestisci dal dettaglio esame`
            : 'Aggiungi lezioni dal dettaglio esame'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {lezioni.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={[s.emptyNum, { color: C.accent, fontFamily: fonts.dot }]}>00</Text>
            <Text style={[s.emptyTitle, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              Nessuna lezione
            </Text>
            <Text style={[s.emptyHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Vai al dettaglio di un esame{'\n'}e aggiungi le lezioni dalla sezione Orario.
            </Text>
          </View>
        )}

        {GIORNI.map((nomeGiorno, idx) => {
          const lez = perGiorno[idx];
          if (!lez || lez.length === 0) return null;
          return (
            <View key={idx} style={s.giornoSection}>
              <Text style={[s.giornoLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
                {nomeGiorno.toUpperCase()}
              </Text>
              {lez.map((l) => (
                <SwipeableRow
                  key={l.id}
                  onDelete={() => { deleteLezione(l.id); load(); }}
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderLeftWidth: 3,
                    borderColor: C.border,
                    borderLeftColor: l.colore,
                    marginBottom: 8,
                  }}
                >
                  <View style={[s.card, { backgroundColor: C.card }]}>
                    <View style={s.orarioCol}>
                      <Text style={[s.ora, { color: l.colore, fontFamily: fonts.dot }]}>
                        {l.ora_inizio}
                      </Text>
                      <Text style={[s.oraSep, { color: C.textMuted, fontFamily: fonts.mono }]}>↓</Text>
                      <Text style={[s.oraFine, { color: C.textSecondary, fontFamily: fonts.dot }]}>
                        {l.ora_fine}
                      </Text>
                    </View>
                    <View style={s.infoCol}>
                      <Text style={[s.nomeEsame, { color: C.textPrimary, fontFamily: fonts.mono }]} numberOfLines={1}>
                        {l.nome_esame}
                      </Text>
                      {l.professore ? (
                        <Text style={[s.profText, { color: C.textSecondary, fontFamily: fonts.mono }]} numberOfLines={1}>
                          {l.professore}
                        </Text>
                      ) : null}
                      <View style={[s.aulaTag, { backgroundColor: l.colore + '22', borderColor: l.colore + '55' }]}>
                        <Text style={[s.aulaText, { color: l.colore, fontFamily: fonts.mono }]}>
                          {l.aula}
                        </Text>
                      </View>
                    </View>
                  </View>
                </SwipeableRow>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 36, lineHeight: 38 },
  subtitle: { fontSize: 12, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyNum: { fontSize: 64, lineHeight: 64 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  giornoSection: { marginBottom: 24 },
  giornoLabel: { fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 14,
  },
  orarioCol: { alignItems: 'center', minWidth: 52 },
  ora: { fontSize: 20, lineHeight: 22 },
  oraSep: { fontSize: 10 },
  oraFine: { fontSize: 16, lineHeight: 18 },
  infoCol: { flex: 1, gap: 3 },
  nomeEsame: { fontSize: 14, fontWeight: '600' },
  profText: { fontSize: 11 },
  aulaTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  aulaText: { fontSize: 11, fontWeight: '700' },
});
