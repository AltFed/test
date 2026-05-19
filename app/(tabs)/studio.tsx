import { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Menu, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import { SwipeableRow } from '@/components/SwipeableRow';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors, fonts } from '@/theme';
import { FatigueRing } from '@/components/FatigueRing';
import { MorningCheckIn } from '@/components/MorningCheckIn';
import { CooldownSheet } from '@/components/CooldownSheet';
import { FlashCard } from '@/components/FlashCard';
import {
  getAllEsami,
  insertSessione,
  getOreStudiate,
  getSessioniRecenti,
  getSessioniOggiTotali,
  getSetting,
  setSetting,
  getFlashcard,
  insertFlashcard,
  deleteFlashcard,
} from '@/db/database';
import type { Esame, SessioneStudio, Flashcard } from '@/db/types';

const POMODORO_LAVORO = 25 * 60;
const POMODORO_PAUSA = 5 * 60;
const AMBER = '#CC8800';

type Fase = 'lavoro' | 'pausa';
type Mode = 'timer' | 'flashcard';

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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function StudioScreen() {
  const C = useColors();

  // ── shared ──
  const [mode, setMode] = useState<Mode>('timer');
  const [esami, setEsami] = useState<Esame[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  // ── timer ──
  const [fase, setFase] = useState<Fase>('lavoro');
  const [secondi, setSecondi] = useState(POMODORO_LAVORO);
  const [running, setRunning] = useState(false);
  const [sessioniOggi, setSessioniOggi] = useState(0);
  const [budget, setBudget] = useState(6);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCooldown, setShowCooldown] = useState(false);
  const [sessioniRecenti, setSessioniRecenti] = useState<SessioneStudio[]>([]);
  const [oreTotali, setOreTotali] = useState(0);
  const [roi, setRoi] = useState<{ ore: number; orePerCfu: number } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const baseSecondiRef = useRef<number>(POMODORO_LAVORO);

  // ── flashcard ──
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [sessionSo, setSessionSo] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [newFronte, setNewFronte] = useState('');
  const [newRetro, setNewRetro] = useState('');
  const [newFoto, setNewFoto] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);

  useFocusEffect(
    useCallback(() => {
      const list = getAllEsami();
      setEsami(list);

      const oggi = todayStr();
      const ultimaCheckin = getSetting('ultima_checkin');
      setShowCheckIn(ultimaCheckin !== oggi);

      const storedBudget = getSetting('budget_odierno');
      if (storedBudget) setBudget(parseInt(storedBudget, 10));

      const cnt = getSessioniOggiTotali();
      setSessioniOggi(cnt);

      if (selectedId !== null) {
        refreshStats(selectedId, list);
        loadDeck(selectedId);
      }

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

  function loadDeck(id: number) {
    const cards = getFlashcard(id);
    setAllCards(cards);
    setDeck(shuffle(cards));
    setDeckIndex(0);
    setSessionSo(0);
    setSessionDone(false);
  }

  function eliminaFlashcard(id: number) {
    deleteFlashcard(id);
    if (selectedId !== null) loadDeck(selectedId);
  }

  function handleCheckIn(b: number) {
    const oggi = todayStr();
    setSetting('ultima_checkin', oggi);
    setSetting('budget_odierno', String(b));
    setBudget(b);
    setShowCheckIn(false);
  }

  function seleziona(id: number) {
    if (running) return;
    setSelectedId(id);
    resetTimer();
    refreshStats(id);
    loadDeck(id);
    setMenuVisible(false);
  }

  // ── Timer logic ──

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
      if (fase === 'lavoro' && sessioniOggi >= budget) {
        setShowCooldown(true);
        return;
      }
      actuallyStart();
    }
  }

  function actuallyStart() {
    setShowCooldown(false);
    startRef.current = Date.now();
    setRunning(true);
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
            const cnt = getSessioniOggiTotali();
            setSessioniOggi(cnt);
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

  // ── Flashcard logic ──

  function handleSo() {
    setSessionSo((n) => n + 1);
    advance();
  }

  function handleRipassare() {
    advance();
  }

  function advance() {
    if (deckIndex + 1 >= deck.length) {
      setSessionDone(true);
    } else {
      setDeckIndex((i) => i + 1);
    }
  }

  function restartDeck() {
    if (selectedId !== null) loadDeck(selectedId);
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso necessario', 'Consenti accesso alla libreria foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setNewFoto(result.assets[0].uri);
    }
  }

  function salvaFlashcard() {
    if (!selectedId || !newFronte.trim()) return;
    insertFlashcard(selectedId, newFronte.trim(), newRetro.trim(), newFoto ?? undefined);
    setNewFronte('');
    setNewRetro('');
    setNewFoto(null);
    setAddDialogVisible(false);
    loadDeck(selectedId);
  }

  const esameSelezionato = esami.find((e) => e.id === selectedId);
  const durata = fase === 'lavoro' ? POMODORO_LAVORO : POMODORO_PAUSA;
  const progress = 1 - secondi / durata;
  const isOverBudget = sessioniOggi >= budget;
  const activeColor = isOverBudget ? AMBER : C.accent;
  const faseColor = fase === 'lavoro' ? activeColor : C.success;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={[s.title, { color: C.textPrimary, fontFamily: fonts.dot }]}>Studio</Text>

        {showCheckIn && <MorningCheckIn onConfirm={handleCheckIn} />}

        {/* Mode switcher */}
        <View style={[s.switcher, { borderColor: C.border, backgroundColor: C.card }]}>
          {(['timer', 'flashcard'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[s.switchBtn, mode === m && { backgroundColor: C.accent }]}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={m === 'timer' ? 'timer-outline' : 'cards-outline'}
                size={14}
                color={mode === m ? '#000000' : C.textMuted}
              />
              <Text style={[s.switchLabel, { color: mode === m ? '#000000' : C.textMuted, fontFamily: fonts.mono }]}>
                {m === 'timer' ? 'TIMER' : 'FLASHCARD'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exam selector (shared) */}
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

        {/* ══════════ TIMER MODE ══════════ */}
        {mode === 'timer' && (
          <>
            <View style={[s.card, s.timerCard, { backgroundColor: C.card, borderColor: isOverBudget ? AMBER + '55' : C.border }]}>
              <Text style={[s.faseLabel, { color: isOverBudget ? AMBER : C.textMuted, fontFamily: fonts.mono }]}>
                {fase === 'lavoro' ? (isOverBudget ? 'OVER BUDGET' : 'SESSIONE FOCUS') : 'PAUSA'}
              </Text>

              <FatigueRing
                total={budget}
                completed={sessioniOggi}
                activeColor={activeColor}
                dimColor={C.border}
              >
                <Text style={[s.timerNum, { color: faseColor, fontFamily: fonts.dot }]}>
                  {formatTime(secondi)}
                </Text>
              </FatigueRing>

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
                <Text style={[s.sessioniCount, { color: faseColor, fontFamily: fonts.dot }]}>
                  {String(sessioniOggi)}
                </Text>
                {` / ${String(budget)}`}
              </Text>
            </View>

            {selectedId !== null && (
              <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>STUDY ROI</Text>
                <View style={s.roiRow}>
                  <View style={s.roiItem}>
                    <Text style={[s.roiNum, { color: C.accent, fontFamily: fonts.dot }]}>{String(oreTotali)}h</Text>
                    <Text style={[s.roiSub, { color: C.textMuted, fontFamily: fonts.mono }]}>investite</Text>
                  </View>
                  {roi ? (
                    <>
                      <View style={[s.roiDivider, { backgroundColor: C.border }]} />
                      <View style={s.roiItem}>
                        <Text style={[s.roiNum, { color: C.success, fontFamily: fonts.dot }]}>{String(roi.orePerCfu)}h</Text>
                        <Text style={[s.roiSub, { color: C.textMuted, fontFamily: fonts.mono }]}>per CFU</Text>
                      </View>
                      <View style={[s.roiDivider, { backgroundColor: C.border }]} />
                      <View style={s.roiItem}>
                        <Text style={[s.roiNum, { color: C.warning, fontFamily: fonts.dot }]}>
                          {esameSelezionato?.voto_finale === 33 ? '30L' : String(esameSelezionato?.voto_finale ?? '—')}
                        </Text>
                        <Text style={[s.roiSub, { color: C.textMuted, fontFamily: fonts.mono }]}>voto</Text>
                      </View>
                    </>
                  ) : oreTotali === 0 ? (
                    <Text style={[s.roiHint, { color: C.textMuted, fontFamily: fonts.mono }]}>Nessuna sessione registrata.</Text>
                  ) : (
                    <Text style={[s.roiHint, { color: C.textMuted, fontFamily: fonts.mono }]}>Registra il voto per sbloccare le statistiche.</Text>
                  )}
                </View>
              </View>
            )}

            {sessioniRecenti.length > 0 && (
              <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>SESSIONI RECENTI</Text>
                {sessioniRecenti.map((sess, i) => (
                  <View
                    key={sess.id}
                    style={[s.sessioneRow, { borderBottomColor: C.border }, i === sessioniRecenti.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <Text style={[s.sessioneMin, { color: C.textPrimary, fontFamily: fonts.dot }]}>{String(sess.durata_minuti)}m</Text>
                    <Text style={[s.sessioneData, { color: C.textMuted, fontFamily: fonts.mono }]}>{formatData(sess.data)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ══════════ FLASHCARD MODE ══════════ */}
        {mode === 'flashcard' && (
          <>
            {selectedId !== null && allCards.length > 0 && (
              <View style={s.fcHeader}>
                <Text style={[s.fcCount, { color: C.textMuted, fontFamily: fonts.mono }]}>
                  {String(allCards.length)} {allCards.length === 1 ? 'CARTA' : 'CARTE'}
                </Text>
                <TouchableOpacity
                  style={[s.manageBtn, { borderColor: managing ? C.accent : C.border }]}
                  onPress={() => setManaging((v) => !v)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={managing ? 'check' : 'pencil-outline'}
                    size={13}
                    color={managing ? C.accent : C.textSecondary}
                  />
                  <Text style={[s.manageBtnText, { color: managing ? C.accent : C.textSecondary, fontFamily: fonts.mono }]}>
                    {managing ? 'FATTO' : 'GESTISCI'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {managing && selectedId !== null ? (
              <View style={[s.card, { backgroundColor: C.card, borderColor: C.border, padding: 0, overflow: 'hidden' }]}>
                {allCards.map((card, i) => (
                  <SwipeableRow
                    key={card.id}
                    onDelete={() => eliminaFlashcard(card.id)}
                    style={{ borderBottomWidth: i < allCards.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: C.border }}
                  >
                    <View style={[s.cardRow, { backgroundColor: C.card }]}>
                      <Text style={[s.cardRowText, { color: C.textPrimary, fontFamily: fonts.mono }]} numberOfLines={2}>
                        {card.fronte}
                      </Text>
                      {card.retro_foto ? (
                        <MaterialCommunityIcons name="image-outline" size={16} color={C.textMuted} />
                      ) : card.retro ? (
                        <Text style={[s.cardRowRetro, { color: C.textMuted, fontFamily: fonts.mono }]} numberOfLines={1}>
                          {card.retro}
                        </Text>
                      ) : null}
                    </View>
                  </SwipeableRow>
                ))}
              </View>
            ) : !selectedId ? (
              <View style={s.emptyBox}>
                <Text style={[s.emptyNum, { color: C.accent, fontFamily: fonts.dot }]}>00</Text>
                <Text style={[s.emptyHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
                  Seleziona un esame per iniziare
                </Text>
              </View>
            ) : deck.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={[s.emptyNum, { color: C.accent, fontFamily: fonts.dot }]}>00</Text>
                <Text style={[s.emptyTitle, { color: C.textSecondary, fontFamily: fonts.mono }]}>Nessuna flashcard</Text>
                <Text style={[s.emptyHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
                  Aggiungine una con + in basso
                </Text>
              </View>
            ) : sessionDone ? (
              <View style={[s.card, s.doneCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[s.doneNum, { color: C.accent, fontFamily: fonts.dot }]}>
                  {String(sessionSo)}/{String(deck.length)}
                </Text>
                <Text style={[s.doneTitle, { color: C.textPrimary, fontFamily: fonts.mono }]}>
                  Sessione completata
                </Text>
                <Text style={[s.doneHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
                  {sessionSo === deck.length ? 'Perfetto! Tutte corrette.' : `${String(deck.length - sessionSo)} da ripassare.`}
                </Text>
                <TouchableOpacity
                  style={[s.restartBtn, { backgroundColor: C.accent }]}
                  onPress={restartDeck}
                  activeOpacity={0.85}
                >
                  <Text style={[s.restartLabel, { color: '#000000', fontFamily: fonts.mono }]}>RICOMINCIA</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlashCard
                card={deck[deckIndex]}
                index={deckIndex}
                total={deck.length}
                onSo={handleSo}
                onRipassare={handleRipassare}
                accent={C.accent}
              />
            )}
          </>

        )}
      </ScrollView>

      {/* FAB — add flashcard */}
      {mode === 'flashcard' && selectedId !== null && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: C.accent }]}
          onPress={() => setAddDialogVisible(true)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={26} color="#000000" />
        </TouchableOpacity>
      )}

      <CooldownSheet
        visible={showCooldown}
        onDismiss={() => setShowCooldown(false)}
        onForceContinue={actuallyStart}
      />

      {/* Add flashcard dialog */}
      <Portal>
        <Dialog
          visible={addDialogVisible}
          onDismiss={() => { setAddDialogVisible(false); setNewFronte(''); setNewRetro(''); setNewFoto(null); }}
          style={[s.dialog, { backgroundColor: C.surface }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Dialog.Title style={[s.dialogTitle, { color: C.textPrimary, fontFamily: fonts.mono }]}>
              Nuova Flashcard
            </Dialog.Title>
            <Dialog.Content style={s.dialogContent}>
              <TextInput
                label="Domanda (fronte)"
                value={newFronte}
                onChangeText={setNewFronte}
                mode="outlined"
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                multiline
                numberOfLines={3}
                style={{ backgroundColor: C.card }}
              />
              <TextInput
                label="Risposta (retro) — opzionale se usi foto"
                value={newRetro}
                onChangeText={setNewRetro}
                mode="outlined"
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                multiline
                numberOfLines={3}
                style={{ backgroundColor: C.card }}
              />
              <TouchableOpacity
                style={[s.fotoBtn, { borderColor: newFoto ? C.accent : C.border, backgroundColor: C.card }]}
                onPress={pickPhoto}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={newFoto ? 'image-check' : 'image-plus'}
                  size={20}
                  color={newFoto ? C.accent : C.textMuted}
                />
                <Text style={[s.fotoBtnText, { color: newFoto ? C.accent : C.textMuted, fontFamily: fonts.mono }]}>
                  {newFoto ? 'Foto selezionata' : 'Aggiungi foto risposta'}
                </Text>
                {newFoto && (
                  <TouchableOpacity onPress={() => setNewFoto(null)}>
                    <MaterialCommunityIcons name="close" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </Dialog.Content>
            <Dialog.Actions>
              <Button textColor={C.textSecondary} onPress={() => { setAddDialogVisible(false); setNewFronte(''); setNewRetro(''); setNewFoto(null); }}>
                Annulla
              </Button>
              <Button
                mode="contained"
                onPress={salvaFlashcard}
                disabled={!newFronte.trim()}
                buttonColor={C.accent}
                textColor="#000000"
              >
                Aggiungi
              </Button>
            </Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  title: { fontSize: 36, lineHeight: 38, marginBottom: 4 },
  // Mode switcher
  switcher: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  switchLabel: { fontSize: 11, letterSpacing: 0.5, fontWeight: '700' },
  // Card / shared
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
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
  // Timer
  timerCard: { alignItems: 'center', gap: 14 },
  faseLabel: { fontSize: 11, letterSpacing: 2 },
  timerNum: { fontSize: 80, lineHeight: 80 },
  progressTrack: { width: '100%', height: 2, borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%' },
  timerBtns: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  playBtn: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  resetBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
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
  // Flashcard empty / done
  emptyBox: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyNum: { fontSize: 64, lineHeight: 64 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  doneCard: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  doneNum: { fontSize: 64, lineHeight: 64 },
  doneTitle: { fontSize: 16, fontWeight: '700' },
  doneHint: { fontSize: 13 },
  restartBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  restartLabel: { fontSize: 12, letterSpacing: 1, fontWeight: '700' },
  // FAB
  fab: { position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  // Dialog
  dialog: { borderRadius: 20 },
  dialogTitle: { fontSize: 18 },
  dialogContent: { gap: 12 },
  fotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  fotoBtnText: { flex: 1, fontSize: 13 },
  // Flashcard manage
  fcHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  fcCount: { fontSize: 10, letterSpacing: 2 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  manageBtnText: { fontSize: 11, letterSpacing: 0.5 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  cardRowText: { flex: 1, fontSize: 13, lineHeight: 18 },
  cardRowRetro: { fontSize: 12, maxWidth: 100 },
});
