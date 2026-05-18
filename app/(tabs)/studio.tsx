import { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, ProgressBar, Menu, Divider } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import {
  getAllEsami,
  insertSessione,
  getOreStudiate,
  getSessioniRecenti,
  getMediaPonderata,
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
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StudioScreen() {
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
      if (selectedId !== null) refreshStats(selectedId);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
      };
    }, [selectedId])
  );

  function refreshStats(id: number) {
    const ore = getOreStudiate(id);
    setOreTotali(ore);
    setSessioniRecenti(getSessioniRecenti(id));
    const esame = esami.find((e) => e.id === id);
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
          // Salva sessione
          if (selectedId) {
            const minutiLavorati = Math.round((POMODORO_LAVORO - Math.max(rimanenti, 0)) / 60);
            insertSessione(selectedId, minutiLavorati || 25);
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
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, fase, selectedId]);

  const esameSelezionato = esami.find((e) => e.id === selectedId);
  const durata = fase === 'lavoro' ? POMODORO_LAVORO : POMODORO_PAUSA;
  const progress = 1 - secondi / durata;
  const progressColor = fase === 'lavoro' ? colors.primary : colors.success;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>PT dello Studio</Text>

        {/* Selezione esame */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>ESAME IN ALLENAMENTO</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => !running && setMenuVisible(true)}
                  textColor={esameSelezionato ? colors.textPrimary : colors.textMuted}
                  style={styles.selectorBtn}
                  contentStyle={styles.selectorContent}
                  icon="chevron-down"
                >
                  {esameSelezionato ? esameSelezionato.nome : 'Seleziona esame...'}
                </Button>
              }
            >
              {esami
                .filter((e) => !e.superato)
                .map((e) => (
                  <Menu.Item key={e.id} onPress={() => seleziona(e.id)} title={e.nome} />
                ))}
              {esami.filter((e) => !e.superato).length === 0 && (
                <Menu.Item title="Nessun esame da studiare" disabled />
              )}
            </Menu>
          </Card.Content>
        </Card>

        {/* Timer */}
        <Card style={styles.card}>
          <Card.Content style={styles.timerContent}>
            <Text style={[styles.label, { textAlign: 'center' }]}>
              {fase === 'lavoro' ? '🎯 SESSIONE FOCUS' : '☕ PAUSA'}
            </Text>
            <Text style={styles.timerNum}>{formatTime(secondi)}</Text>
            <ProgressBar
              progress={progress}
              color={progressColor}
              style={styles.timerBar}
            />
            <View style={styles.timerBtns}>
              <Button
                mode="contained"
                onPress={startStop}
                disabled={!selectedId}
                style={[styles.timerBtn, { backgroundColor: running ? colors.warning : colors.primary }]}
                labelStyle={{ fontSize: 16, fontWeight: '700' }}
              >
                {running ? 'PAUSA' : 'INIZIA'}
              </Button>
              {!running && (
                <Button
                  mode="outlined"
                  onPress={resetTimer}
                  style={styles.resetBtn}
                  textColor={colors.textSecondary}
                >
                  Reset
                </Button>
              )}
            </View>
            <Text style={styles.sessioniCount}>
              Sessioni completate oggi: <Text style={{ color: colors.primary, fontWeight: '700' }}>{sessioni}</Text>
            </Text>
          </Card.Content>
        </Card>

        {/* ROI */}
        {selectedId !== null && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.label}>STUDY ROI</Text>
              <View style={styles.roiRow}>
                <View style={styles.roiItem}>
                  <Text style={styles.roiNum}>{oreTotali}h</Text>
                  <Text style={styles.muted}>ore investite</Text>
                </View>
                {roi && (
                  <>
                    <Divider style={styles.divider} />
                    <View style={styles.roiItem}>
                      <Text style={[styles.roiNum, { color: colors.success }]}>
                        {roi.orePerCfu}h
                      </Text>
                      <Text style={styles.muted}>per CFU</Text>
                    </View>
                    <Divider style={styles.divider} />
                    <View style={styles.roiItem}>
                      <Text style={[styles.roiNum, { color: colors.secondary }]}>
                        {esameSelezionato?.voto_finale === 33
                          ? '30L'
                          : esameSelezionato?.voto_finale}
                      </Text>
                      <Text style={styles.muted}>voto finale</Text>
                    </View>
                  </>
                )}
              </View>
              {!roi && oreTotali > 0 && (
                <Text style={styles.muted}>
                  Registra il voto finale per sbloccare le statistiche di efficienza.
                </Text>
              )}
              {oreTotali === 0 && (
                <Text style={styles.muted}>Nessuna sessione registrata per questo esame.</Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Sessioni recenti */}
        {sessioniRecenti.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.label}>SESSIONI RECENTI</Text>
              {sessioniRecenti.map((s) => (
                <View key={s.id} style={styles.sessioneRow}>
                  <Text variant="bodyMedium" style={{ color: colors.textPrimary }}>
                    {s.durata_minuti} min
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {formatData(s.data)}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { color: colors.textPrimary, fontWeight: '800', marginBottom: 4 },
  card: { backgroundColor: colors.card, borderRadius: 16 },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  selectorBtn: {
    borderColor: colors.border,
    borderRadius: 10,
  },
  selectorContent: { flexDirection: 'row-reverse' },
  timerContent: { alignItems: 'center', gap: 12 },
  timerNum: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerBar: { width: '100%', height: 6, borderRadius: 3 },
  timerBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  timerBtn: { borderRadius: 12, minWidth: 140 },
  resetBtn: {
    borderColor: colors.border,
    borderRadius: 12,
  },
  sessioniCount: { color: colors.textMuted, fontSize: 13 },
  roiRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roiItem: { flex: 1, alignItems: 'center' },
  roiNum: { fontSize: 28, fontWeight: '800', color: colors.primary },
  divider: { width: 1, height: 40, backgroundColor: colors.border },
  muted: { color: colors.textMuted, fontSize: 12 },
  sessioneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
