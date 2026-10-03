import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  History,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { LOG_SETUP_SQL } from '@/lib/log-aktivitas-setup';
import { downloadTextFile } from '@/lib/sidata-backup';

const setupPrimaryBtn =
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity';
const setupSecondaryBtn =
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors';

/** Tabel tidak ditemukan (PostgreSQL 42P01 / PostgREST PGRST205). */
const isTableMissing = (e: any) =>
  e?.code === '42P01' || e?.code === 'PGRST205';

const PAGE_SIZE = 15;
const TABLE = 'log_aktivitas';

/** Kolom terdeteksi dari tabel log_aktivitas (dibaca dinamis, skema dari SQL Admin). */
interface Schema {
  id: string | null;
  time: string;
  user: string | null;
  name: string | null;
  role: string | null;
  action: string | null;
  table: string | null;
  detail: string | null;
}

interface Filters {
  search: string;
  aksi: string;
  tabel: string;
  pengguna: string;
  tanggal: string;
}

const EMPTY_FILTERS: Filters = { search: '', aksi: '', tabel: '', pengguna: '', tanggal: '' };

const pick = (cols: string[], cands: string[]): string | null =>
  cands.find(c => cols.includes(c)) ?? null;

function actionLabel(raw: unknown): string {
  const s = String(raw ?? '').trim();
  const l = s.toLowerCase();
  if (/(tambah|create|insert)/.test(l)) return 'Tambah';
  if (/(ubah|update|edit|perbarui)/.test(l)) return 'Ubah';
  if (/(hapus|delete|remove)/.test(l)) return 'Hapus';
  if (l === 'login') return 'Login';
  if (l === 'logout') return 'Logout';
  return s || '—';
}

/** Badge aksi: Tambah hijau, Ubah amber, Hapus merah, selain itu netral. */
function actionBadge(raw: unknown): string {
  const l = String(raw ?? '').toLowerCase();
  if (/(tambah|create|insert)/.test(l)) return 'bg-success/15 text-success';
  if (/(ubah|update|edit|perbarui)/.test(l)) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  if (/(hapus|delete|remove)/.test(l)) return 'bg-destructive/15 text-destructive';
  return 'bg-primary/15 text-primary';
}

