import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import { SwipeableRow } from '@/components/SwipeableRow';
import { getAllEsami, insertEsame, deleteEsame, getOreStudiate } from '@/db/database';
import type { Esame } from '@/db/types';

function parseImportText(text: string): Array<{ nome: string; cfu: number; tipo: 'voto' | 'tirocinio' }> {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const tokens = line.split(/\s+/);
      const tipo: 'voto' | 'tirocinio' = tokens.some((t) =>
        t.toLowerCase().startsWith('tirocin')
      ) ? 'tirocinio' : 'voto';
      const numIdx = tokens.findIndex((t) => /^\d+$/.test(t));
      if (numIdx === -1) return [];
      const cfu = parseInt(tokens[numIdx], 10);
      const nome = tokens
        .filter((_, i) => i !== numIdx && !tokens[i].toLowerCase().startsWith('tirocin'))
        .join(' ').trim();
      if (!nome || !cfu) return [];
      return [{ nome, cfu, tipo }];
    });
}

type Filtro = 'tutti' | 'da_fare' | 'superati';

const ACCENTS = ['#FFE600', '#30D158', '#0A84FF', '#FF9F0A', '#FF453A', '#BF5AF2'];

function accentForIndex(i: number): string {
  return ACCENTS[i % ACCENTS.length];
}

const FILTRI: { key: Filtro; label: string }[] = [
  { key: 'tutti', label: 'TUTTI' },
  { key: 'da_fare', label: 'DA FARE' },
  { key: 'superati', label: 'SUPERATI' },
];

