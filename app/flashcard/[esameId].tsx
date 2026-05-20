import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import { SwipeableRow } from '@/components/SwipeableRow';
import { getEsame, getFlashcard, insertFlashcard, deleteFlashcard } from '@/db/database';
import type { Flashcard } from '@/db/types';

export default function FlashcardScreen() {
  const { esameId } = useLocalSearchParams<{ esameId: string }>();
  const id = parseInt(esameId, 10);
  const C = useColors();
  const navigation = useNavigation();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [esameNome, setEsameNome] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [domanda, setDomanda] = useState('');
  const [risposta, setRisposta] = useState('');

  const load = useCallback(() => {
    const e = getEsame(id);
    if (e) {
      setEsameNome(e.nome);
      navigation.setOptions({ title: e.nome });
    }
    const c = getFlashcard(id);
    setCards(c);
    setCurrentIdx(0);
    setFlipped(false);
  }, [id]);

  useFocusEffect(load);

  function salvaCard() {
    if (!domanda.trim() || !risposta.trim()) return;
    insertFlashcard(id, domanda.trim(), risposta.trim());
    setDomanda(''); setRisposta('');
    setDialogVisible(false);
    load();
  }

  function prev() {
    setFlipped(false);
    setCurrentIdx((i) => Math.max(0, i - 1));
  }

  function next() {
    setFlipped(false);
    setCurrentIdx((i) => Math.min(cards.length - 1, i + 1));
  }

  const card = cards[currentIdx] ?? null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={[s.title, { color: C.textPrimary, fontFamily: fonts.dot }]}>
          {esameNome}
        </Text>
        <Text style={[s.subtitle, { color: C.textMuted, fontFamily: fonts.mono }]}>
          {String(cards.length)} carte
        </Text>

        {/* Card viewer */}
        {cards.length === 0 ? (
          <View style={[s.emptyCard, { borderColor: C.border }]}>
            <Text style={[s.emptyText, { color: C.textMuted, fontFamily: fonts.mono }]}>
              Nessuna carta ancora.{'\n'}Aggiungine una con + in basso.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.navRow}>
              <TouchableOpacity
                onPress={prev}
                disabled={currentIdx === 0}
                style={[s.navBtn, { borderColor: C.border, opacity: currentIdx === 0 ? 0.3 : 1 }]}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color={C.textSecondary} />
              </TouchableOpacity>
              <Text style={[s.counter, { color: C.textMuted, fontFamily: fonts.mono }]}>
                {String(currentIdx + 1)} / {String(cards.length)}
              </Text>
              <TouchableOpacity
                onPress={next}
                disabled={currentIdx === cards.length - 1}
                style={[s.navBtn, { borderColor: C.border, opacity: currentIdx === cards.length - 1 ? 0.3 : 1 }]}
              >
                <MaterialCommunityIcons name="chevron-right" size={24} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.cardBox, { backgroundColor: C.card, borderColor: flipped ? C.accent : C.border }]}
              onPress={() => setFlipped((f) => !f)}
              activeOpacity={0.85}
            >
              <Text style={[s.cardSide, { color: flipped ? C.accent : C.textMuted, fontFamily: fonts.mono }]}>
                {flipped ? 'RISPOSTA' : 'DOMANDA'}
              </Text>
              <Text style={[s.cardText, { color: C.textPrimary, fontFamily: fonts.mono }]}>
                {flipped ? card.risposta : card.domanda}
              </Text>
              <Text style={[s.flipHint, { color: C.textMuted, fontFamily: fonts.mono }]}>
                {flipped ? '← tocca per girare' : 'tocca per girare →'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Lista carte */}
        {cards.length > 0 ? (
          <View style={[s.listCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.listLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              TUTTE LE CARTE
            </Text>
            {cards.map((c, i) => (
              <SwipeableRow
                key={c.id}
                onDelete={() => { deleteFlashcard(c.id); load(); }}
              >
                <TouchableOpacity
                  style={[s.listRow, { borderBottomColor: C.border }]}
                  onPress={() => { setCurrentIdx(i); setFlipped(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.listNum, { backgroundColor: C.border }]}>
                    <Text style={[s.listNumText, { color: C.textSecondary, fontFamily: fonts.dot }]}>
                      {String(i + 1)}
                    </Text>
                  </View>
                  <View style={s.listInfo}>
                    <Text style={[s.listDomanda, { color: C.textPrimary, fontFamily: fonts.mono }]} numberOfLines={1}>
                      {c.domanda}
                    </Text>
                    <Text style={[s.listRisposta, { color: C.textMuted, fontFamily: fonts.mono }]} numberOfLines={1}>
                      {c.risposta}
                    </Text>
                  </View>
                </TouchableOpacity>
              </SwipeableRow>
            ))}
          </View>
        ) : null}

      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: C.accent }]}
        onPress={() => setDialogVisible(true)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={26} color="#000000" />
      </TouchableOpacity>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={[s.dialog, { backgroundColor: C.surface }]}
        >
          <Dialog.Title style={[s.dialogTitle, { color: C.textPrimary, fontFamily: fonts.mono }]}>
            Nuova Carta
          </Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 360, paddingHorizontal: 24 }}>
            <ScrollView contentContainerStyle={s.dialogContent} keyboardShouldPersistTaps="handled">
              <TextInput
                label="Domanda"
                value={domanda}
                onChangeText={setDomanda}
                mode="outlined"
                multiline
                numberOfLines={3}
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                style={[s.input, { backgroundColor: C.card }]}
              />
              <TextInput
                label="Risposta"
                value={risposta}
                onChangeText={setRisposta}
                mode="outlined"
                multiline
                numberOfLines={3}
                outlineColor={C.border}
                activeOutlineColor={C.accent}
                textColor={C.textPrimary}
                style={[s.input, { backgroundColor: C.card }]}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button textColor={C.textSecondary} onPress={() => setDialogVisible(false)}>Annulla</Button>
            <Button
              mode="contained"
              onPress={salvaCard}
              disabled={!domanda.trim() || !risposta.trim()}
              buttonColor={C.accent}
              textColor="#000"
            >
              Aggiungi
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  title: { fontSize: 36, lineHeight: 38 },
  subtitle: { fontSize: 12, marginTop: 2, marginBottom: 4 },
  emptyCard: { borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 13, lineHeight: 22, textAlign: 'center' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  counter: { fontSize: 13, letterSpacing: 1 },
  cardBox: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 28,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  cardSide: { fontSize: 10, letterSpacing: 2 },
  cardText: { fontSize: 18, lineHeight: 26, textAlign: 'center' },
  flipHint: { fontSize: 10, letterSpacing: 1 },
  listCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  listLabel: { fontSize: 10, letterSpacing: 2, marginBottom: 10 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listNum: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  listNumText: { fontSize: 16, lineHeight: 18 },
  listInfo: { flex: 1 },
  listDomanda: { fontSize: 13, fontWeight: '600' },
  listRisposta: { fontSize: 11, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: { borderRadius: 20 },
  dialogTitle: { fontSize: 18 },
  dialogContent: { gap: 12, paddingVertical: 8 },
  input: {},
});