function formatWaktu(value: unknown): string {
  if (!value) return '—';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LogAktivitas() {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [aksiOptions, setAksiOptions] = useState<string[]>([]);
  const [tabelOptions, setTabelOptions] = useState<string[]>([]);
  const [penggunaOptions, setPenggunaOptions] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [copied, setCopied] = useState(false);

  /** Probe skema + muat opsi filter + peta nama profil (sekali di awal / refresh). */
  const init = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const probe: any = await (supabase.from(TABLE as any) as any)
        .select('*', { count: 'exact' })
        .limit(1);
      if (probe.error) {
        if (isTableMissing(probe.error)) {
          // Tabel public.log_aktivitas belum ada → layar setup SQL
          setSetupNeeded(true);
          setSchema(null);
          setRows([]);
          setTotal(0);
          return;
        }
        const err: any = new Error(probe.error.message);
        err.code = probe.error.code;
        throw err;
      }
      setSetupNeeded(false);

      const totalCount = probe.count || 0;
      setTotal(totalCount);
      if (!totalCount || !probe.data || !probe.data.length) {
        setSchema(null);
        setRows([]);
        setAksiOptions([]);
        setTabelOptions([]);
        setPenggunaOptions([]);
        return;
      }

      const cols: string[] = Object.keys(probe.data[0]);
      const s: Schema = {
        id: pick(cols, ['id']),
        time: pick(cols, ['created_at', 'waktu', 'timestamp', 'tanggal']) || cols[0],
        user: pick(cols, ['user_id', 'pengguna_id']),
        name: pick(cols, ['nama_user', 'user_name', 'nama_pengguna', 'full_name']),
        role: pick(cols, ['role', 'peran', 'jabatan']),
        action: pick(cols, ['aksi', 'action', 'aktivitas']),
        table: pick(cols, ['tabel', 'table', 'target_table', 'modul']),
        detail: pick(cols, ['detail', 'details', 'keterangan', 'deskripsi']),
      };
      setSchema(s);

      const optCols = [s.name, s.action, s.table, s.user].filter(Boolean) as string[];
      const [optRes, profRes] = await Promise.all([
        (supabase.from(TABLE as any) as any)
          .select(optCols.join(','))
          .order(s.time, { ascending: false })
          .limit(1000),
        supabase.from('profiles').select('user_id, full_name' as any),
      ]);

      const optRows: any[] = (optRes && (optRes as any).data) || [];
      const uniq = (col: string | null): string[] =>
        col
          ? Array.from(
              new Set(
                optRows
                  .map(r => r[col])
                  .filter(v => v !== null && v !== undefined && v !== '')
                  .map(String)
              )
            ).sort()
          : [];

      const pmap: Record<string, string> = {};
      (((profRes.data as any[]) || [])).forEach(p => {
        if (p && p.user_id) pmap[p.user_id] = p.full_name || p.user_id;
      });
      setProfiles(pmap);

      setAksiOptions(uniq(s.action));
      setTabelOptions(uniq(s.table));
      if (s.name) {
        setPenggunaOptions(uniq(s.name).map(v => ({ value: v, label: v })));
      } else if (s.user) {
        setPenggunaOptions(
          Array.from(new Set(optRows.map(r => r[s.user]).filter(Boolean).map(String))).map(v => ({
            value: v,
            label: pmap[v] || v,
          }))
        );
      } else {
        setPenggunaOptions([]);
      }
    } catch (e: any) {
      if (isTableMissing(e)) {
        setSetupNeeded(true);
        setError('');
        setSchema(null);
        setRows([]);
        setTotal(0);
      } else {
        setError(e?.message || 'Gagal memuat log aktivitas.');
        setSchema(null);
        setRows([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /** Halaman data: count + .range + filter, terbaru dulu. */
  const fetchPage = useCallback(async () => {
    if (!schema) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const run = async (withSearch: boolean) => {
        let q = (supabase.from(TABLE as any) as any)
          .select('*', { count: 'exact' })
          .order(schema.time, { ascending: false });

        if (filters.aksi && schema.action) q = q.eq(schema.action, filters.aksi);
        if (filters.tabel && schema.table) q = q.eq(schema.table, filters.tabel);
        if (filters.pengguna) {
          if (schema.name) q = q.eq(schema.name, filters.pengguna);
          else if (schema.user) q = q.eq(schema.user, filters.pengguna);
        }
        if (filters.tanggal) {
          const start = new Date(`${filters.tanggal}T00:00:00`);
          const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
          q = q.gte(schema.time, start.toISOString()).lt(schema.time, end.toISOString());
        }
        if (withSearch && filters.search.trim()) {
          const term = filters.search
            .trim()
            .replace(/[%_(),."']/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          const searchCols = [schema.name, schema.action, schema.table].filter(Boolean) as string[];
          if (term && searchCols.length) {
            q = q.or(searchCols.map(c => `${c}.ilike.%${term}%`).join(','));
          }
        }
        const from = page * PAGE_SIZE;
        return q.range(from, from + PAGE_SIZE - 1);
      };

      let res: any = await run(true);
      if (res.error && filters.search.trim()) {
        const retry: any = await run(false);
        if (!retry.error) {
          res = retry;
          setNotice('Pencarian teks tidak didukung kolom ini — data ditampilkan tanpa filter pencarian.');
        }
      }
      if (res.error) {
        const err: any = new Error(res.error.message);
        err.code = res.error.code;
        throw err;
      }
      setRows(res.data || []);
      setTotal(res.count || 0);
    } catch (e: any) {
      if (isTableMissing(e)) {
        setSetupNeeded(true);
        setError('');
        setRows([]);
      } else {
        setError(e?.message || 'Gagal memuat log aktivitas.');
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, [schema, filters, page]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // Jaga halaman tetap dalam rentang total setelah filter berubah.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [total, page]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(0);
  };

  /** Coba lagi setelah SQL setup dijalankan manual oleh Admin di Supabase. */
  const retrySetup = () => {
    setSetupNeeded(false);
    init();
  };

  const copySql = async () => {
    const showCopied = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    };
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(LOG_SETUP_SQL);
      showCopied();
    } catch {
      // Fallback bila Clipboard API tidak tersedia (mis. konteks non-https)
      const ta = document.createElement('textarea');
      ta.value = LOG_SETUP_SQL;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showCopied();
      } catch {
        /* biarkan; pengguna tetap bisa Unduh .sql */
      }
      ta.remove();
    }
  };

  const downloadSql = () => {
    downloadTextFile('sidata-setup-log-aktivitas.sql', LOG_SETUP_SQL, 'application/sql;charset=utf-8');
  };

  const hasFilter =
    filters.search !== '' || filters.aksi !== '' || filters.tabel !== '' ||
    filters.pengguna !== '' || filters.tanggal !== '';

  // ── Layar "Log Aktivitas Belum Aktif" (tabel tidak ditemukan) ──
  if (setupNeeded) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <History className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[26px] leading-tight font-extrabold text-foreground">Log Aktivitas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Riwayat aktivitas pengguna sistem</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/80 shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 max-w-2xl">
          <div className="flex items-start gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'hsl(var(--warning) / 0.15)' }}
            >
              <AlertTriangle className="w-6 h-6" style={{ color: 'hsl(var(--warning))' }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-foreground">Log Aktivitas Belum Aktif</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Tabel <span className="font-mono text-xs font-semibold text-foreground">public.log_aktivitas</span>{' '}
                belum ditemukan di database proyek ini. Jalankan SQL setup berikut sekali lewat
                Supabase, lalu coba lagi.
              </p>
            </div>
          </div>

          <ol className="mt-4 space-y-2 text-sm text-muted-foreground list-decimal pl-5 leading-relaxed">
            <li>
              Buka <span className="font-semibold text-foreground">Supabase Dashboard → SQL Editor</span> proyek SIDATA.
            </li>
            <li>
              Tempel hasil tombol <span className="font-semibold text-foreground">Salin SQL Setup</span> (atau buka
              file hasil <span className="font-semibold text-foreground">Unduh .sql</span>), lalu jalankan.
            </li>
            <li>
              Kembali ke halaman ini dan klik <span className="font-semibold text-foreground">Coba Lagi</span>.
            </li>
          </ol>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button onClick={copySql} className={setupPrimaryBtn}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin!' : 'Salin SQL Setup'}
            </button>
            <button onClick={downloadSql} className={setupSecondaryBtn}>
              <Download className="w-4 h-4" />
              Unduh .sql
            </button>
            <button onClick={retrySetup} className={setupSecondaryBtn}>
              <RefreshCw className="w-4 h-4" />
              Coba Lagi
            </button>
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Aplikasi hanya menyalin atau mengunduh file SQL ini — <span className="font-semibold text-foreground">tidak
              pernah menjalankannya</span> ke database. Periksa isinya sebelum dijalankan di Supabase.
            </span>
          </p>
        </div>
      </div>
    );
  }

  const displayName = (row: Record<string, any>): string => {
    if (schema?.name && row[schema.name]) return String(row[schema.name]);
    if (schema?.user && row[schema.user]) {
      const uid = String(row[schema.user]);
      return profiles[uid] || uid;
    }
    return '—';
  };

  const detailText = (row: Record<string, any>): string => {
    if (!schema?.detail) return '—';
    const v = row[schema.detail];
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return String(v);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fromNo = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const toNo = Math.min((page + 1) * PAGE_SIZE, total);

  const selectCls =
    'w-full px-3 py-2.5 border border-input rounded-xl text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/10 transition-all';
  const inputCls = selectCls;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <History className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[26px] leading-tight font-extrabold text-foreground">Log Aktivitas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Riwayat aktivitas pengguna sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium tabular-nums">
            {total} aktivitas
          </span>
          <button
            onClick={init}
            disabled={loading}
            className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
            title="Muat ulang"
            aria-label="Muat ulang log aktivitas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              placeholder="Cari aktivitas…"
              aria-label="Cari aktivitas"
              className={`${inputCls} pl-9`}
            />
          </div>
          <select
            value={filters.aksi}
            onChange={e => updateFilter('aksi', e.target.value)}
            aria-label="Filter aksi"
            className={selectCls}
          >
            <option value="">Semua Aksi</option>
            {aksiOptions.map(v => (
              <option key={v} value={v}>{actionLabel(v)}</option>
            ))}
          </select>
          <select
            value={filters.tabel}
            onChange={e => updateFilter('tabel', e.target.value)}
            aria-label="Filter tabel"
            className={selectCls}
          >
            <option value="">Semua Tabel</option>
            {tabelOptions.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={filters.pengguna}
            onChange={e => updateFilter('pengguna', e.target.value)}
            aria-label="Filter pengguna"
            className={selectCls}
          >
            <option value="">Semua Pengguna</option>
            {penggunaOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.tanggal}
            onChange={e => updateFilter('tanggal', e.target.value)}
            aria-label="Filter tanggal"
            className={selectCls}
          />
          <div className="flex md:col-span-2 xl:col-span-1">
            <button
              onClick={resetFilters}
              disabled={!hasFilter}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground bg-card hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && !error && (
        <div className="mb-5 p-3.5 rounded-xl text-sm font-medium bg-info/10 text-info border border-info/20" role="status">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card rounded-2xl border border-border">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat log aktivitas…</p>
        </div>
      ) : total === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <History className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Belum ada aktivitas tercatat</h3>
          <p className="text-sm text-muted-foreground mt-1">Aktivitas pengguna akan muncul di sini setelah ada perubahan data.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Tidak ada aktivitas yang cocok</h3>
          <p className="text-sm text-muted-foreground mt-1">Coba ubah kata kunci atau filter Anda.</p>
          {hasFilter && (
            <button
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" /> Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-14">No</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Waktu</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Pengguna</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Aksi</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tabel</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rawAction = schema?.action ? row[schema.action] : null;
                  const rawRole = schema?.role ? row[schema.role] : null;
                  const rawTable = schema?.table ? row[schema.table] : null;
                  const rawTime = schema?.time ? row[schema.time] : null;
                  const detail = detailText(row);
                  return (
                    <tr
                      key={(schema?.id && row[schema.id]) || `${page}-${i}`}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                        {page * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatWaktu(rawTime)}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium max-w-[180px] truncate" title={displayName(row)}>
                        {displayName(row)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {rawRole ? String(rawRole) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${actionBadge(rawAction)}`}>
                          {actionLabel(rawAction)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {rawTable ? String(rawTable) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[260px] truncate" title={detail}>
                        {detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground tabular-nums">
              Menampilkan {fromNo}–{toNo} dari {total} aktivitas
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                Halaman {page + 1} dari {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || loading}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
