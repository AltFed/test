import { useRef, useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors, fonts } from '@/theme';
import type { Flashcard } from '@/db/types';

interface Props {
  card: Flashcard;
  index: number;
  total: number;
  onSo: () => void;
  onRipassare: () => void;
  accent: string;
}

export function FlashCard({ card, index, total, onSo, onRipassare, accent }: Props) {
  const C = useColors();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  // Reset flip when card changes
  useEffect(() => {
    flipAnim.setValue(0);
    setFlipped(false);
  }, [card.id]);

  function handleFlip() {
    Animated.spring(flipAnim, {
      toValue: flipped ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setFlipped((f) => !f);
  }

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0.4, 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0.4, 0.5],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={s.wrapper}>
      {/* Counter */}
      <Text style={[s.counter, { color: C.textMuted, fontFamily: fonts.mono }]}>
        <Text style={[s.counter, { color: accent, fontFamily: fonts.dot }]}>{String(index + 1)}</Text>
        {` / ${String(total)}`}
      </Text>

      {/* Card container */}
      <TouchableOpacity onPress={handleFlip} activeOpacity={0.95} style={s.cardTouchable}>
        {/* Front */}
        <Animated.View
          style={[
            s.face,
            s.front,
            { backgroundColor: C.card, borderColor: accent + '66' },
            { transform: [{ perspective: 1200 }, { rotateY: frontRotate }], opacity: frontOpacity },
          ]}
        >
          <Text style={[s.faceLabel, { color: accent, fontFamily: fonts.mono }]}>DOMANDA</Text>
          <ScrollView contentContainerStyle={s.faceContent} showsVerticalScrollIndicator={false}>
            <Text style={[s.fronteText, { color: C.textPrimary, fontFamily: fonts.mono }]}>
              {card.domanda}
            </Text>
          </ScrollView>
          <View style={s.tapHint}>
            <MaterialCommunityIcons name="rotate-3d-variant" size={14} color={C.textMuted} />
            <Text style={[s.tapHintText, { color: C.textMuted, fontFamily: fonts.mono }]}>
              tocca per girare
            </Text>
          </View>
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[
            s.face,
            s.back,
            { backgroundColor: C.card, borderColor: C.border },
            { transform: [{ perspective: 1200 }, { rotateY: backRotate }], opacity: backOpacity },
          ]}
        >
          <Text style={[s.faceLabel, { color: C.textSecondary, fontFamily: fonts.mono }]}>RISPOSTA</Text>
          <ScrollView contentContainerStyle={s.faceContent} showsVerticalScrollIndicator={false}>
            <Text style={[s.retroText, { color: C.textPrimary, fontFamily: fonts.mono }]}>
              {card.risposta}
            </Text>
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>

      {/* Action buttons — only visible when flipped */}
      <View style={[s.actions, { opacity: flipped ? 1 : 0 }]} pointerEvents={flipped ? 'auto' : 'none'}>
        <TouchableOpacity
          style={[s.actionBtn, { borderColor: '#FF453A', backgroundColor: '#FF453A22' }]}
          onPress={onRipassare}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#FF453A" />
          <Text style={[s.actionLabel, { color: '#FF453A', fontFamily: fonts.mono }]}>RIPASSARE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { borderColor: '#30D158', backgroundColor: '#30D15822' }]}
          onPress={onSo}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="check" size={20} color="#30D158" />
          <Text style={[s.actionLabel, { color: '#30D158', fontFamily: fonts.mono }]}>SO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CARD_HEIGHT = 280;

const s = StyleSheet.create({
  wrapper: { gap: 16 },
  counter: { fontSize: 13, textAlign: 'center' },
  cardTouchable: { height: CARD_HEIGHT },
  face: {
    position: 'absolute',
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 10,
    backfaceVisibility: 'hidden',
  },
  front: {},
  back: {},
  faceLabel: { fontSize: 9, letterSpacing: 2 },
  faceContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 8 },
  fronteText: { fontSize: 18, lineHeight: 28, textAlign: 'center' },
  retroText: { fontSize: 16, lineHeight: 26, textAlign: 'center' },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 4 },
  tapHintText: { fontSize: 11 },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});
