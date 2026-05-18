import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import { getEsamiSuperati, getMediaPonderata } from '@/db/database';
import type { Esame } from '@/db/types';

interface VotoIpotetico {
  id: string;
  nome: string;
  cfu: string;
  voto: string;
}

function mediaConLode(v: number): number { return v === 33 ? 30 : v; }

function calcolaMedia(esami: Esame[], ipotesi: VotoIpotetico[]): number {
  const reali = esami
    .filter((e) => e.superato && e.tipo === 'voto' && e.voto_finale)
    .map((e) => ({ voto: e.voto_finale!, cfu: e.cfu }));
  const extra = ipotesi
    .filter((h) => h.voto && h.cfu)
    .map((h) => ({ voto: mediaConLode(parseInt(h.voto, 10)), cfu: parseInt(h.cfu, 10) }))
    .filter((h) => !isNaN(h.voto) && !isNaN(h.cfu));
  const all = [...reali, ...extra];
  if (all.length === 0) return 0;
  const sumCfu = all.reduce((s, e) => s + e.cfu, 0);
  const sumPeso = all.reduce((s, e) => s + e.voto * e.cfu, 0);
  return Math.round((sumPeso / sumCfu) * 100) / 100;
}

function votoNecessarioPer(target: number, esami: Esame[], cfu: number): number | null {
  const reali = esami
    .filter((e) => e.superato && e.tipo === 'voto' && e.voto_finale)
    .map((e) => ({ voto: e.voto_finale!, cfu: e.cfu }));
  if (reali.length === 0) return null;
  const sumCfu = reali.reduce((s, e) => s + e.cfu, 0);
  const sumPeso = reali.reduce((s, e) => s + e.voto * e.cfu, 0);
  return Math.round(((target * (sumCfu + cfu) - sumPeso) / cfu) * 10) / 10;
}

function mediaA110(media: number): number {
  return Math.round((media / 30) * 110 * 10) / 10;
}

