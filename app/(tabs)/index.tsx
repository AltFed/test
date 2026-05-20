import { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import { getSetting, getAllEsami, getMediaPonderata, getCfuAcquisiti } from '@/db/database';
import type { Esame } from '@/db/types';

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function Dashboard() {
  const C = useColors();
  const [dataLaurea, setDataLaurea] = useState<string | null>(null);
  const [cfuTotali, setCfuTotali] = useState(180);
  const [cfuAcquisiti, setCfuAcquisiti] = useState(0);
  const [media, setMedia] = useState(0);
  const [esami, setEsami] = useState<Esame[]>([]);

  useFocusEffect(
    useCallback(() => {
      setDataLaurea(getSetting('data_laurea'));
      setCfuTotali(parseInt(getSetting('cfu_totali') ?? '180', 10));
      setCfuAcquisiti(getCfuAcquisiti());
      setMedia(getMediaPonderata());
      setEsami(getAllEsami());
    }, [])
  );

  const giorni = dataLaurea ? daysUntil(dataLaurea) : null;
  const cfuProgress = Math.min(cfuAcquisiti / cfuTotali, 1);
  const daSuperare = esami.filter((e) => !e.superato);
  const superati = esami.filter((e) => e.superato);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.appTitle, { color: C.textPrimary, fontFamily: fonts.dot }]}>
            UniVersal
          </Text>
          <TouchableOpacity onPress={() => router.push('/impostazioni')} style={s.settingsBtn}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Countdown card */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
            TARGET LAUREA
          </Text>
          {giorni !== null ? (
            <View style={s.countdownRow}>
              <Text style={[s.countdownNum, { color: C.accent, fontFamily: fonts.dot }]}>
                {String(giorni)}
              </Text>
              <Text style={[s.countdownSuffix, { color: C.textSecondary, fontFamily: fonts.mono }]}>
                {giorni === 1 ? 'giorno' : 'giorni'}{'\n'}alla sessione
              </Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => router.push('/impostazioni')}>
              <Text style={[s.tapHint, { color: C.accent, fontFamily: fonts.mono }]}>
                Imposta data → impostazioni
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CFU progress */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.row}>
            <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              CFU ACQUISITI
            </Text>
            <Text style={[s.cfuCount, { color: C.accent, fontFamily: fonts.dot }]}>
              {String(cfuAcquisiti)} / {String(cfuTotali)}
            </Text>
          </View>
          <View style={[s.progressTrack, { backgroundColor: C.border }]}>
            <View
              style={[s.progressFill, { width: `${cfuProgress * 100}%` as any, backgroundColor: C.accent }]}
            />
          </View>
          <Text style={[s.subtext, { color: C.textMuted, fontFamily: fonts.mono }]}>
            {String(cfuTotali - cfuAcquisiti)} CFU rimanenti · {String(Math.round(cfuProgress * 100))}%
          </Text>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'MEDIA', value: media > 0 ? media.toFixed(2) : '—', color: C.accent },
            { label: 'SUPERATI', value: String(superati.length), color: C.success },
            { label: 'IN SOSPESO', value: String(daSuperare.length), color: C.warning },
          ].map((stat) => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[s.statLabel, { color: C.textMuted, fontFamily: fonts.mono }]}>
                {stat.label}
              </Text>
              <Text style={[s.statNum, { color: stat.color, fontFamily: fonts.dot }]}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Radar operativo */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
            RADAR OPERATIVO
          </Text>
          {daSuperare.length === 0 ? (
            <Text style={[s.subtext, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Nessun esame in sospeso. Ottimo.
            </Text>
          ) : (
            daSuperare.slice(0, 6).map((esame) => (
              <TouchableOpacity
                key={esame.id}
                style={[s.radarRow, { borderBottomColor: C.border }]}
                onPress={() => router.push(`/esame/${esame.id}`)}
              >
                <View style={[s.radarDot, { backgroundColor: C.accent }]} />
                <Text style={[s.radarNome, { color: C.textPrimary, fontFamily: fonts.mono }]} numberOfLines={1}>
                  {esame.nome}
                </Text>
                <Text style={[s.radarCfu, { color: C.textMuted, fontFamily: fonts.mono }]}>
                  {String(esame.cfu)} CFU
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  appTitle: { fontSize: 34, letterSpacing: 1 },
  settingsBtn: { padding: 4 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  label: { fontSize: 10, letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' },
  countdownRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  countdownNum: { fontSize: 88, lineHeight: 88 },
  countdownSuffix: { fontSize: 14, lineHeight: 20 },
  tapHint: { fontSize: 13, textDecorationLine: 'underline' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cfuCount: { fontSize: 22, lineHeight: 24 },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  subtext: { fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 9, letterSpacing: 1.5 },
  statNum: { fontSize: 40, lineHeight: 44 },
  radarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  radarDot: { width: 6, height: 6, borderRadius: 3 },
  radarNome: { flex: 1, fontSize: 13 },
  radarCfu: { fontSize: 12 },
});
