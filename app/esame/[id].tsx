import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Checkbox,
  Button,
  Portal,
  Dialog,
  TextInput,
  FAB,
  SegmentedButtons,
  Chip,
  IconButton,
} from 'react-native-paper';
import { useLocalSearchParams, useFocusEffect, router, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import {
  getEsame,
  getModuli,
  insertModulo,
  toggleModulo,
  deleteModulo,
  getOreStudiate,
  updateEsameVoto,
  getLezioniByEsame,
  insertLezione,
  deleteLezione,
} from '@/db/database';
import type { Esame, Modulo, Lezione } from '@/db/types';

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const PALETTE = [
  '#7C4DFF', '#00BCD4', '#FF9800', '#4CAF50',
  '#FF6B9D', '#C084FC', '#F44336', '#2196F3',
];

const tipoLabel: Record<string, string> = {
  scritto: 'Scritto', orale: 'Orale', progetto: 'Progetto', ore: 'Ore',
};
const tipoColor: Record<string, string> = {
  scritto: colors.primary, orale: colors.secondary, progetto: colors.warning, ore: colors.success,
};

export default function EsameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const esameId = parseInt(id, 10);
  const navigation = useNavigation();

  const [esame, setEsame] = useState<Esame | null>(null);
  const [moduli, setModuli] = useState<Modulo[]>([]);
  const [lezioni, setLezioni] = useState<Lezione[]>([]);
  const [ore, setOre] = useState(0);

  // Dialog task
  const [dialogModulo, setDialogModulo] = useState(false);
  const [nomeModulo, setNomeModulo] = useState('');
  const [tipoModulo, setTipoModulo] = useState<'scritto' | 'orale' | 'progetto' | 'ore'>('scritto');

  // Dialog voto
  const [dialogVoto, setDialogVoto] = useState(false);
  const [votoStr, setVotoStr] = useState('');
  const [lode, setLode] = useState(false);

  // Dialog lezione
  const [dialogLezione, setDialogLezione] = useState(false);
  const [lezGiorno, setLezGiorno] = useState(0);
  const [lezInizio, setLezInizio] = useState('');
  const [lezFine, setLezFine] = useState('');
  const [lezAula, setLezAula] = useState('');
  const [lezColore, setLezColore] = useState(PALETTE[0]);

  const load = useCallback(() => {
    const e = getEsame(esameId);
    setEsame(e);
    if (e) {
      navigation.setOptions({ title: e.nome });
      setModuli(getModuli(esameId));
      setLezioni(getLezioniByEsame(esameId));
      setOre(getOreStudiate(esameId));
    }
  }, [esameId]);

  useFocusEffect(load);

  function salvaModulo() {
    if (!nomeModulo.trim()) return;
    insertModulo(esameId, nomeModulo.trim(), tipoModulo);
    setNomeModulo(''); setTipoModulo('scritto'); setDialogModulo(false);
    load();
  }

  function salvaVoto() {
    const v = parseInt(votoStr, 10);
    if (isNaN(v) || v < 18 || v > 30) return;
    updateEsameVoto(esameId, lode ? 33 : v);
    setDialogVoto(false); setVotoStr(''); setLode(false);
    load();
  }

  function salvaLezione() {
    if (!lezInizio.trim() || !lezFine.trim() || !lezAula.trim()) return;
    insertLezione(esameId, lezGiorno, lezInizio.trim(), lezFine.trim(), lezAula.trim(), lezColore);
    setLezInizio(''); setLezFine(''); setLezAula(''); setLezGiorno(0); setLezColore(PALETTE[0]);
    setDialogLezione(false);
    load();
  }

  function eliminaModulo(mid: number) {
    Alert.alert('Elimina task', 'Rimuovere questo task?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => { deleteModulo(mid); load(); } },
    ]);
  }

  function eliminaLezione(lid: number) {
    Alert.alert('Elimina lezione', 'Rimuovere questa lezione dall\'orario?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => { deleteLezione(lid); load(); } },
    ]);
  }

  if (!esame) return null;

  const moduliCompletati = moduli.filter((m) => m.completato).length;
  const progressoModuli = moduli.length > 0 ? moduliCompletati / moduli.length : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={styles.nome}>{esame.nome}</Text>
                {esame.professore ? (
                  <Text style={styles.professore}>{esame.professore}</Text>
                ) : null}
                <View style={styles.tagRow}>
                  <View style={[styles.tag, { backgroundColor: colors.primary + '22' }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>
                      {String(esame.cfu)} CFU
                    </Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: colors.border }]}>
                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                      {esame.tipo === 'tirocinio' ? 'Tirocinio' : 'Esame'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.votoBox}>
                {esame.superato ? (
                  <>
                    <Text style={styles.votoGrande}>
                      {esame.voto_finale === 33 ? '30L' : String(esame.voto_finale ?? '✓')}
                    </Text>
                    <Text style={styles.muted}>✓ Superato</Text>
                  </>
                ) : (
                  <Button
                    mode="contained"
                    compact
                    onPress={() => setDialogVoto(true)}
                    style={{ backgroundColor: colors.success }}
                  >
                    Segna superato
                  </Button>
                )}
              </View>
            </View>

            {ore > 0 ? (
              <Text style={[styles.muted, { marginTop: 10 }]}>
                {String(ore)}h studiate totali
              </Text>
            ) : null}

            {esame.superato && ore > 0 && esame.tipo === 'voto' && esame.voto_finale ? (
              <View style={styles.roiBox}>
                <Text style={styles.roiText}>
                  {String(ore)}h investite · {String(esame.voto_finale === 33 ? '30L' : esame.voto_finale)} · {String(Math.round((ore / esame.cfu) * 10) / 10)}h per CFU
                </Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        {/* Task / Moduli */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>
                TASK ({String(moduliCompletati)}/{String(moduli.length)})
              </Text>
              <Button compact mode="text" icon="plus" textColor={colors.primary} onPress={() => setDialogModulo(true)}>
                Aggiungi
              </Button>
            </View>

            {moduli.length > 0 ? (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressoModuli * 100}%` as any }]} />
              </View>
            ) : null}

            {moduli.length === 0 ? (
              <Text style={styles.muted}>
                Nessun task. Spacchetta l'esame in moduli (Scritto, Orale, Progetto...).
              </Text>
            ) : null}

            {moduli.map((m) => (
              <View key={m.id} style={styles.moduloRow}>
                <Checkbox.Android
                  status={m.completato ? 'checked' : 'unchecked'}
                  color={colors.primary}
                  uncheckedColor={colors.border}
                  onPress={() => { toggleModulo(m.id, m.completato ? 0 : 1); load(); }}
                />
                <View style={styles.moduloInfo}>
                  <Text
                    variant="bodyMedium"
                    style={[styles.moduloNome, m.completato ? styles.moduloStrike : undefined]}
                  >
                    {m.nome}
                  </Text>
                  <View style={[styles.tag, { backgroundColor: tipoColor[m.tipo] + '22' }]}>
                    <Text style={[styles.tagText, { color: tipoColor[m.tipo] }]}>
                      {tipoLabel[m.tipo]}
                    </Text>
                  </View>
                </View>
                <IconButton icon="trash-can-outline" size={16} iconColor={colors.textMuted} onPress={() => eliminaModulo(m.id)} />
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Orario lezioni */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>ORARIO LEZIONI</Text>
              <Button compact mode="text" icon="plus" textColor={colors.primary} onPress={() => setDialogLezione(true)}>
                Aggiungi
              </Button>
            </View>

            {lezioni.length === 0 ? (
              <Text style={styles.muted}>
                Nessuna lezione. Aggiungi giorno, orario e aula.
              </Text>
            ) : null}

            {lezioni.map((l) => (
              <View key={l.id} style={[styles.lezioneRow, { borderLeftColor: l.colore }]}>
                <View style={styles.lezioneOrario}>
                  <Text style={[styles.lezOra, { color: l.colore }]}>{l.ora_inizio}</Text>
                  <Text style={styles.lezSep}>→</Text>
                  <Text style={styles.lezOraFine}>{l.ora_fine}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lezGiorno}>{GIORNI[l.giorno]}</Text>
                  <View style={[styles.tag, { backgroundColor: l.colore + '22', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.tagText, { color: l.colore }]}>{l.aula}</Text>
                  </View>
                </View>
                <IconButton icon="trash-can-outline" size={16} iconColor={colors.textMuted} onPress={() => eliminaLezione(l.id)} />
              </View>
            ))}
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          icon="timer-outline"
          style={styles.studiaBtn}
          textColor={colors.secondary}
          onPress={() => router.push('/(tabs)/studio')}
        >
          Vai alla sessione di studio
        </Button>
      </ScrollView>

      {/* Dialogs */}
      <Portal>
        {/* Dialog task */}
        <Dialog visible={dialogModulo} onDismiss={() => setDialogModulo(false)} style={styles.dialog}>
          <Dialog.Title style={{ color: colors.textPrimary }}>Nuovo Task</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              label="Nome task (es. Scritto, Orale...)"
              value={nomeModulo}
              onChangeText={setNomeModulo}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.textPrimary}
              style={styles.input}
            />
            <SegmentedButtons
              value={tipoModulo}
              onValueChange={(v) => setTipoModulo(v as typeof tipoModulo)}
              buttons={[
                { value: 'scritto', label: 'Scritto' },
                { value: 'orale', label: 'Orale' },
                { value: 'progetto', label: 'Prog.' },
                { value: 'ore', label: 'Ore' },
              ]}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.textSecondary} onPress={() => setDialogModulo(false)}>Annulla</Button>
            <Button mode="contained" onPress={salvaModulo} disabled={!nomeModulo.trim()}>Aggiungi</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Dialog voto */}
        <Dialog visible={dialogVoto} onDismiss={() => setDialogVoto(false)} style={styles.dialog}>
          <Dialog.Title style={{ color: colors.textPrimary }}>Registra Voto</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              label="Voto (18-30)"
              value={votoStr}
              onChangeText={setVotoStr}
              keyboardType="numeric"
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.textPrimary}
              style={styles.input}
            />
            <Button
              mode={lode ? 'contained' : 'outlined'}
              onPress={() => setLode((l) => !l)}
              style={lode ? { backgroundColor: colors.success } : { borderColor: colors.border }}
              textColor={lode ? colors.textPrimary : colors.textSecondary}
            >
              {lode ? '✓ Con lode (30L)' : 'Con lode?'}
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.textSecondary} onPress={() => setDialogVoto(false)}>Annulla</Button>
            <Button
              mode="contained"
              onPress={salvaVoto}
              disabled={!votoStr || parseInt(votoStr, 10) < 18 || parseInt(votoStr, 10) > 30}
              style={{ backgroundColor: colors.success }}
            >
              Salva
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Dialog lezione */}
        <Dialog visible={dialogLezione} onDismiss={() => setDialogLezione(false)} style={styles.dialog}>
          <Dialog.Title style={{ color: colors.textPrimary }}>Aggiungi Lezione</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420, paddingHorizontal: 24 }}>
            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
              <Text style={styles.fieldLabel}>GIORNO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {GIORNI.slice(0, 6).map((g, i) => (
                    <Button
                      key={i}
                      mode={lezGiorno === i ? 'contained' : 'outlined'}
                      compact
                      onPress={() => setLezGiorno(i)}
                      style={lezGiorno === i
                        ? { backgroundColor: colors.primary }
                        : { borderColor: colors.border }
                      }
                      labelStyle={{ fontSize: 12 }}
                      textColor={lezGiorno === i ? colors.textPrimary : colors.textSecondary}
                    >
                      {g.slice(0, 3)}
                    </Button>
                  ))}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  label="Inizio (09:00)"
                  value={lezInizio}
                  onChangeText={setLezInizio}
                  mode="outlined"
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  label="Fine (11:00)"
                  value={lezFine}
                  onChangeText={setLezFine}
                  mode="outlined"
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                  style={[styles.input, { flex: 1 }]}
                />
              </View>

              <TextInput
                label="Aula (es. A1, Edificio 4)"
                value={lezAula}
                onChangeText={setLezAula}
                mode="outlined"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>COLORE</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {PALETTE.map((c) => (
                  <View
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      lezColore === c && styles.colorDotSelected,
                    ]}
                    onTouchEnd={() => setLezColore(c)}
                  />
                ))}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button textColor={colors.textSecondary} onPress={() => setDialogLezione(false)}>Annulla</Button>
            <Button
              mode="contained"
              onPress={salvaLezione}
              disabled={!lezInizio.trim() || !lezFine.trim() || !lezAula.trim()}
            >
              Aggiungi
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="timer-outline"
        label="Studia ora"
        style={styles.fab}
        color={colors.textPrimary}
        onPress={() => router.push('/(tabs)/studio')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  card: { backgroundColor: colors.card, borderRadius: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nome: { color: colors.textPrimary, fontWeight: '700', marginBottom: 4 },
  professore: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '700' },
  votoBox: { alignItems: 'flex-end', marginLeft: 8 },
  votoGrande: { fontSize: 36, fontWeight: '800', color: colors.success },
  muted: { color: colors.textMuted, fontSize: 12 },
  roiBox: { backgroundColor: colors.surface, borderRadius: 8, padding: 10, marginTop: 10 },
  roiText: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  moduloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moduloInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  moduloNome: { color: colors.textPrimary, flex: 1 },
  moduloStrike: { color: colors.textMuted, textDecorationLine: 'line-through' },
  lezioneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 12,
  },
  lezioneOrario: { alignItems: 'center', minWidth: 50 },
  lezOra: { fontSize: 14, fontWeight: '800' },
  lezSep: { color: colors.textMuted, fontSize: 10 },
  lezOraFine: { color: colors.textSecondary, fontSize: 12 },
  lezGiorno: { color: colors.textPrimary, fontWeight: '600', fontSize: 13, marginBottom: 4 },
  studiaBtn: { borderColor: colors.secondary, borderRadius: 12 },
  dialog: { backgroundColor: colors.surface },
  input: { backgroundColor: colors.card },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: colors.textPrimary },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: colors.secondary,
    borderRadius: 16,
  },
});
