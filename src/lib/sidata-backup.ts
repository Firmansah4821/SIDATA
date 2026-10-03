import { supabase } from '@/integrations/supabase/client';

export interface BackupTableSpec {
  name: string;
  label: string;
  /** Kolom terverifikasi dari skema existing; null = kolom dinamis dari baris. */
  columns: string[] | null;
}

/** Tabel yang benar-benar ada di skema SIDATA — urutan aman untuk restore (induk → anak). */
export const BACKUP_TABLES: BackupTableSpec[] = [
  { name: 'profiles', label: 'Profil pengguna', columns: ['id', 'user_id', 'username', 'full_name', 'email', 'jabatan', 'avatar_url', 'created_at', 'updated_at'] },
  { name: 'user_roles', label: 'Peran pengguna', columns: ['id', 'user_id', 'role'] },
  { name: 'pegawai_options', label: 'Opsi pegawai', columns: ['id', 'name', 'created_at', 'updated_at'] },
  { name: 'sidata_records', label: 'Data SIDATA', columns: ['id', 'type', 'data', 'submitted_at', 'created_at'] },
  { name: 'audit_logs', label: 'Log audit', columns: ['id', 'user_id', 'user_name', 'action', 'target_type', 'target_id', 'details', 'created_at'] },
  { name: 'log_aktivitas', label: 'Log aktivitas', columns: null },
];

export const BACKUP_FORMAT = 'sidata-backup';
export const BACKUP_VERSION = 1;
export const LAST_BACKUP_KEY = 'sidata-backup-last';

const PAGE_SIZE = 1000;
const IDENT = /^[a-z_][a-z0-9_]*$/;

export async function countTable(table: string): Promise<number | null> {
  const { count, error } = await supabase
    .from(table as any)
    .select('*', { count: 'exact', head: true });
  if (error) return null;
  return count ?? 0;
}

/** Ambil SEMUA baris secara bertahap (.range) agar tidak terpotong batas PostgREST. */
export async function fetchAllRows(
  table: string,
  onProgress?: (fetched: number, total: number) => void
): Promise<{ rows: Record<string, any>[]; total: number; error?: string }> {
  const { count, error: countErr } = await supabase
    .from(table as any)
    .select('*', { count: 'exact', head: true });
  if (countErr) return { rows: [], total: 0, error: countErr.message };
  const total = count ?? 0;
  if (total === 0) return { rows: [], total: 0 };

  // Probe kolom untuk menentukan kolom pengurut yang valid.
  const probe: any = await supabase.from(table as any).select('*').limit(1);
  const cols: string[] = probe.data && probe.data[0] ? Object.keys(probe.data[0]) : [];
  const orderCol = cols.includes('id') ? 'id' : cols.includes('created_at') ? 'created_at' : cols[0] || null;

  const rows: Record<string, any>[] = [];
  let from = 0;
  while (from < total) {
    const to = Math.min(from + PAGE_SIZE - 1, total - 1);
    let q: any = supabase.from(table as any).select('*');
    if (orderCol) q = q.order(orderCol, { ascending: true });
    const { data, error } = await q.range(from, to);
    if (error) return { rows, total, error: error.message };
    const batch = (data || []) as Record<string, any>[];
    if (batch.length === 0) break;
    rows.push(...batch);
    from += batch.length;
    onProgress?.(rows.length, total);
  }
  return { rows, total };
}

/** CSV dengan header gabungan; objek (jsonb) di-JSON.stringify. */
export function rowsToCsv(rows: Record<string, any>[], preferredCols?: string[] | null): string {
  if (!rows.length) return '';
  const present = new Set<string>();
  rows.forEach(r => Object.keys(r).forEach(k => present.add(k)));
  const keys: string[] = [];
  if (preferredCols) {
    preferredCols.forEach(k => {
      if (present.has(k)) {
        keys.push(k);
        present.delete(k);
      }
    });
  }
  rows.forEach(r =>
    Object.keys(r).forEach(k => {
      if (present.has(k)) {
        keys.push(k);
        present.delete(k);
      }
    })
  );
  const esc = (v: any): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [keys.map(k => `"${k}"`).join(',')];
  rows.forEach(r => lines.push(keys.map(k => esc(r[k])).join(',')));
  return lines.join('\r\n');
}

const sqlValue = (v: any): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return `'${s.replace(/'/g, "''")}'`;
};

/**
 * Susun file SQL pemulihan dari payload backup.
 * - Tabel/kolom terverifikasi (skema existing); kolom tak dikenal diabaikan.
 * - Urutan relasi aman (induk sebelum anak), dibungkus transaksi.
 * - Upsert ON CONFLICT — TANPA TRUNCATE/DELETE.
 * - Aplikasi hanya menghasilkan teks; Admin menjalankan manual di SQL Editor.
 */
