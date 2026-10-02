import { useState } from 'react';
import { Eye, EyeOff, Loader2, User, Lock, ArrowRight, ShieldCheck, AlertCircle, ChevronDown, UserCog } from 'lucide-react';
import logoBima from '@/assets/logo-bima.png';

interface AuthPageProps {
  onSignIn: (username: string, password: string, role?: 'admin' | 'operator') => Promise<any>;
}

export default function AuthPage({ onSignIn }: AuthPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'operator'>('admin');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const err = await onSignIn(username.trim(), password, role);
      if (err) {
        if (err.message === 'ROLE_MISMATCH') {
          setError(`Akun ini tidak terdaftar sebagai ${role === 'admin' ? 'Admin' : 'Operator'}. Pilih peran yang sesuai.`);
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
      setLoading(false);
    }
  };

  const inputClass =
    'w-full py-3.5 pl-12 pr-11 border border-input rounded-xl text-sm bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/15 transition-all';

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Subtle land-parcel background pattern */}
      <svg className="absolute inset-0 w-full h-full text-border/70 pointer-events-none" aria-hidden="true">
        <defs>
          <pattern id="login-parcels" width="280" height="280" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M-20 90 L60 40 L150 75 L220 20 L300 55" />
              <path d="M60 40 L95 150 L30 210 L-20 170" />
              <path d="M150 75 L185 180 L95 150" />
              <path d="M220 20 L265 130 L185 180" />
              <path d="M-20 250 L70 220 L95 150" />
              <path d="M70 220 L160 260 L185 180" />
              <path d="M265 130 L300 230 L230 270 L160 260" />
              <path d="M-20 320 L60 300 L95 330" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-parcels)" />
      </svg>
      {/* Soft light wash for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background/90 pointer-events-none" />

      {/* Main content */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Brand header */}
          <div className="text-center mb-8">
            <img
              src={logoBima}
              alt="Logo Kabupaten Bima"
              className="w-24 h-auto mx-auto mb-5 drop-shadow-md"
            />
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">SIDATA</h1>
            <p className="text-lg font-bold text-foreground/80 mt-2">Sistem Informasi Data Pertanahan</p>
            <p className="text-sm text-muted-foreground mt-1.5">Kantor Pertanahan Kab. Bima</p>
            <div className="w-10 h-1 bg-primary rounded-full mx-auto mt-5" />
          </div>

          {/* Login card */}
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl p-7 sm:p-8 animate-fade-in">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-username" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-0 top-0 h-full w-11 flex items-center justify-center border-r border-input text-muted-foreground pointer-events-none">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className={inputClass}
                    placeholder="Masukkan username"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-0 top-0 h-full w-11 flex items-center justify-center border-r border-input text-muted-foreground pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Masukkan password"
                    required
                    minLength={6}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="login-role" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Masuk Sebagai
                </label>
                <div className="relative">
                  <span className="absolute left-0 top-0 h-full w-11 flex items-center justify-center border-r border-input text-muted-foreground pointer-events-none">
                    <UserCog className="w-4 h-4" />
                  </span>
                  <select
                    id="login-role"
                    value={role}
                    onChange={e => setRole(e.target.value as 'admin' | 'operator')}
                    className={`${inputClass} appearance-none cursor-pointer`}
                  >
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl text-sm font-medium bg-destructive/10 text-destructive" role="alert">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold uppercase tracking-wide hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Masuk
              </button>
            </form>

            <div className="flex items-center justify-center gap-1.5 mt-6 pt-1 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              Akses sistem terlindungi
            </div>
          </div>
        </div>
      </div>

      {/* Page footer */}
      <footer className="relative py-5 text-center text-xs text-muted-foreground">
        © 2026 SIDATA <span className="mx-1.5">•</span> Sistem Informasi Data Pertanahan <span className="mx-1.5">•</span> Versi 1.0.0
      </footer>
    </div>
  );
}
