import { View, Modal, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { useColors, fonts } from '@/theme';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onForceContinue: () => void;
}

const SUGGESTIONS = [
  'Rileggere gli ultimi appunti',
  'Fare una camminata di 10 min',
  'Bere acqua + stretching',
  'Guardare le slide del prossimo argomento',
];

export function CooldownSheet({ visible, onDismiss, onForceContinue }: Props) {
  const C = useColors();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onDismiss} />
        <BlurView
          intensity={Platform.OS === 'ios' ? 60 : 0}
          tint="dark"
          style={[s.blurContainer, { backgroundColor: Platform.OS === 'android' ? 'rgba(0,0,0,0.85)' : undefined }]}
        >
          <View style={[s.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={s.handle} />
            <Text style={[s.title, { color: C.textPrimary, fontFamily: fonts.dot }]}>
              Limite raggiunto!
            </Text>
            <Text style={[s.subtitle, { color: C.textSecondary, fontFamily: fonts.mono }]}>
              Hai completato il tuo budget di sessioni.{'\n'}Considera queste alternative:
            </Text>
            <View style={s.pills}>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[pill.container, { borderColor: C.border, backgroundColor: C.card }]}
                  onPress={onDismiss}
                  activeOpacity={0.7}
                >
                  <Text style={[pill.text, { color: C.textPrimary, fontFamily: fonts.mono }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[s2.ignoreBtn, { borderColor: C.border }]}
              onPress={onForceContinue}
              activeOpacity={0.7}
            >
              <Text style={[s2.ignoreText, { color: C.textMuted, fontFamily: fonts.mono }]}>
                Ignora e continua
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  blurContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingTop: 12,
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444444',
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 32, lineHeight: 34 },
  subtitle: { fontSize: 13, lineHeight: 20 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

const pill = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: { fontSize: 13 },
});

const s2 = StyleSheet.create({
  ignoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  ignoreText: { fontSize: 13 },
});
