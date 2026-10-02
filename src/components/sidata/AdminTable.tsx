import { useState, useRef, useEffect, useMemo } from 'react';
import { SidataRecord, DataType, FormField, typeLabels, formFields, extraFilters } from '@/lib/sidata-config';
import { buildFileDirectUrl, getCleanStorageFileName } from '@/lib/file-link-utils';
import { Search, Trash2, Inbox, Download, FileSpreadsheet, ChevronLeft, ChevronRight, X, ChevronDown, Loader2, Pencil, AlertTriangle, Paperclip } from 'lucide-react';
import { CalendarDays } from 'lucide-react';

const PAGE_SIZE = 8;

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
  searchQuery?: string;
}

// ─── Column configuration per report page ───
// Columns mirror the fields of the "Detail Data" modal (source: formFields),
// in the same order, plus one merged DOKUMEN/LAMPIRAN column and AKSI.
interface ColumnDef {
  id: string;
  label: string;
  isFile: boolean;
  isDate: boolean;
}

// Surat Masuk follows the reference layout exactly (Jenis Surat before Tanggal Terima)
const COLUMN_ORDER_OVERRIDE: Partial<Record<DataType, string[]>> = {
  surat_masuk: [
    'nomor_buku', 'asal_surat', 'nomor_surat', 'tanggal_surat', 'perihal',
    'jenis_surat', 'tanggal_terima', 'tanggapan_kabid', 'operator',
  ],
};

const HEADER_LABELS: Record<string, string> = {
  nomor_buku: 'NO. BUKU',
  nomor_surat: 'NO. SURAT',
};

function headerLabel(field: FormField): string {
  return HEADER_LABELS[field.id] || field.label.toUpperCase();
}

function buildColumns(type: DataType): ColumnDef[] {
  const fields = (formFields[type] || []).filter(f => f.type !== 'html');
  const nonFileFields = fields.filter(f => f.type !== 'file');
  const override = COLUMN_ORDER_OVERRIDE[type];

  let ordered = nonFileFields;
  if (override) {
    const byId = new Map(nonFileFields.map(f => [f.id, f]));
    const listed = override.map(id => byId.get(id)).filter(Boolean) as FormField[];
    const rest = nonFileFields.filter(f => !override.includes(f.id));
    ordered = [...listed, ...rest];
  }

  const cols: ColumnDef[] = ordered.map(f => ({
    id: f.id,
    label: headerLabel(f),
    isFile: false,
    isDate: f.type === 'date',
  }));

  if (fields.some(f => f.type === 'file')) {
    cols.push({ id: '__files', label: 'DOKUMEN / LAMPIRAN', isFile: true, isDate: false });
  }
  return cols;
}

function formatDateValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  const str = String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (m) return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;
  return str;
}

function getRecordFiles(item: SidataRecord): { fieldId: string; label: string; url: string; name: string }[] {
  const fileFields = (formFields[item.type] || []).filter(f => f.type === 'file');
  const result: { fieldId: string; label: string; url: string; name: string }[] = [];
  for (const f of fileFields) {
    const raw = item[f.id];
    if (!raw) continue;
    const arr: unknown[] = Array.isArray(raw) ? raw : [raw];
    for (const v of arr) {
      if (typeof v !== 'string' || !v) continue;
      if (v.startsWith('data:')) continue; // inline photo data — not a storage file
      const url = buildFileDirectUrl(v);
      if (url) result.push({ fieldId: f.id, label: f.label, url, name: getCleanStorageFileName(url) });
    }
  }
  return result;
}

// Main document of a record: dokumen_surat when present, otherwise first uploaded file
function getMainFile(item: SidataRecord) {
  const files = getRecordFiles(item);
  if (files.length === 0) return null;
  return files.find(f => f.fieldId === 'dokumen_surat') || files[0];
}

// Download a storage file for real (blob fetch, fallback: open in new tab)
async function downloadStorageFile(url: string, fileName: string) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'dokumen';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | '…')[] = [1];
  const start = Math.max(2, current);
  const end = Math.min(total - 1, current + 2);
  if (start > 2) items.push('…');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push('…');
  items.push(total);
  return items;
}

