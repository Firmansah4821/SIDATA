import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, User, Lock, ArrowRight, AlertCircle, ChevronDown, UserCog } from 'lucide-react';
import { consumeSessionExpired } from '@/hooks/useIdleTimeout';
import logoBima from '@/assets/logo-bima.png';

interface AuthPageProps {
  onSignIn: (username: string, password: string, role?: 'admin' | 'operator') => Promise<any>;
}

// Batas waktu tunggu proses login — agar tidak pernah menggantung tanpa umpan balik.
const LOGIN_TIMEOUT_MS = 10000;
const LOGIN_TIMEOUT = '__LOGIN_TIMEOUT__';

export default function AuthPage({ onSignIn }: AuthPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'operator' | ''>('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  // Pesan auto-logout 15 menit tidak aktif — tampilkan sekali di halaman login.
  useEffect(() => {
    if (consumeSessionExpired()) setSessionExpired(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSessionExpired(false);

    // Belum memilih peran: tampilkan pesan tanpa memanggil autentikasi.
    if (!role) {
      setError('Silakan pilih peran dulu');
      return;
    }

    setLoading(true);

    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raced = await Promise.race([
        onSignIn(username.trim(), password, role),
        new Promise<string>(resolve => {
          timeoutTimer = setTimeout(() => resolve(LOGIN_TIMEOUT), LOGIN_TIMEOUT_MS);
        }),
      ]);

      if (raced === LOGIN_TIMEOUT) {
        setError('Server sedang sibuk, silakan coba lagi');
        return;
      }

      const err = raced;
      if (err) {
        if (err.message === 'ROLE_MISMATCH') {
          const actual: 'admin' | 'operator' = err.actualRole ?? (role === 'admin' ? 'operator' : 'admin');
          const label = actual === 'admin' ? 'Admin' : 'Petugas';
          setError(`Akun ini terdaftar sebagai ${label} — pilih ${label} untuk masuk`);
        } else if (err.message?.includes('Invalid login credentials')) {
          setError('Username atau password salah. Silakan coba lagi.');
        } else if (err.message?.includes('Email not confirmed')) {
          setError('Akun belum diverifikasi. Hubungi administrator.');
        } else if (err.message?.includes('Too many requests') || err.status === 429) {
          setError('Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.');
        } else {
          setError('Login gagal. Periksa koneksi internet Anda dan coba lagi.');
        }
      }
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      setLoading(false);
    }
  };

  return (
    <div className="login-bg min-h-screen w-full flex flex-col items-center justify-center p-4">
      {/* Single stacked card: white brand block on top, navy login block below */}
      <div className="w-full max-w-[404px] mx-auto animate-fade-in">
        <div className="rounded-[22px] overflow-hidden shadow-[0_30px_70px_-28px_rgba(15,23,42,0.45)]">
          {/* ── Brand (light) — blok identitas ringkas, hierarki jelas ── */}
          <div className="bg-[#fffdf6] px-6 pt-5 pb-4 text-center">
            <img
              src={logoBima}
              alt="Logo Kabupaten Bima"
              className="w-16 h-16 object-contain mx-auto"
            />
            <h1 className="text-[30px] leading-none font-extrabold tracking-tight text-[#16233b] mt-2">SIDATA</h1>
            <p className="text-[14px] font-bold text-[#16233b] mt-1.5 leading-snug">Sistem Informasi Data Pertanahan</p>
            <p className="text-[12px] text-slate-500 mt-1">Kantor Pertanahan Kab. Bima</p>
          </div>

          {/* ── Login (navy) ── */}
          <div className="login-panel px-7 pt-5 pb-6">
            <p className="text-[11px] font-bold tracking-[0.28em] text-slate-400 mb-4">LOGIN</p>

            {sessionExpired && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-xl text-[13px] font-medium bg-amber-500/15 text-amber-200 border border-amber-400/25 mb-1"
                role="status"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
                <span>Sesi berakhir karena tidak ada aktivitas, silakan login kembali</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <User className="w-[17px] h-[17px]" />
                </span>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="login-input w-full h-12 pl-11 pr-4 rounded-xl text-sm transition-all"
                  placeholder="Masukkan username"
                  required
                  autoComplete="username"
                  aria-label="Username"
                />
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock className="w-[17px] h-[17px]" />
                </span>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="login-input w-full h-12 pl-11 pr-11 rounded-xl text-sm transition-all"
                  placeholder="Masukkan password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <UserCog className="w-[17px] h-[17px]" />
                </span>
                <select
                  id="login-role"
                  value={role}
                  onChange={e => setRole(e.target.value as 'admin' | 'operator')}
                  className="login-input w-full h-12 pl-11 pr-10 rounded-xl text-sm appearance-none cursor-pointer transition-all"
                  aria-label="Masuk sebagai"
                >
                  <option value="" disabled>
                    Silakan pilih peran
                  </option>
                  <option value="admin">Admin</option>
                  <option value="operator">Petugas</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl text-[13px] font-medium bg-red-500/15 text-red-200 border border-red-400/20" role="alert">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-button w-full h-12 rounded-xl text-sm font-bold uppercase tracking-[0.08em] mt-1 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Masuk
              </button>
            </form>
          </div>
        </div>

        {/* ── Keterangan identitas di bawah kartu ── */}
        <div className="mt-4 text-center">
          <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Akses sistem terlindungi
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            © 2026 SIDATA • Sistem Informasi Data Pertanahan • Versi 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
