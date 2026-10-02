import { useState, useCallback, useEffect } from 'react';
import { DataType, SidataRecord, typeLabels } from '@/lib/sidata-config';
import { loadRecords, loadRecordsByType, addRecord, getStats, loadStatsOnly, recomputeConflictsForDate } from '@/lib/sidata-store';
import { logAudit } from '@/lib/audit-logger';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import AppHeader from '@/components/sidata/AppHeader';
import Sidebar from '@/components/sidata/Sidebar';
import StatsTable from '@/components/sidata/StatsTable';
import ModuleDashboard from '@/components/sidata/ModuleDashboard';
import CalendarView from '@/components/sidata/CalendarView';
import InputForm from '@/components/sidata/InputForm';
import ProfileSection from '@/components/sidata/ProfileSection';
import SidataToast, { showSidataToast } from '@/components/sidata/Toast';
import { DashboardSkeleton } from '@/components/sidata/LoadingSkeleton';
import { BarChart3, UserCircle } from 'lucide-react';
import type { AuthState } from '@/hooks/useAuth';

type UserView = 'dashboard' | 'input' | 'profil' | 'module-dashboard' | 'kalender';

interface UserDashboardProps {
  auth: AuthState & { signOut: () => Promise<void>; refreshProfile: () => Promise<void> };
}

