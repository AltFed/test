import { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Portal, Dialog, Button, Menu } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import {
  getAllEsami,
  insertSessione,
  getOreStudiate,
  getSessioniRecenti,
} from '@/db/database';
import type { Esame, SessioneStudio } from '@/db/types';

const POMODORO_LAVORO = 25 * 60;
const POMODORO_PAUSA = 5 * 60;

type Fase = 'lavoro' | 'pausa';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function StudioScreen() {
  const C = useColors();
  const [esami, setEsami] = useState<Esame[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [fase, setFase] = useState<Fase>('lavoro');
  const [secondi, setSecondi] = useState(POMODORO_LAVORO);
  const [running, setRunning] = useState(false);
  const [sessioni, setSessioni] = useState(0);
  const [sessioniRecenti, setSessioniRecenti] = useState<SessioneStudio[]>([]);
  const [oreTotali, setOreTotali] = useState(0);
  const [roi, setRoi] = useState<{ ore: number; orePerCfu: number } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const baseSecondiRef = useRef<number>(POMODORO_LAVORO);

  useFocusEffect(
    useCallback(() => {
      const list = getAllEsami();
      setEsami(list);
      if (selectedId !== null) refreshStats(selectedId, list);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
      };
    }, [selectedId])
  );

  function refreshStats(id: number, list?: Esame[]) {
    const ore = getOreStudiate(id);
    setOreTotali(ore);
    setSessioniRecenti(getSessioniRecenti(id));
    const src = list ?? esami;
    const esame = src.find((e) => e.id === id);
    if (esame?.superato && esame.voto_finale) {
      setRoi({ ore, orePerCfu: Math.round((ore / esame.cfu) * 10) / 10 });
    } else {
      setRoi(null);
    }
  }

  function seleziona(id: number) {
    if (running) return;
    setSelectedId(id);
    resetTimer();
    refreshStats(id);
    setMenuVisible(false);
  }

  function resetTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setFase('lavoro');
    setSecondi(POMODORO_LAVORO);
    baseSecondiRef.current = POMODORO_LAVORO;
  }

  function startStop() {
    if (!selectedId) return;
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      baseSecondiRef.current = secondi;
      setRunning(false);
    } else {
      startRef.current = Date.now();
      setRunning(true);
    }
  }

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const rimanenti = baseSecondiRef.current - elapsed;
      if (rimanenti <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
        if (fase === 'lavoro') {
          if (selectedId) {
            insertSessione(selectedId, 25);
            setSessioni((s) => s + 1);
            refreshStats(selectedId);
          }
          setFase('pausa');
          setSecondi(POMODORO_PAUSA);
          baseSecondiRef.current = POMODORO_PAUSA;
        } else {
          setFase('lavoro');
          setSecondi(POMODORO_LAVORO);
          baseSecondiRef.current = POMODORO_LAVORO;
        }
      } else {
        setSecondi(rimanenti);
      }
    }, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, fase, selectedId]);

  const esameSelezionato = esami.find((e) => e.id === selectedId);
  const durata = fase === 'lavoro' ? POMODORO_LAVORO : POMODORO_PAUSA;
  const progress = 1 - secondi / durata;
  const faseColor = fase === 'lavoro' ? C.accent : C.success;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.title, { color: C.textPrimary, fontFamily: fonts.dot }]}>Studio</Text>

        {/* Exam selector */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
            ESAME IN ALLENAMENTO
          </Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={[s.selectorBtn, { borderColor: C.border }]}
                onPress={() => !running && setMenuVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={[s.selectorText, { color: esameSelezionato ? C.textPrimary : C.textMuted, fontFamily: fonts.mono }]} numberOfLines={1}>
                  {esameSelezionato ? esameSelezionato.nome : 'Seleziona esame...'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={C.textMuted} />
              </TouchableOpacity>
            }
          >
            {esami.filter((e) => !e.superato).map((e) => (
              <Menu.Item key={e.id} onPress={() => seleziona(e.id)} title={e.nome} />
            ))}
            {esami.filter((e) => !e.superato).length === 0 && (
              <Menu.Item title="Nessun esame da studiare" disabled />
            )}
          </Menu>
        </View>

        {/* Timer */}
        <View style={[s.card, s.timerCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.faseLabel, { color: C.textMuted, fontFamily: fonts.mono }]}>
            {fase === 'lavoro' ? 'SESSIONE FOCUS' : 'PAUSA'}
          </Text>

          <Text style={[s.timerNum, { color: faseColor, fontFamily: fonts.dot }]}>
            {formatTime(secondi)}
          </Text>

          {/* Progress track */}
          <View style={[s.progressTrack, { backgroundColor: C.border }]}>
            <View style={[s.progressFill, { width: `${progress * 100}%` as any, backgroundColor: faseColor }]} />
          </View>

          {/* Buttons */}
          <View style={s.timerBtns}>
            <TouchableOpacity
              style={[
                s.playBtn,
                { backgroundColor: selectedId ? faseColor : C.border },
              ]}
              onPress={startStop}
              disabled={!selectedId}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name={running ? 'pause' : 'play'}
                size={28}
                color={selectedId ? '#000000' : C.textMuted}
              />
            </TouchableOpacity>
            {!running && (
              <TouchableOpacity
                style={[s.resetBtn, { borderColor: C.border }]}
                onPress={resetTimer}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="refresh" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[s.sessioniCount, { color: C.textMuted, fontFamily: fonts.mono }]}>
            Sessioni oggi:{' '}
            <Text style={[s.sessioniCount, { color: faseColor, fontFamily: fonts.dot }]}>
              {String(sessioni)}
            </Text>
          </Text>
        </View>

        {/* Study ROI */}
        {selectedId !== null && (
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              STUDY ROI
            </Text>
            <View style={s.roiRow}>
              <View style={s.roiItem}>
                <Text style={[s.roiNum, { color: C.accent, fontFamily: fonts.dot }]}>
                  {String(oreTotali)}h
                </Text>
                <Text style={[s.roiSub, { color: C.textMuted, fontFamily: fonts.mono }]}>
                  investite
                </Text>
              </View>
              {roi ? (
                <>
                  <View style={[s.roiDivider, { backgroundColor: C.border }]} />
                  <View style={s.roiItem}>
                    <Text style={[s.roiNum, { color: C.success, fontFamily: fonts.dot }]}>
                      {String(roi.orePerCfu)}h
                    </Text>
                    <Text style={[s.roiSub, { color: C.textMuted, fontFamily: fonts.mono }]}>
                      per CFU
                    </Text>
                  </View>
                  <View style={[s.roiDivider, { backgroundColor: C.border }]} />
                  <View style={s.roiItem}>
                    <Text style={[s.roiNum, { color: C.warning, fontFamily: fonts.dot }]}>
                      {esameSelezionato?.voto_finale === 33 ? '30L' : String(esameSelezionato?.voto_finale ?? '—')}
                    </Text>
                    <Text style={[s.roiSub, { color: C.textMuted, fontFamily: fonts.mono }]}>
                      voto
                    </Text>
                  </View>
                </>
              ) : oreTotali === 0 ? (
                <Text style={[s.roiHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
                  Nessuna sessione registrata.
                </Text>
              ) : (
                <Text style={[s.roiHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
                  Registra il voto per sbloccare le statistiche.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Sessioni recenti */}
        {sessioniRecenti.length > 0 && (
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              SESSIONI RECENTI
            </Text>
            {sessioniRecenti.map((sess, i) => (
              <View
                key={sess.id}
                style={[
                  s.sessioneRow,
                  { borderBottomColor: C.border },
                  i === sessioniRecenti.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[s.sessioneMin, { color: C.textPrimary, fontFamily: fonts.dot }]}>
                  {String(sess.durata_minuti)}m
                </Text>
                <Text style={[s.sessioneData, { color: C.textMuted, fontFamily: fonts.mono }]}>
                  {formatData(sess.data)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 36, lineHeight: 38, marginBottom: 4 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  timerCard: { alignItems: 'center', gap: 14 },
  label: { fontSize: 10, letterSpacing: 2, marginBottom: 10 },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selectorText: { fontSize: 14, flex: 1 },
  faseLabel: { fontSize: 11, letterSpacing: 2 },
  timerNum: { fontSize: 88, lineHeight: 88 },
  progressTrack: { width: '100%', height: 2, borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%' },
  timerBtns: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessioniCount: { fontSize: 13 },
  roiRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roiItem: { flex: 1, alignItems: 'center', gap: 2 },
  roiNum: { fontSize: 36, lineHeight: 38 },
  roiSub: { fontSize: 11, letterSpacing: 0.5 },
  roiDivider: { width: 1, height: 44 },
  roiHint: { flex: 1, fontSize: 12, lineHeight: 18 },
  sessioneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessioneMin: { fontSize: 24, lineHeight: 26 },
  sessioneData: { fontSize: 12 },
});