export default function EsamiScreen() {
  const C = useColors();
  const [esami, setEsami] = useState<Esame[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('tutti');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [oreMap, setOreMap] = useState<Record<number, number>>({});

  const [nome, setNome] = useState('');
  const [professore, setProfessore] = useState('');
  const [cfu, setCfu] = useState('');
  const [tipo, setTipo] = useState<'voto' | 'tirocinio'>('voto');
  const [oreTarget, setOreTarget] = useState('');

  const load = useCallback(() => {
    const list = getAllEsami();
    setEsami(list);
    const map: Record<number, number> = {};
    list.forEach((e) => { map[e.id] = getOreStudiate(e.id); });
    setOreMap(map);
  }, []);

  useFocusEffect(load);

  const filtered = esami.filter((e) => {
    if (filtro === 'da_fare') return !e.superato;
    if (filtro === 'superati') return e.superato === 1;
    return true;
  });

  function salvaImport() {
    const parsed = parseImportText(importText);
    parsed.forEach(({ nome, cfu, tipo }) => insertEsame(nome, cfu, tipo));
    setImportText('');
    setImportVisible(false);
    load();
  }

  function salvaEsame() {
    if (!nome.trim() || !cfu.trim()) return;
    insertEsame(
      nome.trim(),
      parseInt(cfu, 10),
      tipo,
      professore.trim() || undefined,
      tipo === 'tirocinio' && oreTarget ? parseInt(oreTarget, 10) : undefined
    );
    setNome(''); setProfessore(''); setCfu(''); setTipo('voto'); setOreTarget('');
    setDialogVisible(false);
    load();
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: C.textPrimary, fontFamily: fonts.dot }]}>Esami</Text>
          <Text style={[s.subtitle, { color: C.textMuted, fontFamily: fonts.mono }]}>
            {esami.filter((e) => e.superato).length}/{esami.length} superati
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {FILTRI.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFiltro(f.key)}
            style={[
              s.filterPill,
              { borderColor: filtro === f.key ? C.accent : C.border },
              filtro === f.key && { backgroundColor: C.accentDim },
            ]}
          >
            <Text
              style={[
                s.filterLabel,
                { color: filtro === f.key ? C.accent : C.textMuted, fontFamily: fonts.mono },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {filtered.length === 0 && (
          <Text style={[s.empty, { color: C.textMuted, fontFamily: fonts.mono }]}>
            {filtro === 'tutti'
              ? 'Nessun esame. Aggiungine uno con + in basso.'
              : 'Nessun esame in questa categoria.'}
          </Text>
        )}

        {filtered.map((esame, index) => {
          const accent = accentForIndex(index);
          const ore = oreMap[esame.id] ?? 0;
          return (
            <SwipeableRow
              key={esame.id}
              onDelete={() => { deleteEsame(esame.id); load(); }}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderLeftWidth: 3,
                borderColor: C.border,
                borderLeftColor: accent,
                marginBottom: 10,
              }}
            >
              <TouchableOpacity
                style={[s.card, { backgroundColor: C.card }]}
                onPress={() => router.push(`/esame/${esame.id}`)}
                activeOpacity={0.7}
              >
                <View style={s.cardMain}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.esameNome, { color: C.textPrimary, fontFamily: fonts.mono }]} numberOfLines={1}>
                      {esame.nome}
                    </Text>
                    {esame.professore ? (
                      <Text style={[s.professore, { color: C.textSecondary, fontFamily: fonts.mono }]} numberOfLines={1}>
                        {esame.professore}
                      </Text>
                    ) : null}
                    <View style={s.tagRow}>
                      <View style={[s.tag, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
                        <Text style={[s.tagText, { color: accent, fontFamily: fonts.mono }]}>
                          {String(esame.cfu)} CFU
                        </Text>
                      </View>
                      {esame.tipo === 'tirocinio' ? (
                        <View style={[s.tag, { backgroundColor: C.border }]}>
                          <Text style={[s.tagText, { color: C.textSecondary, fontFamily: fonts.mono }]}>
                            TRC
                          </Text>
                        </View>
                      ) : null}
                      {ore > 0 ? (
                        <Text style={[s.oreText, { color: C.textMuted, fontFamily: fonts.mono }]}>
                          {String(ore)}h
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={s.votoBox}>
                    {esame.superato ? (
                      <Text style={[s.voto, { color: accent, fontFamily: fonts.dot }]}>
                        {esame.voto_finale === 33 ? '30L' : String(esame.voto_finale ?? '✓')}
                      </Text>
                    ) : (
                      <MaterialCommunityIcons name="chevron-right" size={18} color={C.textMuted} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </SwipeableRow>
          );
        })}
      </ScrollView>

      {/* FAB import */}
      <TouchableOpacity
        style={[s.fabImport, { backgroundColor: C.card, borderColor: C.border }]}
        onPress={() => setImportVisible(true)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="import" size={22} color={C.accent} />
      </TouchableOpacity>

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: C.accent }]}
        onPress={() => setDialogVisible(true)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={26} color="#000000" />
      </TouchableOpacity>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={[s.dialog, { backgroundColor: C.surface }]}
        >
          <Dialog.Title style={[s.dialogTitle, { color: C.textPrimary, fontFamily: fonts.mono }]}>
            Nuovo Esame
          </Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 380, paddingHorizontal: 24 }}>
            <ScrollView contentContainerStyle={s.dialogContent} keyboardShouldPersistTaps="handled">
              <TextInput
                label="Nome esame"
                value={nome}
                onChangeText={setNome}
                mode="outlined"
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                style={[s.input, { backgroundColor: C.card }]}
              />
              <TextInput
                label="Professore (opzionale)"
                value={professore}
                onChangeText={setProfessore}
                mode="outlined"
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                style={[s.input, { backgroundColor: C.card }]}
              />
              <TextInput
                label="CFU"
                value={cfu}
                onChangeText={setCfu}
                keyboardType="numeric"
                mode="outlined"
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                style={[s.input, { backgroundColor: C.card }]}
              />
              <View style={s.tipoRow}>
                {(['voto', 'tirocinio'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTipo(t)}
                    style={[
                      s.tipoPill,
                      { borderColor: tipo === t ? C.accent : C.border },
                      tipo === t && { backgroundColor: C.accentDim },
                    ]}
                  >
                    <Text style={[s.tipoPillText, { color: tipo === t ? C.accent : C.textMuted, fontFamily: fonts.mono }]}>
                      {t === 'voto' ? 'VOTO (30mi)' : 'TIROCINIO'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {tipo === 'tirocinio' ? (
                <TextInput
                  label="Ore target tirocinio"
                  value={oreTarget}
                  onChangeText={setOreTarget}
                  keyboardType="numeric"
                  mode="outlined"
                  outlineColor={C.border}
                  activeOutlineColor={C.accent}
                  textColor={C.textPrimary}
                  style={[s.input, { backgroundColor: C.card }]}
                />
              ) : null}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button textColor={C.textSecondary} onPress={() => setDialogVisible(false)}>Annulla</Button>
            <Button
              mode="contained"
              onPress={salvaEsame}
              disabled={!nome.trim() || !cfu.trim()}
              buttonColor={C.accent}
              textColor="#000000"
            >
              Aggiungi
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Dialog import massivo */}
        <Dialog
          visible={importVisible}
          onDismiss={() => setImportVisible(false)}
          style={[s.dialog, { backgroundColor: C.surface }]}
        >
          <Dialog.Title style={[s.dialogTitle, { color: C.textPrimary, fontFamily: fonts.mono }]}>
            Import Massivo
          </Dialog.Title>
          <Dialog.Content style={s.dialogContent}>
            <Text style={[s.importHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
              {'Una riga per esame: "Nome Esame CFU [tirocinio]"\nEs: Analisi Matematica 9\nFisica 6\nTirocinio Azienda 6 tirocinio'}
            </Text>
            <TextInput
              label="Incolla qui la lista"
              value={importText}
              onChangeText={setImportText}
              mode="outlined"
              multiline
              numberOfLines={8}
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
              style={[s.input, { backgroundColor: C.card, minHeight: 160 }]}
            />
            {importText.trim() ? (
              <Text style={[s.importPreview, { color: C.textSecondary, fontFamily: fonts.mono }]}>
                {String(parseImportText(importText).length)} esami rilevati
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={C.textSecondary} onPress={() => setImportVisible(false)}>Annulla</Button>
            <Button
              mode="contained"
              onPress={salvaImport}
              disabled={parseImportText(importText).length === 0}
              buttonColor={C.accent}
              textColor="#000000"
            >
              Importa
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
  subtitle: { fontSize: 12, marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 11, letterSpacing: 0.5 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100, gap: 10 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 13, lineHeight: 20 },
  card: {
    padding: 14,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  esameNome: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  professore: { fontSize: 12, marginBottom: 6 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  tagText: { fontSize: 11, fontWeight: '700' },
  oreText: { fontSize: 11 },
  votoBox: { alignItems: 'flex-end', minWidth: 40 },
  voto: { fontSize: 30, lineHeight: 32 },
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
  fabImport: {
    position: 'absolute',
    right: 88,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importHint: { fontSize: 11, lineHeight: 18, marginBottom: 4 },
  importPreview: { fontSize: 11, textAlign: 'right' },
  dialog: { borderRadius: 20 },
  dialogTitle: { fontSize: 18 },
  dialogContent: { gap: 12 },
  input: {},
  tipoRow: { flexDirection: 'row', gap: 8 },
  tipoPill: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  tipoPillText: { fontSize: 11, letterSpacing: 0.3 },
});
