import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  ProgressBar,
  IconButton,
  Divider,
} from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { getEsamiSuperati, getMediaPonderata } from '@/db/database';
import type { Esame } from '@/db/types';

interface VotoIpotetico {
  id: string;
  nome: string;
  cfu: string;
  voto: string;
}

function mediaConLode(voto: number): number {
  return voto === 33 ? 30 : voto;
}

function calcolaMedia(esami: Esame[], ipotesi: VotoIpotetico[]): number {
  const reali = esami
    .filter((e) => e.superato && e.tipo === 'voto' && e.voto_finale)
    .map((e) => ({ voto: e.voto_finale!, cfu: e.cfu }));

  const extra = ipotesi
    .filter((h) => h.voto && h.cfu)
    .map((h) => ({
      voto: mediaConLode(parseInt(h.voto, 10)),
      cfu: parseInt(h.cfu, 10),
    }))
    .filter((h) => !isNaN(h.voto) && !isNaN(h.cfu));

  const all = [...reali, ...extra];
  if (all.length === 0) return 0;
  const sumCfu = all.reduce((s, e) => s + e.cfu, 0);
  const sumPeso = all.reduce((s, e) => s + e.voto * e.cfu, 0);
  return Math.round((sumPeso / sumCfu) * 100) / 100;
}

function votiNecessariPer(mediaTarget: number, esami: Esame[], cfu: number): number | null {
  const reali = esami
    .filter((e) => e.superato && e.tipo === 'voto' && e.voto_finale)
    .map((e) => ({ voto: e.voto_finale!, cfu: e.cfu }));
  if (reali.length === 0) return null;
  const sumCfuAttuali = reali.reduce((s, e) => s + e.cfu, 0);
  const sumPesoAttuali = reali.reduce((s, e) => s + e.voto * e.cfu, 0);
  // target = (sumPeso + X * cfu) / (sumCfu + cfu)
  // X = (target * (sumCfu + cfu) - sumPeso) / cfu
  const votoNecessario =
    (mediaTarget * (sumCfuAttuali + cfu) - sumPesoAttuali) / cfu;
  return Math.round(votoNecessario * 10) / 10;
}

// Conversione media → 110: formula standard
function mediaA110(media: number): number {
  return Math.round((media / 30) * 110 * 10) / 10;
}

