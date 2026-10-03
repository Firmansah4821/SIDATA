/**
 * Tema & Warna — mekanisme dark-class + CSS variables yang sudah ada.
 * Pilihan disimpan di localStorage agar pulih setelah refresh.
 *
 * - Mode  : Terang | Gelap | Sistem (matchMedia prefers-color-scheme)
 * - Aksen : Biru | Ungu | Hijau | Teal | Rose | Amber → hanya elemen UI
 *           (menu aktif, tombol utama, focus ring) lewat `data-accent`
 *           di <html> + variabel --primary / --ring / --sidebar-active-*.
 *           Warna semantik grafik/donut TIDAK berubah (hardcoded di komponen chart).
 */

export type ThemeMode = 'terang' | 'gelap' | 'sistem';
export type ThemeAccent = 'biru' | 'ungu' | 'hijau' | 'teal' | 'rose' | 'amber';

export interface ThemePrefs {
  mode: ThemeMode;
  accent: ThemeAccent;
}

/** Default acuan: aksen Biru, mode mengikuti default aplikasi (Terang). */
export const DEFAULT_THEME: ThemePrefs = { mode: 'terang', accent: 'biru' };

const STORAGE_KEY = 'sidata-theme-prefs';
/** Kunci lama (toggle bulan-sabit) — dimigrasi agar pilihan user lama tetap berlaku. */
const LEGACY_KEY = 'sidata-theme';

export const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: 'terang', label: 'Terang' },
  { id: 'gelap', label: 'Gelap' },
  { id: 'sistem', label: 'Sistem' },
];

export interface AccentMeta {
  id: ThemeAccent;
  label: string;
  /** Warna swatch pada tile pilihan aksen */
  swatch: string;
  /** Warna tombol utama untuk pratinjau (mode terang / gelap) */
  primary: string;
  primaryDark: string;
  /** Warna chip menu aktif sidebar (mengikuti referensi untuk Biru) */
  activeBg: string;
  activeFg: string;
}

export const THEME_ACCENTS: AccentMeta[] = [
  { id: 'biru', label: 'Biru', swatch: '#3b82f6', primary: '#2563eb', primaryDark: '#3b82f6', activeBg: '#f7f3e6', activeFg: '#16233b' },
  { id: 'ungu', label: 'Ungu', swatch: '#8b5cf6', primary: '#7c3aed', primaryDark: '#8b5cf6', activeBg: '#f1e8ff', activeFg: '#4c1d95' },
  { id: 'hijau', label: 'Hijau', swatch: '#22c55e', primary: '#059669', primaryDark: '#10b981', activeBg: '#e7f8ee', activeFg: '#14532d' },
  { id: 'teal', label: 'Teal', swatch: '#14b8a6', primary: '#0d9488', primaryDark: '#14b8a6', activeBg: '#e0f6f3', activeFg: '#134e4a' },
  { id: 'rose', label: 'Rose', swatch: '#f43f5e', primary: '#e11d48', primaryDark: '#fb7185', activeBg: '#ffe9ef', activeFg: '#881337' },
  { id: 'amber', label: 'Amber', swatch: '#f59e0b', primary: '#d97706', primaryDark: '#f59e0b', activeBg: '#fdf0d5', activeFg: '#78350f' },
];

const VALID_MODES: ThemeMode[] = ['terang', 'gelap', 'sistem'];
const VALID_ACCENTS: ThemeAccent[] = ['biru', 'ungu', 'hijau', 'teal', 'rose', 'amber'];

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'gelap') return true;
  if (mode === 'terang') return false;
  return prefersDark();
}

let systemMql: MediaQueryList | null = null;
let systemHandler: ((e: MediaQueryListEvent) => void) | null = null;

/** Terapkan tema ke dokumen + simpan ke localStorage. */
export function applyTheme(prefs: ThemePrefs): void {
  const root = document.documentElement;

  root.classList.toggle('dark', resolveDark(prefs.mode));
  root.setAttribute('data-accent', prefs.accent);

  // Mode Sistem: dengarkan perubahan preferensi OS selama aktif.
  if (systemMql && systemHandler) {
    systemMql.removeEventListener('change', systemHandler);
    systemMql = null;
    systemHandler = null;
  }
  if (prefs.mode === 'sistem') {
    systemMql = window.matchMedia('(prefers-color-scheme: dark)');
    systemHandler = (e) => root.classList.toggle('dark', e.matches);
    systemMql.addEventListener('change', systemHandler);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // Jaga kompatibilitas dengan mekanisme lama ('sidata-theme').
    localStorage.setItem(LEGACY_KEY, resolveDark(prefs.mode) ? 'dark' : 'light');
  } catch {
    /* storage penuh/di-block — tema tetap berlaku untuk sesi ini */
  }
}

/** Baca pilihan tersimpan; migrasi dari kunci lama bila belum ada pilihan baru. */
export function loadTheme(): ThemePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
      const mode = VALID_MODES.includes(parsed.mode as ThemeMode) ? (parsed.mode as ThemeMode) : DEFAULT_THEME.mode;
      const accent = VALID_ACCENTS.includes(parsed.accent as ThemeAccent) ? (parsed.accent as ThemeAccent) : DEFAULT_THEME.accent;
      return { mode, accent };
    }
    if (localStorage.getItem(LEGACY_KEY) === 'dark') {
      return { mode: 'gelap', accent: DEFAULT_THEME.accent };
    }
  } catch {
    /* abaikan parse error → pakai default */
  }
  return DEFAULT_THEME;
}

/** Dipanggil sekali saat aplikasi start (main.tsx). */
export function initTheme(): void {
  applyTheme(loadTheme());
}
