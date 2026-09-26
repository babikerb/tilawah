import type { Reciter } from './types';

export const RECITERS: Reciter[] = [
  {
    id: 'mishary',
    edition: 'ar.alafasy',
    name: 'Mishary Alafasy',
    arabic: 'مشاري العفاسي',
    origin: 'Kuwait',
    style: 'Hafs · Mujawwad',
  },
  {
    id: 'abdulbasit',
    edition: 'ar.abdulbasitmurattal',
    name: 'Abdul Basit',
    arabic: 'عبد الباسط',
    origin: 'Egypt',
    style: 'Hafs · Mujawwad',
  },
  {
    id: 'maher',
    edition: 'ar.mahermuaiqly',
    name: 'Maher Al-Muaiqly',
    arabic: 'ماهر المعيقلي',
    origin: 'Saudi Arabia',
    style: 'Hafs · Murattal',
  },
];

export const DEFAULT_RECITER = RECITERS[0];
