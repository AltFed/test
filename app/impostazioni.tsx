import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import { getSetting, setSetting, resetAllData } from '@/db/database';

export default function Impostazioni() {
  const C = useColors();
  const [nomeStudente, setNomeStudente] = useState('');
  const [corsoLaurea, setCorsoLaurea] = useState('');
  const [cfuTotali, setCfuTotali] = useState('180');
  const [dataLaurea, setDataLaurea] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNomeStudente(getSetting('nome_studente') ?? '');
    setCorsoLaurea(getSetting('corso_laurea') ?? '');
    setCfuTotali(getSetting('cfu_totali') ?? '180');
    setDataLaurea(getSetting('data_laurea') ?? '');
  }, []);

  function isDataValida(): boolean {
    if (!dataLaurea) return true;
    return !isNaN(new Date(dataLaurea).getTime());
  }

  function salva() {
    if (nomeStudente.trim()) setSetting('nome_studente', nomeStudente.trim());
    if (corsoLaurea.trim()) setSetting('corso_laurea', corsoLaurea.trim());
    if (cfuTotali.trim()) setSetting('cfu_totali', cfuTotali.trim());
    if (dataLaurea.trim()) setSetting('data_laurea', dataLaurea.trim());
    setSaved(true);
    setTimeout(() => router.back(), 700);
  }

  function confermaReset() {
    Alert.alert(
      'Cancella tutti i dati',
      'Verranno eliminati tutti gli esami, sessioni, lezioni, moduli e flashcard. Le impostazioni rimarranno.\n\nL\'operazione non è reversibile.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella tutto',
          style: 'destructive',
          onPress: () => {
            resetAllData();
            Alert.alert('Fatto', 'Tutti i dati sono stati eliminati.');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        {/* Profilo */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>PROFILO</Text>
          <TextInput
            label="Nome e cognome"
            value={nomeStudente}
            onChangeText={(v) => { setNomeStudente(v); setSaved(false); }}
            mode="outlined"
            outlineColor={C.border}
            activeOutlineColor={C.accent}
            textColor={C.textPrimary}
            style={{ backgroundColor: C.background }}
          />
          <TextInput
            label="Corso di laurea"
            value={corsoLaurea}
            onChangeText={(v) => { setCorsoLaurea(v); setSaved(false); }}
            mode="outlined"
            outlineColor={C.border}
            activeOutlineColor={C.accent}
            textColor={C.textPrimary}
            style={{ backgroundColor: C.background }}
          />
        </View>

        {/* Piano di studi */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>PIANO DI STUDI</Text>
          <TextInput
            label="CFU totali del corso"
            value={cfuTotali}
            onChangeText={(v) => { setCfuTotali(v); setSaved(false); }}
            keyboardType="numeric"
            mode="outlined"
            outlineColor={C.border}
            activeOutlineColor={C.accent}
            textColor={C.textPrimary}
            style={{ backgroundColor: C.background }}
          />
          <TextInput
            label="Data sessione di laurea (YYYY-MM-DD)"
            value={dataLaurea}
            onChangeText={(v) => { setDataLaurea(v); setSaved(false); }}
            placeholder="2027-07-15"
            placeholderTextColor={C.textMuted}
            mode="outlined"
            outlineColor={C.border}
            activeOutlineColor={C.accent}
            textColor={C.textPrimary}
            style={{ backgroundColor: C.background }}
            error={dataLaurea.length > 0 && !isDataValida()}
          />
          {dataLaurea.length > 0 && isDataValida() && !isNaN(new Date(dataLaurea).getTime()) ? (
            <Text style={[s.preview, { color: C.accent, fontFamily: fonts.mono }]}>
              {new Date(dataLaurea).toLocaleDateString('it-IT', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          ) : null}
        </View>

        {/* Salva */}
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: saved ? C.success : C.accent }]}
          onPress={salva}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name={saved ? 'check' : 'content-save'} size={20} color="#000000" />
          <Text style={[s.saveBtnText, { fontFamily: fonts.mono }]}>
            {saved ? 'SALVATO' : 'SALVA'}
          </Text>
        </TouchableOpacity>

        {/* Danger zone */}
        <View style={[s.dangerCard, { borderColor: C.destructive + '44' }]}>
          <Text style={[s.label, { color: C.destructive, fontFamily: fonts.mono }]}>DANGER ZONE</Text>
          <Text style={[s.dangerHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
            Elimina tutti gli esami, sessioni, lezioni, moduli e flashcard. Le impostazioni non vengono cancellate.
          </Text>
          <TouchableOpacity
            style={[s.resetBtn, { borderColor: C.destructive }]}
            onPress={confermaReset}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.destructive} />
            <Text style={[s.resetBtnText, { color: C.destructive, fontFamily: fonts.mono }]}>
              CANCELLA TUTTI I DATI
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, gap: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  label: { fontSize: 10, letterSpacing: 2 },
  preview: { fontSize: 13 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 16, marginTop: 4,
  },
  saveBtnText: { color: '#000000', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  dangerCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  dangerHint: { fontSize: 12, lineHeight: 18 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 12,
  },
  resetBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});
