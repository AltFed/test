import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  FAB,
  Portal,
  Dialog,
  Button,
  TextInput,
  IconButton,
} from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { getAllLezioni, insertLezione, deleteLezione } from '@/db/database';
import type { Lezione } from '@/db/types';

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

const PALETTE = [
  '#7C4DFF', '#00BCD4', '#FF9800', '#4CAF50',
  '#FF6B9D', '#C084FC', '#F44336', '#2196F3',
];

export default function OrarioScreen() {
  const [lezioni, setLezioni] = useState<Lezione[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);

  const [nome, setNome] = useState('');
  const [professore, setProfessore] = useState('');
  const [giorno, setGiorno] = useState(0);
  const [oraInizio, setOraInizio] = useState('');
  const [oraFine, setOraFine] = useState('');
  const [aula, setAula] = useState('');
  const [colore, setColore] = useState(PALETTE[0]);

  const load = useCallback(() => {
    setLezioni(getAllLezioni());
  }, []);

  useFocusEffect(load);

  // Raggruppa per giorno
  const perGiorno: Record<number, Lezione[]> = {};
  lezioni.forEach((l) => {
    if (!perGiorno[l.giorno]) perGiorno[l.giorno] = [];
    perGiorno[l.giorno].push(l);
  });

  function salva() {
    if (!nome.trim() || !oraInizio.trim() || !oraFine.trim() || !aula.trim()) return;
    insertLezione(
      nome.trim(),
      professore.trim() || null,
      giorno,
      oraInizio.trim(),
      oraFine.trim(),
      aula.trim(),
      colore
    );
    resetForm();
    setDialogVisible(false);
    load();
  }

  function resetForm() {
    setNome(''); setProfessore(''); setGiorno(0);
    setOraInizio(''); setOraFine(''); setAula(''); setColore(PALETTE[0]);
  }

  function elimina(id: number) {
    Alert.alert('Elimina lezione', 'Rimuovere questa lezione dall\'orario?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => { deleteLezione(id); load(); } },
    ]);
  }

  const hasLezioni = lezioni.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Orario Lezioni</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          {lezioni.length > 0 ? `${String(lezioni.length)} lezioni` : 'Aggiungi le tue lezioni'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!hasLezioni && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>Nessuna lezione ancora.</Text>
            <Text style={styles.emptyHint}>
              Aggiungi le tue lezioni con il tasto + per tenere traccia di aule e orari.
            </Text>
          </View>
        )}

        {GIORNI.map((nomeGiorno, idx) => {
          const lez = perGiorno[idx];
          if (!lez || lez.length === 0) return null;
          return (
            <View key={idx} style={styles.giornoSection}>
              <Text style={styles.giornoLabel}>{nomeGiorno.toUpperCase()}</Text>
              {lez.map((l) => (
                <View key={l.id} style={[styles.lezioneCard, { borderLeftColor: l.colore }]}>
                  <View style={styles.lezioneContent}>
                    <View style={styles.lezioneOrario}>
                      <Text style={[styles.ora, { color: l.colore }]}>{l.ora_inizio}</Text>
                      <Text style={styles.oraSep}>→</Text>
                      <Text style={styles.oraFine}>{l.ora_fine}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleSmall" style={styles.lezioneNome} numberOfLines={1}>
                        {l.nome}
                      </Text>
                      {l.professore ? (
                        <Text style={styles.lezioneProfessore} numberOfLines={1}>
                          {l.professore}
                        </Text>
                      ) : null}
                      <View style={[styles.aulaTag, { backgroundColor: l.colore + '22' }]}>
                        <Text style={[styles.aulaText, { color: l.colore }]}>
                          {l.aula}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <IconButton
                    icon="trash-can-outline"
                    size={18}
                    iconColor={colors.textMuted}
                    onPress={() => elimina(l.id)}
                    style={styles.deleteBtn}
                  />
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => { resetForm(); setDialogVisible(false); }}
          style={styles.dialog}
        >
          <Dialog.ScrollArea style={{ maxHeight: 500, paddingHorizontal: 0 }}>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              <Text variant="titleLarge" style={styles.dialogTitle}>Nuova Lezione</Text>

              <TextInput
                label="Nome corso"
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

              <Text style={styles.fieldLabel}>GIORNO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={styles.giornoRow}>
                  {GIORNI.map((g, i) => (
                    <Button
                      key={i}
                      mode={giorno === i ? 'contained' : 'outlined'}
                      compact
                      onPress={() => setGiorno(i)}
                      style={[
                        styles.giornoBtn,
                        giorno === i
                          ? { backgroundColor: colors.primary }
                          : { borderColor: colors.border },
                      ]}
                      labelStyle={{ fontSize: 12 }}
                      textColor={giorno === i ? colors.textPrimary : colors.textSecondary}
                    >
                      {g.slice(0, 3)}
                    </Button>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.orarioRow}>
                <TextInput
                  label="Inizio (es. 09:00)"
                  value={oraInizio}
                  onChangeText={setOraInizio}
                  mode="outlined"
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  label="Fine (es. 11:00)"
                  value={oraFine}
                  onChangeText={setOraFine}
                  mode="outlined"
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                  style={[styles.input, { flex: 1 }]}
                />
              </View>

              <TextInput
                label="Aula (es. A1, Edificio 4)"
                value={aula}
                onChangeText={setAula}
                mode="outlined"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>COLORE</Text>
              <View style={styles.paletteRow}>
                {PALETTE.map((c) => (
                  <View
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      colore === c && styles.colorDotSelected,
                    ]}
                    onTouchEnd={() => setColore(c)}
                  />
                ))}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              textColor={colors.textSecondary}
              onPress={() => { resetForm(); setDialogVisible(false); }}
            >
              Annulla
            </Button>
            <Button
              mode="contained"
              onPress={salva}
              disabled={!nome.trim() || !oraInizio.trim() || !oraFine.trim() || !aula.trim()}
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
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { color: colors.textPrimary, fontWeight: '800' },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  content: { padding: 16, gap: 4, paddingBottom: 100 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  giornoSection: { marginBottom: 20 },
  giornoLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  lezioneCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lezioneContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  lezioneOrario: { alignItems: 'center', minWidth: 52 },
  ora: { fontSize: 15, fontWeight: '800' },
  oraSep: { color: colors.textMuted, fontSize: 11 },
  oraFine: { color: colors.textSecondary, fontSize: 13 },
  lezioneNome: { color: colors.textPrimary, fontWeight: '700', marginBottom: 2 },
  lezioneProfessore: { color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  aulaTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  aulaText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { marginRight: 4 },
  dialog: { backgroundColor: colors.surface },
  dialogTitle: { color: colors.textPrimary, fontWeight: '800', marginBottom: 16 },
  dialogContent: { padding: 20, gap: 0 },
  input: { backgroundColor: colors.card, marginBottom: 12 },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  giornoRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  giornoBtn: { borderRadius: 8 },
  orarioRow: { flexDirection: 'row', gap: 12 },
  paletteRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: colors.textPrimary },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: colors.primary,
    borderRadius: 16,
  },
});
