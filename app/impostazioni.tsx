import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import { getSetting, setSetting } from '@/db/database';

export default function Impostazioni() {
  const C = useColors();
  const [dataLaurea, setDataLaurea] = useState('');
  const [cfuTotali, setCfuTotali] = useState('180');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDataLaurea(getSetting('data_laurea') ?? '');
    setCfuTotali(getSetting('cfu_totali') ?? '180');
  }, []);

  function isDataValida(): boolean {
    if (!dataLaurea) return false;
    return !isNaN(new Date(dataLaurea).getTime());
  }

  function salva() {
    if (dataLaurea) setSetting('data_laurea', dataLaurea);
    if (cfuTotali) setSetting('cfu_totali', cfuTotali);
    setSaved(true);
    setTimeout(() => router.back(), 600);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
            DATA SESSIONE DI LAUREA
          </Text>
          <Text style={[s.hint, { color: C.textMuted, fontFamily: fonts.mono }]}>
            Formato: YYYY-MM-DD (es. 2027-03-15)
          </Text>
          <TextInput
            value={dataLaurea}
            onChangeText={(v) => { setDataLaurea(v); setSaved(false); }}
            placeholder="2027-03-15"
            placeholderTextColor={C.textMuted}
            mode="outlined"
            outlineColor={C.border}
            activeOutlineColor={C.accent}
            textColor={C.textPrimary}
            style={[s.input, { backgroundColor: C.card }]}
            error={dataLaurea.length > 0 && !isDataValida()}
          />
          {dataLaurea.length > 0 && isDataValida() ? (
            <Text style={[s.preview, { color: C.accent, fontFamily: fonts.mono }]}>
              {new Date(dataLaurea).toLocaleDateString('it-IT', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          ) : null}
        </View>

        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.label, { color: C.textSecondary, fontFamily: fonts.mono }]}>
            CFU TOTALI DEL CORSO
          </Text>
          <TextInput
            value={cfuTotali}
            onChangeText={(v) => { setCfuTotali(v); setSaved(false); }}
            keyboardType="numeric"
            mode="outlined"
            outlineColor={C.border}
            activeOutlineColor={C.accent}
            textColor={C.textPrimary}
            style={[s.input, { backgroundColor: C.card }]}
          />
        </View>

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: saved ? C.success : C.accent }]}
          onPress={salva}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={saved ? 'check' : 'content-save'}
            size={20}
            color="#000000"
          />
          <Text style={[s.saveBtnText, { fontFamily: fonts.mono }]}>
            {saved ? 'SALVATO' : 'SALVA'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, gap: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  label: { fontSize: 10, letterSpacing: 2, marginBottom: 6 },
  hint: { fontSize: 11, marginBottom: 10 },
  input: {},
  preview: { fontSize: 13, marginTop: 8 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  saveBtnText: { color: '#000000', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
});
