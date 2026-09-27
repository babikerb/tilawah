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
    id: 'husary',
    edition: 'ar.husary',
    name: 'Mahmoud Al-Husary',
    arabic: 'محمود الحصري',
    origin: 'Egypt',
    style: 'Hafs · Murattal',
  },
  {
    id: 'sudais',
    edition: 'ar.abdurrahmaansudais',
    name: 'Abdur-Rahman As-Sudais',
    arabic: 'عبد الرحمن السديس',
    origin: 'Saudi Arabia',
    style: 'Hafs · Murattal',
  },
  {
    id: 'minshawi',
    edition: 'ar.minshawi',
    name: 'Al-Minshawi',
    arabic: 'المنشاوي',
    origin: 'Egypt',
    style: 'Hafs · Murattal',
  },
];

export const DEFAULT_RECITER = RECITERS[0];