export default function UserDashboard({ auth }: UserDashboardProps) {
  const [records, setRecords] = useState<SidataRecord[]>([]);
 const [stats, setStats] = useState<Record<DataType, number>>({ surat_masuk: 0, surat_keluar: 0, buku_tamu: 0, inventaris_dokumen: 0, pengajuan_bpn: 0, perjalanan_dinas: 0, agenda_rapat: 0, lembur: 0 });
  const [view, setView] = useState<UserView>('dashboard');
  const [inputType, setInputType] = useState<DataType>('surat_masuk');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [moduleDashboardType, setModuleDashboardType] = useState<DataType>('surat_masuk');
  const [moduleDashboardLoading, setModuleDashboardLoading] = useState(false);
  const [loadedTypes, setLoadedTypes] = useState<Set<DataType>>(new Set());
  const [kalenderType, setKalenderType] = useState<DataType>('surat_masuk');
  const [kalenderLoading, setKalenderLoading] = useState(false);
  const [topbarSearch, setTopbarSearch] = useState('');

  useIdleTimeout(async () => {
    await auth.signOut();
    showSidataToast('Sesi habis karena tidak aktif selama 15 menit', 'info');
  }, !!auth.user);

  const refreshRecords = useCallback(async () => {
    const data = await loadRecords();
    setRecords(data);
    setStats(getStats(data));
  }, []);

  const handleOpenModuleDashboard = useCallback(async (type: DataType) => {
    setModuleDashboardType(type);
    setView('module-dashboard');
    if (!loadedTypes.has(type)) {
      setModuleDashboardLoading(true);
      const data = await loadRecordsByType(type);
      setRecords(prev => {
        const others = prev.filter(r => r.type !== type);
        return [...others, ...data];
      });
      setLoadedTypes(prev => new Set(prev).add(type));
      setModuleDashboardLoading(false);
    }
  }, [loadedTypes]);

  const loadTypeIfNeeded = useCallback(async (type: DataType) => {
    if (loadedTypes.has(type)) return;
    const data = await loadRecordsByType(type);
    setRecords(prev => {
      const others = prev.filter(r => r.type !== type);
      return [...others, ...data];
    });
    setLoadedTypes(prev => new Set(prev).add(type));
  }, [loadedTypes]);

  const handleSelectKalenderType = useCallback(async (type: DataType) => {
    setKalenderType(type);
    if (!loadedTypes.has(type)) {
      setKalenderLoading(true);
      await loadTypeIfNeeded(type);
      setKalenderLoading(false);
    }
  }, [loadedTypes, loadTypeIfNeeded]);

  const handleOpenKalender = useCallback(async () => {
    setView('kalender');
    if (!loadedTypes.has(kalenderType)) {
      setKalenderLoading(true);
      await loadTypeIfNeeded(kalenderType);
      setKalenderLoading(false);
    }
  }, [loadedTypes, kalenderType, loadTypeIfNeeded]);

  // Fast initial load: only fetch stats
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
    const displayName = auth.profile?.full_name || auth.profile?.username || 'Operator';
    showSidataToast(`Login berhasil\nSelamat datang, ${displayName}`, 'success');
  }, [loading]);

  const handleLogout = async () => {
    await logAudit('logout', 'session');
    await auth.signOut();
    showSidataToast('Logout berhasil', 'info');
  };

  const handleSubmitData = async (data: Record<string, any>) => {
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
    setView('dashboard');
    showSidataToast('Data berhasil dikirim', 'success');
  };

  // stats already managed via state
  const displayName = auth.profile?.full_name || auth.profile?.username || auth.user?.email || 'User';

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) setSidebarVisible(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-background">
        <Sidebar
          visible={sidebarVisible}
          isAdmin={false}
          activeView={view}
          activeInputType={inputType}
          submenuOpen={submenuOpen}
          laporanSubmenuOpen={false}
          onToggleSubmenu={() => {}}
          onToggleLaporanSubmenu={() => {}}
          onDashboard={() => {}}
          onSelectType={() => {}}
          onSelectLaporanType={() => {}}
          onAdminDashboard={() => {}}
        />
        <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">
          <div aria-hidden="true" className="topbar-wave pointer-events-none absolute top-0 right-0 h-[220px] w-[65%] z-0" />
          <AppHeader
            isAdmin={false}
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

  const handleTopbarSearchSubmit = async (query: string, type?: DataType) => {
    const target = type || kalenderType;
    setTopbarSearch(query);
    if (!type) return;
    setKalenderType(target);
    setView('kalender');
    closeSidebarOnMobile();
    if (!loadedTypes.has(target)) {
      setKalenderLoading(true);
      await loadTypeIfNeeded(target);
      setKalenderLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background">
      <Sidebar
        visible={sidebarVisible}
        isAdmin={false}
        activeView={view}
        activeInputType={inputType}
        submenuOpen={submenuOpen}
        laporanSubmenuOpen={false}
        onToggleSubmenu={() => setSubmenuOpen(!submenuOpen)}
        onToggleLaporanSubmenu={() => {}}
        onDashboard={() => { setView('dashboard'); closeSidebarOnMobile(); }}
        onSelectType={(type) => { setInputType(type); setView('input'); setSubmenuOpen(false); closeSidebarOnMobile(); }}
        onSelectLaporanType={() => {}}
        onAdminDashboard={() => {}}
        onProfil={() => { setView('profil'); closeSidebarOnMobile(); }}
        onKalender={() => { handleOpenKalender(); closeSidebarOnMobile(); }}
      />
      {sidebarVisible && (
        <div className="fixed inset-0 bg-foreground/30 z-[998] md:hidden" onClick={() => setSidebarVisible(false)} />
      )}
      <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">
        <div aria-hidden="true" className="topbar-wave pointer-events-none absolute top-0 right-0 h-[220px] w-[65%] z-0" />
        <AppHeader
          isAdmin={false}
          currentUser={displayName}
          avatarUrl={auth.profile?.avatar_url}
          onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
          onLogout={handleLogout}
          onSearchChange={setTopbarSearch}
          onSearchSubmit={handleTopbarSearchSubmit}
          searchHint="Data tidak ditemukan"
        />
        <main className="flex-1 overflow-y-auto p-6 relative z-10">
          {view === 'dashboard' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-[26px] leading-tight font-extrabold text-foreground">Dashboard</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Ringkasan data pertanahan</p>
                </div>
              </div>
              <StatsTable stats={stats} onSelectType={handleOpenModuleDashboard} />
            </div>
          )}
          {view === 'module-dashboard' && (
            <ModuleDashboard
              type={moduleDashboardType}
              records={records}
              loading={moduleDashboardLoading}
              onBack={() => setView('dashboard')}
            />
          )}
          {view === 'kalender' && (
            <CalendarView
              type={kalenderType}
              records={records}
              loading={kalenderLoading || (!loadedTypes.has(kalenderType))}
              onSelectType={handleSelectKalenderType}
            />
          )}
          {view === 'input' && (
            <InputForm type={inputType} onSubmit={handleSubmitData} onBack={() => setView('dashboard')} />
          )}
          {view === 'profil' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <UserCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-[26px] leading-tight font-extrabold text-foreground">Profil Saya</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Kelola informasi profil Anda</p>
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
            </div>
          )}
        </main>
      </div>
      <SidataToast />
    </div>
  );
}
