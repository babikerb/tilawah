import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PaperBackground } from '../components/ui/PaperBackground';
import { CassetteCard } from '../components/home/CassetteCard';
import { SurahRow } from '../components/home/SurahRow';
import { JuzHeader } from '../components/home/JuzHeader';
import { EmptyState } from '../components/home/EmptyState';
import { MiniPlayer } from '../components/home/MiniPlayer';
import { SearchIcon } from '../components/ui/icons';
import { colors, fonts } from '../theme/tokens';
import { SURAHS, getSurah } from '../data/surahs';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import type { Surah } from '../data/types';

type Row = { kind: 'header'; juz: number } | { kind: 'surah'; surah: Surah };

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
  const cassetteSurah = currentSurah ?? getSurah(18)!;

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
    for (const s of filtered) {
      const j = s.juz[0];
      if (j !== lastJuz) {
        out.push({ kind: 'header', juz: j });
        lastJuz = j;
      }
      out.push({ kind: 'surah', surah: s });
    }
    return out;
  }, [filtered]);

  const handlePlay = (surah: Surah) => {
    play(surah.id);
    router.push('/player');
  };

  const showEmptySaved = filter === 'saved' && savedIds.length === 0 && !query;

  return (
    <PaperBackground style={{ paddingTop: insets.top }}>
      <View style={styles.masthead}>
        <Text style={styles.title}>Tilawah</Text>
        <Text style={styles.titleArabic}>تِلاوَة</Text>
      </View>

      <CassetteCard
        surah={cassetteSurah}
        reciter={reciter}
        sectionLabel="CONTINUE LISTENING"
        onPlay={() => handlePlay(cassetteSurah)}
      />

      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search…"
            placeholderTextColor="rgba(26,17,8,0.30)"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.segmented}>
          {(['all', 'saved'] as const).map((f, i) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.segment,
                i > 0 && styles.segmentBorder,
                filter === f && styles.segmentActive,
              ]}
            >
              <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]}>
                {f === 'all' ? 'All' : savedIds.length > 0 ? `Saved · ${savedIds.length}` : 'Saved'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {showEmptySaved || rows.length === 0 ? (
        <EmptyState type={filter === 'saved' && !query ? 'saved' : 'search'} />
      ) : (
        <FlatList
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
              />
            )
          }
          contentContainerStyle={{ paddingBottom: 8 }}
          style={styles.list}
        />
      )}

      <View style={{ paddingBottom: insets.bottom }}>
        <MiniPlayer
          surah={currentSurah}
          reciter={reciter}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onOpen={() => currentSurah && router.push('/player')}
        />
      </View>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  masthead: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
  },
  titleArabic: {
    fontFamily: fonts.quran,
    fontSize: 18,
    color: 'rgba(26,17,8,0.35)',
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,17,8,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(26,17,8,0.36)',
    borderRadius: 4,
    backgroundColor: 'rgba(26,17,8,0.035)',
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 9,
  },
  clearText: {
    color: 'rgba(26,17,8,0.30)',
    fontSize: 17,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 4,
    overflow: 'hidden',
  },
  segment: {
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  segmentBorder: {
    borderLeftWidth: 2,
    borderLeftColor: colors.ink,
  },
  segmentActive: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.ink,
  },
  segmentTextActive: {
    color: colors.cream,
  },
  list: {
    flex: 1,
  },
});