export default function AdminTable({ records, activeType, loading, onExportAllByType, onExportAllExcelByType, onDelete, onEdit, searchQuery }: AdminTableProps) {
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

  // Keep table search in sync with the global topbar search pill
  useEffect(() => {
    setSearch(searchQuery ?? '');
    setPage(0);
  }, [searchQuery, activeType]);

  // Full-detail column set for the active report page
  const columns = useMemo(() => buildColumns(activeType), [activeType]);

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
  const tableMinWidth = Math.max(900, (columns.length + 2) * 105);
  const pageList = buildPageList(safePage + 1, totalPages);

  const clearSearch = () => { setSearch(''); setPage(0); };

  const thClass = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap";

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
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-sm font-semibold text-foreground">Memuat data {typeLabels[activeType].toLowerCase()}...</p>
          <p className="text-xs text-muted-foreground mt-1">Mohon tunggu sebentar</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: `${tableMinWidth}px` }}>
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className={`${thClass} text-center w-[52px]`}>No</th>
                  {columns.map(col => (
                    <th key={col.id} className={thClass}>{col.label}</th>
                  ))}
                  <th className={`${thClass} text-center w-[130px]`}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-4 py-16 text-center">
                      <Inbox className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-muted-foreground">Belum ada data</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {search || Object.values(filterValues).some(Boolean)
                          ? 'Coba ubah kata pencarian atau filter'
                          : `Belum ada data ${typeLabels[activeType].toLowerCase()} yang diinput untuk kategori ini`}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paged.map((item, idx) => {
                    const mainFile = getMainFile(item);
                    const cellFiles = getRecordFiles(item);
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-border/50 transition-colors align-top ${
                          item.conflict_flag
                            ? 'bg-warning/10 hover:bg-warning/15'
                            : 'even:bg-secondary/50 hover:bg-primary/5'
                        }`}
                        title={item.conflict_flag ? `Bentrok jadwal: ${item.conflict_info || ''}` : undefined}
                      >
                        <td className="px-4 py-3.5 text-sm text-center text-muted-foreground tabular-nums">
                          {safePage * PAGE_SIZE + idx + 1}
                        </td>
                        {columns.map(col => {
                          if (col.isFile) {
                            return (
                              <td key={col.id} className="px-4 py-3.5 align-top">
                                {cellFiles.length === 0 ? (
                                  <span className="text-sm text-muted-foreground/60">-</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    {cellFiles.map((f, i) => (
                                      <div key={`${f.url}-${i}`} className="flex items-center gap-1.5 min-w-0">
                                        <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <button
                                          type="button"
                                          onClick={() => downloadStorageFile(f.url, f.name)}
                                          className="text-xs text-primary hover:underline truncate max-w-[190px]"
                                          title={`Unduh ${f.name}`}
                                        >
                                          {f.name}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => downloadStorageFile(f.url, f.name)}
                                          className="text-primary hover:text-primary/70 shrink-0 p-0.5 rounded hover:bg-primary/10 transition-colors"
                                          title="Unduh file"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          }
                          const raw = item[col.id];
                          const hasValue = raw !== null && raw !== undefined && raw !== '' &&
                            !(Array.isArray(raw) && raw.filter(Boolean).length === 0);
                          return (
                            <td key={col.id} className="px-4 py-3.5 text-sm text-foreground align-top">
                              <div className="line-clamp-3 whitespace-normal break-words">
                                {hasValue ? (col.isDate ? formatDateValue(raw) : String(raw)) : (
                                  <span className="text-muted-foreground/60">-</span>
                                )}
                              </div>
                              {item.conflict_flag && col.id === 'tanggal_perjalanan' && (
                                <div className="mt-1 text-[11px] font-semibold text-warning flex items-start gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                  <span>Bentrok jadwal{item.conflict_info ? `: ${item.conflict_info}` : ''}</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3.5 text-center align-top">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => mainFile && downloadStorageFile(mainFile.url, mainFile.name)}
                              disabled={!mainFile}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                                mainFile
                                  ? 'bg-success/10 text-success hover:bg-success/20'
                                  : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                              }`}
                              title={mainFile ? 'Unduh dokumen' : 'Tidak ada dokumen'}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {onEdit && (
                              <button onClick={() => onEdit(item)} className="w-8 h-8 rounded-full bg-warning/10 text-warning hover:bg-warning/20 flex items-center justify-center transition-all active:scale-95" title="Edit Data">
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => onDelete(item)} className="w-8 h-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-all active:scale-95" title="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - attached to table */}
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} - {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} dari {filtered.length} data
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-foreground border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                title="Halaman sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageList.map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p - 1)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                      p - 1 === safePage
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'text-foreground border-border hover:bg-muted'
                    }`}
                    aria-current={p - 1 === safePage ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-foreground border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                title="Halaman berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
