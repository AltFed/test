import { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Portal, Dialog, Button, Menu, TextInput } from 'react-native-paper';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import {
  getAllEsami,
  insertSessione,
  getOreStudiate,
  getSessioniRecenti,
  getMinutiStudioOggi,
  getSetting,
  setSetting,
  countFlashcard,
} from '@/db/database';
import type { Esame, SessioneStudio } from '@/db/types';

const DEEP_WORK_LIMIT = 240;

type Fase = 'lavoro' | 'pausa';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatMinuti(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${min}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function getBudgetCutoff(): string {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const resetTs = getSetting('deep_work_reset_ts');
  return resetTs && resetTs > startOfToday.toISOString()
    ? resetTs
    : startOfToday.toISOString();
}

export default function StudioScreen() {
  const C = useColors();
  const [esami, setEsami] = useState<Esame[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [fase, setFase] = useState<Fase>('lavoro');
  const [secondi, setSecondi] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessioni, setSessioni] = useState(0);
  const [sessioniRecenti, setSessioniRecenti] = useState<SessioneStudio[]>([]);
  const [oreTotali, setOreTotali] = useState(0);
  const [roi, setRoi] = useState<{ ore: number; orePerCfu: number } | null>(null);
  const [minutiOggi, setMinutiOggi] = useState(0);
  const [lavoroMin, setLavoroMin] = useState(25);
  const [pausaMin, setPausaMin] = useState(5);
  const [showManifesto, setShowManifesto] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settLavoroStr, setSettLavoroStr] = useState('25');
  const [settPausaStr, setSettPausaStr] = useState('5');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const baseSecondiRef = useRef<number>(25 * 60);

  const shallowMode = minutiOggi >= DEEP_WORK_LIMIT;

  useFocusEffect(
    useCallback(() => {
      const list = getAllEsami();
      setEsami(list);

      const lav = parseInt(getSetting('pomodoro_lavoro') ?? '25', 10);
      const pau = parseInt(getSetting('pomodoro_pausa') ?? '5', 10);
      setLavoroMin(lav);
      setPausaMin(pau);
      setSettLavoroStr(String(lav));
      setSettPausaStr(String(pau));
      if (!running) {
        setSecondi(lav * 60);
        baseSecondiRef.current = lav * 60;
        setFase('lavoro');
      }

      setMinutiOggi(getMinutiStudioOggi(getBudgetCutoff()));

      if (!getSetting('trainer_visto')) {
        setShowManifesto(true);
      }

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
    setSecondi(lavoroMin * 60);
    baseSecondiRef.current = lavoroMin * 60;
  }

  function resetBudget() {
    setSetting('deep_work_reset_ts', new Date().toISOString());
    setMinutiOggi(0);
  }

  function salvaSettings() {
    const lav = Math.max(1, Math.min(120, parseInt(settLavoroStr, 10) || 25));
    const pau = Math.max(1, Math.min(60, parseInt(settPausaStr, 10) || 5));
    setSetting('pomodoro_lavoro', String(lav));
    setSetting('pomodoro_pausa', String(pau));
    setLavoroMin(lav);
    setPausaMin(pau);
    if (!running) {
      setSecondi(lav * 60);
      baseSecondiRef.current = lav * 60;
      setFase('lavoro');
    }
    setShowSettings(false);
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
            insertSessione(selectedId, lavoroMin);
            setSessioni((s) => s + 1);
            refreshStats(selectedId);
            const newMinuti = getMinutiStudioOggi(getBudgetCutoff());
            setMinutiOggi(newMinuti);
          }
          setFase('pausa');
          setSecondi(pausaMin * 60);
          baseSecondiRef.current = pausaMin * 60;
        } else {
          setFase('lavoro');
          setSecondi(lavoroMin * 60);
          baseSecondiRef.current = lavoroMin * 60;
        }
      } else {
        setSecondi(rimanenti);
      }
    }, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, fase, selectedId, lavoroMin, pausaMin]);

  const esameSelezionato = esami.find((e) => e.id === selectedId);
  const durata = fase === 'lavoro' ? lavoroMin * 60 : pausaMin * 60;
  const progress = 1 - secondi / durata;
  const deepColor = shallowMode ? C.warning : C.accent;
  const faseColor = fase === 'lavoro' ? deepColor : C.success;
  const budgetProgress = Math.min(minutiOggi / DEEP_WORK_LIMIT, 1);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.title, { color: C.textPrimary, fontFamily: fonts.dot }]}>Studio</Text>

        {/* Deep Work Budget */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: shallowMode ? C.warning + '66' : C.border }]}>
          <View style={s.budgetHeader}>
            <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono, marginBottom: 0 }]}>
              DEEP WORK BUDGET
            </Text>
            <TouchableOpacity onPress={resetBudget} style={s.resetBudgetBtn}>
              <MaterialCommunityIcons name="refresh" size={13} color={C.textMuted} />
              <Text style={[s.resetBudgetText, { color: C.textMuted, fontFamily: fonts.mono }]}>RESET</Text>
            </TouchableOpacity>
          </View>
          <View style={s.budgetRow}>
            <Text style={[s.budgetNum, { color: deepColor, fontFamily: fonts.dot }]}>
              {formatMinuti(minutiOggi)}
            </Text>
            <Text style={[s.budgetOf, { color: C.textMuted, fontFamily: fonts.mono }]}>
              {' / 4h'}
            </Text>
          </View>
          <View style={[s.progressTrack, { backgroundColor: C.border }]}>
            <View style={[s.progressFill, { width: `${budgetProgress * 100}%` as any, backgroundColor: deepColor }]} />
          </View>
          {shallowMode && (
            <View style={[s.shallowBanner, { backgroundColor: C.warning + '22', borderColor: C.warning + '55' }]}>
              <MaterialCommunityIcons name="brain" size={14} color={C.warning} />
              <Text style={[s.shallowText, { color: C.warning, fontFamily: fonts.mono }]}>
                Budget cognitivo esaurito. Sei in Shallow Zone — puoi continuare, ma il deep focus è degradato.
              </Text>
            </View>
          )}
        </View>

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
                <Text
                  style={[s.selectorText, { color: esameSelezionato ? C.textPrimary : C.textMuted, fontFamily: fonts.mono }]}
                  numberOfLines={1}
                >
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
          <View style={s.timerTopRow}>
            <Text style={[s.faseLabel, { color: shallowMode && fase === 'lavoro' ? C.warning : C.textMuted, fontFamily: fonts.mono }]}>
              {fase === 'lavoro' ? (shallowMode ? 'SHALLOW ZONE' : 'SESSIONE FOCUS') : 'PAUSA'}
            </Text>
            <TouchableOpacity
              onPress={() => !running && setShowSettings(true)}
              style={s.settingsIcon}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="tune-variant" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[s.timerNum, { color: faseColor, fontFamily: fonts.dot }]}>
            {formatTime(secondi)}
          </Text>

          <View style={[s.progressTrack, { backgroundColor: C.border }]}>
            <View style={[s.progressFill, { width: `${progress * 100}%` as any, backgroundColor: faseColor }]} />
          </View>

          <View style={s.timerBtns}>
            <TouchableOpacity
              style={[s.playBtn, { backgroundColor: selectedId ? faseColor : C.border }]}
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
            {'Sessioni oggi: '}
            <Text style={{ color: faseColor, fontFamily: fonts.dot }}>{String(sessioni)}</Text>
            {'  ·  '}
            {`${lavoroMin}m + ${pausaMin}m`}
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

        {/* Flashcard */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
            FLASHCARD
          </Text>
          {esami.length === 0 ? (
            <Text style={[s.sessioneData, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Aggiungi un esame per creare un deck.
            </Text>
          ) : (
            esami.map((e) => {
              const n = countFlashcard(e.id);
              return (
                <TouchableOpacity
                  key={e.id}
                  style={[s.flashRow, { borderBottomColor: C.border }]}
                  onPress={() => router.push(`/flashcard/${e.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.flashNome, { color: C.textPrimary, fontFamily: fonts.mono }]} numberOfLines={1}>
                      {e.nome}
                    </Text>
                  </View>
                  <View style={[s.flashCount, { backgroundColor: n > 0 ? C.accentDim : C.border }]}>
                    <Text style={[s.flashCountText, { color: n > 0 ? C.accent : C.textMuted, fontFamily: fonts.dot }]}>
                      {String(n)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={C.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </ScrollView>

      <Portal>
        {/* Manifesto — primo accesso */}
        <Dialog
          visible={showManifesto}
          onDismiss={() => {}}
          dismissable={false}
          style={[s.dialog, { backgroundColor: C.surface }]}
        >
          <Dialog.Title style={[s.dialogTitle, { color: C.textPrimary, fontFamily: fonts.dot }]}>
            Personal Trainer
          </Dialog.Title>
          <Dialog.Content style={s.dialogContent}>
            <Text style={[s.manifestoHeading, { color: C.accent, fontFamily: fonts.mono }]}>
              LA REGOLA DELLE 4 ORE
            </Text>
            <Text style={[s.manifestoBody, { color: C.textPrimary, fontFamily: fonts.mono }]}>
              Cal Newport lo ha dimostrato: il cervello umano non può sostenere più di 4 ore di concentrazione profonda al giorno.
            </Text>
            <Text style={[s.manifestoBody, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              {'Studiare 10 ore di fila non è produttività — è '}
              <Text style={{ color: C.warning }}>burnout</Text>
              {'. Oltre il limite entri in Shallow Zone: meno memoria, meno comprensione.'}
            </Text>
            <Text style={[s.manifestoBody, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              Questa app traccia il tuo budget cognitivo. Quando lo esaurisci, te lo segnala. Puoi continuare — ma sarai avvisato.
            </Text>
            <Text style={[s.manifestoMotto, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Il focus chirurgico batte sempre la maratona.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              mode="contained"
              onPress={() => { setSetting('trainer_visto', '1'); setShowManifesto(false); }}
              buttonColor={C.accent}
              textColor="#000"
              style={{ flex: 1 }}
            >
              Ho capito — inizia
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Settings Pomodoro */}
        <Dialog
          visible={showSettings}
          onDismiss={() => setShowSettings(false)}
          style={[s.dialog, { backgroundColor: C.surface }]}
        >
          <Dialog.Title style={[s.dialogTitle, { color: C.textPrimary, fontFamily: fonts.mono }]}>
            Configura Pomodoro
          </Dialog.Title>
          <Dialog.Content style={s.dialogContent}>
            <TextInput
              label="Focus (minuti)"
              value={settLavoroStr}
              onChangeText={setSettLavoroStr}
              keyboardType="numeric"
              mode="outlined"
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
              style={{ backgroundColor: C.card }}
            />
            <TextInput
              label="Pausa (minuti)"
              value={settPausaStr}
              onChangeText={setSettPausaStr}
              keyboardType="numeric"
              mode="outlined"
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
              style={{ backgroundColor: C.card }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={C.textSecondary} onPress={() => setShowSettings(false)}>Annulla</Button>
            <Button mode="contained" onPress={salvaSettings} buttonColor={C.accent} textColor="#000">
              Salva
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  title: { fontSize: 36, lineHeight: 38, marginBottom: 4 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  timerCard: { alignItems: 'center', gap: 14 },
  label: { fontSize: 10, letterSpacing: 2, marginBottom: 10 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resetBudgetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetBudgetText: { fontSize: 10, letterSpacing: 1 },
  budgetRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 },
  budgetNum: { fontSize: 36, lineHeight: 38 },
  budgetOf: { fontSize: 14 },
  shallowBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  shallowText: { flex: 1, fontSize: 11, lineHeight: 16 },
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
  timerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  faseLabel: { fontSize: 11, letterSpacing: 2 },
  settingsIcon: { padding: 4 },
  timerNum: { fontSize: 88, lineHeight: 88 },
  progressTrack: { width: '100%', height: 2, borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%' },
  timerBtns: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  playBtn: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  resetBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sessioniCount: { fontSize: 12 },
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
  dialog: { borderRadius: 20 },
  dialogTitle: { fontSize: 20 },
  dialogContent: { gap: 12 },
  manifestoHeading: { fontSize: 11, letterSpacing: 2 },
  manifestoBody: { fontSize: 13, lineHeight: 20 },
  manifestoMotto: { fontSize: 12, lineHeight: 18, fontStyle: 'italic', marginTop: 4 },
  flashRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  flashNome: { fontSize: 13 },
  flashCount: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  flashCountText: { fontSize: 20, lineHeight: 22 },
});
