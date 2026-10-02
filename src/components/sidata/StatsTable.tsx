import { DataType, typeLabels } from '@/lib/sidata-config';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Mail, MailOpen, UserCheck, FolderArchive, Building2, Car, CalendarDays, Clock } from 'lucide-react';

interface StatsTableProps {
  stats: Record<DataType, number>;
  onSelectType?: (type: DataType) => void;
}

const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#a855f7', '#ec4899'];

const typeIconMap: Record<DataType, React.ReactNode> = {
  surat_masuk: <Mail className="w-5 h-5" />,
  surat_keluar: <MailOpen className="w-5 h-5" />,
  buku_tamu: <UserCheck className="w-5 h-5" />,
  inventaris_dokumen: <FolderArchive className="w-5 h-5" />,
  pengajuan_bpn: <Building2 className="w-5 h-5" />,
  perjalanan_dinas: <Car className="w-5 h-5" />,
  agenda_rapat: <CalendarDays className="w-5 h-5" />,
  lembur: <Clock className="w-5 h-5" />,
};

export default function StatsTable({ stats, onSelectType }: StatsTableProps) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const allData = Object.entries(stats).map(([type, count], idx) => ({
    name: typeLabels[type as DataType],
    value: count,
    type: type as DataType,
    color: COLORS[idx % COLORS.length],
  }));
  const pieData = allData.filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {allData.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onSelectType?.(item.type)}
            style={{ '--stat-color': item.color } as React.CSSProperties}
            className="stat-card rounded-2xl border border-border/80 p-4 sm:p-5 hover:shadow-lg hover:border-primary/40 transition-all duration-200 group text-left cursor-pointer shadow-[0_1px_3px_rgba(15,23,42,0.05)]"
          >
            <div className="relative z-[1]">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-[0_6px_14px_-6px_rgba(15,23,42,0.4)]"
                style={{ backgroundColor: item.color }}
              >
                {typeIconMap[item.type]}
              </div>
              <p className="mt-4 text-[26px] leading-none font-extrabold text-foreground tabular-nums">{item.value}</p>
              <p className="mt-2 text-[13px] font-medium text-muted-foreground leading-snug">{item.name}</p>
            </div>
            <span className="absolute top-4 right-4 z-[2] text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Grafik →
            </span>
          </button>
        ))}
      </div>

      {/* Chart Section */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-[0_1px_3px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="flex-shrink-0 flex items-center justify-center p-6 lg:p-8 lg:border-r border-b lg:border-b-0 border-border/80">
            <div className="relative w-48 h-48 lg:w-52 lg:h-52">
              {total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        fontSize: 12,
                        border: '1px solid hsl(var(--border))',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ value: 1 }]} dataKey="value" cx="50%" cy="50%" innerRadius={58} outerRadius={88} strokeWidth={0}>
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[36px] font-extrabold text-foreground leading-none tabular-nums">{total}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1.5">Total Data</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-5 lg:p-6 min-w-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.18em] mb-4">Distribusi Data</p>
            <div className="space-y-3">
              {allData.map((item) => {
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.type} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-foreground flex-1 truncate">{item.name}</span>
                    <span className="text-sm font-bold text-foreground tabular-nums w-10 text-right shrink-0">{item.value}</span>
                    <div className="w-20 md:w-28 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-9 text-right tabular-nums shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
