import { useState, useRef, useEffect, useMemo } from 'react';
import { SidataRecord, DataType, typeLabels, getSummary, extraFilters } from '@/lib/sidata-config';
import { Search, Eye, Trash2, Inbox, Download, FileSpreadsheet, ChevronLeft, ChevronRight, X, ChevronDown, Settings, Loader2, Pencil, AlertTriangle } from 'lucide-react';
import { CalendarDays } from 'lucide-react';

const PAGE_SIZE = 10;

interface AdminTableProps {
  records: SidataRecord[];
  activeType: DataType;
  loading?: boolean;
  onViewDetail: (record: SidataRecord) => void;
  onExport: (record: SidataRecord) => void;
  onExportExcel?: (record: SidataRecord) => void;
  onExportAllByType: (type: DataType) => void;
  onExportAllExcelByType?: (type: DataType) => void;
  onDelete: (record: SidataRecord) => void;
  onEdit?: (record: SidataRecord) => void;
}

export default function AdminTable({ records, activeType, loading, onViewDetail, onExportAllByType, onExportAllExcelByType, onDelete, onEdit }: AdminTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtersForType = extraFilters[activeType] || [];

  // Reset filters and page when switching report type
  useEffect(() => {
    setFilterValues({});
    setPage(0);
    setSearch('');
  }, [activeType]);

  // Build dropdown options from existing records (distinct, sorted)
  const filterOptions = useMemo(() => {
    const result: Record<string, string[]> = {};
    const typeRecords = records.filter(r => r.type === activeType);
    for (const def of filtersForType) {
      const set = new Set<string>();
      // Seed with static options so dropdown is never empty
      if (def.options) def.options.forEach(o => set.add(o));
      for (const rec of typeRecords) {
        const raw = (rec as any)[def.field];
        if (raw === undefined || raw === null || raw === '') continue;
        if (def.multi) {
          String(raw).split('|').map(s => s.trim()).filter(Boolean).forEach(v => set.add(v));
        } else {
          set.add(String(raw).trim());
        }
      }
      result[def.field] = Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
    }
    return result;
  }, [records, activeType, filtersForType]);

  let filtered = records.filter(d => d.type === activeType);

  // Apply dropdown filters
  for (const def of filtersForType) {
    const sel = filterValues[def.field];
    if (!sel) continue;
    filtered = filtered.filter(rec => {
      const raw = (rec as any)[def.field];
      if (raw === undefined || raw === null || raw === '') return false;
      if (def.multi) {
        const parts = String(raw).split('|').map(s => s.trim());
        return parts.includes(sel);
      }
      return String(raw).trim() === sel;
    });
  }

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(d => {
      for (const [k, v] of Object.entries(d)) {
        if (k === 'id' || k === 'type' || v === null || v === undefined) continue;
        if (typeof v === 'string' || typeof v === 'number') {
          if (String(v).toLowerCase().includes(s)) return true;
        }
      }
      return false;
    });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const clearSearch = () => { setSearch(''); setPage(0); };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-foreground">Laporan {typeLabels[activeType]}</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
          {filtered.length} data
        </span>
      </div>

      {/* Search + Filters + Export — single row */}
      <div className="flex gap-2 sm:gap-3 flex-wrap items-center">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder={`Cari ${typeLabels[activeType].toLowerCase()}...`}
            className="w-full h-10 pl-10 pr-10 border border-input rounded-xl text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/10 transition-all"
          />
          {search && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/20 transition-colors" title="Hapus pencarian">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Per-type filter dropdowns */}
        {filtersForType.map(def => {
          if (def.type === 'date') {
            const dateValue = filterValues[def.field] || '';
            return (
              <div key={def.field} className="relative flex-1 min-w-[180px]">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={dateValue}
                  onChange={e => { setFilterValues(prev => ({ ...prev, [def.field]: e.target.value })); setPage(0); }}
                  className={`w-full h-10 pl-10 pr-8 border border-input rounded-xl text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/10 transition-all cursor-pointer ${!dateValue ? 'text-transparent' : ''}`}
                  title={`Filter ${def.label}`}
                />
                {!dateValue && (
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none truncate">
                    {def.placeholder || `Cari ${def.label.toLowerCase()}`}
                  </span>
                )}
                {dateValue && (
                  <button
                    type="button"
                    onClick={() => { setFilterValues(prev => { const n = { ...prev }; delete n[def.field]; return n; }); setPage(0); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/20 transition-colors"
                    title="Hapus filter tanggal"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            );
          }
          return (
            <div key={def.field} className="relative flex-1 min-w-[180px]">
              <select
                value={filterValues[def.field] || ''}
                onChange={e => { setFilterValues(prev => ({ ...prev, [def.field]: e.target.value })); setPage(0); }}
                className="w-full h-10 pl-3 pr-8 border border-input rounded-xl text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/10 transition-all appearance-none cursor-pointer"
                title={`Filter ${def.label}`}
              >
                <option value="">Semua {def.label}</option>
                {(filterOptions[def.field] || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          );
        })}

        {/* Eksport Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Eksport</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden animate-fade-in">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">Eksport Semua Data</div>
              <button
                onClick={() => { onExportAllByType(activeType); setDropdownOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4 text-primary" />
                Eksport PDF
              </button>
              {onExportAllExcelByType && (
                <button
                  onClick={() => { onExportAllExcelByType(activeType); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors border-t border-border"
                >
                  <FileSpreadsheet className="w-4 h-4 text-success" />
                  Eksport Excel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-sm font-semibold text-foreground">Memuat data {typeLabels[activeType].toLowerCase()}...</p>
          <p className="text-xs text-muted-foreground mt-1">Mohon tunggu sebentar</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <Inbox className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Tidak ada data {typeLabels[activeType].toLowerCase()}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {search ? 'Coba ubah kata pencarian' : 'Belum ada data yang diinput untuk kategori ini'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[50px]">No</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Detail</th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[110px]">Tanggal</th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[120px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border/50 transition-colors ${item.conflict_flag ? 'bg-warning/10 hover:bg-warning/15' : 'hover:bg-muted/30'}`}
                    title={item.conflict_flag ? `Bentrok jadwal: ${item.conflict_info || ''}` : undefined}
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{safePage * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      <div className="flex items-start gap-2">
                        {item.conflict_flag && (
                          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div>{getSummary(item)}</div>
                          {item.conflict_flag && (
                            <div className="mt-1 text-[11px] font-semibold text-warning flex items-center gap-1">
                              ⚠ Bentrok jadwal{item.conflict_info ? `: ${item.conflict_info}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-center text-muted-foreground tabular-nums">
                      {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button onClick={() => onViewDetail(item)} className="p-2 rounded-lg bg-info/10 text-info hover:bg-info/20 transition-all active:scale-95" title="Detail Data">
                          <Eye className="w-4 h-4" />
                        </button>
                        {onEdit && (
                          <button onClick={() => onEdit(item)} className="p-2 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-all active:scale-95" title="Edit Data">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => onDelete(item)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-95" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination - attached to table */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} dari {filtered.length} data
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted disabled:opacity-40 transition-colors text-foreground border border-border"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <span className="text-xs font-semibold text-foreground px-2">
                Halaman {safePage + 1} dari {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted disabled:opacity-40 transition-colors text-foreground border border-border"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
