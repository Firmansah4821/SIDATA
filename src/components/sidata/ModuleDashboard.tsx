import { useMemo } from 'react';
import { DataType, SidataRecord, typeLabels, namaPegawaiOptions } from '@/lib/sidata-config';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { ArrowLeft, Briefcase, Calendar, Users, Loader2 } from 'lucide-react';

interface ModuleDashboardProps {
  type: DataType;
  records: SidataRecord[];
  loading?: boolean;
  onBack: () => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const PIE_COLORS = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];

// Map types to their primary "date" field
const dateFieldMap: Record<DataType, string> = {
  surat_masuk: 'tanggal_terima',
  surat_keluar: 'tanggal_kirim',
  buku_tamu: 'tanggal_tamu',
  inventaris_dokumen: 'tanggal_input',
  pengajuan_bpn: 'tanggal_terbit_sps',
  perjalanan_dinas: 'tanggal_perjalanan',
  agenda_rapat: 'tanggal_rapat',
  lembur: 'tanggal_lembur',
};

// Chart configuration per data type
interface ChartConfig {
  monthlyLabel: string;
  pieField?: string; // for pie chart distribution
  pieTitle?: string;
  topField?: string; // for top-N bar chart
  topTitle?: string;
  peopleField?: string; // multi-value pegawai field
  peopleTitle?: string;
  freqField?: string; // for frequency table
  freqTitle?: string;
  freqColumn?: string;
  petugasLabel?: string;
}

const chartConfig: Record<DataType, ChartConfig> = {
  surat_masuk: {
    monthlyLabel: 'Jumlah Surat Masuk per Bulan',
    pieField: 'jenis_surat', pieTitle: 'Distribusi Jenis Surat',
    topField: 'asal_surat', topTitle: 'Top Asal Surat',
    freqField: 'asal_surat', freqTitle: 'Frekuensi Asal Surat', freqColumn: 'Asal Surat',
    petugasLabel: 'Operator',
  },
  surat_keluar: {
    monthlyLabel: 'Jumlah Surat Keluar per Bulan',
    pieField: 'jenis_surat', pieTitle: 'Distribusi Jenis Surat',
    topField: 'tujuan_surat', topTitle: 'Top Tujuan Surat',
    freqField: 'tujuan_surat', freqTitle: 'Frekuensi Tujuan Surat', freqColumn: 'Tujuan',
    petugasLabel: 'Operator',
  },
  buku_tamu: {
    monthlyLabel: 'Jumlah Tamu per Bulan',
    pieField: 'jenis_kelamin', pieTitle: 'Distribusi Jenis Kelamin',
    topField: 'kecamatan_tamu', topTitle: 'Top Kecamatan Asal Tamu',
    freqField: 'kecamatan_tamu', freqTitle: 'Distribusi Frekuensi Kecamatan', freqColumn: 'Kecamatan',
  },
  inventaris_dokumen: {
    monthlyLabel: 'Jumlah Dokumen per Bulan',
    pieField: 'kategori_dokumen', pieTitle: 'Distribusi Kategori Dokumen',
    topField: 'lokasi_dokumen', topTitle: 'Top Kecamatan Dokumen',
    freqField: 'status_dokumen', freqTitle: 'Distribusi Status Dokumen', freqColumn: 'Status',
  },
  pengajuan_bpn: {
    monthlyLabel: 'Jumlah Pengajuan per Bulan',
    pieField: 'jenis_pengajuan', pieTitle: 'Distribusi Jenis Pengajuan',
    topField: 'kecamatan_bpn', topTitle: 'Top Kecamatan Pemohon',
    freqField: 'kecamatan_bpn', freqTitle: 'Frekuensi Kecamatan', freqColumn: 'Kecamatan',
  },
  perjalanan_dinas: {
    monthlyLabel: 'Jumlah Perjalanan per Bulan',
    pieField: 'tujuan_perjalanan', pieTitle: 'Top Kecamatan Tujuan',
    peopleField: 'pelaku_perjalanan', peopleTitle: 'Pegawai Teraktif',
    freqField: 'tujuan_perjalanan', freqTitle: 'Distribusi Frekuensi Kecamatan', freqColumn: 'Kecamatan',
    petugasLabel: 'Petugas',
  },
  agenda_rapat: {
    monthlyLabel: 'Jumlah Rapat per Bulan',
    topField: 'tempat_rapat', topTitle: 'Top Lokasi Rapat',
    freqField: 'tempat_rapat', freqTitle: 'Frekuensi Tempat Rapat', freqColumn: 'Tempat',
  },
  lembur: {
    monthlyLabel: 'Jumlah Lembur per Bulan',
    pieField: 'bidang_unit_lembur', pieTitle: 'Distribusi Bidang/Unit',
    peopleField: 'nama_pegawai_lembur', peopleTitle: 'Pegawai Teraktif (Lembur)',
    freqField: 'bidang_unit_lembur', freqTitle: 'Frekuensi Bidang/Unit', freqColumn: 'Bidang',
  },
};

function normalizeKecamatan(v: string) {
  return (v || '').replace(/^Kecamatan\s+/i, '').trim();
}

