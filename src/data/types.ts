export interface Surah {
  id: number;
  arabic: string;
  english: string;
  meaning: string;
  ayahs: number;
  juz: number[];
}

export interface Reciter {
  id: string;
  /** Al Quran Cloud / everyayah.com edition identifier used to build audio URLs */
  edition: string;
  name: string;
  arabic: string;
  origin: string;
  style: string;
}

export interface Ayah {
  number: number;
  numberInSurah: number;
  arabic: string;
  translation: string;
  audioUrl: string;
}
