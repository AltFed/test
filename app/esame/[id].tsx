import { useState, useCallback } from 'react';
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
import { useEffect } from 'react';
import { colors } from '@/theme';
import {
  getEsame,
  getModuli,
  insertModulo,
  toggleModulo,
  deleteModulo,
  getOreStudiate,
  updateEsameVoto,
} from '@/db/database';
import type { Esame, Modulo } from '@/db/types';

export default function EsameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const esameId = parseInt(id, 10);
  const navigation = useNavigation();

  const [esame, setEsame] = useState<Esame | null>(null);
  const [moduli, setModuli] = useState<Modulo[]>([]);
  const [ore, setOre] = useState(0);

  // Dialog aggiungi modulo
  const [dialogModulo, setDialogModulo] = useState(false);
  const [nomeModulo, setNomeModulo] = useState('');
  const [tipoModulo, setTipoModulo] = useState<'scritto' | 'orale' | 'progetto' | 'ore'>('scritto');

  // Dialog voto finale
  const [dialogVoto, setDialogVoto] = useState(false);
  const [votoStr, setVotoStr] = useState('');
  const [lode, setLode] = useState(false);

  const load = useCallback(() => {
    const e = getEsame(esameId);
    setEsame(e);
    if (e) {
      navigation.setOptions({ title: e.nome });
      setModuli(getModuli(esameId));
      setOre(getOreStudiate(esameId));
    }
  }, [esameId]);

  useFocusEffect(load);

  function salvaModulo() {
    if (!nomeModulo.trim()) return;
    insertModulo(esameId, nomeModulo.trim(), tipoModulo);
    setNomeModulo('');
    setTipoModulo('scritto');
    setDialogModulo(false);
    load();
  }

  function salvaVoto() {
    const v = parseInt(votoStr, 10);
    if (isNaN(v) || v < 18 || v > 30) return;
    updateEsameVoto(esameId, lode ? 33 : v);
    setDialogVoto(false);
    setVotoStr('');
    setLode(false);
    load();
  }

  function eliminaModulo(mid: number) {
    Alert.alert('Elimina modulo', 'Rimuovere questo task?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => {
          deleteModulo(mid);
          load();
        },
      },
    ]);
  }

  if (!esame) return null;

  const moduliCompletati = moduli.filter((m) => m.completato).length;
  const progressoModuli = moduli.length > 0 ? moduliCompletati / moduli.length : 0;

  const tipoLabel: Record<string, string> = {
    scritto: 'Scritto',
    orale: 'Orale',
    progetto: 'Progetto',
    ore: 'Ore',
  };

  const tipoColor: Record<string, string> = {
    scritto: colors.primary,
    orale: colors.secondary,
    progetto: colors.warning,
    ore: colors.success,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <View>
                <Text variant="headlineSmall" style={styles.nome}>{esame.nome}</Text>
                <View style={styles.chipRow}>
                  <Chip
                    compact
                    style={{ backgroundColor: colors.primary + '22' }}
                    textStyle={{ color: colors.primary, fontSize: 11 }}
                  >
                    {esame.cfu} CFU
                  </Chip>
                  <Chip
                    compact
                    style={{ backgroundColor: colors.border }}
                    textStyle={{ color: colors.textSecondary, fontSize: 11 }}
                  >
                    {esame.tipo === 'tirocinio' ? 'Tirocinio' : 'Esame'}
                  </Chip>
                </View>
              </View>
              <View style={styles.votoBox}>
                {esame.superato ? (
                  <>
                    <Text style={styles.votoGrande}>
                      {esame.voto_finale === 33 ? '30L' : esame.voto_finale}
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

            {ore > 0 && (
              <Text style={[styles.muted, { marginTop: 8 }]}>
                {ore}h studiate totali
              </Text>
            )}

            {esame.superato && ore > 0 && esame.tipo === 'voto' && esame.voto_finale && (
              <View style={styles.roiBox}>
                <Text style={styles.roiLabel}>
                  {ore}h → {esame.voto_finale === 33 ? '30L' : esame.voto_finale}
                  {'  '}·{'  '}
                  {Math.round((ore / esame.cfu) * 10) / 10}h per CFU
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Moduli */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.label}>
                TASK ({moduliCompletati}/{moduli.length})
              </Text>
              <Button
                compact
                mode="text"
                icon="plus"
                textColor={colors.primary}
                onPress={() => setDialogModulo(true)}
              >
                Aggiungi
              </Button>
            </View>

            {moduli.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <View style={styles.progressRow}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressoModuli * 100}%` },
                    ]}
                  />
                </View>
              </View>
            )}

            {moduli.length === 0 && (
              <Text style={styles.muted}>
                Nessun task. Spacchetta l'esame in moduli (Scritto, Orale, Progetto...).
              </Text>
            )}

            {moduli.map((m) => (
              <View key={m.id} style={styles.moduloRow}>
                <Checkbox.Android
                  status={m.completato ? 'checked' : 'unchecked'}
                  color={colors.primary}
                  uncheckedColor={colors.border}
                  onPress={() => {
                    toggleModulo(m.id, m.completato ? 0 : 1);
                    load();
                  }}
                />
                <View style={styles.moduloInfo}>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.moduloNome,
                      m.completato ? styles.moduloCompletato : undefined,
                    ]}
                  >
                    {m.nome}
                  </Text>
                  <Chip
                    compact
                    style={{ backgroundColor: tipoColor[m.tipo] + '22', height: 20 }}
                    textStyle={{ color: tipoColor[m.tipo], fontSize: 10 }}
                  >
                    {tipoLabel[m.tipo]}
                  </Chip>
                </View>
                <IconButton
                  icon="trash-can-outline"
                  size={16}
                  iconColor={colors.textMuted}
                  onPress={() => eliminaModulo(m.id)}
                />
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Pulsante studia */}
        <Button
          mode="outlined"
          icon="timer-outline"
          style={styles.studiaBtn}
          textColor={colors.secondary}
          onPress={() => router.push({ pathname: '/(tabs)/studio' })}
        >
          Vai alla sessione di studio
        </Button>
      </ScrollView>

      {/* Dialog aggiungi modulo */}
      <Portal>
        <Dialog
          visible={dialogModulo}
          onDismiss={() => setDialogModulo(false)}
          style={styles.dialog}
        >
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
              onValueChange={(v) =>
                setTipoModulo(v as 'scritto' | 'orale' | 'progetto' | 'ore')
              }
              buttons={[
                { value: 'scritto', label: 'Scritto' },
                { value: 'orale', label: 'Orale' },
                { value: 'progetto', label: 'Prog.' },
                { value: 'ore', label: 'Ore' },
              ]}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.textSecondary} onPress={() => setDialogModulo(false)}>
              Annulla
            </Button>
            <Button mode="contained" onPress={salvaModulo} disabled={!nomeModulo.trim()}>
              Aggiungi
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Dialog voto */}
        <Dialog
          visible={dialogVoto}
          onDismiss={() => setDialogVoto(false)}
          style={styles.dialog}
        >
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
            <Button textColor={colors.textSecondary} onPress={() => setDialogVoto(false)}>
              Annulla
            </Button>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nome: { color: colors.textPrimary, fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 6 },
  votoBox: { alignItems: 'flex-end' },
  votoGrande: { fontSize: 36, fontWeight: '800', color: colors.success },
  muted: { color: colors.textMuted, fontSize: 12 },
  roiBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  roiLabel: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  progressRow: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  moduloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moduloInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  moduloNome: { color: colors.textPrimary, flex: 1 },
  moduloCompletato: { color: colors.textMuted, textDecorationLine: 'line-through' },
  studiaBtn: { borderColor: colors.secondary, borderRadius: 12 },
  dialog: { backgroundColor: colors.surface },
  input: { backgroundColor: colors.card },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: colors.secondary,
    borderRadius: 16,
  },
});