function splitMulti(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  const s = String(v);
  // Split by semicolon or newline only — commas are part of names like "Budiansani, ST"
  const parts = s.split(/[;\n]+/).map(x => x.trim()).filter(Boolean);
  // Try to match against known employee list to recover names accidentally joined
  const matched: string[] = [];
  parts.forEach(part => {
    const hits = namaPegawaiOptions.filter(n => part.includes(n));
    if (hits.length > 0) matched.push(...hits);
    else matched.push(part);
  });
  return matched;
}

export default function ModuleDashboard({ type, records, loading, onBack }: ModuleDashboardProps) {
  const cfg = chartConfig[type];
  const items = useMemo(() => records.filter(r => r.type === type), [records, type]);

  const dateField = dateFieldMap[type];

  const monthlyData = useMemo(() => {
    const counts = new Array(12).fill(0);
    const yearSet = new Set<number>();
    items.forEach(it => {
      const d = it[dateField] || it.submitted_at;
      if (!d) return;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return;
      counts[dt.getMonth()]++;
      yearSet.add(dt.getFullYear());
    });
    return {
      data: MONTHS.map((m, i) => ({ month: m, value: counts[i] })),
      years: yearSet.size,
    };
  }, [items, dateField]);

  const pieData = useMemo(() => {
    if (!cfg.pieField) return [];
    const map = new Map<string, number>();
    items.forEach(it => {
      let v = it[cfg.pieField!];
      if (!v) return;
      v = type === 'buku_tamu' && cfg.pieField === 'kecamatan_tamu' ? normalizeKecamatan(v) : v;
      if (cfg.pieField === 'tujuan_perjalanan' || cfg.pieField === 'kecamatan_bpn' || cfg.pieField === 'lokasi_dokumen' || cfg.pieField === 'kecamatan_tamu') {
        v = normalizeKecamatan(v);
      }
      map.set(v, (map.get(v) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items, cfg.pieField, type]);

  const topData = useMemo(() => {
    if (!cfg.topField) return [];
    const map = new Map<string, number>();
    items.forEach(it => {
      let v = it[cfg.topField!];
      if (!v) return;
      v = normalizeKecamatan(v);
      map.set(v, (map.get(v) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [items, cfg.topField]);

  const peopleData = useMemo(() => {
    if (!cfg.peopleField) return [];
    const map = new Map<string, number>();
    items.forEach(it => {
      const arr = splitMulti(it[cfg.peopleField!]);
      arr.forEach(name => {
        const full = name.trim();
        if (!full) return;
        map.set(full, (map.get(full) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items, cfg.peopleField]);

  const freqData = useMemo(() => {
    if (!cfg.freqField) return [];
    const map = new Map<string, number>();
    items.forEach(it => {
      let v = it[cfg.freqField!];
      if (!v) return;
      v = normalizeKecamatan(v);
      map.set(v, (map.get(v) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [items, cfg.freqField]);

  // Petugas count (unique people)
  const petugasCount = useMemo(() => {
    const set = new Set<string>();
    if (cfg.peopleField) {
      items.forEach(it => splitMulti(it[cfg.peopleField!]).forEach(n => set.add(n.trim())));
    } else if (cfg.petugasLabel === 'Operator') {
      items.forEach(it => { if (it.operator) set.add(String(it.operator).trim()); });
    }
    return set.size;
  }, [items, cfg.peopleField, cfg.petugasLabel]);

  const total = items.length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard {typeLabels[type]}</h2>
          <p className="text-sm text-muted-foreground">Visualisasi data {typeLabels[type].toLowerCase()}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : total === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Belum ada data {typeLabels[type].toLowerCase()} untuk divisualisasikan.</p>
        </div>
      ) : (
        <>
          {/* Row 1: Monthly bar + Pie/Top */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">{cfg.monthlyLabel} ({new Date().getFullYear()})</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="#3b82f6" name="Jumlah" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {pieData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">{cfg.pieTitle}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="40%" cy="50%" outerRadius={85}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {!cfg.pieField && topData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">{cfg.topTitle}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" fill="#3b82f6" name="Jumlah" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={<Briefcase className="w-6 h-6 text-primary" />} value={total} label={`Total ${typeLabels[type]} (periode)`} />
            <StatCard icon={<Calendar className="w-6 h-6 text-amber-500" />} value={monthlyData.years || 1} label="Tahun Aktif" />
            <StatCard icon={<Users className="w-6 h-6 text-emerald-500" />} value={petugasCount} label={cfg.petugasLabel === 'Operator' ? 'Operator' : 'Petugas'} />
          </div>

          {/* Row 3: People bar + Frequency table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {peopleData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">📊 {cfg.peopleTitle}</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peopleData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" fill="#f97316" name="Frekuensi" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {freqData.length > 0 && (
              <div className={`bg-card border border-border rounded-xl p-4 ${peopleData.length === 0 ? 'lg:col-span-2' : ''}`}>
                <h3 className="text-sm font-semibold text-foreground mb-3">📋 {cfg.freqTitle}</h3>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 font-semibold text-muted-foreground">{cfg.freqColumn}</th>
                        <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {freqData.map((r, i) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                          <td className="py-2 px-2 text-foreground">{r.name}</td>
                          <td className="py-2 px-2 text-right tabular-nums font-medium text-foreground">{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center text-center">
      <div className="mb-2">{icon}</div>
      <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}