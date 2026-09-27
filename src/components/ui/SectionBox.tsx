import React from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { colors, fonts, radii } from '../../theme/tokens';

interface SectionBoxProps extends ViewProps {
  title: string;
  titleArabic?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  noBodyPadding?: boolean;
}

/** Bordered content box with a green title strip — the core layout unit of the app. */
export function SectionBox({
  title,
  titleArabic,
  right,
  children,
  noBodyPadding,
  style,
  ...rest
}: SectionBoxProps) {
  return (
    <View style={[styles.box, style]} {...rest}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {titleArabic ? <Text style={styles.titleArabic}>{titleArabic}</Text> : null}
        </View>
        {right}
      </View>
      <View style={noBodyPadding ? styles.bodyFlush : styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: colors.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexShrink: 1,
  },
  title: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.3,
  },
  titleArabic: {
    fontFamily: fonts.arabic,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  body: {
    padding: 12,
  },
  bodyFlush: {
    flex: 1,
  },
});
