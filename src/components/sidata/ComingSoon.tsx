import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';

interface ComingSoonProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
}

/**
 * Halaman placeholder "Segera hadir" — hanya tampilan, tanpa fungsi nyata.
 * Dipakai untuk 2 rute baru Pengaturan (Admin): Log Aktivitas & Backup & Restore.
 */
export default function ComingSoon({ icon, title, subtitle }: ComingSoonProps) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-[26px] leading-tight font-extrabold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/80 shadow-[0_1px_3px_rgba(15,23,42,0.05)] flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-1"
          style={{ backgroundColor: 'hsl(var(--primary) / 0.12)' }}
        >
          <Clock className="w-8 h-8" style={{ color: 'hsl(var(--primary))' }} />
        </div>
        <h3 className="text-lg font-extrabold text-foreground">Segera hadir</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Fitur <span className="font-semibold text-foreground">{title}</span> sedang dalam pengembangan dan akan segera tersedia.
        </p>
      </div>
    </div>
  );
}
