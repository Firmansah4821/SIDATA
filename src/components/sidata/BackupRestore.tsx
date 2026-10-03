import { useEffect, useState } from 'react';
import {
  BACKUP_TABLES,
  LAST_BACKUP_KEY,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  countTable,
  fetchAllRows,
  rowsToCsv,
  fileStamp,
  downloadTextFile,
  parseBackupJson,
  buildRestoreSql,
  type ImportSummary,
} from '@/lib/sidata-backup';
import { showSidataToast } from '@/components/sidata/Toast';
import {
  Archive,
  Clock,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  AlertTriangle,
} from 'lucide-react';

const primaryBtn =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed';
const ghostBtn =
  'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export default function BackupRestore() {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null);
  const [progress, setProgress] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const [importName, setImportName] = useState('');
  const [importText, setImportText] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [sqlBusy, setSqlBusy] = useState(false);

  // Jumlah baris per tabel (dinamis) + waktu "Backup terakhir".
  useEffect(() => {
    let alive = true;
    const loadCounts = async () => {
      setCountsLoading(true);
      const entries = await Promise.all(
        BACKUP_TABLES.map(async t => [t.name, await countTable(t.name)] as const)
      );
      if (!alive) return;
      setCounts(Object.fromEntries(entries));
      setCountsLoading(false);
    };
    loadCounts();
    try {
      const raw = localStorage.getItem(LAST_BACKUP_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.at) setLastBackup(p.at);
      }
    } catch {
      /* abaikan localStorage rusak */
    }
    return () => {
      alive = false;
    };
  }, []);

  const refreshCounts = async () => {
    setCountsLoading(true);
    const entries = await Promise.all(
      BACKUP_TABLES.map(async t => [t.name, await countTable(t.name)] as const)
    );
    setCounts(Object.fromEntries(entries));
    setCountsLoading(false);
  };

  const totalRows = BACKUP_TABLES.reduce(
    (sum, t) => sum + (typeof counts[t.name] === 'number' ? (counts[t.name] as number) : 0),
    0
  );

  /** Unduh JSON gabungan — semua tabel diambil bertahap agar tidak terpotong. */
  const handleDownloadJson = async () => {
    setBusy('json');
    try {
      const tables: Record<string, Record<string, any>[]> = {};
      const countsNow: Record<string, number> = {};
      let total = 0;
      for (const spec of BACKUP_TABLES) {
        setProgress(`Mengambil ${spec.label}…`);
        const res = await fetchAllRows(spec.name, (f, t) =>
          setProgress(`Mengambil ${spec.label}… ${f}/${t} baris`)
        );
        if (res.error) throw new Error(`${spec.label}: ${res.error}`);
        tables[spec.name] = res.rows;
        countsNow[spec.name] = res.rows.length;
        total += res.rows.length;
      }
      const payload = {
        app: 'SIDATA',
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        generated_at: new Date().toISOString(),
        counts: countsNow,
        tables,
      };
      downloadTextFile(
        `sidata-backup-${fileStamp()}.json`,
        JSON.stringify(payload, null, 2),
        'application/json'
      );
      const at = new Date().toISOString();
      setLastBackup(at);
      try {
        localStorage.setItem(
          LAST_BACKUP_KEY,
          JSON.stringify({ at, total, counts: countsNow })
        );
      } catch {
        /* abaikan */
      }
      showSidataToast(`Backup JSON berhasil diunduh (${total} baris)`, 'success');
    } catch (e: any) {
      showSidataToast(e?.message || 'Gagal membuat backup JSON', 'error');
    } finally {
      setBusy(null);
      setProgress('');
    }
  };

  /** Unduh CSV satu tabel (juga diambil bertahap). */
  const handleDownloadCsv = async (name: string, label: string) => {
    setBusy('csv');
    setProgress(`Mengambil ${label}…`);
    try {
      const res = await fetchAllRows(name, (f, t) =>
        setProgress(`Mengambil ${label}… ${f}/${t} baris`)
      );
      if (res.error) throw new Error(res.error);
      const spec = BACKUP_TABLES.find(t => t.name === name);
      const csv = rowsToCsv(res.rows, spec?.columns ?? null);
      downloadTextFile(
        `sidata-${name}-${fileStamp()}.csv`,
        csv || '"tidak ada data"\r\n',
        'text/csv;charset=utf-8'
      );
      showSidataToast(`CSV ${label} berhasil diunduh (${res.rows.length} baris)`, 'success');
    } catch (e: any) {
      showSidataToast(e?.message || 'Gagal membuat CSV', 'error');
    } finally {
      setBusy(null);
      setProgress('');
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportName(file.name);
    setImportText('');
    setSummary(null);
    try {
      const text = await file.text();
      const result = parseBackupJson(text);
      if (result.ok) setImportText(text);
      setSummary(result);
    } catch {
      setSummary({
        ok: false,
        error: 'Gagal membaca file.',
        tables: [],
        ignored: [],
        totalRows: 0,
      });
    }
  };

  const handleCreateSql = () => {
    if (!summary?.ok || !summary.payload) return;
    setSqlBusy(true);
    try {
      const sql = buildRestoreSql(summary.payload);
      downloadTextFile(`sidata-restore-${fileStamp()}.sql`, sql, 'application/sql;charset=utf-8');
      showSidataToast('File SQL pemulihan diunduh — periksa lalu jalankan manual di SQL Editor', 'success');
    } catch (e: any) {
      showSidataToast(e?.message || 'Gagal membuat file SQL', 'error');
    } finally {
      setSqlBusy(false);
    }
  };

  const resetImport = () => {
    setImportName('');
    setImportText('');
    setSummary(null);
  };

  const busyNow = busy !== null || sqlBusy;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <Archive className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[26px] leading-tight font-extrabold text-foreground">Backup &amp; Restore</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Pencadangan dan pemulihan data SIDATA</p>
        </div>
        <button
          onClick={refreshCounts}
          disabled={countsLoading || busyNow}
          className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
          title="Segarkan jumlah data"
          aria-label="Segarkan jumlah data"
        >
          <RefreshCw className={`w-4 h-4 ${countsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Backup ── */}
      <section className="bg-card rounded-2xl border border-border/80 shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-primary" />
              <h3 className="text-base font-extrabold text-foreground">Backup Data</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ekspor seluruh tabel SIDATA ke file JSON gabungan, atau CSV per tabel.
              Pengambilan data dilakukan <span className="font-semibold text-foreground">bertahap</span>{' '}
              sehingga tidak terpotong batas server.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Backup terakhir:{' '}
                <span className="font-semibold text-foreground">
                  {lastBackup
                    ? new Date(lastBackup).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Belum pernah'}
                </span>
              </span>
              <span className="tabular-nums">
                Total baris terdeteksi:{' '}
                <span className="font-semibold text-foreground">
                  {countsLoading ? '…' : totalRows.toLocaleString('id-ID')}
                </span>
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <button
              onClick={handleDownloadJson}
              disabled={busyNow || countsLoading}
              className={primaryBtn}
            >
              {busy === 'json' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4" />
              )}
              Unduh JSON (semua tabel)
            </button>
          </div>
        </div>

        {progress && (
          <div className="mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span className="tabular-nums">{progress}</span>
          </div>
        )}

        {/* Daftar tabel + jumlah dinamis + CSV per tabel */}
        <div className="mt-4 rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tabel</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-28">Jumlah Baris</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-28">CSV</th>
                </tr>
              </thead>
              <tbody>
                {BACKUP_TABLES.map(t => (
                  <tr key={t.name} className="border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-foreground">{t.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{t.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {countsLoading ? (
                        <span className="text-muted-foreground">…</span>
                      ) : counts[t.name] === null ? (
                        <span className="text-xs font-semibold text-destructive" title="Tabel tidak dapat dibaca (belum ada atau dibatasi RLS)">Tidak tersedia</span>
                      ) : (
                        <span className="font-semibold text-foreground">{(counts[t.name] as number).toLocaleString('id-ID')}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDownloadCsv(t.name, t.label)}
                        disabled={busyNow || counts[t.name] === null}
                        className={ghostBtn}
                        title={`Unduh CSV ${t.label}`}
                      >
                        {busy === 'csv' && progress.includes(t.label) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5 text-success" />
                        )}
                        CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground leading-relaxed list-disc pl-5">
          <li>
            Ekspor ini <span className="font-semibold text-foreground">tidak mencakup seluruh database</span> — hanya tabel SIDATA di atas.
          </li>
          <li>
            <span className="font-semibold text-foreground">Akun</span> (auth Supabase &amp; admin_accounts) dan file{' '}
            <span className="font-semibold text-foreground">Storage</span> tidak disertakan.
          </li>
          <li>File backup bersifat sensitif — simpan di lokasi yang aman dan jangan bagikan sembarangan.</li>
        </ul>
      </section>

      {/* ── Import / Pemulihan ── */}
      <section className="bg-card rounded-2xl border border-border/80 shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Upload className="w-4 h-4 text-primary" />
          <h3 className="text-base font-extrabold text-foreground">Import / Pemulihan</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Unggah file backup JSON (<span className="font-mono text-xs">sidata-backup-*.json</span>) untuk
          melihat ringkasan jumlah data, lalu buat file SQL pemulihan.
        </p>

        {/* Peringatan jelas */}
        <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[13px] leading-relaxed text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">Perhatian:</span> aplikasi <b>hanya menghasilkan file SQL</b> — tidak
            ada SQL yang dijalankan dan tidak ada data yang ditimpa dari aplikasi. Admin harus{' '}
            <b>memeriksa isinya</b>, lalu <b>menjalankan manual di Supabase SQL Editor</b>. SQL pemulihan
            <b> dapat mengubah data</b> yang sudah ada (upsert per baris, tanpa TRUNCATE).
          </div>
        </div>

        {/* Pilih file */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-border bg-card cursor-pointer hover:bg-muted transition-colors ${busyNow ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <Upload className="w-4 h-4" />
            Pilih File JSON
            <input type="file" accept=".json,application/json" onChange={handleFile} className="sr-only" aria-label="Pilih file backup JSON" />
          </label>
          {importName && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-mono max-w-[240px] truncate" title={importName}>
                {importName}
              </span>
              <button onClick={resetImport} className={ghostBtn} type="button">
                Hapus
              </button>
            </div>
          )}
        </div>

        {/* Ringkasan data SEBELUM membuat SQL */}
        {summary && !summary.ok && (
          <div className="mt-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm font-medium text-destructive" role="alert">
            {summary.error}
          </div>
        )}
        {summary && summary.ok && (
          <div className="mt-4 rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ringkasan data dalam file — total {summary.totalRows.toLocaleString('id-ID')} baris
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tabel</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-32">Jumlah Baris</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.tables.map(t => (
                    <tr key={t.name} className="border-b border-border/50 last:border-b-0">
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-foreground">{t.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground font-mono">{t.name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">
                        {t.rows.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summary.ignored.length > 0 && (
              <p className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
                Tabel tidak dikenal diabaikan: {summary.ignored.join(', ')}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-border bg-muted/20">
              <button onClick={handleCreateSql} disabled={sqlBusy || !importText} className={primaryBtn}>
                {sqlBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Buat File SQL Pemulihan
              </button>
              <p className="text-xs text-muted-foreground">
                File <span className="font-mono">sidata-restore-{fileStamp()}.sql</span> akan diunduh — periksa sebelum dijalankan.
              </p>
            </div>
          </div>
        )}

        {/* Impor otomatis — nonaktif */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Impor otomatis</span> — pulihkan data langsung dari aplikasi.
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide bg-muted text-muted-foreground px-2 py-1 rounded-full border border-border">
              Segera Hadir
            </span>
            <button type="button" disabled className={`${primaryBtn} opacity-60`}>
              Impor Otomatis
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
