import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import { insertEsame, updateEsameVoto, deleteEsame } from '@/db/database';

const GRADES_R1 = [18, 19, 20, 21, 22, 23];
const GRADES_R2 = [24, 25, 26, 27, 28, 29];
const GRADES_R3 = [30, 33]; // 33 = 30L

function displayVoto(v: number): string {
  return v === 33 ? '30L' : String(v);
}

interface Added {
  id: number;
  nome: string;
  cfu: number;
  voto: number;
  professore: string;
}

export default function ImportScreen() {
  const C = useColors();
  const [nome, setNome] = useState('');
  const [cfu, setCfu] = useState('');
  const [professore, setProfessore] = useState('');
  const [voto, setVoto] = useState<number | null>(null);
  const [aggiunti, setAggiunti] = useState<Added[]>([]);

  const canAdd = nome.trim().length > 0 && cfu.trim().length > 0 && voto !== null;

  function aggiungi() {
    if (!canAdd) return;
    const id = insertEsame(nome.trim(), parseInt(cfu, 10), 'voto', professore.trim() || undefined);
    updateEsameVoto(id, voto!);
    setAggiunti((prev) => [
      { id, nome: nome.trim(), cfu: parseInt(cfu, 10), voto: voto!, professore: professore.trim() },
      ...prev,
    ]);
    setNome('');
    setCfu('');
    setProfessore('');
    setVoto(null);
  }

  function rimuovi(id: number) {
    deleteEsame(id);
    setAggiunti((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Importa Storico',
          headerRight: () => (
            <TouchableOpacity
              onPress={aggiungi}
              disabled={!canAdd}
              style={{ paddingRight: 4 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="check"
                size={22}
                color={canAdd ? C.accent : C.textMuted}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Form */}
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              DATI ESAME
            </Text>
            <TextInput
              label="Nome esame"
              value={nome}
              onChangeText={setNome}
              mode="outlined"
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
              style={{ backgroundColor: C.background }}
              returnKeyType="next"
            />
            <TextInput
              label="Professore (opzionale)"
              value={professore}
              onChangeText={setProfessore}
              mode="outlined"
              outlineColor={C.border}
              activeOutlineColor={C.accent}
              textColor={C.textPrimary}
              style={{ backgroundColor: C.background }}
              returnKeyType="next"
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
              style={{ backgroundColor: C.background }}
              returnKeyType="done"
            />
          </View>

          {/* Voto grid */}
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              VOTO
            </Text>
            {[GRADES_R1, GRADES_R2, GRADES_R3].map((row, ri) => (
              <View key={ri} style={s.gradeRow}>
                {row.map((g) => {
                  const selected = voto === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setVoto(g)}
                      style={[
                        s.gradeBtn,
                        {
                          borderColor: selected ? C.accent : C.border,
                          backgroundColor: selected ? C.accentDim : 'transparent',
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.gradeTxt, { color: selected ? C.accent : C.textSecondary, fontFamily: fonts.dot }]}>
                        {displayVoto(g)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Add button */}
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: canAdd ? C.accent : C.border }]}
            onPress={aggiungi}
            disabled={!canAdd}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus" size={18} color={canAdd ? '#000000' : C.textMuted} />
            <Text style={[s.addBtnText, { color: canAdd ? '#000000' : C.textMuted, fontFamily: fonts.mono }]}>
              AGGIUNGI ESAME
            </Text>
          </TouchableOpacity>

          {/* Added list */}
          {aggiunti.length > 0 && (
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[s.sectionLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
                {`AGGIUNTI — ${String(aggiunti.length)}`}
              </Text>
              {aggiunti.map((e, i) => (
                <View
                  key={e.id}
                  style={[
                    s.addedRow,
                    { borderBottomColor: C.border },
                    i === aggiunti.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={s.addedInfo}>
                    <Text style={[s.addedNome, { color: C.textPrimary, fontFamily: fonts.mono }]} numberOfLines={1}>
                      {e.nome}
                    </Text>
                    <Text style={[s.addedMeta, { color: C.textMuted, fontFamily: fonts.mono }]}>
                      {`${String(e.cfu)} CFU`}
                      {e.professore ? ` · ${e.professore}` : ''}
                    </Text>
                  </View>
                  <Text style={[s.addedVoto, { color: C.accent, fontFamily: fonts.dot }]}>
                    {displayVoto(e.voto)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => rimuovi(e.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {aggiunti.length === 0 && (
            <Text style={[s.hint, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Inserisci un esame alla volta.{'\n'}Compila il voto selezionando dalla griglia,{'\n'}poi premi AGGIUNGI o ✓ in alto a destra.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 60 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionLabel: { fontSize: 10, letterSpacing: 2 },
  gradeRow: { flexDirection: 'row', gap: 6 },
  gradeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  gradeTxt: { fontSize: 20, lineHeight: 22 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  addedInfo: { flex: 1 },
  addedNome: { fontSize: 14, fontWeight: '600' },
  addedMeta: { fontSize: 11, marginTop: 1 },
  addedVoto: { fontSize: 28, lineHeight: 30, minWidth: 44, textAlign: 'right' },
  hint: { textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 8 },
});
