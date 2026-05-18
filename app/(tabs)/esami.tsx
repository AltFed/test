import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  FAB,
  Portal,
  Dialog,
  Button,
  TextInput,
  SegmentedButtons,
  Menu,
  IconButton,
  Divider,
} from 'react-native-paper';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { getAllEsami, insertEsame, deleteEsame, getOreStudiate } from '@/db/database';
import type { Esame } from '@/db/types';

type Filtro = 'tutti' | 'da_fare' | 'superati';

const ACCENT_COLORS = [
  colors.primary,
  colors.secondary,
  colors.warning,
  colors.success,
  '#FF6B9D',
  '#C084FC',
];

function accentForIndex(i: number): string {
  return ACCENT_COLORS[i % ACCENT_COLORS.length];
}

export default function EsamiScreen() {
  const [esami, setEsami] = useState<Esame[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('tutti');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [menuEsameId, setMenuEsameId] = useState<number | null>(null);
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

  function elimina(id: number) {
    Alert.alert('Elimina esame', 'Verranno eliminati anche sessioni e moduli.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => { deleteEsame(id); load(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Esami</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          {esami.filter((e) => e.superato).length}/{esami.length} superati
        </Text>
      </View>

      <View style={styles.filterRow}>
        <SegmentedButtons
          value={filtro}
          onValueChange={(v) => setFiltro(v as Filtro)}
          buttons={[
            { value: 'tutti', label: 'Tutti' },
            { value: 'da_fare', label: 'Da fare' },
            { value: 'superati', label: 'Superati' },
          ]}
          style={styles.segmented}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {filtered.length === 0 && (
          <Text style={styles.empty}>
            {filtro === 'tutti'
              ? 'Nessun esame. Aggiungine uno con + in basso.'
              : 'Nessun esame in questa categoria.'}
          </Text>
        )}

        {filtered.map((esame, index) => {
          const accent = accentForIndex(index);
          const ore = oreMap[esame.id] ?? 0;
          return (
            <View
              key={esame.id}
              style={[styles.card, { borderLeftColor: accent }]}
            >
              <View
                style={styles.cardInner}
                onTouchEnd={() => router.push(`/esame/${esame.id}`)}
              >
                {/* Nome + menu */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={styles.esameNome} numberOfLines={1}>
                      {esame.nome}
                    </Text>
                    {esame.professore ? (
                      <Text variant="bodySmall" style={styles.professore} numberOfLines={1}>
                        {esame.professore}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.cardRight}>
                    {esame.superato ? (
                      <Text style={[styles.votoText, { color: accent }]}>
                        {esame.voto_finale === 33 ? '30L' : String(esame.voto_finale ?? '✓')}
                      </Text>
                    ) : (
                      <Text style={styles.votoMuted}>—</Text>
                    )}
                    <Menu
                      visible={menuEsameId === esame.id}
                      onDismiss={() => setMenuEsameId(null)}
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          size={18}
                          iconColor={colors.textMuted}
                          onPress={() => setMenuEsameId(esame.id)}
                        />
                      }
                    >
                      <Menu.Item
                        onPress={() => { setMenuEsameId(null); router.push(`/esame/${esame.id}`); }}
                        title="Apri dettaglio"
                        leadingIcon="open-in-app"
                      />
                      <Divider />
                      <Menu.Item
                        onPress={() => { setMenuEsameId(null); elimina(esame.id); }}
                        title="Elimina"
                        leadingIcon="trash-can-outline"
                      />
                    </Menu>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <View style={[styles.tag, { backgroundColor: accent + '22' }]}>
                    <Text style={[styles.tagText, { color: accent }]}>
                      {String(esame.cfu)} CFU
                    </Text>
                  </View>
                  {esame.tipo === 'tirocinio' ? (
                    <View style={[styles.tag, { backgroundColor: colors.secondary + '22' }]}>
                      <Text style={[styles.tagText, { color: colors.secondary }]}>Tirocinio</Text>
                    </View>
                  ) : null}
                  {ore > 0 ? (
                    <Text style={styles.oreText}>{String(ore)}h studiate</Text>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title style={{ color: colors.textPrimary }}>Nuovo Esame</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              label="Nome esame"
              value={nome}
              onChangeText={setNome}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.textPrimary}
              style={styles.input}
            />
            <TextInput
              label="Professore (opzionale)"
              value={professore}
              onChangeText={setProfessore}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.textPrimary}
              style={styles.input}
            />
            <TextInput
              label="CFU"
              value={cfu}
              onChangeText={setCfu}
              keyboardType="numeric"
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.textPrimary}
              style={styles.input}
            />
            <SegmentedButtons
              value={tipo}
              onValueChange={(v) => setTipo(v as 'voto' | 'tirocinio')}
              buttons={[
                { value: 'voto', label: 'Voto (30mi)' },
                { value: 'tirocinio', label: 'Tirocinio' },
              ]}
            />
            {tipo === 'tirocinio' ? (
              <TextInput
                label="Ore target tirocinio"
                value={oreTarget}
                onChangeText={setOreTarget}
                keyboardType="numeric"
                mode="outlined"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                style={styles.input}
              />
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.textSecondary} onPress={() => setDialogVisible(false)}>
              Annulla
            </Button>
            <Button mode="contained" onPress={salvaEsame} disabled={!nome.trim() || !cfu.trim()}>
              Aggiungi
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setDialogVisible(true)}
        color={colors.textPrimary}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { color: colors.textPrimary, fontWeight: '800' },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 10 },
  segmented: { backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  cardInner: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  esameNome: { color: colors.textPrimary, fontWeight: '700', marginBottom: 2 },
  professore: { color: colors.textSecondary },
  cardRight: { alignItems: 'flex-end', marginLeft: 8 },
  votoText: { fontSize: 24, fontWeight: '800', lineHeight: 28 },
  votoMuted: { fontSize: 24, fontWeight: '800', color: colors.border, lineHeight: 28 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '700' },
  oreText: { color: colors.textMuted, fontSize: 12, marginLeft: 'auto' },
  dialog: { backgroundColor: colors.surface },
  input: { backgroundColor: colors.card },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: colors.primary,
    borderRadius: 16,
  },
});
