import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, AlertTriangle } from 'lucide-react';
import {
  DataType, SidataRecord, typeLabels, getSummary,
} from '@/lib/sidata-config';

interface CalendarViewProps {
  type: DataType;
  records: SidataRecord[];
  loading?: boolean;
  onSelectType: (t: DataType) => void;
  onViewDetail?: (r: SidataRecord) => void;
}

const ALL_TYPES: DataType[] = [
  'surat_masuk','surat_keluar','buku_tamu','inventaris_dokumen',
  'pengajuan_bpn','perjalanan_dinas','agenda_rapat','lembur',
];

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

const MONTHS_ID = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];
const DAYS_ID = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseRecordDate(r: SidataRecord, type: DataType): string | null {
  const v = r[dateFieldMap[type]] || r.submitted_at;
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return toYMD(d);
}

export default function CalendarView({ type, records, loading, onSelectType, onViewDetail }: CalendarViewProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Reset selection when switching type or month
  useEffect(() => { setSelectedDate(null); }, [type, cursor.getMonth(), cursor.getFullYear()]);

  const items = useMemo(() => records.filter(r => r.type === type), [records, type]);

  // Group records by YYYY-MM-DD for the current month
  const recordsByDate = useMemo(() => {
    const map = new Map<string, SidataRecord[]>();
    items.forEach(r => {
      const key = parseRecordDate(r, type);
      if (!key) return;
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    });
    return map;
  }, [items, type]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ day: number; ymd: string } | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ day: d, ymd });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const todayYmd = toYMD(today);
  const selectedRecords = selectedDate ? (recordsByDate.get(selectedDate) || []) : [];
  const hasConflict = (r: SidataRecord) => !!(r as any).conflict_flag;
  const dateHasConflict = (ymd: string) => (recordsByDate.get(ymd) || []).some(hasConflict);

  const formatSelectedDate = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return `${d} ${MONTHS_ID[m - 1]} ${y}`;
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Kalender {typeLabels[type]}</h2>
          <p className="text-sm text-muted-foreground">Klik tanggal untuk melihat daftar {typeLabels[type].toLowerCase()}</p>
        </div>
      </div>

      {/* Type tabs — even grid, clean and consistent */}
      <div className="bg-card border border-border rounded-2xl p-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {ALL_TYPES.map(t => {
          const active = t === type;
          return (
            <button
              key={t}
              onClick={() => onSelectType(t)}
              className={`px-3 py-2 text-xs sm:text-[13px] rounded-xl font-semibold transition-all text-center truncate ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              title={typeLabels[t]}
            >
              {typeLabels[t]}
            </button>
          );
        })}
      </div>

      {/* Calendar card */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="w-10 h-10 rounded-xl border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h3 className="text-base sm:text-lg font-bold text-primary tabular-nums">
            {MONTHS_ID[month]} {year}
          </h3>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="w-10 h-10 rounded-xl border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
          {DAYS_ID.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {cells.map((c, i) => {
              if (!c) return <div key={i} className="h-11 sm:h-12" />;
              const has = recordsByDate.has(c.ymd);
              const count = recordsByDate.get(c.ymd)?.length || 0;
              const isToday = c.ymd === todayYmd;
              const isSelected = c.ymd === selectedDate;
              const conflict = has && dateHasConflict(c.ymd);
              return (
                <button
                  key={i}
                  onClick={() => has && setSelectedDate(c.ymd)}
                  disabled={!has}
                  className={`relative h-11 sm:h-12 rounded-lg border text-sm font-medium transition-all
                    ${isSelected ? 'bg-primary text-primary-foreground border-primary shadow-md' :
                      conflict ? 'bg-warning/15 dark:bg-warning/15 border-warning/50 text-foreground hover:bg-warning/25 cursor-pointer' :
                      has ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-foreground hover:bg-orange-100 dark:hover:bg-orange-500/20 cursor-pointer' :
                      'bg-background border-border text-muted-foreground/70 cursor-default'}
                    ${isToday && !isSelected ? 'ring-2 ring-primary/40' : ''}
                  `}
                  title={conflict ? 'Bentrok jadwal pada tanggal ini' : undefined}
                >
                  <span className="tabular-nums">{c.day}</span>
                  {conflict && !isSelected && (
                    <AlertTriangle className="absolute top-0.5 right-0.5 w-3 h-3 text-warning" />
                  )}
                  {has && !isSelected && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${conflict ? 'bg-warning' : 'bg-orange-500'}`} />
                      {count > 1 && <span className={`w-1.5 h-1.5 rounded-full ${conflict ? 'bg-warning/70' : 'bg-orange-500/70'}`} />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected day detail */}
        {selectedDate && (
          <div className={`mt-5 rounded-xl p-4 border ${
            selectedRecords.some(hasConflict)
              ? 'bg-warning/10 border-warning/40'
              : 'bg-orange-50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/30'
          }`}>
            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <span>📅 {typeLabels[type]} pada {formatSelectedDate(selectedDate)}:</span>
              {selectedRecords.some(hasConflict) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/20 text-warning text-[11px] font-semibold">
                  <AlertTriangle className="w-3 h-3" /> Bentrok jadwal
                </span>
              )}
            </p>
            {selectedRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada data.</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedRecords.map(r => {
                  const c = hasConflict(r);
                  return (
                    <li key={r.id} className={`text-sm flex items-start gap-2 rounded-md px-2 py-1 ${c ? 'bg-warning/10 border border-warning/30' : ''}`}>
                      {c ? (
                        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                      ) : (
                        <span className="text-orange-500 mt-0.5">•</span>
                      )}
                      <span className="flex-1 break-words text-foreground">
                        {getSummary(r)}
                        {c && (
                          <span className="ml-2 text-[11px] font-semibold text-warning">⚠ Bentrok jadwal</span>
                        )}
                      </span>
                      {onViewDetail && (
                        <button
                          onClick={() => onViewDetail(r)}
                          className="text-xs text-primary hover:underline font-medium shrink-0"
                        >
                          Lihat
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {!selectedDate && !loading && (
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Klik tanggal yang ditandai untuk melihat daftar.
          </p>
        )}
      </div>
    </div>
  );
}