import { useState, useCallback, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { DataType, SidataRecord, typeLabels, formFields } from '@/lib/sidata-config';
import { loadRecords, loadRecordsByType, deleteRecord, addRecord, updateRecord, getStats, loadStatsOnly, recomputeConflictsForDate } from '@/lib/sidata-store';
import { exportToExcel, exportSingleToExcel } from '@/lib/excel-export';
import { logAudit } from '@/lib/audit-logger';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import AppHeader from '@/components/sidata/AppHeader';
import Sidebar from '@/components/sidata/Sidebar';
import StatsTable from '@/components/sidata/StatsTable';
import ModuleDashboard from '@/components/sidata/ModuleDashboard';
import CalendarView from '@/components/sidata/CalendarView';

import AdminTable from '@/components/sidata/AdminTable';
import InputForm from '@/components/sidata/InputForm';
import SidataToast, { showSidataToast } from '@/components/sidata/Toast';
import { DetailModal, ConfirmDeleteModal } from '@/components/sidata/Modals';
import UserManagement from '@/components/sidata/UserManagement';
import ProfileSection from '@/components/sidata/ProfileSection';
import { DashboardSkeleton } from '@/components/sidata/LoadingSkeleton';
import { BarChart3, UserCircle } from 'lucide-react';
import type { AuthState } from '@/hooks/useAuth';
import {
  buildFileDirectUrl,
  buildFileOpenRedirectUrl,
  escapeHtmlAttribute,
  escapeHtmlText,
  getCleanStorageFileName,
  isImageFileUrl,
} from '@/lib/file-link-utils';

type AdminView = 'admin-dashboard' | 'admin-input' | 'admin-laporan' | 'admin-profil' | 'admin-module-dashboard' | 'admin-kalender';

interface AdminDashboardProps {
  auth: AuthState & { signOut: () => Promise<void>; refreshProfile: () => Promise<void> };
}

export default function AdminDashboard({ auth }: AdminDashboardProps) {
  const [records, setRecords] = useState<SidataRecord[]>([]);
  const [stats, setStats] = useState<Record<DataType, number>>({ surat_masuk: 0, surat_keluar: 0, buku_tamu: 0, inventaris_dokumen: 0, pengajuan_bpn: 0, perjalanan_dinas: 0, agenda_rapat: 0, lembur: 0 });
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [loadedTypes, setLoadedTypes] = useState<Set<DataType>>(new Set());
  const [laporanLoading, setLaporanLoading] = useState(false);
  const [view, setView] = useState<AdminView>('admin-dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [laporanSubmenuOpen, setLaporanSubmenuOpen] = useState(false);
  const [laporanType, setLaporanType] = useState<DataType>('surat_masuk');
  const [inputType, setInputType] = useState<DataType>('surat_masuk');
  const [moduleDashboardType, setModuleDashboardType] = useState<DataType>('surat_masuk');
  const [moduleDashboardLoading, setModuleDashboardLoading] = useState(false);
  const [kalenderType, setKalenderType] = useState<DataType>('surat_masuk');
  const [kalenderLoading, setKalenderLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [detailRecord, setDetailRecord] = useState<SidataRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SidataRecord | null>(null);
  const [editRecord, setEditRecord] = useState<SidataRecord | null>(null);

  useIdleTimeout(async () => {
    await auth.signOut();
    showSidataToast('Sesi habis karena tidak aktif selama 15 menit', 'info');
  }, !!auth.user);

  const refreshRecords = useCallback(async () => {
    const data = await loadRecords();
    setRecords(data);
    setStats(getStats(data));
    setRecordsLoaded(true);
    setLoadedTypes(new Set(['surat_masuk','surat_keluar','buku_tamu','inventaris_dokumen','pengajuan_bpn','perjalanan_dinas','agenda_rapat','lembur']));
  }, []);

  // Load records for a single type (fast). Merges into state & caches.
  const loadLaporanType = useCallback(async (type: DataType) => {
    if (loadedTypes.has(type)) return;
    setLaporanLoading(true);
    try {
      const data = await loadRecordsByType(type);
      setRecords(prev => {
        const others = prev.filter(r => r.type !== type);
        return [...others, ...data].sort((a, b) =>
          (b.submitted_at || '').localeCompare(a.submitted_at || '')
        );
      });
      setLoadedTypes(prev => new Set(prev).add(type));
    } finally {
      setLaporanLoading(false);
    }
  }, [loadedTypes]);

  // Fast initial load: only fetch stats (lightweight)
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const s = await loadStatsOnly();
      setStats(s);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (loading) return;
    const displayName = auth.profile?.full_name || auth.profile?.username || 'Administrator';
    showSidataToast(`Login berhasil\nSelamat datang, ${displayName}`, 'success');
  }, [loading]);

  const handleLogout = async () => {
    await logAudit('logout', 'session');
    await auth.signOut();
    showSidataToast('Logout berhasil', 'info');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    // Close modal & update UI instantly (optimistic)
    setDeleteTarget(null);
    setRecords(prev => prev.filter(r => r.id !== target.id));
    setStats(prev => ({ ...prev, [target.type]: Math.max(0, (prev[target.type] || 1) - 1) }));
    showSidataToast('Data berhasil dihapus', 'success');
    // Fire-and-forget DB delete + audit log
    const ok = await deleteRecord(target.id);
    if (!ok) {
      // Rollback on failure
      showSidataToast('Gagal menghapus data, memuat ulang...', 'error');
      const fresh = await loadRecordsByType(target.type);
      setRecords(prev => [...prev.filter(r => r.type !== target.type), ...fresh].sort((a, b) =>
        (b.submitted_at || '').localeCompare(a.submitted_at || '')
      ));
      return;
    }
    if (target.type === 'perjalanan_dinas' && (target as any).tanggal_perjalanan) {
      recomputeConflictsForDate((target as any).tanggal_perjalanan).catch(() => {});
    }
    logAudit('delete', 'record', target.id, { type_label: typeLabels[target.type] }).catch(() => {});
  };

  const handleViewDetail = (record: SidataRecord) => {
    setDetailRecord(record);
    window.dispatchEvent(new CustomEvent('sidata-record-viewed', { detail: { recordId: record.id } }));
  };

  const handleSubmitData = async (data: Record<string, any>) => {
    if (editRecord) {
      const oldDate = editRecord.type === 'perjalanan_dinas' ? (editRecord as any).tanggal_perjalanan : undefined;
      const result = await updateRecord(editRecord.id, {
        ...data,
        type: editRecord.type,
        submitted_at: editRecord.submitted_at,
      } as any);
      if (result) {
        await logAudit('update', 'record', result.id, { type_label: typeLabels[editRecord.type] });
      }
      if (editRecord.type === 'perjalanan_dinas') {
        const dates = [oldDate, data.tanggal_perjalanan].filter(Boolean) as string[];
        await recomputeConflictsForDate(dates);
      }
      // Reload only this type
      const fresh = await loadRecordsByType(editRecord.type);
      setRecords(prev => [...prev.filter(r => r.type !== editRecord.type), ...fresh].sort((a, b) =>
        (b.submitted_at || '').localeCompare(a.submitted_at || '')
      ));
      setEditRecord(null);
      setView('admin-laporan');
      showSidataToast('Data berhasil diperbarui', 'success');
    } else {
      let result;
      try {
        result = await addRecord({ ...data, type: inputType, submitted_at: new Date().toISOString() } as any);
      } catch (err: any) {
        console.error('Submit failed:', err);
        showSidataToast(`Gagal menyimpan: ${err?.message || 'Koneksi/database error'}`, 'error');
        return;
      }
      if (!result) {
        showSidataToast('Gagal menyimpan data (response kosong). Coba lagi.', 'error');
        return;
      }
      await logAudit('create', 'record', result.id, { type_label: typeLabels[inputType] });
      if (inputType === 'perjalanan_dinas' && data.tanggal_perjalanan) {
        await recomputeConflictsForDate(data.tanggal_perjalanan);
      }
      await refreshRecords();
      setView('admin-dashboard');
      showSidataToast('Data berhasil dikirim', 'success');
    }
  };

  const handleEditRecord = (record: SidataRecord) => {
    setEditRecord(record);
    setInputType(record.type);
    setView('admin-input');
  };

  // ─── PDF Export Logic ───
  const pdfTypeLabels: Record<DataType, string> = {
    surat_masuk: "Laporan Surat Masuk",
    surat_keluar: "Laporan Surat Keluar",
    buku_tamu: "Laporan Buku Tamu",
    inventaris_dokumen: "Laporan Inventaris Dokumen",
    pengajuan_bpn: "Laporan Pengajuan BPN",
    perjalanan_dinas: "Laporan Perjalanan Dinas",
    agenda_rapat: "Laporan Agenda Rapat",
    lembur: "Laporan Lembur",
  };

  const buildFileContent = (val: any, _fieldId: string) => {
    if (!val) return '-';

    const fileArr: string[] = Array.isArray(val) ? val : [val];
    const contents = fileArr
      .map((v: string) => {
        if (!v) return '';

        if (v.startsWith('data:image')) {
          return `<span style="font-size:11px;color:#1e40af;">🖼️ Foto (embedded)</span>`;
        }

        const directUrl = buildFileDirectUrl(v);
        if (directUrl) {
          const isImg = isImageFileUrl(directUrl);
          const displayName = getCleanStorageFileName(directUrl);
          const openUrl = buildFileOpenRedirectUrl(directUrl);
          const icon = isImg ? '🖼️' : '📄';
          return `<a href="${escapeHtmlAttribute(openUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#1e40af;text-decoration:underline;word-break:break-all;">${icon} ${escapeHtmlText(displayName)}</a>`;
        }

        return `<span style="font-size:11px;color:#000;">${escapeHtmlText(v)}</span>`;
      })
      .filter(Boolean)
      .join('<br/>');

    return contents || '-';
  };

  const buildTableForType = (type: DataType, items: SidataRecord[]) => {
    const fields = (formFields[type] || []).filter(f => f.type !== 'html');
    const getFieldLabel = (f: { id: string; label: string }) => {
      if (f.id === 'foto_tamu') return 'Foto Tamu';
      if (f.id === 'foto_perjalanan') return 'Foto Perjalanan';
      if (f.id === 'foto_lembur') return 'Foto Dokumentasi';
      return f.label;
    };
    // Adaptive sizing so EVERY table fits on A4 landscape (no A3 fallback)
    const colCount = fields.length + 1; // +1 for NO
    // Tier the density by column count
    let fontSize: number, padding: string, filePadding: string, imgMaxW: number, imgMaxH: number;
    if (colCount <= 7) {
      fontSize = 11; padding = '7px 8px'; filePadding = '5px'; imgMaxW = 95; imgMaxH = 70;
    } else if (colCount <= 10) {
      fontSize = 9; padding = '4px 5px'; filePadding = '3px'; imgMaxW = 70; imgMaxH = 55;
    } else {
      // Very wide tables (e.g. lembur with 12+ cols) — squeeze further
      fontSize = 8; padding = '3px 4px'; filePadding = '2px'; imgMaxW = 55; imgMaxH = 45;
    }

    const thCells = fields.map(f =>
      `<th style="border:1px solid #ccc;padding:${padding};background:#1e40af;color:#fff;font-size:${fontSize}px;text-align:${f.type === 'file' ? 'center' : 'left'};word-break:break-word;">${getFieldLabel(f)}</th>`
    ).join('');

    const rows = items.map((item, idx) => {
      const tdCells = fields.map(f => {
        const val = item[f.id];
        if (f.type === 'file') {
          const content = buildFileContentSized(val, f.id, imgMaxW, imgMaxH, fontSize);
          return `<td style="border:1px solid #ccc;padding:${filePadding};text-align:center;vertical-align:middle;">${content}</td>`;
        }
        return `<td style="border:1px solid #ccc;padding:${padding};font-size:${fontSize}px;color:#000;word-break:break-word;">${val || '-'}</td>`;
      }).join('');
      return `<tr><td style="border:1px solid #ccc;padding:${padding};font-size:${fontSize}px;text-align:center;color:#000;vertical-align:top;">${idx + 1}</td>${tdCells}</tr>`;
    }).join('');

    return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <thead><tr><th style="border:1px solid #ccc;padding:${padding};background:#1e40af;color:#fff;font-size:${fontSize}px;width:30px;text-align:center;">NO</th>${thCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  const buildFileContentSized = (val: any, _fieldId: string, _maxW: number, _maxH: number, fontSize: number) => {
    if (!val) return '-';
    const fileArr: string[] = Array.isArray(val) ? val : [val];
    const contents = fileArr
      .map((v: string) => {
        if (!v) return '';
        if (v.startsWith('data:image')) {
          return `<span style="font-size:${fontSize - 1}px;color:#1e40af;">🖼️ Foto</span>`;
        }
        const directUrl = buildFileDirectUrl(v);
        if (directUrl) {
          const isImg = isImageFileUrl(directUrl);
          const displayName = getCleanStorageFileName(directUrl);
          const openUrl = buildFileOpenRedirectUrl(directUrl);
          const icon = isImg ? '🖼️' : '📄';
          return `<a href="${escapeHtmlAttribute(openUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:${fontSize - 1}px;color:#1e40af;text-decoration:underline;word-break:break-all;">${icon} ${escapeHtmlText(displayName)}</a>`;
        }
        return `<span style="font-size:${fontSize - 1}px;color:#000;">${escapeHtmlText(v)}</span>`;
      })
      .filter(Boolean)
      .join('<br/>');
    return contents || '-';
  };

  const executePdfExport = async (htmlContent: string, fileName: string, _type?: DataType) => {
    // Always use A4 landscape for consistency across all reports
    const pdfFormat = 'a4';
    // A4 landscape printable width ≈ 277mm; render at ~1100px for clean scaling
    const rootWidth = 1100;
    const iframe = document.createElement('iframe');
    // Iframe must be tall enough for html2canvas to capture every row of the table.
    iframe.style.cssText = `position:fixed;left:0;top:0;width:${rootWidth + 100}px;height:100vh;opacity:0;pointer-events:none;z-index:-1;border:none;`;
    document.body.appendChild(iframe);

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html>
        <html><head><meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #fff; color: #000; font-family: 'Times New Roman', serif; }
          img { display: block; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        </style>
        </head><body>
          <div id="pdf-root" style="width:${rootWidth}px;padding:25px;background:#fff;">
            ${htmlContent}
          </div>
        </body></html>`);
      iframeDoc.close();

      // Wait for layout to settle and fonts to apply before snapshotting
      await new Promise<void>(r => setTimeout(r, 250));

      const root = iframeDoc.getElementById('pdf-root');
      if (!root) throw new Error('PDF root not found');

      // Resize iframe to actual content height so html2canvas captures everything
      const contentHeight = Math.max(root.scrollHeight, root.offsetHeight, 900);
      iframe.style.height = `${contentHeight + 50}px`;
      await new Promise<void>(r => setTimeout(r, 50));

      await html2pdf().set({
        margin: 8,
        filename: fileName,
        // Keep <a href> tags clickable in the generated PDF.
        enableLinks: true,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.5, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff', width: rootWidth, windowWidth: rootWidth, windowHeight: contentHeight + 50, scrollX: 0, scrollY: 0 },
        pagebreak: { mode: ['css', 'legacy'] },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'landscape' },
      }).from(root).save();

      showSidataToast('Laporan PDF berhasil diunduh', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showSidataToast('Gagal mengunduh PDF', 'error');
    } finally {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }
  };

  const handleExport = async (item: SidataRecord) => {
    showSidataToast('Memproses PDF...', 'info');
    const title = pdfTypeLabels[item.type];
    const printDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const submitDate = item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-';

    const html = `
      <h2 style="text-align:center;margin:20px 0 5px;font-size:16px;font-weight:bold;color:#000;">${title}</h2>
      <p style="font-size:12px;margin:8px 0;color:#000;">Di cetak pada : ${printDate}</p>
      <p style="font-size:12px;margin:0 0 15px;color:#000;">Data dikirim pada : ${submitDate}</p>
      ${buildTableForType(item.type, [item])}
      <div style="margin-top:30px;text-align:center;font-size:10px;color:#999;border-top:1px solid #ddd;padding-top:10px;">
        © ${new Date().getFullYear()} Kantor Pertanahan Kabupaten Bima
      </div>
    `;
    await executePdfExport(html, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`, item.type);
  };

  const handleExportByType = async (type: DataType) => {
    const items = records.filter(r => r.type === type);
    if (items.length === 0) { showSidataToast(`Tidak ada data ${typeLabels[type]} untuk diexport`, 'error'); return; }
    showSidataToast('Memproses PDF...', 'info');
    const title = pdfTypeLabels[type];
    const printDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
      <h2 style="text-align:center;margin:20px 0 5px;font-size:16px;font-weight:bold;color:#000;">${title}</h2>
      <p style="font-size:12px;margin:8px 0;color:#000;">Di cetak pada : ${printDate}</p>
      <p style="font-size:12px;margin:0 0 15px;color:#000;">Total data : ${items.length} record</p>
      ${buildTableForType(type, items)}
      <div style="margin-top:30px;text-align:center;font-size:10px;color:#999;border-top:1px solid #ddd;padding-top:10px;">
        © ${new Date().getFullYear()} Kantor Pertanahan Kabupaten Bima
      </div>
    `;
    await executePdfExport(html, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`, type);
  };

  const handleExportExcel = async (item: SidataRecord) => {
    try {
      const ok = await exportSingleToExcel(item);
      if (ok) showSidataToast('File Excel berhasil diunduh', 'success');
      else showSidataToast('Gagal mengunduh Excel', 'error');
    } catch {
      showSidataToast('Gagal mengunduh Excel', 'error');
    }
  };

  const handleExportAllExcelByType = async (type: DataType) => {
    const items = records.filter(r => r.type === type);
    if (items.length === 0) { showSidataToast(`Tidak ada data ${typeLabels[type]} untuk diexport`, 'error'); return; }
    try {
      const ok = await exportToExcel(items, type);
      if (ok) showSidataToast('File Excel berhasil diunduh', 'success');
      else showSidataToast('Gagal mengunduh Excel', 'error');
    } catch {
      showSidataToast('Gagal mengunduh Excel', 'error');
    }
  };

  // Lazy-load: for laporan load only the active type (fast),
  // for input/other views keep existing lightweight behavior.
  useEffect(() => {
    if (view === 'admin-laporan') {
      loadLaporanType(laporanType);
    }
  }, [view, laporanType, loadLaporanType]);

  // Lazy-load records for the module dashboard view
  useEffect(() => {
    if (view === 'admin-module-dashboard') {
      if (!loadedTypes.has(moduleDashboardType)) {
        setModuleDashboardLoading(true);
        loadLaporanType(moduleDashboardType).finally(() => setModuleDashboardLoading(false));
      }
    }
  }, [view, moduleDashboardType, loadedTypes, loadLaporanType]);

  const handleOpenModuleDashboard = (type: DataType) => {
    setModuleDashboardType(type);
    setView('admin-module-dashboard');
  };

  const handleOpenKalender = () => {
    setView('admin-kalender');
  };

  const handleSelectKalenderType = useCallback(async (type: DataType) => {
    setKalenderType(type);
    if (!loadedTypes.has(type)) {
      setKalenderLoading(true);
      await loadLaporanType(type);
      setKalenderLoading(false);
    }
  }, [loadedTypes, loadLaporanType]);

  useEffect(() => {
    if (view === 'admin-kalender' && !loadedTypes.has(kalenderType)) {
      setKalenderLoading(true);
      loadLaporanType(kalenderType).finally(() => setKalenderLoading(false));
    }
  }, [view, kalenderType, loadedTypes, loadLaporanType]);

  // No longer need to compute stats from records on render
  const displayName = auth.profile?.full_name || auth.profile?.username || auth.user?.email || 'Admin';

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) setSidebarVisible(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        <AppHeader
          isAdmin={true}
          currentUser={displayName}
          avatarUrl={auth.profile?.avatar_url}
          onToggleSidebar={() => {}}
          onLogout={() => {}}
        />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <DashboardSkeleton />
          </main>
        </div>
        <SidataToast />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <AppHeader
        isAdmin={true}
        currentUser={displayName}
        avatarUrl={auth.profile?.avatar_url}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          visible={sidebarVisible}
          isAdmin={true}
          activeView={view}
          activeInputType={inputType}
          activeLaporanType={laporanType}
          submenuOpen={submenuOpen}
          laporanSubmenuOpen={laporanSubmenuOpen}
          onToggleSubmenu={() => setSubmenuOpen(!submenuOpen)}
          onToggleLaporanSubmenu={() => setLaporanSubmenuOpen(!laporanSubmenuOpen)}
          onDashboard={() => {}}
          onSelectType={(type) => { setInputType(type); setView('admin-input'); setSubmenuOpen(false); closeSidebarOnMobile(); }}
          onSelectLaporanType={(type) => { setLaporanType(type); setView('admin-laporan'); setLaporanSubmenuOpen(false); closeSidebarOnMobile(); }}
          onAdminDashboard={() => { setView('admin-dashboard'); closeSidebarOnMobile(); }}
          onProfil={() => { setView('admin-profil'); closeSidebarOnMobile(); }}
          onKalender={() => { handleOpenKalender(); closeSidebarOnMobile(); }}
        />
        {sidebarVisible && (
          <div className="fixed inset-0 bg-foreground/30 z-[998] md:hidden" onClick={() => setSidebarVisible(false)} />
        )}
        <main className="flex-1 overflow-y-auto p-6">
          {view === 'admin-dashboard' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Dashboard Admin</h2>
                  <p className="text-sm text-muted-foreground">Kelola dan pantau semua data</p>
                </div>
              </div>
              <StatsTable stats={stats} onSelectType={handleOpenModuleDashboard} />
            </div>
          )}
          {view === 'admin-module-dashboard' && (
            <ModuleDashboard
              type={moduleDashboardType}
              records={records}
              loading={moduleDashboardLoading || (!loadedTypes.has(moduleDashboardType))}
              onBack={() => setView('admin-dashboard')}
            />
          )}
          {view === 'admin-kalender' && (
            <CalendarView
              type={kalenderType}
              records={records}
              loading={kalenderLoading || (!loadedTypes.has(kalenderType))}
              onSelectType={handleSelectKalenderType}
              onViewDetail={handleViewDetail}
            />
          )}
          {view === 'admin-input' && (
            <InputForm
              type={inputType}
              onSubmit={handleSubmitData}
              onBack={() => { setEditRecord(null); setView(editRecord ? 'admin-laporan' : 'admin-dashboard'); }}
              editRecord={editRecord}
            />
          )}
          {view === 'admin-laporan' && (
            <AdminTable
              records={records}
              activeType={laporanType}
              loading={laporanLoading}
              onViewDetail={handleViewDetail}
              onExport={handleExport}
              onExportExcel={handleExportExcel}
              onExportAllByType={handleExportByType}
              onExportAllExcelByType={handleExportAllExcelByType}
              onDelete={setDeleteTarget}
              onEdit={handleEditRecord}
            />
          )}
          {view === 'admin-profil' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Profil & Kelola User</h2>
                  <p className="text-sm text-muted-foreground">Kelola profil Anda dan akun pengguna</p>
                </div>
              </div>
              {auth.user && (
                <ProfileSection
                  userId={auth.user.id}
                  currentProfile={{
                    full_name: auth.profile?.full_name || null,
                    jabatan: auth.profile?.jabatan || null,
                  }}
                  onProfileUpdate={() => auth.refreshProfile()}
                />
              )}
              <UserManagement />
            </div>
          )}
        </main>
      </div>

      <SidataToast />
      <DetailModal 
        open={!!detailRecord} 
        onClose={() => setDetailRecord(null)} 
        record={detailRecord}
        onExportPdf={handleExport}
        onExportExcel={handleExportExcel}
      />
      <ConfirmDeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
    </div>
  );
}
