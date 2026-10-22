export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentColorKey =
  | 'monochrome'
  | 'emerald'
  | 'ocean'
  | 'sunset'
  | 'violet'
  | 'crimson';

export const ACCENT_PALETTES: Record<
  AccentColorKey,
  { name: string; primary: string; softLight: string; softDark: string }
> = {
  monochrome: {
    name: 'Negro y Blanco GT! (Predeterminado)',
    primary: '#090D16',
    softLight: '#F1F5F9',
    softDark: '#1E293B',
  },
  emerald: {
    name: 'Verde GymTrack',
    primary: '#10B981',
    softLight: '#D1FAE5',
    softDark: '#064E3B',
  },
  ocean: {
    name: 'Azul Eléctrico',
    primary: '#0EA5E9',
    softLight: '#E0F2FE',
    softDark: '#0C4A6E',
  },
  sunset: {
    name: 'Naranja Energía',
    primary: '#F97316',
    softLight: '#FFEDD5',
    softDark: '#7C2D12',
  },
  violet: {
    name: 'Morado Pro',
    primary: '#8B5CF6',
    softLight: '#EDE9FE',
    softDark: '#4C1D95',
  },
  crimson: {
    name: 'Rojo Intenso',
    primary: '#EF4444',
    softLight: '#FEE2E2',
    softDark: '#7F1D1D',
  },
};

export interface AppThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceElevated: string;
  menuBackground: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSoft: string;
  accentOrange: string;
  accentBlue: string;
  inputBg: string;
}

export function resolveTheme(
  systemColorScheme: 'light' | 'dark' | null | undefined,
  userPreference: ThemeMode = 'system',
  accentKey: AccentColorKey = 'monochrome'
): AppThemeColors {
  const isDark =
    userPreference === 'dark' ||
    (userPreference === 'system' && systemColorScheme === 'dark');

  const accent = ACCENT_PALETTES[accentKey] || ACCENT_PALETTES.monochrome;
  const resolvedPrimary =
    accentKey === 'monochrome'
      ? isDark
        ? '#FFFFFF'
        : '#090D16'
      : accent.primary;

  if (!isDark) {
    return {
      isDark: false,
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceElevated: '#F1F5F9',
      menuBackground: '#FFFFFF',
      border: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#64748B',
      accentPrimary: resolvedPrimary,
      accentSoft: accent.softLight,
      accentOrange: '#F97316',
      accentBlue: '#38BDF8',
      inputBg: '#F8FAFC',
    };
  }

  return {
    isDark: true,
    background: '#090D16',
    surface: '#111827',
    surfaceElevated: '#172033',
    menuBackground: '#0F172A',
    border: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    accentPrimary: resolvedPrimary,
    accentSoft: accent.softDark,
    accentOrange: '#FB923C',
    accentBlue: '#38BDF8',
    inputBg: '#0B0F19',
  };
}