export default function SimulatoreScreen() {
  const C = useColors();
  const [esamiSuperati, setEsamiSuperati] = useState<Esame[]>([]);
  const [mediaAttuale, setMediaAttuale] = useState(0);
  const [ipotesi, setIpotesi] = useState<VotoIpotetico[]>([]);
  const [targetMediaStr, setTargetMediaStr] = useState('');
  const [cfuSimStr, setCfuSimStr] = useState('6');

  useFocusEffect(
    useCallback(() => {
      setEsamiSuperati(getEsamiSuperati());
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
      ? votoNecessarioPer(targetMedia, esamiSuperati, cfuSim)
      : null;

  function aggiungiIpotesi() {
    setIpotesi((prev) => [...prev, { id: Date.now().toString(), nome: '', cfu: '6', voto: '' }]);
  }

  function aggiornaIpotesi(id: string, field: keyof VotoIpotetico, val: string) {
    setIpotesi((prev) => prev.map((h) => (h.id === id ? { ...h, [field]: val } : h)));
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.title, { color: C.textPrimary, fontFamily: fonts.dot }]}>Simulatore</Text>

        {/* Media attuale */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
            MEDIA ATTUALE
          </Text>
          <View style={s.mediaRow}>
            <View style={s.mediaBlock}>
              <Text style={[s.mediaBig, { color: C.accent, fontFamily: fonts.dot }]}>
                {mediaAttuale > 0 ? mediaAttuale.toFixed(2) : '—'}
              </Text>
              <Text style={[s.mediaSub, { color: C.textMuted, fontFamily: fonts.mono }]}>
                / 30 ponderata
              </Text>
            </View>
            <View style={[s.mediaDivider, { backgroundColor: C.border }]} />
            <View style={[s.mediaBlock, { alignItems: 'flex-end' }]}>
              <Text style={[s.mediaBig, { color: C.textSecondary, fontFamily: fonts.dot }]}>
                {mediaAttuale > 0 ? String(voto110Attuale) : '—'}
              </Text>
              <Text style={[s.mediaSub, { color: C.textMuted, fontFamily: fonts.mono }]}>
                / 110 stimato
              </Text>
            </View>
          </View>
          <View style={[s.progressTrack, { backgroundColor: C.border }]}>
            <View
              style={[
                s.progressFill,
                { width: `${(mediaAttuale / 30) * 100}%` as any, backgroundColor: C.accent },
              ]}
            />
          </View>
          <Text style={[s.subtext, { color: C.textMuted, fontFamily: fonts.mono }]}>
            {String(esamiSuperati.filter((e) => e.tipo === 'voto').length)} esami con voto
          </Text>
        </View>

        {/* Sliding doors */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              SLIDING DOORS
            </Text>
            <TouchableOpacity
              style={[s.addBtn, { borderColor: C.accent }]}
              onPress={aggiungiIpotesi}
            >
              <MaterialCommunityIcons name="plus" size={14} color={C.accent} />
              <Text style={[s.addBtnText, { color: C.accent, fontFamily: fonts.mono }]}>
                AGGIUNGI
              </Text>
            </TouchableOpacity>
          </View>

          {ipotesi.length === 0 && (
            <Text style={[s.subtext, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Aggiungi voti ipotetici per simulare la tua media futura.
            </Text>
          )}

          {ipotesi.map((h) => (
            <View key={h.id} style={s.ipotesiRow}>
              <TextInput
                placeholder="Materia"
                value={h.nome}
                onChangeText={(v) => aggiornaIpotesi(h.id, 'nome', v)}
                mode="outlined"
                style={[s.input, { flex: 2, backgroundColor: C.surface }]}
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                placeholderTextColor={C.textMuted}
                dense
              />
              <TextInput
                placeholder="CFU"
                value={h.cfu}
                onChangeText={(v) => aggiornaIpotesi(h.id, 'cfu', v)}
                keyboardType="numeric"
                mode="outlined"
                style={[s.input, { flex: 1, backgroundColor: C.surface }]}
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                placeholderTextColor={C.textMuted}
                dense
              />
              <TextInput
                placeholder="Voto"
                value={h.voto}
                onChangeText={(v) => aggiornaIpotesi(h.id, 'voto', v)}
                keyboardType="numeric"
                mode="outlined"
                style={[s.input, { flex: 1, backgroundColor: C.surface }]}
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                placeholderTextColor={C.textMuted}
                dense
              />
              <TouchableOpacity
                onPress={() => setIpotesi((p) => p.filter((x) => x.id !== h.id))}
                style={s.removeBtn}
              >
                <MaterialCommunityIcons name="close" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          {ipotesi.length > 0 && (
            <View style={[s.deltaBox, { borderTopColor: C.border }]}>
              {[
                { label: 'SIMULATA', value: mediaSimulata > 0 ? mediaSimulata.toFixed(2) : '—', color: C.accent },
                {
                  label: 'DELTA',
                  value: `${deltaMedia >= 0 ? '+' : ''}${deltaMedia.toFixed(2)}`,
                  color: deltaMedia >= 0 ? C.success : C.destructive,
                },
                { label: '/ 110', value: mediaSimulata > 0 ? String(voto110Simulato) : '—', color: C.textSecondary },
              ].map((item) => (
                <View key={item.label} style={s.deltaItem}>
                  <Text style={[s.deltaLabel, { color: C.textMuted, fontFamily: fonts.mono }]}>
                    {item.label}
                  </Text>
                  <Text style={[s.deltaNum, { color: item.color, fontFamily: fonts.dot }]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Target calculator */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
            CALCOLATORE TARGET
          </Text>
          <Text style={[s.subtext, { color: C.textMuted, fontFamily: fonts.mono, marginBottom: 12 }]}>
            Che voto devo prendere per raggiungere la media target?
          </Text>
          <View style={s.targetRow}>
            <TextInput
              label="Media target"
              value={targetMediaStr}
              onChangeText={setTargetMediaStr}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[s.input, { flex: 1, backgroundColor: C.surface }]}
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
            />
            <TextInput
              label="Su CFU"
              value={cfuSimStr}
              onChangeText={setCfuSimStr}
              keyboardType="numeric"
              mode="outlined"
              style={[s.input, { flex: 1, backgroundColor: C.surface }]}
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
            />
          </View>

          {votoNecessario !== null && (
            <View style={[s.risultatoBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[s.subtext, { color: C.textMuted, fontFamily: fonts.mono }]}>
                Voto necessario ({String(cfuSim)} CFU):
              </Text>
              <Text
                style={[
                  s.risultatoNum,
                  {
                    fontFamily: fonts.dot,
                    color: votoNecessario <= 30 ? C.success : votoNecessario <= 33 ? C.warning : C.destructive,
                  },
                ]}
              >
                {votoNecessario > 33
                  ? 'IMPOSSIBILE'
                  : votoNecessario <= 18
                  ? '18 MIN'
                  : votoNecessario > 30
                  ? '30 LODE'
                  : String(votoNecessario)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 36, lineHeight: 38, marginBottom: 4 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  label: { fontSize: 10, letterSpacing: 2, marginBottom: 10 },
  mediaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  mediaBlock: { flex: 1 },
  mediaBig: { fontSize: 44, lineHeight: 46 },
  mediaSub: { fontSize: 12 },
  mediaDivider: { width: 1, height: 50 },
  progressTrack: { height: 2, borderRadius: 1, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%' },
  subtext: { fontSize: 12, lineHeight: 18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  addBtnText: { fontSize: 11, letterSpacing: 0.5 },
  ipotesiRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 8 },
  input: {},
  removeBtn: { padding: 4 },
  deltaBox: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  deltaItem: { alignItems: 'center', gap: 2 },
  deltaLabel: { fontSize: 9, letterSpacing: 1.5 },
  deltaNum: { fontSize: 32, lineHeight: 34 },
  targetRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  risultatoBox: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  risultatoNum: { fontSize: 36, lineHeight: 38 },
});
