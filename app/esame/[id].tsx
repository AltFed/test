import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import {
  Text,
  Portal,
  Dialog,
  Button,
  TextInput,
} from 'react-native-paper';
import { useLocalSearchParams, useFocusEffect, router, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import { SwipeableRow } from '@/components/SwipeableRow';
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
  '#FFE600', '#30D158', '#0A84FF', '#FF9F0A',
  '#FF453A', '#BF5AF2', '#FF6B9D', '#00C7BE',
];

const tipoColor: Record<string, string> = {
  scritto: '#0A84FF', orale: '#30D158', progetto: '#FF9F0A', ore: '#BF5AF2',
};
const tipoLabel: Record<string, string> = {
  scritto: 'Scritto', orale: 'Orale', progetto: 'Progetto', ore: 'Ore',
};

export default function EsameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const esameId = parseInt(id, 10);
  const navigation = useNavigation();
  const C = useColors();

  const [esame, setEsame] = useState<Esame | null>(null);
  const [moduli, setModuli] = useState<Modulo[]>([]);
  const [lezioni, setLezioni] = useState<Lezione[]>([]);
  const [ore, setOre] = useState(0);

  const [dialogModulo, setDialogModulo] = useState(false);
  const [nomeModulo, setNomeModulo] = useState('');
  const [tipoModulo, setTipoModulo] = useState<'scritto' | 'orale' | 'progetto' | 'ore'>('scritto');

  const [dialogVoto, setDialogVoto] = useState(false);
  const [votoStr, setVotoStr] = useState('');
  const [lode, setLode] = useState(false);

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

  if (!esame) return null;

  const moduliCompletati = moduli.filter((m) => m.completato).length;
  const progressoModuli = moduli.length > 0 ? moduliCompletati / moduli.length : 0;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        {/* Header card */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.esameNome, { color: C.textPrimary, fontFamily: fonts.mono }]}>
                {esame.nome}
              </Text>
              {esame.professore ? (
                <Text style={[s.professore, { color: C.textSecondary, fontFamily: fonts.mono }]}>
                  {esame.professore}
                </Text>
              ) : null}
              <View style={s.tagRow}>
                <View style={[s.tag, { backgroundColor: C.accentDim, borderColor: C.accent + '55' }]}>
                  <Text style={[s.tagText, { color: C.accent, fontFamily: fonts.mono }]}>
                    {String(esame.cfu)} CFU
                  </Text>
                </View>
                <View style={[s.tag, { backgroundColor: C.border }]}>
                  <Text style={[s.tagText, { color: C.textSecondary, fontFamily: fonts.mono }]}>
                    {esame.tipo === 'tirocinio' ? 'TRC' : 'ESAME'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.votoBox}>
              {esame.superato ? (
                <>
                  <Text style={[s.votoGrande, { color: C.success, fontFamily: fonts.dot }]}>
                    {esame.voto_finale === 33 ? '30L' : String(esame.voto_finale ?? '✓')}
                  </Text>
                  <Text style={[s.superatoTag, { color: C.success, fontFamily: fonts.mono }]}>✓ SUPERATO</Text>
                </>
              ) : (
                <TouchableOpacity
                  style={[s.superaBtn, { backgroundColor: C.success }]}
                  onPress={() => setDialogVoto(true)}
                >
                  <Text style={[s.superaBtnText, { fontFamily: fonts.mono }]}>Segna{'\n'}superato</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {ore > 0 ? (
            <View style={[s.roiRow, { borderTopColor: C.border }]}>
              <Text style={[s.roiText, { color: C.accent, fontFamily: fonts.dot }]}>
                {String(ore)}h
              </Text>
              <Text style={[s.roiSub, { color: C.textMuted, fontFamily: fonts.mono }]}>
                studiate totali
              </Text>
              {esame.superato && esame.voto_finale && esame.tipo === 'voto' ? (
                <>
                  <View style={[s.roiDot, { backgroundColor: C.border }]} />
                  <Text style={[s.roiText, { color: C.warning, fontFamily: fonts.dot }]}>
                    {String(Math.round((ore / esame.cfu) * 10) / 10)}h
                  </Text>
                  <Text style={[s.roiSub, { color: C.textMuted, fontFamily: fonts.mono }]}>
                    per CFU
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Task / Moduli */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              TASK ({String(moduliCompletati)}/{String(moduli.length)})
            </Text>
            <TouchableOpacity
              style={[s.addPill, { borderColor: C.accent }]}
              onPress={() => setDialogModulo(true)}
            >
              <MaterialCommunityIcons name="plus" size={12} color={C.accent} />
              <Text style={[s.addPillText, { color: C.accent, fontFamily: fonts.mono }]}>ADD</Text>
            </TouchableOpacity>
          </View>

          {moduli.length > 0 ? (
            <View style={[s.progressTrack, { backgroundColor: C.border }]}>
              <View
                style={[s.progressFill, { width: `${progressoModuli * 100}%` as any, backgroundColor: C.accent }]}
              />
            </View>
          ) : null}

          {moduli.length === 0 ? (
            <Text style={[s.muted, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Spacchetta l'esame: Scritto, Orale, Progetto...
            </Text>
          ) : null}

          {moduli.map((m) => (
            <SwipeableRow key={m.id} onDelete={() => { deleteModulo(m.id); load(); }}>
              <TouchableOpacity
                style={[s.moduloRow, { borderBottomColor: C.border }]}
                onPress={() => { toggleModulo(m.id, m.completato ? 0 : 1); load(); }}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, { borderColor: m.completato ? C.accent : C.border, backgroundColor: m.completato ? C.accentDim : 'transparent' }]}>
                  {m.completato ? (
                    <MaterialCommunityIcons name="check" size={14} color={C.accent} />
                  ) : null}
                </View>
                <View style={s.moduloInfo}>
                  <Text
                    style={[
                      s.moduloNome,
                      { color: m.completato ? C.textMuted : C.textPrimary, fontFamily: fonts.mono },
                      m.completato ? s.moduloStrike : undefined,
                    ]}
                  >
                    {m.nome}
                  </Text>
                  <View style={[s.tipoTag, { backgroundColor: tipoColor[m.tipo] + '22' }]}>
                    <Text style={[s.tipoTagText, { color: tipoColor[m.tipo], fontFamily: fonts.mono }]}>
                      {tipoLabel[m.tipo].toUpperCase()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </SwipeableRow>
          ))}
        </View>

        {/* Orario lezioni */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              ORARIO LEZIONI
            </Text>
            <TouchableOpacity
              style={[s.addPill, { borderColor: C.accent }]}
              onPress={() => setDialogLezione(true)}
            >
              <MaterialCommunityIcons name="plus" size={12} color={C.accent} />
              <Text style={[s.addPillText, { color: C.accent, fontFamily: fonts.mono }]}>ADD</Text>
            </TouchableOpacity>
          </View>

          {lezioni.length === 0 ? (
            <Text style={[s.muted, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Aggiungi giorno, orario e aula.
            </Text>
          ) : null}

          {lezioni.map((l) => (
            <SwipeableRow key={l.id} onDelete={() => { deleteLezione(l.id); load(); }}>
              <View style={[s.lezioneRow, { borderBottomColor: C.border, borderLeftColor: l.colore }]}>
                <View style={s.lezioneOrario}>
                  <Text style={[s.lezOra, { color: l.colore, fontFamily: fonts.dot }]}>
                    {l.ora_inizio}
                  </Text>
                  <Text style={[s.lezSep, { color: C.textMuted }]}>↓</Text>
                  <Text style={[s.lezOraFine, { color: C.textSecondary, fontFamily: fonts.dot }]}>
                    {l.ora_fine}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.lezGiorno, { color: C.textPrimary, fontFamily: fonts.mono }]}>
                    {GIORNI[l.giorno]}
                  </Text>
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

        {/* Vai a studio */}
        <TouchableOpacity
          style={[s.studiaBtn, { borderColor: C.accent }]}
          onPress={() => router.push('/(tabs)/studio')}
        >
          <MaterialCommunityIcons name="timer-outline" size={18} color={C.accent} />
          <Text style={[s.studiaBtnText, { color: C.accent, fontFamily: fonts.mono }]}>
            SESSIONE DI STUDIO
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: C.accent }]}
        onPress={() => router.push('/(tabs)/studio')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="timer-outline" size={24} color="#000000" />
      </TouchableOpacity>

      {/* Dialogs */}
      <Portal>
        {/* Dialog task */}
        <Dialog
          visible={dialogModulo}
          onDismiss={() => setDialogModulo(false)}
          style={[s.dialog, { backgroundColor: C.surface }]}
        >
          <Dialog.Title style={[s.dialogTitle, { color: C.textPrimary, fontFamily: fonts.mono }]}>
            Nuovo Task
          </Dialog.Title>
          <Dialog.Content style={s.dialogContent}>
            <TextInput
              label="Nome task (es. Scritto, Orale...)"
              value={nomeModulo}
              onChangeText={setNomeModulo}
              mode="outlined"
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
              style={[s.input, { backgroundColor: C.card }]}
            />
            <View style={s.tipoRow}>
              {(['scritto', 'orale', 'progetto', 'ore'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTipoModulo(t)}
                  style={[
                    s.tipoPill,
                    { borderColor: tipoModulo === t ? tipoColor[t] : C.border },
                    tipoModulo === t && { backgroundColor: tipoColor[t] + '22' },
                  ]}
                >
                  <Text style={[s.tipoPillText, { color: tipoModulo === t ? tipoColor[t] : C.textMuted, fontFamily: fonts.mono }]}>
                    {t.toUpperCase().slice(0, 4)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={C.textSecondary} onPress={() => setDialogModulo(false)}>Annulla</Button>
            <Button mode="contained" onPress={salvaModulo} disabled={!nomeModulo.trim()} buttonColor={C.accent} textColor="#000">
              Aggiungi
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Dialog voto */}
        <Dialog
          visible={dialogVoto}
          onDismiss={() => setDialogVoto(false)}
          style={[s.dialog, { backgroundColor: C.surface }]}
        >
          <Dialog.Title style={[s.dialogTitle, { color: C.textPrimary, fontFamily: fonts.mono }]}>
            Registra Voto
          </Dialog.Title>
          <Dialog.Content style={s.dialogContent}>
            <TextInput
              label="Voto (18–30)"
              value={votoStr}
              onChangeText={setVotoStr}
              keyboardType="numeric"
              mode="outlined"
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
              style={[s.input, { backgroundColor: C.card }]}
            />
            <TouchableOpacity
              style={[
                s.lodeBtn,
                { borderColor: lode ? C.success : C.border, backgroundColor: lode ? C.success + '22' : 'transparent' },
              ]}
              onPress={() => setLode((l) => !l)}
            >
              <MaterialCommunityIcons
                name={lode ? 'star' : 'star-outline'}
                size={18}
                color={lode ? C.success : C.textMuted}
              />
              <Text style={[s.lodeBtnText, { color: lode ? C.success : C.textMuted, fontFamily: fonts.mono }]}>
                {lode ? 'CON LODE (30L)' : 'CON LODE?'}
              </Text>
            </TouchableOpacity>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={C.textSecondary} onPress={() => setDialogVoto(false)}>Annulla</Button>
            <Button
              mode="contained"
              onPress={salvaVoto}
              disabled={!votoStr || parseInt(votoStr, 10) < 18 || parseInt(votoStr, 10) > 30}
              buttonColor={C.success}
              textColor="#000"
            >
              Salva
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Dialog lezione */}
        <Dialog
          visible={dialogLezione}
          onDismiss={() => setDialogLezione(false)}
          style={[s.dialog, { backgroundColor: C.surface }]}
        >
          <Dialog.Title style={[s.dialogTitle, { color: C.textPrimary, fontFamily: fonts.mono }]}>
            Aggiungi Lezione
          </Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 440, paddingHorizontal: 24 }}>
            <ScrollView contentContainerStyle={{ gap: 14, paddingVertical: 8 }}>
              <Text style={[s.fieldLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>GIORNO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {GIORNI.slice(0, 6).map((g, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setLezGiorno(i)}
                      style={[
                        s.giornoPill,
                        { borderColor: lezGiorno === i ? C.accent : C.border },
                        lezGiorno === i && { backgroundColor: C.accentDim },
                      ]}
                    >
                      <Text style={[s.giornoPillText, { color: lezGiorno === i ? C.accent : C.textSecondary, fontFamily: fonts.mono }]}>
                        {g.slice(0, 3).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  label="Inizio (09:00)"
                  value={lezInizio}
                  onChangeText={setLezInizio}
                  mode="outlined"
                  outlineColor={C.border}
                  activeOutlineColor={C.accent}
                  textColor={C.textPrimary}
                  style={[s.input, { flex: 1, backgroundColor: C.card }]}
                />
                <TextInput
                  label="Fine (11:00)"
                  value={lezFine}
                  onChangeText={setLezFine}
                  mode="outlined"
                  outlineColor={C.border}
                  activeOutlineColor={C.accent}
                  textColor={C.textPrimary}
                  style={[s.input, { flex: 1, backgroundColor: C.card }]}
                />
              </View>

              <TextInput
                label="Aula (es. A1, Edificio 4)"
                value={lezAula}
                onChangeText={setLezAula}
                mode="outlined"
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                style={[s.input, { backgroundColor: C.card }]}
              />

              <Text style={[s.fieldLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>COLORE</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {PALETTE.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      s.colorDot,
                      { backgroundColor: c },
                      lezColore === c && { borderWidth: 3, borderColor: '#FFFFFF' },
                    ]}
                    onPress={() => setLezColore(c)}
                  />
                ))}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button textColor={C.textSecondary} onPress={() => setDialogLezione(false)}>Annulla</Button>
            <Button
              mode="contained"
              onPress={salvaLezione}
              disabled={!lezInizio.trim() || !lezFine.trim() || !lezAula.trim()}
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
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  esameNome: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  professore: { fontSize: 13, marginBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  tagText: { fontSize: 11, fontWeight: '700' },
  votoBox: { alignItems: 'center', gap: 4 },
  votoGrande: { fontSize: 44, lineHeight: 46 },
  superatoTag: { fontSize: 11, letterSpacing: 0.5 },
  superaBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  superaBtnText: { color: '#000', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  roiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  roiText: { fontSize: 28, lineHeight: 30 },
  roiSub: { fontSize: 11 },
  roiDot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabel: { fontSize: 10, letterSpacing: 2 },
  addPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  addPillText: { fontSize: 11, letterSpacing: 0.5 },
  progressTrack: { height: 2, borderRadius: 1, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%' },
  muted: { fontSize: 12, lineHeight: 18 },
  moduloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  moduloInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  moduloNome: { flex: 1, fontSize: 14 },
  moduloStrike: { textDecorationLine: 'line-through' },
  tipoTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  tipoTagText: { fontSize: 10, fontWeight: '700' },
  lezioneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 2,
    paddingLeft: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  lezioneOrario: { alignItems: 'center', minWidth: 50 },
  lezOra: { fontSize: 18, lineHeight: 20 },
  lezSep: { fontSize: 10 },
  lezOraFine: { fontSize: 14, lineHeight: 16 },
  lezGiorno: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  aulaTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  aulaText: { fontSize: 11, fontWeight: '700' },
  studiaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
  },
  studiaBtnText: { fontSize: 13, letterSpacing: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: { borderRadius: 20 },
  dialogTitle: { fontSize: 18 },
  dialogContent: { gap: 12 },
  input: {},
  tipoRow: { flexDirection: 'row', gap: 6 },
  tipoPill: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  tipoPillText: { fontSize: 11, letterSpacing: 0.3 },
  lodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  lodeBtnText: { fontSize: 13, letterSpacing: 0.5 },
  fieldLabel: { fontSize: 10, letterSpacing: 2 },
  giornoPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  giornoPillText: { fontSize: 12, letterSpacing: 0.5 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
});