export function buildRestoreSql(tables: Record<string, Record<string, any>[]>): string {
  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  const lines: string[] = [];
  lines.push('-- ================================================================');
  lines.push('-- SIDATA — File SQL Pemulihan (Restore)');
  lines.push(`-- Dibuat      : ${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())} ${p2(now.getHours())}:${p2(now.getMinutes())}`);
  lines.push('-- Dihasilkan  : Aplikasi SIDATA (hanya membuat file, TIDAK menjalankan SQL)');
  lines.push('--');
  lines.push('-- CARA PAKAI:');
  lines.push('--   1. Periksa isi file ini terlebih dahulu.');
  lines.push('--   2. Buka Supabase Dashboard → SQL Editor.');
  lines.push('--   3. Jalankan manual hanya jika Anda yakin isinya benar.');
  lines.push('--');
  lines.push('-- PERINGATAN: SQL ini DAPAT mengubah data yang sudah ada.');
  lines.push('--   - Tiap baris di-upsert (ON CONFLICT id DO UPDATE): id yang sama akan ditimpa.');
  lines.push('--   - Tidak ada TRUNCATE/DELETE; transaksi dibungkus BEGIN/COMMIT,');
  lines.push('--     bila ada kesalahan seluruh perubahan dibatalkan (ROLLBACK).');
  lines.push('--   - Baris yang merujuk akun auth tidak terdaftar bisa gagal (FK).');
  lines.push('-- ================================================================');
  lines.push('');

  const summary: string[] = [];
  for (const spec of BACKUP_TABLES) {
    const rows = tables[spec.name];
    if (Array.isArray(rows) && rows.length) summary.push(`${spec.name} (${rows.length})`);
  }
  lines.push(`-- Tabel dipulihkan: ${summary.join(', ') || '(tidak ada)'}`);
  lines.push('');
  lines.push('begin;');
  lines.push('');

  for (const spec of BACKUP_TABLES) {
    const rows = tables[spec.name];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const present = new Set<string>();
    rows.forEach(r => Object.keys(r || {}).forEach(k => present.add(k)));
    const cols = spec.columns
      ? spec.columns.filter(c => present.has(c))
      : Array.from(present).filter(k => IDENT.test(k));
    const skipped = Array.from(present).filter(k => !cols.includes(k));
    if (!cols.length) {
      lines.push(`-- ${spec.name}: dilewati (tidak ada kolom yang dikenal)`);
      lines.push('');
      continue;
    }
    const conflict = cols.includes('id');
    const colList = cols.map(c => `"${c}"`).join(', ');
    const conflictClause = conflict
      ? ` on conflict ("id") do update set ${cols.map(c => `"${c}" = excluded."${c}"`).join(', ')}`
      : '';

    lines.push(`-- ── ${spec.label} (public.${spec.name}) — ${rows.length} baris ──`);
    if (skipped.length) lines.push(`-- Kolom diabaikan (tidak dikenal): ${skipped.join(', ')}`);
    if (!conflict) lines.push('-- Catatan: tanpa kolom id, baris ditambahkan sebagai INSERT biasa.');

    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      lines.push(`insert into public."${spec.name}" (${colList}) values`);
      lines.push(
        chunk
          .map(r => `  (${cols.map(c => sqlValue(r[c])).join(', ')})`)
          .join(',\n') +
          conflictClause + ';'
      );
      lines.push('');
    }
    lines.push('');
  }

  lines.push('commit;');
  lines.push('');
  lines.push('-- Akhir file pemulihan SIDATA.');
  return lines.join('\n');
}

export interface ImportSummary {
  ok: boolean;
  error?: string;
  tables: { name: string; label: string; rows: number }[];
  ignored: string[];
  totalRows: number;
  payload?: Record<string, Record<string, any>[]>;
}

/** Validasi file JSON backup + ringkasan jumlah data SEBELUM SQL dibuat. */
export function parseBackupJson(text: string): ImportSummary {
  const fail = (error: string): ImportSummary => ({ ok: false, error, tables: [], ignored: [], totalRows: 0 });
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail('File bukan JSON yang valid.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fail('Format file tidak dikenali.');
  }
  const source =
    parsed.tables && typeof parsed.tables === 'object' && !Array.isArray(parsed.tables)
      ? parsed.tables
      : parsed;
  const payload: Record<string, Record<string, any>[]> = {};
  const summary: ImportSummary['tables'] = [];
  let totalRows = 0;
  for (const spec of BACKUP_TABLES) {
    const arr = source[spec.name];
    if (arr === undefined) continue;
    if (!Array.isArray(arr)) return fail(`Tabel "${spec.name}" bukan array.`);
    const rows = arr.filter(r => r && typeof r === 'object' && !Array.isArray(r));
    payload[spec.name] = rows;
    summary.push({ name: spec.name, label: spec.label, rows: rows.length });
    totalRows += rows.length;
  }
  if (!summary.length) return fail('Tidak ditemukan tabel SIDATA yang dikenal di dalam file ini.');
  if (totalRows === 0) return fail('File tidak berisi baris data sama sekali.');
  const ignored = Object.keys(source).filter(k => !BACKUP_TABLES.some(t => t.name === k));
  return { ok: true, tables: summary, ignored, totalRows, payload };
}

/** Stempel waktu untuk nama file: YYYYMMDD-HHmm */
export function fileStamp(d = new Date()): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
