import React, { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { ReciterRow } from './ReciterRow';
import { CloseIcon } from '../ui/icons';
import { colors, fonts } from '../../theme/tokens';
import { RECITERS } from '../../data/reciters';

interface ReciterSheetProps {
  selectedId: string;
  onSelect: (reciterId: string) => void;
}

export const ReciterSheet = forwardRef<BottomSheetModal, ReciterSheetProps>(
  ({ selectedId, onSelect }, ref) => {
    const snapPoints = useMemo(() => ['45%'], []);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Reciter</Text>
            <Text style={styles.titleArabic}>اختر القارئ</Text>
            <Pressable
              onPress={() => (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss()}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <CloseIcon size={12} color={colors.white} />
            </Pressable>
          </View>

          {RECITERS.map((r, i) => (
            <ReciterRow
              key={r.id}
              reciter={r}
              selected={r.id === selectedId}
              striped={i % 2 === 1}
              onSelect={() => {
                onSelect(r.id);
                (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
              }}
            />
          ))}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);
ReciterSheet.displayName = 'ReciterSheet';

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  handle: {
    backgroundColor: colors.border,
    width: 36,
  },
  container: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: colors.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: colors.white,
  },
  titleArabic: {
    fontFamily: fonts.arabic,
    fontSize: 15,
    color: colors.goldLight,
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
