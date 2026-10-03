import { useState } from 'react';
import { Palette, Sun, Moon, Monitor, Check, X, RotateCcw } from 'lucide-react';
import {
  DEFAULT_THEME,
  THEME_ACCENTS,
  THEME_MODES,
  applyTheme,
  loadTheme,
  type ThemeMode,
  type ThemePrefs,
} from '@/lib/theme';

interface ThemePanelProps {
  onClose: () => void;
}

/**
 * Panel "Tema & Warna" — pratinjau statis (bukan iframe).
 * Pilihan baru hanya diterapkan saat tombol "Terapkan" ditekan;
 * "Reset ke Default" langsung mengembalikan aksen Biru + mode default aplikasi.
 */
export default function ThemePanel({ onClose }: ThemePanelProps) {
  const [draft, setDraft] = useState<ThemePrefs>(() => loadTheme());

  const draftMeta = THEME_ACCENTS.find(a => a.id === draft.accent) ?? THEME_ACCENTS[0];
  const rootIsDark = document.documentElement.classList.contains('dark');
  // Warna UI panel mengikuti aksen yang sedang dipilih di draft (pratinjau).
  const uiPrimary = rootIsDark ? draftMeta.primaryDark : draftMeta.primary;

  const handleApply = () => {
    applyTheme(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_THEME);
    applyTheme(DEFAULT_THEME);
  };

  // ── Pratinjau statis: cerminan draft mode + aksen ──
  const previewDark =
    draft.mode === 'gelap' ||
    (draft.mode === 'sistem' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const previewPrimary = previewDark ? draftMeta.primaryDark : draftMeta.primary;
  const previewBg = previewDark ? '#0b1220' : '#faf7ec';
  const previewCard = previewDark ? '#131c31' : '#ffffff';
  const previewLine = previewDark ? '#26334f' : '#e7e1cf';

  return (
    <div className="w-[330px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 z-[80] overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border">
        <Palette className="w-[18px] h-[18px] shrink-0" style={{ color: uiPrimary }} />
        <h4 className="flex-1 text-sm font-extrabold text-foreground tracking-tight">Tema &amp; Warna</h4>
        <button
          onClick={onClose}
          title="Tutup"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Mode Tampilan */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">Mode Tampilan</p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_MODES.map(mode => {
              const active = draft.mode === mode.id;
              const Icon = mode.id === 'terang' ? Sun : mode.id === 'gelap' ? Moon : Monitor;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setDraft(prev => ({ ...prev, mode: mode.id as ThemeMode }))}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-[11.5px] font-bold transition-all duration-200 ${
                    active ? 'border-transparent text-white shadow-md' : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                  style={active ? { backgroundColor: uiPrimary } : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Warna Aksen */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">Warna Aksen</p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_ACCENTS.map(acc => {
              const active = draft.accent === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setDraft(prev => ({ ...prev, accent: acc.id }))}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all duration-200 ${
                    active ? '' : 'border-border bg-background hover:bg-muted'
                  }`}
                  style={
                    active
                      ? { backgroundColor: `${acc.swatch}1f`, borderColor: acc.swatch }
                      : undefined
                  }
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: acc.swatch }}
                  >
                    {active && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </span>
                  <span className={`text-[11px] font-bold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {acc.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pratinjau Tema — statis, tanpa iframe */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">Pratinjau Tema</p>
          <div
            className="rounded-xl border border-border overflow-hidden flex h-[132px]"
            style={{ backgroundColor: previewBg }}
          >
            {/* Mini sidebar */}
            <div
              className="w-[62px] p-1.5 space-y-1.5 shrink-0"
              style={{ background: 'linear-gradient(180deg, hsl(217 49% 19%) 0%, hsl(226 52% 10%) 100%)' }}
            >
              <div className="h-2 w-9 rounded-full bg-white/70 mb-2" />
              {/* menu aktif — mengikuti aksen draft */}
              <div className="h-3.5 rounded" style={{ backgroundColor: draftMeta.activeBg }} />
              {/* menu bersubmenu terbuka — tint aksen draft */}
              <div className="h-2.5 rounded" style={{ backgroundColor: previewPrimary, opacity: 0.55 }} />
              <div className="h-2.5 rounded bg-white/15" />
              <div className="h-2.5 rounded bg-white/15" />
              <div className="h-2.5 rounded bg-white/15" />
            </div>

            {/* Mini konten */}
            <div className="flex-1 min-w-0 p-2 space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="h-3.5 flex-1 rounded-full border" style={{ backgroundColor: previewCard, borderColor: previewLine }} />
                <div className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: previewPrimary }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-8 rounded-lg border p-1.5" style={{ backgroundColor: previewCard, borderColor: previewLine }}>
                    <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: previewLine }} />
                    <div className="h-2 w-2/3 rounded-full mt-1.5" style={{ backgroundColor: previewLine }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {/* Donut — warna SEMANTIK, tidak berubah karena aksen */}
                <div
                  className="w-9 h-9 rounded-full relative shrink-0"
                  style={{ background: 'conic-gradient(#3b82f6 0 22%, #06b6d4 0 32%, #10b981 0 40%, #f59e0b 0 90%, #f43f5e 0 100%)' }}
                >
                  <div className="absolute inset-[6px] rounded-full" style={{ backgroundColor: previewBg }} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: previewLine }} />
                  <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: previewLine }} />
                </div>
                <div className="h-4 px-2 rounded flex items-center shrink-0" style={{ backgroundColor: previewPrimary }}>
                  <div className="h-1 w-5 rounded-full bg-white/90" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Aksi */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 px-3 py-2.5 rounded-xl border border-border text-[12.5px] font-bold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            Reset ke Default
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-[1.3] px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
            style={{ backgroundColor: uiPrimary }}
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
