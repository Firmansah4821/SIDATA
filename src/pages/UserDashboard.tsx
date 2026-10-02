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
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        <AppHeader
          isAdmin={false}
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
        isAdmin={false}
        currentUser={displayName}
        avatarUrl={auth.profile?.avatar_url}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 overflow-hidden relative">
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
        <main className="flex-1 overflow-y-auto p-6">
          {view === 'dashboard' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
                  <p className="text-sm text-muted-foreground">Ringkasan data pertanahan</p>
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
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Profil Saya</h2>
                  <p className="text-sm text-muted-foreground">Kelola informasi profil Anda</p>
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
