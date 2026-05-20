import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import { SwipeableRow } from '@/components/SwipeableRow';
import {
  getAllLezioniConEsame, deleteLezione,
  getBlocchiOccupati, insertBlocco, deleteBlocco,
  getPianoSessioni, generatePiano,
} from '@/db/database';
import type { LezioneConEsame, BloccoOccupato, PianoSessioneConTask } from '@/db/types';

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const GIORNI_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MESI_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${GIORNI_SHORT[d.getDay()]} ${d.getDate()} ${MESI_SHORT[d.getMonth()]}`;
}

function diffColor(d: number, C: ReturnType<typeof import('@/theme').useColors>): string {
  if (d <= 3) return C.success;
  if (d <= 6) return C.warning;
  return C.destructive;
}

export default function OrarioScreen() {
  const C = useColors();
  const [lezioni, setLezioni] = useState<LezioneConEsame[]>([]);
  const [piano, setPiano] = useState<PianoSessioneConTask[]>([]);
  const [blocchi, setBlocchi] = useState<BloccoOccupato[]>([]);

  const [showBloccoDialog, setShowBloccoDialog] = useState(false);
  const [bData, setBData] = useState('');
  const [bInizio, setBInizio] = useState('');
  const [bFine, setBFine] = useState('');
  const [bEtichetta, setBEtichetta] = useState('');

  const load = useCallback(() => {
    setLezioni(getAllLezioniConEsame());
    setPiano(getPianoSessioni());
    setBlocchi(getBlocchiOccupati());
  }, []);

  useFocusEffect(load);

  function handleGenera() {
    generatePiano();
    setPiano(getPianoSessioni());
  }

  function salvaBlocco() {
    if (!bData.trim() || !bInizio.trim() || !bFine.trim()) return;
    insertBlocco(bData.trim(), bInizio.trim(), bFine.trim(), bEtichetta.trim() || undefined);
    setBData(''); setBInizio(''); setBFine(''); setBEtichetta('');
    setShowBloccoDialog(false);
    load();
  }

  const perGiorno: Record<number, LezioneConEsame[]> = {};
  lezioni.forEach((l) => {
    if (!perGiorno[l.giorno]) perGiorno[l.giorno] = [];
    perGiorno[l.giorno].push(l);
  });

  // Group piano sessions by date
  const pianoPerData: Record<string, PianoSessioneConTask[]> = {};
  piano.forEach((p) => {
    if (!pianoPerData[p.data]) pianoPerData[p.data] = [];
    pianoPerData[p.data].push(p);
  });
  const pianoDates = Object.keys(pianoPerData).sort();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <View style={s.header}>
        <Text style={[s.title, { color: C.textPrimary, fontFamily: fonts.dot }]}>Orario</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* ── Lezioni ── */}
        <Text style={[s.sectionLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
          LEZIONI SETTIMANALI
        </Text>

        {lezioni.length === 0 && (
          <View style={[s.emptyBox, { borderColor: C.border }]}>
            <Text style={[s.emptyHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Aggiungi lezioni dal dettaglio esame.
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
                    borderRadius: 14, borderWidth: 1, borderLeftWidth: 3,
                    borderColor: C.border, borderLeftColor: l.colore, marginBottom: 8,
                  }}
                >
                  <View style={[s.card, { backgroundColor: C.card }]}>
                    <View style={s.orarioCol}>
                      <Text style={[s.ora, { color: l.colore, fontFamily: fonts.dot }]}>{l.ora_inizio}</Text>
                      <Text style={[s.oraSep, { color: C.textMuted, fontFamily: fonts.mono }]}>↓</Text>
                      <Text style={[s.oraFine, { color: C.textSecondary, fontFamily: fonts.dot }]}>{l.ora_fine}</Text>
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
                        <Text style={[s.aulaText, { color: l.colore, fontFamily: fonts.mono }]}>{l.aula}</Text>
                      </View>
                    </View>
                  </View>
                </SwipeableRow>
              ))}
            </View>
          );
        })}

        {/* ── Divider ── */}
        <View style={[s.divider, { backgroundColor: C.border }]} />

        {/* ── Piano Studio ── */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
            PIANO STUDIO
          </Text>
          <TouchableOpacity
            style={[s.actionBtn, { borderColor: C.accent }]}
            onPress={handleGenera}
          >
            <MaterialCommunityIcons name="refresh" size={12} color={C.accent} />
            <Text style={[s.actionBtnText, { color: C.accent, fontFamily: fonts.mono }]}>GENERA</Text>
          </TouchableOpacity>
        </View>

        {pianoDates.length === 0 ? (
          <View style={[s.emptyBox, { borderColor: C.border }]}>
            <Text style={[s.emptyHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Aggiungi task dal dettaglio esame, poi premi GENERA.
            </Text>
          </View>
        ) : null}

        {pianoDates.map((dateStr) => (
          <View key={dateStr} style={s.giornoSection}>
            <Text style={[s.giornoLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              {formatDateLabel(dateStr).toUpperCase()}
            </Text>
            {pianoPerData[dateStr].map((p) => {
              const dc = diffColor(p.difficolta, C);
              return (
                <View
                  key={p.id}
                  style={[s.pianoCard, { backgroundColor: C.card, borderColor: C.border, borderLeftColor: dc }]}
                >
                  <View style={s.orarioCol}>
                    <Text style={[s.ora, { color: dc, fontFamily: fonts.dot }]}>{p.ora_inizio}</Text>
                    <Text style={[s.oraSep, { color: C.textMuted, fontFamily: fonts.mono }]}>↓</Text>
                    <Text style={[s.oraFine, { color: C.textSecondary, fontFamily: fonts.dot }]}>{p.ora_fine}</Text>
                  </View>
                  <View style={s.infoCol}>
                    <Text style={[s.nomeEsame, { color: C.textPrimary, fontFamily: fonts.mono }]} numberOfLines={1}>
                      {p.nome_task}
                    </Text>
                    <Text style={[s.profText, { color: C.textSecondary, fontFamily: fonts.mono }]} numberOfLines={1}>
                      {p.nome_esame}
                    </Text>
                    <View style={s.pianoMeta}>
                      <View style={[s.diffBadge, { backgroundColor: dc + '22', borderColor: dc + '55' }]}>
                        <Text style={[s.diffText, { color: dc, fontFamily: fonts.mono }]}>
                          DIFF {String(p.difficolta)}
                        </Text>
                      </View>
                      <Text style={[s.oreText, { color: C.textMuted, fontFamily: fonts.mono }]}>
                        {String(Math.round(p.ore_pianificate * 10) / 10)}h
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {/* ── Divider ── */}
        <View style={[s.divider, { backgroundColor: C.border }]} />

        {/* ── Blocchi Occupati ── */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
            BLOCCHI OCCUPATI
          </Text>
          <TouchableOpacity
            style={[s.actionBtn, { borderColor: C.border }]}
            onPress={() => setShowBloccoDialog(true)}
          >
            <MaterialCommunityIcons name="plus" size={12} color={C.textSecondary} />
            <Text style={[s.actionBtnText, { color: C.textSecondary, fontFamily: fonts.mono }]}>ADD</Text>
          </TouchableOpacity>
        </View>

        {blocchi.length === 0 ? (
          <View style={[s.emptyBox, { borderColor: C.border }]}>
            <Text style={[s.emptyHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Nessun blocco. Il piano usa 08:00–22:00 come finestra disponibile.
            </Text>
          </View>
        ) : null}

        {blocchi.map((b) => (
          <SwipeableRow
            key={b.id}
            onDelete={() => { deleteBlocco(b.id); load(); }}
            style={{ borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 }}
          >
            <View style={[s.bloccoCard, { backgroundColor: C.card }]}>
              <View style={s.orarioCol}>
                <Text style={[s.ora, { color: C.textSecondary, fontFamily: fonts.dot }]}>{b.ora_inizio}</Text>
                <Text style={[s.oraSep, { color: C.textMuted, fontFamily: fonts.mono }]}>↓</Text>
                <Text style={[s.oraFine, { color: C.textMuted, fontFamily: fonts.dot }]}>{b.ora_fine}</Text>
              </View>
              <View style={s.infoCol}>
                <Text style={[s.nomeEsame, { color: C.textPrimary, fontFamily: fonts.mono }]}>
                  {formatDateLabel(b.data)}
                </Text>
                {b.etichetta ? (
                  <Text style={[s.profText, { color: C.textMuted, fontFamily: fonts.mono }]}>
                    {b.etichetta}
                  </Text>
                ) : null}
              </View>
            </View>
          </SwipeableRow>
        ))}

      </ScrollView>

      {/* Dialog blocco occupato */}
      <Portal>
        <Dialog
          visible={showBloccoDialog}
          onDismiss={() => setShowBloccoDialog(false)}
          style={[s.dialog, { backgroundColor: C.surface }]}
        >
          <Dialog.Title style={[s.dialogTitle, { color: C.textPrimary, fontFamily: fonts.mono }]}>
            Blocco Occupato
          </Dialog.Title>
          <Dialog.Content style={s.dialogContent}>
            <TextInput
              label="Data (AAAA-MM-GG)"
              value={bData}
              onChangeText={setBData}
              mode="outlined"
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
              style={[s.input, { backgroundColor: C.card }]}
              placeholder="2025-06-10"
              placeholderTextColor={C.textMuted}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput
                label="Inizio (HH:MM)"
                value={bInizio}
                onChangeText={setBInizio}
                mode="outlined"
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                style={[s.input, { flex: 1, backgroundColor: C.card }]}
              />
              <TextInput
                label="Fine (HH:MM)"
                value={bFine}
                onChangeText={setBFine}
                mode="outlined"
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                style={[s.input, { flex: 1, backgroundColor: C.card }]}
              />
            </View>
            <TextInput
              label="Etichetta (opzionale)"
              value={bEtichetta}
              onChangeText={setBEtichetta}
              mode="outlined"
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
              style={[s.input, { backgroundColor: C.card }]}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={C.textSecondary} onPress={() => setShowBloccoDialog(false)}>Annulla</Button>
            <Button
              mode="contained"
              onPress={salvaBlocco}
              disabled={!bData.trim() || !bInizio.trim() || !bFine.trim()}
              buttonColor={C.accent}
              textColor="#000"
            >
              Aggiungi
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 36, lineHeight: 38 },
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 10, letterSpacing: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 11, letterSpacing: 0.5 },
  divider: { height: 1, marginVertical: 20 },
  emptyBox: { borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', padding: 16, marginBottom: 12 },
  emptyHint: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  giornoSection: { marginBottom: 20 },
  giornoLabel: { fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 14 },
  pianoCard: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 14, borderRadius: 14, borderWidth: 1, borderLeftWidth: 3, marginBottom: 8 },
  bloccoCard: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 14 },
  orarioCol: { alignItems: 'center', minWidth: 52 },
  ora: { fontSize: 20, lineHeight: 22 },
  oraSep: { fontSize: 10 },
  oraFine: { fontSize: 16, lineHeight: 18 },
  infoCol: { flex: 1, gap: 3 },
  nomeEsame: { fontSize: 14, fontWeight: '600' },
  profText: { fontSize: 11 },
  aulaTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, marginTop: 2 },
  aulaText: { fontSize: 11, fontWeight: '700' },
  pianoMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth },
  diffText: { fontSize: 10, fontWeight: '700' },
  oreText: { fontSize: 11 },
  dialog: { borderRadius: 20 },
  dialogTitle: { fontSize: 18 },
  dialogContent: { gap: 12 },
  input: {},
});
