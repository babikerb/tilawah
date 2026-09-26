import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckIcon } from '../ui/icons';
import { colors, fonts } from '../../theme/tokens';
import type { Reciter } from '../../data/types';

const RIBS = Array.from({ length: 7 });

export function CassetteSpine({
  reciter,
  selected,
  onSelect,
}: {
  reciter: Reciter;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.row, selected && styles.rowSelected]}
      accessibilityRole="button"
      accessibilityLabel={`Select ${reciter.name}`}
    >
      <View style={styles.spineEnd}>
        {RIBS.map((_, i) => (
          <View key={i} style={styles.rib} />
        ))}
      </View>

      <View style={styles.label}>
        <Text style={styles.arabic}>{reciter.arabic}</Text>
        <Text style={styles.name}>{reciter.name}</Text>
        <Text style={styles.meta}>
          {reciter.origin} · {reciter.style}
        </Text>
      </View>

      <View style={styles.indicatorWrap}>
        {selected ? (
          <View style={styles.indicatorSelected}>
            <CheckIcon />
          </View>
        ) : (
          <View style={styles.indicatorEmpty} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowSelected: {
    backgroundColor: 'rgba(196,144,56,0.10)',
  },
  spineEnd: {
    width: 22,
    backgroundColor: colors.tapeDark,
    borderRightWidth: 1.5,
    borderRightColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 5,
  },
  rib: {
    width: 12,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  label: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 2,
  },
  arabic: {
    fontFamily: fonts.quran,
    fontSize: 17,
    color: colors.cream,
    lineHeight: 22,
  },
  name: {
    fontFamily: fonts.serifBold,
    fontSize: 14,
    color: colors.cream,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: 'rgba(237,224,181,0.42)',
  },
  indicatorWrap: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.mustard,
    borderWidth: 2,
    borderColor: 'rgba(237,224,181,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(237,224,181,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(237,224,181,0.16)',
  },
});
