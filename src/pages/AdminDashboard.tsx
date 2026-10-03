import { useState, useCallback, useEffect } from 'react';
import { DataType, SidataRecord, typeLabels } from '@/lib/sidata-config';
import { exportPDF, buildPdfColumns, buildRecordPdfFileName } from '@/lib/pdf-export';
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
import LogAktivitas from '@/components/sidata/LogAktivitas';
import BackupRestore from '@/components/sidata/BackupRestore';
import { KhususAdminInline } from '@/components/sidata/PengaturanRouteGuard';
import { BarChart3, UserCircle } from 'lucide-react';
import type { AuthState } from '@/hooks/useAuth';

type AdminView = 'admin-dashboard' | 'admin-input' | 'admin-laporan' | 'admin-profil' | 'admin-module-dashboard' | 'admin-kalender' | 'admin-log-aktivitas' | 'admin-backup-restore';

interface AdminDashboardProps {
  auth: AuthState & { signOut: () => Promise<void>; refreshProfile: () => Promise<void> };
}

export default function AdminDashboard({ auth }: AdminDashboardProps) {
  const [records, setRecords] = useState<SidataRecord[]>([]);
  const [stats, setStats] = useState<Record<DataType, number>>({ surat_masuk: 0, surat_keluar: 0, buku_tamu: 0, inventaris_dokumen: 0, pengajuan_bpn: 0, perjalanan_dinas: 0, agenda_rapat: 0, lembur: 0 });
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [loadedTypes, setLoadedTypes] = useState<Set<DataType>>(new Set());
  const [laporanLoading, setLaporanLoading] = useState(false);
  // Deep link /pengaturan/* — view awal mengikuti URL (hanya Admin yang bisa masuk).
  const [deepLinkView] = useState<AdminView | null>(() => {
    const p = window.location.pathname.replace(/\/+$/, '');
    if (p === '/pengaturan/log-aktivitas') return 'admin-log-aktivitas';
    if (p === '/pengaturan/backup-restore') return 'admin-backup-restore';
    return null;
  });
  const [view, setView] = useState<AdminView>(deepLinkView ?? 'admin-dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  // Laporan terbuka default (sesuai gambar acuan); Input Data tetap tertutup default.
  const [laporanSubmenuOpen, setLaporanSubmenuOpen] = useState(true);
  const [pengaturanSubmenuOpen, setPengaturanSubmenuOpen] = useState(deepLinkView !== null);
  const [laporanType, setLaporanType] = useState<DataType>('surat_masuk');
  const [inputType, setInputType] = useState<DataType>('surat_masuk');
  const [moduleDashboardType, setModuleDashboardType] = useState<DataType>('surat_masuk');
  const [moduleDashboardLoading, setModuleDashboardLoading] = useState(false);
  const [kalenderType, setKalenderType] = useState<DataType>('surat_masuk');
  const [kalenderLoading, setKalenderLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topbarSearch, setTopbarSearch] = useState('');

  // Jaga URL tetap sinkron dengan view Pengaturan (tanpa reload, tanpa mengubah routing lain).
  useEffect(() => {
    const p = window.location.pathname;
    if (view === 'admin-log-aktivitas' && p !== '/pengaturan/log-aktivitas') {
      window.history.replaceState(null, '', '/pengaturan/log-aktivitas');
    } else if (view === 'admin-backup-restore' && p !== '/pengaturan/backup-restore') {
      window.history.replaceState(null, '', '/pengaturan/backup-restore');
    } else if (
      view !== 'admin-log-aktivitas' &&
      view !== 'admin-backup-restore' &&
      p.startsWith('/pengaturan/')
    ) {
      window.history.replaceState(null, '', '/');
    }
  }, [view]);

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
  // Shared helper lives in src/lib/pdf-export.ts (exportPDF) and is used by
  // the toolbar export, the detail modal, and the AKSI green download button.

  // Single-record PDF — AKSI green download button + detail-modal export.
  // Filename: Laporan-<Menu>-<identitas record>.pdf
  const handleExport = async (item: SidataRecord) => {
    showSidataToast('Memproses PDF...', 'info');
    await exportPDF(typeLabels[item.type], buildPdfColumns(item.type), [item], {
      subtitle: 'submit',
      fileName: buildRecordPdfFileName(item),
    });
  };  // Toolbar export — ALL records of the type, behaviour unchanged (Total data line).
  const handleExportByType = async (type: DataType) => {
    const items = records.filter(r => r.type === type);
    if (items.length === 0) { showSidataToast(`Tidak ada data ${typeLabels[type]} untuk diexport`, 'error'); return; }
    showSidataToast('Memproses PDF...', 'info');
    await exportPDF(typeLabels[type], buildPdfColumns(type), items, { subtitle: 'total' });
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
      <div className="h-screen w-screen flex overflow-hidden bg-background">
        <Sidebar
          visible={sidebarVisible}
          isAdmin={true}
          activeView={view}
          activeInputType={inputType}
          activeLaporanType={laporanType}
          submenuOpen={submenuOpen}
          laporanSubmenuOpen={laporanSubmenuOpen}
          onToggleSubmenu={() => {}}
          onToggleLaporanSubmenu={() => {}}
          onDashboard={() => {}}
          onSelectType={() => {}}
          onSelectLaporanType={() => {}}
          onAdminDashboard={() => {}}
          pengaturanSubmenuOpen={pengaturanSubmenuOpen}
          onTogglePengaturanSubmenu={() => {}}
        />
        <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">
          <div aria-hidden="true" className="topbar-wave pointer-events-none absolute top-0 right-0 h-[220px] w-[65%] z-0" />
          <AppHeader
            isAdmin={true}
            currentUser={displayName}
            avatarUrl={auth.profile?.avatar_url}
            onToggleSidebar={() => {}}
            onLogout={() => {}}
          />
          <div className="flex-1 overflow-y-auto relative z-10">
            <DashboardSkeleton />
          </div>
        </div>
        <SidataToast />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background">
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
        pengaturanSubmenuOpen={pengaturanSubmenuOpen}
        onTogglePengaturanSubmenu={() => setPengaturanSubmenuOpen(!pengaturanSubmenuOpen)}
        onSelectPengaturan={(item) => {
          setView(item === 'log-aktivitas' ? 'admin-log-aktivitas' : 'admin-backup-restore');
          closeSidebarOnMobile();
        }}
      />
      {sidebarVisible && (
        <div className="fixed inset-0 bg-foreground/30 z-[998] md:hidden" onClick={() => setSidebarVisible(false)} />
      )}
      <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">
        <div aria-hidden="true" className="topbar-wave pointer-events-none absolute top-0 right-0 h-[220px] w-[65%] z-0" />
        <AppHeader
          isAdmin={true}
          currentUser={displayName}
          avatarUrl={auth.profile?.avatar_url}
          onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
          onLogout={handleLogout}
          onSearchChange={setTopbarSearch}
          onSearchSubmit={(q, type) => {
            setTopbarSearch(q);
            if (type) setLaporanType(type);
            setLaporanSubmenuOpen(false);
            setView('admin-laporan');
            closeSidebarOnMobile();
          }}
          searchHint="Tekan Enter untuk mencari di Laporan"
        />
        <main className="flex-1 overflow-y-auto p-6 relative z-10">
          {view === 'admin-dashboard' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-[26px] leading-tight font-extrabold text-foreground">Dashboard Admin</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Kelola dan pantau semua data</p>
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
              searchQuery={topbarSearch}
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
              <div className="flex items-center gap-3.5 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <UserCircle className="w-6 h-6 text-white" />
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
          {view === 'admin-log-aktivitas' && (
            auth.isAdmin ? <LogAktivitas /> : <KhususAdminInline title="Log Aktivitas" />
          )}
          {view === 'admin-backup-restore' && (
            auth.isAdmin ? <BackupRestore /> : <KhususAdminInline title="Backup & Restore" />
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
