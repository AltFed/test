import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useColors, fonts } from '@/theme';

interface Props {
  onConfirm: (budget: number) => void;
}

function energyToBudget(e: number): number {
  if (e <= 2) return 4;
  if (e === 3) return 6;
  return 8;
}

const ENERGY_LABELS: Record<number, string> = {
  1: 'Stanco',
  2: 'Bassa',
  3: 'Normale',
  4: 'Alta',
  5: 'Max',
};

export function MorningCheckIn({ onConfirm }: Props) {
  const C = useColors();
  const [selected, setSelected] = useState<number | null>(null);
  const budget = selected ? energyToBudget(selected) : null;

  return (
    <View style={[s.card, { backgroundColor: C.card, borderColor: C.accent + '66' }]}>
      <Text style={[s.label, { color: C.accent, fontFamily: fonts.mono }]}>ENERGY CHECK-IN</Text>
      <Text style={[s.question, { color: C.textPrimary, fontFamily: fonts.mono }]}>
        Come stai oggi?
      </Text>
      <View style={s.dotsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => setSelected(n)}
            style={[
              s.dot,
              {
                borderColor: selected === n ? C.accent : C.border,
                backgroundColor: selected === n ? C.accentDim : 'transparent',
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[s.dotNum, { color: selected === n ? C.accent : C.textMuted, fontFamily: fonts.dot }]}>
              {String(n)}
            </Text>
            <Text style={[s.dotLabel, { color: selected === n ? C.accent : C.textMuted, fontFamily: fonts.mono }]}>
              {ENERGY_LABELS[n]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {budget !== null && (
        <Text style={[s.budgetHint, { color: C.textSecondary, fontFamily: fonts.mono }]}>
          Budget odierno:{' '}
          <Text style={[s.budgetHint, { color: C.accent, fontFamily: fonts.dot }]}>
            {String(budget)}
          </Text>
          {' '}sessioni
        </Text>
      )}
      <TouchableOpacity
        style={[
          s.confirmBtn,
          {
            backgroundColor: selected ? C.accent : C.border,
          },
        ]}
        onPress={() => selected && onConfirm(energyToBudget(selected))}
        disabled={!selected}
        activeOpacity={0.85}
      >
        <Text style={[s.confirmText, { color: selected ? '#000000' : C.textMuted, fontFamily: fonts.mono }]}>
          CONFERMA
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  label: { fontSize: 10, letterSpacing: 2 },
  question: { fontSize: 16, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  dotNum: { fontSize: 24, lineHeight: 26 },
  dotLabel: { fontSize: 9, letterSpacing: 0.3 },
  budgetHint: { fontSize: 13 },
  confirmBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: { fontSize: 12, letterSpacing: 1, fontWeight: '700' },
});
