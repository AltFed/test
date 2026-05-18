import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  onDelete: () => void;
  bottomGap?: number;
}

export function SwipeableRow({ children, onDelete, bottomGap = 10 }: Props) {
  const ref = useRef<Swipeable>(null);

  function renderRightAction() {
    return (
      <View style={[styles.action, { marginBottom: bottomGap }]}>
        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
        <Text style={styles.label}>ELIMINA</Text>
      </View>
    );
  }

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={80}
      renderRightActions={renderRightAction}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') onDelete();
      }}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    backgroundColor: '#FF3B30',
    width: 88,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    gap: 4,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
