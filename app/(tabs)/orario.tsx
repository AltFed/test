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
const GIORNI_SHORT = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

// JS getDay(): 0=Sun,1=Mon..6=Sat → our giorno: 0=Mon..6=Sun
function jsGiornoToOur(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

type LessonStatus = 'past' | 'now' | 'next' | 'future';

function getLessonStatuses(lezioni: LezioneConEsame[]): Map<number, LessonStatus> {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const map = new Map<number, LessonStatus>();
  let foundNext = false;
  // sort by start time to find "next" correctly
  const sorted = [...lezioni].sort((a, b) => timeToMinutes(a.ora_inizio) - timeToMinutes(b.ora_inizio));
  for (const l of sorted) {
    const start = timeToMinutes(l.ora_inizio);
    const end = timeToMinutes(l.ora_fine);
    if (nowMin >= start && nowMin < end) {
      map.set(l.id, 'now');
    } else if (nowMin < start && !foundNext) {
      map.set(l.id, 'next');
      foundNext = true;
    } else if (nowMin >= end) {
      map.set(l.id, 'past');
    } else {
      map.set(l.id, 'future');
    }
  }
  return map;
}

export default function OrarioScreen() {
  const C = useColors();
  const [lezioni, setLezioni] = useState<LezioneConEsame[]>([]);
  const [nowMin, setNowMin] = useState(0);

  const load = useCallback(() => {
    setLezioni(getAllLezioniConEsame());
    const n = new Date();
    setNowMin(n.getHours() * 60 + n.getMinutes());
  }, []);

  useFocusEffect(load);

  const today = jsGiornoToOur(new Date().getDay());
  const todayName = GIORNI[today];
  const lezioniOggi = lezioni.filter((l) => l.giorno === today);
  const statuses = getLessonStatuses(lezioniOggi);

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

        {/* ── OGGI ── */}
        {lezioniOggi.length > 0 && (
          <View style={s.oggiSection}>
            <View style={s.oggiHeader}>
              <Text style={[s.oggiLabel, { color: C.accent, fontFamily: fonts.mono }]}>
                OGGI
              </Text>
              <Text style={[s.oggiGiorno, { color: C.textSecondary, fontFamily: fonts.mono }]}>
                {todayName.toUpperCase()}
              </Text>
            </View>
            {lezioniOggi
              .sort((a, b) => timeToMinutes(a.ora_inizio) - timeToMinutes(b.ora_inizio))
              .map((l) => {
                const status = statuses.get(l.id) ?? 'future';
                const isPast = status === 'past';
                return (
                  <View
                    key={l.id}
                    style={[
                      s.oggiCard,
                      {
                        backgroundColor: C.card,
                        borderColor: isPast ? C.border : l.colore,
                        borderLeftColor: isPast ? C.border : l.colore,
                        opacity: isPast ? 0.45 : 1,
                      },
                    ]}
                  >
                    <View style={s.oggiOrarioCol}>
                      <Text style={[s.oggiOra, { color: isPast ? C.textMuted : l.colore, fontFamily: fonts.dot }]}>
                        {l.ora_inizio}
                      </Text>
                      <Text style={[s.oggiSep, { color: C.textMuted, fontFamily: fonts.mono }]}>↓</Text>
                      <Text style={[s.oggiOraFine, { color: C.textMuted, fontFamily: fonts.dot }]}>
                        {l.ora_fine}
                      </Text>
                    </View>
                    <View style={s.oggiInfo}>
                      <Text style={[s.oggiNome, { color: C.textPrimary, fontFamily: fonts.mono }]} numberOfLines={1}>
                        {l.nome_esame}
                      </Text>
                      <View style={[s.aulaTag, { backgroundColor: l.colore + '22', borderColor: l.colore + '55' }]}>
                        <Text style={[s.aulaText, { color: l.colore, fontFamily: fonts.mono }]}>
                          {l.aula}
                        </Text>
                      </View>
                    </View>
                    {(status === 'now' || status === 'next') && (
                      <View
                        style={[
                          s.statusBadge,
                          { backgroundColor: status === 'now' ? l.colore : C.accentDim, borderColor: status === 'now' ? l.colore : C.accent },
                        ]}
                      >
                        <Text style={[s.statusText, { color: status === 'now' ? '#000000' : C.accent, fontFamily: fonts.mono }]}>
                          {status === 'now' ? 'ORA' : 'PROX'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        )}

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

        {/* ── SETTIMANA ── */}
        {lezioni.length > 0 && (
          <Text style={[s.weekLabel, { color: C.textMuted, fontFamily: fonts.mono }]}>
            SETTIMANA
          </Text>
        )}

        {GIORNI.map((nomeGiorno, idx) => {
          const lez = perGiorno[idx];
          if (!lez || lez.length === 0) return null;
          const isToday = idx === today;
          return (
            <View key={idx} style={s.giornoSection}>
              <View style={s.giornoHeaderRow}>
                <Text style={[s.giornoLabel, { color: isToday ? C.accent : C.textSecondary, fontFamily: fonts.mono }]}>
                  {nomeGiorno.toUpperCase()}
                </Text>
                {isToday && (
                  <View style={[s.todayDot, { backgroundColor: C.accent }]} />
                )}
              </View>
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
  // ── OGGI ──
  oggiSection: { marginBottom: 24 },
  oggiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  oggiLabel: { fontSize: 10, letterSpacing: 2 },
  oggiGiorno: { fontSize: 10, letterSpacing: 1 },
  oggiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  oggiOrarioCol: { alignItems: 'center', minWidth: 52 },
  oggiOra: { fontSize: 20, lineHeight: 22 },
  oggiSep: { fontSize: 10 },
  oggiOraFine: { fontSize: 16, lineHeight: 18 },
  oggiInfo: { flex: 1, gap: 4 },
  oggiNome: { fontSize: 14, fontWeight: '600' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  // ── SETTIMANA ──
  weekLabel: { fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  giornoSection: { marginBottom: 24 },
  giornoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  giornoLabel: { fontSize: 10, letterSpacing: 2 },
  todayDot: { width: 5, height: 5, borderRadius: 3 },
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
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyNum: { fontSize: 64, lineHeight: 64 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
