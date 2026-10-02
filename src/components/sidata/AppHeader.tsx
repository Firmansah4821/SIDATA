import { useState, useEffect, useRef } from 'react';
import { Menu, CalendarDays, LogOut, ChevronDown, Sun, Moon, User, Search, ArrowRight } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { DataType, typeLabels } from '@/lib/sidata-config';

const ALL_TYPES: DataType[] = ['surat_masuk', 'surat_keluar', 'buku_tamu', 'inventaris_dokumen', 'pengajuan_bpn', 'perjalanan_dinas', 'agenda_rapat', 'lembur'];

interface AppHeaderProps {
  isAdmin: boolean;
  currentUser?: string;
  avatarUrl?: string | null;
  onToggleSidebar: () => void;
  onLogout: () => void;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string, type?: DataType) => void;
  searchHint?: string;
}

export default function AppHeader({ isAdmin, currentUser, avatarUrl, onToggleSidebar, onLogout, onSearchChange, onSearchSubmit, searchHint }: AppHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const todayDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const trimmed = query.trim().toLowerCase();
  const matches = trimmed ? ALL_TYPES.filter(t => typeLabels[t].toLowerCase().includes(trimmed)) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('sidata-theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const saved = localStorage.getItem('sidata-theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSearchOpen(true);
    onSearchChange?.(value);
  };

  const submitSearch = (type?: DataType) => {
    const q = query.trim();
    if (!q) return;
    onSearchSubmit?.(q, type);
    setSearchOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitSearch(matches[0]);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  return (
    <header className="relative h-[68px] px-4 md:px-6 flex items-center justify-between gap-3 flex-shrink-0 z-[100]">
      {/* Left: hamburger + search pill */}
      <div className="relative flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onToggleSidebar}
          title="Menu"
          className="w-10 h-10 shrink-0 rounded-xl bg-foreground/[0.05] hover:bg-foreground/[0.09] border border-foreground/10 flex items-center justify-center text-foreground transition-all active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div ref={searchRef} className="relative w-full max-w-[420px] min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 140)}
            onKeyDown={handleKeyDown}
            placeholder="Cari Surat..."
            aria-label="Cari data"
            className="w-full h-11 pl-11 pr-4 rounded-full bg-foreground/[0.05] border border-foreground/10 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring/15 transition-all"
          />

          {searchOpen && query.trim() && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[250px] bg-card border border-border rounded-xl shadow-xl z-[60] overflow-hidden animate-slide-up">
              {matches.length > 0 ? (
                matches.map(type => (
                  <button
                    key={type}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); submitSearch(type); }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center justify-between gap-3 text-foreground hover:bg-muted transition-colors"
                  >
                    <span className="truncate">{typeLabels[type]}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  {searchHint || 'Data tidak ditemukan'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: date, notifications, dark mode, profile */}
      <div className="relative flex items-center gap-1 md:gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-2 h-10 px-3 rounded-full">
          <CalendarDays className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          <span className="text-[13.5px] font-semibold text-foreground/80 whitespace-nowrap">{todayDate}</span>
        </div>

        {isAdmin && (
          <div className="w-10 h-10 flex items-center justify-center">
            <NotificationBell />
          </div>
        )}

        <button
          onClick={toggleDarkMode}
          className="w-10 h-10 rounded-full flex items-center justify-center text-foreground/75 hover:bg-foreground/[0.07] transition-all duration-200 active:scale-95"
          title={isDark ? 'Mode Terang' : 'Mode Gelap'}
        >
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-10 pl-1 pr-2 rounded-full flex items-center gap-1.5 hover:bg-foreground/[0.07] transition-all duration-200 active:scale-95"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 ring-2 ring-white/60 shadow">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-foreground/60 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl min-w-[180px] shadow-xl z-50 overflow-hidden animate-slide-up">
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground truncate max-w-[120px]">{currentUser}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{isAdmin ? 'Administrator' : 'Operator'}</p>
                </div>
              </div>
              <div className="border-t border-border py-1">
                <button onClick={() => { onLogout(); setDropdownOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2.5">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
