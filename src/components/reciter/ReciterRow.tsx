import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../../theme/tokens';
import { supportsWordTiming } from '../../lib/wordTiming';
import type { Reciter } from '../../data/types';

export function ReciterRow({
  reciter,
  selected,
  onSelect,
  striped,
}: {
  reciter: Reciter;
  selected: boolean;
  onSelect: () => void;
  striped: boolean;
}) {
  const hasHighlighting = supportsWordTiming(reciter.edition);

  return (
    <Pressable
      onPress={onSelect}
      style={[styles.row, striped && styles.rowStriped, selected && styles.rowSelected]}
      accessibilityRole="button"
      accessibilityLabel={`Select ${reciter.name}${hasHighlighting ? ', supports word highlighting' : ''}`}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>

      <View style={styles.label}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{reciter.name}</Text>
          <Text style={styles.arabic}>{reciter.arabic}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {reciter.origin} · {reciter.style}
          </Text>
          {hasHighlighting && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Highlights words</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowStriped: {
    backgroundColor: colors.creamAlt,
  },
  rowSelected: {
    backgroundColor: colors.greenLight,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.green,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.ink,
  },
  arabic: {
    fontFamily: fonts.arabic,
    fontSize: 15,
    color: colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  meta: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.inkMuted,
    flexShrink: 1,
  },
  badge: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.goldLight,
  },
  badgeText: {
    fontFamily: fonts.uiMedium,
    fontSize: 9,
    color: colors.gold,
  },
});
