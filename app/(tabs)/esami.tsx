import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  FAB,
  Portal,
  Dialog,
  Button,
  TextInput,
  SegmentedButtons,
  Chip,
  Menu,
  IconButton,
} from 'react-native-paper';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import {
  getAllEsami,
  insertEsame,
  deleteEsame,
  getOreStudiate,
} from '@/db/database';
import type { Esame } from '@/db/types';

type Filtro = 'tutti' | 'da_fare' | 'superati';

export default function EsamiScreen() {
  const [esami, setEsami] = useState<Esame[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('tutti');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [menuEsameId, setMenuEsameId] = useState<number | null>(null);
  const [oreMap, setOreMap] = useState<Record<number, number>>({});

  // Campi form
  const [nome, setNome] = useState('');
  const [cfu, setCfu] = useState('');
  const [tipo, setTipo] = useState<'voto' | 'tirocinio'>('voto');
  const [oreTarget, setOreTarget] = useState('');

  const load = useCallback(() => {
    const list = getAllEsami();
    setEsami(list);
    const map: Record<number, number> = {};
    list.forEach((e) => {
      map[e.id] = getOreStudiate(e.id);
    });
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
      tipo === 'tirocinio' && oreTarget ? parseInt(oreTarget, 10) : undefined
    );
    setNome('');
    setCfu('');
    setTipo('voto');
    setOreTarget('');
    setDialogVisible(false);
    load();
  }

  function elimina(id: number) {
    Alert.alert('Elimina esame', 'Sei sicuro? Verranno eliminati anche sessioni e moduli.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => {
          deleteEsame(id);
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Esami</Text>
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
          theme={{ colors: { secondaryContainer: colors.primary + '33' } }}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {filtered.length === 0 && (
          <Text style={styles.empty}>
            {filtro === 'tutti'
              ? 'Nessun esame. Aggiungine uno con il tasto + in basso.'
              : 'Nessun esame in questa categoria.'}
          </Text>
        )}

        {filtered.map((esame) => (
          <Card
            key={esame.id}
            style={styles.card}
            onPress={() => router.push(`/esame/${esame.id}`)}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.esameNome} numberOfLines={1}>
                    {esame.nome}
                  </Text>
                  <View style={styles.chipRow}>
                    <Chip
                      compact
                      style={[
                        styles.chip,
                        { backgroundColor: colors.primary + '22' },
                      ]}
                      textStyle={{ color: colors.primary, fontSize: 11 }}
                    >
                      {esame.cfu} CFU
                    </Chip>
                    {esame.tipo === 'tirocinio' && (
                      <Chip
                        compact
                        style={[styles.chip, { backgroundColor: colors.secondary + '22' }]}
                        textStyle={{ color: colors.secondary, fontSize: 11 }}
                      >
                        Tirocinio
                      </Chip>
                    )}
                  </View>
                </View>

                <View style={styles.cardRight}>
                  {esame.superato ? (
                    <Text style={styles.votoText}>
                      {esame.voto_finale === 33 ? '30L' : esame.voto_finale ?? '✓'}
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
                      onPress={() => {
                        setMenuEsameId(null);
                        router.push(`/esame/${esame.id}`);
                      }}
                      title="Apri dettaglio"
                      leadingIcon="open-in-app"
                    />
                    <Menu.Item
                      onPress={() => {
                        setMenuEsameId(null);
                        elimina(esame.id);
                      }}
                      title="Elimina"
                      leadingIcon="trash-can-outline"
                    />
                  </Menu>
                </View>
              </View>

              <Text variant="bodySmall" style={styles.oreText}>
                {oreMap[esame.id] ?? 0}h studiate
              </Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={styles.dialog}
        >
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
            {tipo === 'tirocinio' && (
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
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.textSecondary} onPress={() => setDialogVisible(false)}>
              Annulla
            </Button>
            <Button
              mode="contained"
              onPress={salvaEsame}
              disabled={!nome.trim() || !cfu.trim()}
            >
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
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { color: colors.textPrimary, fontWeight: '800' },
  filterRow: { paddingHorizontal: 16, paddingBottom: 8 },
  segmented: { backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 16 },
  cardContent: { gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  esameNome: { color: colors.textPrimary, fontWeight: '600', marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: { height: 22 },
  cardRight: { alignItems: 'flex-end' },
  votoText: { fontSize: 22, fontWeight: '800', color: colors.success },
  votoMuted: { fontSize: 22, fontWeight: '800', color: colors.textMuted },
  oreText: { color: colors.textMuted },
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
