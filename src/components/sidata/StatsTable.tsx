import { DataType, typeLabels } from '@/lib/sidata-config';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Mail, MailOpen, UserCheck, FolderArchive, Building2, Car, CalendarDays, TrendingUp, Clock } from 'lucide-react';

interface StatsTableProps {
  stats: Record<DataType, number>;
  onSelectType?: (type: DataType) => void;
}

const COLORS = ['#3b82f6', '#0ea5e9', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
        {allData.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onSelectType?.(item.type)}
            className="bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200 group text-left cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-primary-foreground" style={{ backgroundColor: item.color }}>
                {typeIconMap[item.type]}
              </div>
              <TrendingUp className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.name}</p>
            <p className="text-[10px] text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Klik untuk lihat grafik →</p>
          </button>
        ))}
      </div>

      {/* Chart Section */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="flex-shrink-0 flex items-center justify-center p-8 md:border-r border-b md:border-b-0 border-border">
            <div className="relative w-48 h-48">
              {total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
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
                    <Pie data={[{ value: 1 }]} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} strokeWidth={0}>
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-foreground leading-none">{total}</span>
                <span className="text-[10px] text-muted-foreground font-medium mt-1">Total Data</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Distribusi Data</p>
            <div className="space-y-3">
              {allData.map((item) => {
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.type} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-foreground flex-1">{item.name}</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{item.value}</span>
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{pct}%</span>
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
