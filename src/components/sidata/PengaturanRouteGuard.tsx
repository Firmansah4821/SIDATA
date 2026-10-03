import { Link, Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from '@/pages/AdminDashboard';

/** Kartu ringkas "Khusus Admin" — dipakai di dalam dashboard bila view dibuka non-admin. */
export function KhususAdminInline({ title = 'Halaman Pengaturan' }: { title?: string }) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <ShieldAlert className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-[26px] leading-tight font-extrabold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Akses terbatas</p>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border/80 shadow-[0_1px_3px_rgba(15,23,42,0.05)] flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-1"
          style={{ backgroundColor: 'hsl(var(--destructive) / 0.12)' }}
        >
          <ShieldAlert className="w-8 h-8" style={{ color: 'hsl(var(--destructive))' }} />
        </div>
        <h3 className="text-lg font-extrabold text-foreground">Khusus Admin</h3>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          Halaman ini hanya dapat diakses oleh akun <span className="font-semibold text-foreground">Admin</span>.
          Silakan masuk dengan akun Admin untuk membukanya.
        </p>
        <Link
          to="/"
          className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Kembali
        </Link>
      </div>
    </div>
  );
}

/**
 * Guard rute /pengaturan/* — hanya Admin yang boleh membuka halaman.
 * Petugas/operator yang membuka URL langsung akan ditolak ("Khusus Admin").
 */
export default function PengaturanRouteGuard() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return <Navigate to="/" replace />;
  }

  if (!auth.isAdmin) {
    return (
      <div className="login-bg min-h-screen w-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[404px] bg-card rounded-[22px] border border-border shadow-[0_30px_70px_-28px_rgba(15,23,42,0.35)] p-8 text-center animate-fade-in">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'hsl(var(--destructive) / 0.12)' }}
          >
            <ShieldAlert className="w-7 h-7" style={{ color: 'hsl(var(--destructive))' }} />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">Khusus Admin</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Halaman Pengaturan SIDATA ini hanya dapat diakses oleh akun Admin.
            Silakan kembali atau masuk dengan akun Admin.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  // Admin — buka dashboard; view awal mengikuti path /pengaturan/*.
  return <AdminDashboard auth={auth} />;
}
