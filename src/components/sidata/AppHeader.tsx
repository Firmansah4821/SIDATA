import { useState, useEffect, useRef } from 'react';
import { Menu, CalendarDays, LogOut, ChevronDown, Sun, Moon, User } from 'lucide-react';
import logoBima from '@/assets/logo-bima.png';
import NotificationBell from './NotificationBell';

interface AppHeaderProps {
  isAdmin: boolean;
  currentUser?: string;
  avatarUrl?: string | null;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export default function AppHeader({ isAdmin, currentUser, avatarUrl, onToggleSidebar, onLogout }: AppHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const dropdownRef = useRef<HTMLDivElement>(null);

  const todayDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

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

  return (
    <header className="header-gradient h-16 px-5 flex justify-between items-center shadow-lg flex-shrink-0 sticky top-0 z-[1000]">
      <div className="flex items-center gap-3">
        <img src={logoBima} alt="Logo Kabupaten Bima" className="w-9 h-auto drop-shadow-md" />
        <div className="leading-tight">
          <h1 className="text-lg font-extrabold tracking-tight leading-none text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.04em' }}>SIDATA</h1>
          <p className="text-[11px] opacity-75 hidden sm:block mt-0.5 font-semibold tracking-wide text-white">Sistem Informasi Data Pertanahan</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
          <CalendarDays className="w-3.5 h-3.5 opacity-70 text-white" />
          <span className="font-semibold text-xs hidden sm:inline text-white">{todayDate}</span>
          <div className="w-px h-4 bg-white/20 mx-1" />
          {isAdmin && <NotificationBell />}
          <button
            onClick={toggleDarkMode}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/15 transition-all duration-200 active:scale-95"
            title={isDark ? 'Mode Terang' : 'Mode Gelap'}
          >
            {isDark ? <Sun className="w-[16px] h-[16px] text-white" /> : <Moon className="w-[16px] h-[16px] text-white" />}
          </button>
          <button
            onClick={onToggleSidebar}
            className="w-7 h-7 rounded-md flex items-center justify-center bg-amber-400/20 hover:bg-amber-400/40 transition-all duration-200 active:scale-95 ring-1 ring-amber-300/30"
          >
            <Menu className="w-[16px] h-[16px] text-amber-300" />
          </button>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-9 px-2 rounded-lg bg-white/15 hover:bg-white/25 transition-all duration-200 text-xs font-semibold flex items-center gap-1.5 active:scale-95"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
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
