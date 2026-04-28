const BASE_THEMES = {
  pink: {
    primary: '#E1306C',
    secondary: '#F97316',
    accent: '#8B5CF6',
    primarySoft: '#FCE7F3',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceMuted: '#F8FAFC',
    border: '#F1F5F9',
    text: '#111827',
    muted: '#6B7280',
    onPrimary: '#FFFFFF',
    onSoft: '#BE185D',
  },
  blue: {
    primary: '#2563EB',
    secondary: '#0EA5E9',
    accent: '#7C3AED',
    primarySoft: '#DBEAFE',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    muted: '#64748B',
    onPrimary: '#FFFFFF',
    onSoft: '#1D4ED8',
  },
  green: {
    primary: '#16A34A',
    secondary: '#10B981',
    accent: '#84CC16',
    primarySoft: '#DCFCE7',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F0FDF4',
    border: '#DCFCE7',
    text: '#0F172A',
    muted: '#64748B',
    onPrimary: '#FFFFFF',
    onSoft: '#15803D',
  },
  aurora: {
    primary: '#F97316',
    secondary: '#14B8A6',
    accent: '#EC4899',
    primarySoft: '#FFEDD5',
    background: '#FFF7ED',
    surface: '#FFFFFF',
    surfaceMuted: '#FFF7ED',
    border: '#FED7AA',
    text: '#1F2937',
    muted: '#6B7280',
    onPrimary: '#FFFFFF',
    onSoft: '#C2410C',
  },
};

const DARK_OVERRIDES = {
  background: '#0B1020',
  surface: '#111827',
  surfaceMuted: '#0F172A',
  border: '#263548',
  text: '#F8FAFC',
  muted: '#94A3B8',
  primarySoft: 'rgba(255,255,255,0.08)',
  onSoft: '#F8FAFC',
};

export const THEME_OPTIONS = [
  { key: 'pink', label: 'Pink' },
  { key: 'blue', label: 'Blue' },
  { key: 'green', label: 'Green' },
  { key: 'aurora', label: 'Aurora' },
];

export const DEFAULT_THEME_KEY = 'pink';
export const DEFAULT_DARK_MODE = false;
export const DEFAULT_MONTHLY_BUDGET_LIMIT = 2500;

export function getTheme(themeKey = DEFAULT_THEME_KEY, darkModeEnabled = DEFAULT_DARK_MODE) {
  const safeTheme = BASE_THEMES[themeKey] || BASE_THEMES[DEFAULT_THEME_KEY];
  if (!darkModeEnabled) return safeTheme;
  return {
    ...safeTheme,
    ...DARK_OVERRIDES,
  };
}
