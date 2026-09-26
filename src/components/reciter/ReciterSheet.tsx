import React, { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { CassetteSpine } from './CassetteSpine';
import { CloseIcon } from '../ui/icons';
import { colors, fonts } from '../../theme/tokens';
import { RECITERS } from '../../data/reciters';

interface ReciterSheetProps {
  selectedId: string;
  onSelect: (reciterId: string) => void;
}

export const ReciterSheet = forwardRef<BottomSheetModal, ReciterSheetProps>(
  ({ selectedId, onSelect }, ref) => {
    const snapPoints = useMemo(() => ['52%'], []);

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
            <Pressable
              onPress={() => (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss()}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <CloseIcon />
            </Pressable>
          </View>

          {RECITERS.map((r) => (
            <CassetteSpine
              key={r.id}
              reciter={r}
              selected={r.id === selectedId}
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
    backgroundColor: colors.walnut,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handle: {
    backgroundColor: 'rgba(237,224,181,0.22)',
    width: 36,
  },
  container: {
    paddingBottom: 28,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.cream,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: 'rgba(237,224,181,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(237,224,181,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
