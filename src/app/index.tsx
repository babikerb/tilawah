import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppBackground } from '../components/ui/AppBackground';
import { AppHeader } from '../components/ui/AppHeader';
import { SectionBox } from '../components/ui/SectionBox';
import { SurahRow } from '../components/home/SurahRow';
import { JuzHeader } from '../components/home/JuzHeader';
import { EmptyState } from '../components/home/EmptyState';
import { MiniPlayer } from '../components/home/MiniPlayer';
import { SearchIcon, PlayIcon } from '../components/ui/icons';
import { FlatIconButton } from '../components/ui/FlatIconButton';
import { colors, fonts } from '../theme/tokens';
import { SURAHS, getSurah } from '../data/surahs';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import type { Surah } from '../data/types';

type Row = { kind: 'header'; juz: number } | { kind: 'surah'; surah: Surah; striped: boolean };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'saved'>('all');
  const [query, setQuery] = useState('');

  const currentSurahId = usePlayerStore((s) => s.currentSurahId);
  const reciter = usePlayerStore((s) => s.reciter());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const play = usePlayerStore((s) => s.play);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const savedIds = useLibraryStore((s) => s.savedIds);
  const isSaved = useLibraryStore((s) => s.isSaved);
  const toggleSave = useLibraryStore((s) => s.toggleSave);

  const currentSurah = currentSurahId ? getSurah(currentSurahId) ?? null : null;
  const continueSurah = currentSurah ?? getSurah(18)!;

  const filtered = useMemo(() => {
    return SURAHS.filter((s) => {
      if (filter === 'saved' && !savedIds.includes(s.id)) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          s.english.toLowerCase().includes(q) ||
          s.arabic.includes(query) ||
          s.meaning.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filter, query, savedIds]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastJuz = -1;
    let i = 0;
    for (const s of filtered) {
      const j = s.juz[0];
      if (j !== lastJuz) {
        out.push({ kind: 'header', juz: j });
        lastJuz = j;
      }
      out.push({ kind: 'surah', surah: s, striped: i % 2 === 1 });
      i++;
    }
    return out;
  }, [filtered]);

  const handlePlay = (surah: Surah) => {
    play(surah.id);
    router.push('/player');
  };

  const showEmptySaved = filter === 'saved' && savedIds.length === 0 && !query;

  return (
    <AppBackground>
      <AppHeader topInset={insets.top} />

      <SectionBox title="CONTINUE LISTENING" titleArabic="متابعة الاستماع">
        <View style={styles.continueRow}>
          <View style={styles.continueNames}>
            <View style={styles.continueTitleRow}>
              <Text style={styles.continueEnglish}>{continueSurah.english}</Text>
              <Text style={styles.continueArabic}>{continueSurah.arabic}</Text>
            </View>
            <Text style={styles.continueMeta}>
              {continueSurah.meaning} · {reciter.name}
            </Text>
          </View>
          <FlatIconButton
            variant="filled"
            size={36}
            onPress={() => handlePlay(continueSurah)}
            accessibilityLabel={`Play ${continueSurah.english}`}
          >
            <PlayIcon size={12} color={colors.white} />
          </FlatIconButton>
        </View>
      </SectionBox>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <SearchIcon color={colors.inkMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search…"
            placeholderTextColor={colors.inkMuted}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.segmented}>
          {(['all', 'saved'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.segment, filter === f && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]}>
                {f === 'all' ? 'All' : savedIds.length > 0 ? `Saved (${savedIds.length})` : 'Saved'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <SectionBox title="SURAHS" titleArabic="السور" style={styles.listBox} noBodyPadding>
        {showEmptySaved || rows.length === 0 ? (
          <EmptyState type={filter === 'saved' && !query ? 'saved' : 'search'} />
        ) : (
          <FlatList
            style={styles.list}
            data={rows}
            keyExtractor={(item, i) => (item.kind === 'header' ? `j${item.juz}` : `s${item.surah.id}`) + i}
            renderItem={({ item }) =>
              item.kind === 'header' ? (
                <JuzHeader juz={item.juz} />
              ) : (
                <SurahRow
                  surah={item.surah}
                  saved={isSaved(item.surah.id)}
                  onToggleSave={() => toggleSave(item.surah.id)}
                  onPlay={() => handlePlay(item.surah)}
                  striped={item.striped}
                />
              )
            }
          />
        )}
      </SectionBox>

      <View style={{ paddingBottom: insets.bottom }}>
        <MiniPlayer
          surah={currentSurah}
          reciter={reciter}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onOpen={() => currentSurah && router.push('/player')}
        />
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  continueNames: {
    flex: 1,
    minWidth: 0,
  },
  continueTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  continueEnglish: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.ink,
  },
  continueArabic: {
    fontFamily: fonts.arabic,
    fontSize: 16,
    color: colors.ink,
  },
  continueMeta: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 8,
  },
  clearText: {
    color: colors.inkMuted,
    fontSize: 16,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  segmentActive: {
    backgroundColor: colors.green,
  },
  segmentText: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.ink,
  },
  segmentTextActive: {
    color: colors.white,
  },
  listBox: {
    flex: 1,
    marginBottom: 0,
  },
  list: {
    flex: 1,
  },
});