export default function SimulatoreScreen() {
  const [esamiSuperati, setEsamiSuperati] = useState<Esame[]>([]);
  const [mediaAttuale, setMediaAttuale] = useState(0);
  const [ipotesi, setIpotesi] = useState<VotoIpotetico[]>([]);
  const [targetMediaStr, setTargetMediaStr] = useState('');
  const [cfuSimStr, setCfuSimStr] = useState('6');

  useFocusEffect(
    useCallback(() => {
      const sup = getEsamiSuperati();
      setEsamiSuperati(sup);
      setMediaAttuale(getMediaPonderata());
    }, [])
  );

  const mediaSimulata = calcolaMedia(esamiSuperati, ipotesi);
  const deltaMedia = mediaSimulata - mediaAttuale;
  const voto110Attuale = mediaA110(mediaAttuale);
  const voto110Simulato = mediaA110(mediaSimulata);

  const targetMedia = parseFloat(targetMediaStr);
  const cfuSim = parseInt(cfuSimStr, 10);
  const votoNecessario =
    targetMediaStr && !isNaN(targetMedia) && !isNaN(cfuSim)
      ? votiNecessariPer(targetMedia, esamiSuperati, cfuSim)
      : null;

  function aggiungiIpotesi() {
    setIpotesi((prev) => [
      ...prev,
      { id: Date.now().toString(), nome: '', cfu: '6', voto: '' },
    ]);
  }

  function rimuoviIpotesi(id: string) {
    setIpotesi((prev) => prev.filter((h) => h.id !== id));
  }

  function aggiornaIpotesi(id: string, field: keyof VotoIpotetico, val: string) {
    setIpotesi((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: val } : h))
    );
  }

  const progressTarget = Math.min(mediaSimulata / 30, 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>Simulatore</Text>

        {/* Media attuale */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>MEDIA ATTUALE</Text>
            <View style={styles.mediaRow}>
              <View style={styles.mediaBlock}>
                <Text style={styles.mediaNum}>
                  {mediaAttuale > 0 ? mediaAttuale.toFixed(2) : '—'}
                </Text>
                <Text style={styles.muted}>/ 30 ponderata</Text>
              </View>
              <View style={[styles.mediaBlock, { alignItems: 'flex-end' }]}>
                <Text style={[styles.mediaNum, { color: colors.secondary }]}>
                  {mediaAttuale > 0 ? voto110Attuale : '—'}
                </Text>
                <Text style={styles.muted}>/ 110 stimato</Text>
              </View>
            </View>
            <ProgressBar
              progress={mediaAttuale > 0 ? progressTarget : 0}
              color={colors.primary}
              style={styles.bar}
            />
            <Text style={styles.muted}>
              {esamiSuperati.filter((e) => e.tipo === 'voto').length} esami con voto registrati
            </Text>
          </Card.Content>
        </Card>

        {/* Simulazione sliding doors */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.label}>SLIDING DOORS</Text>
              <Button
                compact
                mode="text"
                onPress={aggiungiIpotesi}
                textColor={colors.primary}
                icon="plus"
              >
                Aggiungi voto
              </Button>
            </View>

            {ipotesi.length === 0 && (
              <Text style={styles.muted}>
                Aggiungi voti ipotetici per vedere come cambia la tua media.
              </Text>
            )}

            {ipotesi.map((h) => (
              <View key={h.id} style={styles.ipotesiRow}>
                <TextInput
                  placeholder="Materia"
                  value={h.nome}
                  onChangeText={(v) => aggiornaIpotesi(h.id, 'nome', v)}
                  mode="outlined"
                  style={[styles.input, { flex: 2 }]}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textMuted}
                  dense
                />
                <TextInput
                  placeholder="CFU"
                  value={h.cfu}
                  onChangeText={(v) => aggiornaIpotesi(h.id, 'cfu', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textMuted}
                  dense
                />
                <TextInput
                  placeholder="Voto"
                  value={h.voto}
                  onChangeText={(v) => aggiornaIpotesi(h.id, 'voto', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textMuted}
                  dense
                />
                <IconButton
                  icon="close"
                  size={18}
                  iconColor={colors.textMuted}
                  onPress={() => rimuoviIpotesi(h.id)}
                />
              </View>
            ))}

            {ipotesi.length > 0 && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.deltaRow}>
                  <View style={styles.deltaBlock}>
                    <Text style={styles.label}>MEDIA SIMULATA</Text>
                    <Text style={[styles.deltaNum, { color: colors.primary }]}>
                      {mediaSimulata > 0 ? mediaSimulata.toFixed(2) : '—'}
                    </Text>
                  </View>
                  <View style={styles.deltaBlock}>
                    <Text style={styles.label}>DELTA</Text>
                    <Text
                      style={[
                        styles.deltaNum,
                        { color: deltaMedia >= 0 ? colors.success : colors.error },
                      ]}
                    >
                      {deltaMedia >= 0 ? '+' : ''}{deltaMedia.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.deltaBlock}>
                    <Text style={styles.label}>/ 110</Text>
                    <Text style={[styles.deltaNum, { color: colors.secondary }]}>
                      {mediaSimulata > 0 ? voto110Simulato : '—'}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Calcolatore target */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>CALCOLATORE TARGET</Text>
            <Text style={[styles.muted, { marginBottom: 12 }]}>
              Che voto devo prendere per raggiungere la media desiderata?
            </Text>
            <View style={styles.targetRow}>
              <TextInput
                label="Media target"
                value={targetMediaStr}
                onChangeText={setTargetMediaStr}
                keyboardType="decimal-pad"
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
              />
              <TextInput
                label="Su CFU"
                value={cfuSimStr}
                onChangeText={setCfuSimStr}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
              />
            </View>

            {votoNecessario !== null && (
              <View style={styles.risultatoBox}>
                <Text style={styles.muted}>Voto necessario al prossimo esame ({cfuSim} CFU):</Text>
                <Text
                  style={[
                    styles.risultatoNum,
                    {
                      color:
                        votoNecessario <= 30
                          ? colors.success
                          : votoNecessario <= 33
                          ? colors.warning
                          : colors.error,
                    },
                  ]}
                >
                  {votoNecessario > 33
                    ? 'Impossibile con questo esame'
                    : votoNecessario <= 18
                    ? '18 (minimo)'
                    : `${votoNecessario > 30 ? '30 con lode' : votoNecessario}`}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
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
    marginBottom: 8,
  },
  mediaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  mediaBlock: {},
  mediaNum: { fontSize: 40, fontWeight: '800', color: colors.primary },
  muted: { color: colors.textMuted, fontSize: 12 },
  bar: { height: 8, borderRadius: 4, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ipotesiRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 8 },
  input: { backgroundColor: colors.surface },
  divider: { marginVertical: 12, backgroundColor: colors.border },
  deltaRow: { flexDirection: 'row', justifyContent: 'space-around' },
  deltaBlock: { alignItems: 'center' },
  deltaNum: { fontSize: 28, fontWeight: '800' },
  targetRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  risultatoBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    alignItems: 'center',
  },
  risultatoNum: { fontSize: 24, fontWeight: '800' },
});
