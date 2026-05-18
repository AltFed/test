import React, { useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  onDelete: () => void;
  style?: ViewStyle;
}

export function SwipeableRow({ children, onDelete, style }: Props) {
  const ref = useRef<Swipeable>(null);

  function renderRightAction() {
    return (
      <View style={s.action}>
        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
        <Text style={s.label}>ELIMINA</Text>
      </View>
    );
  }

  return (
    <View style={[s.outer, style]}>
      <Swipeable
        ref={ref}
        friction={1.5}
        rightThreshold={60}
        renderRightActions={renderRightAction}
        onSwipeableOpen={(direction) => {
          if (direction === 'right') onDelete();
        }}
        overshootRight={false}
      >
        {children}
      </Swipeable>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { overflow: 'hidden' },
  action: {
    backgroundColor: '#FF3B30',
    width: 88,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
