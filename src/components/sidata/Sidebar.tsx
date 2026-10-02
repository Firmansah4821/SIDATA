import { DataType, typeLabels } from '@/lib/sidata-config';
import { LayoutDashboard, PenSquare, FileText, ChevronDown, ChevronRight, Mail, MailOpen, UserCheck, FolderArchive, Building2, Car, CalendarDays, UserCircle, Clock, Calendar } from 'lucide-react';

const submenuTypes: DataType[] = ['surat_masuk', 'surat_keluar', 'buku_tamu', 'inventaris_dokumen', 'pengajuan_bpn', 'perjalanan_dinas', 'agenda_rapat', 'lembur'];

const typeIconMap: Record<DataType, React.ReactNode> = {
  surat_masuk: <Mail className="w-4 h-4" />,
  surat_keluar: <MailOpen className="w-4 h-4" />,
  buku_tamu: <UserCheck className="w-4 h-4" />,
  inventaris_dokumen: <FolderArchive className="w-4 h-4" />,
  pengajuan_bpn: <Building2 className="w-4 h-4" />,
  perjalanan_dinas: <Car className="w-4 h-4" />,
  agenda_rapat: <CalendarDays className="w-4 h-4" />,
  lembur: <Clock className="w-4 h-4" />,
};

interface SidebarProps {
  visible: boolean;
  isAdmin: boolean;
  activeView: string;
  activeInputType?: DataType;
  activeLaporanType?: DataType;
  submenuOpen: boolean;
  laporanSubmenuOpen: boolean;
  onToggleSubmenu: () => void;
  onToggleLaporanSubmenu: () => void;
  onDashboard: () => void;
  onSelectType: (type: DataType) => void;
  onSelectLaporanType: (type: DataType) => void;
  onAdminDashboard: () => void;
  onProfil?: () => void;
  onKalender?: () => void;
}

export default function Sidebar({
  visible, isAdmin, activeView, activeInputType, activeLaporanType,
  submenuOpen, laporanSubmenuOpen,
  onToggleSubmenu, onToggleLaporanSubmenu,
  onDashboard, onSelectType, onSelectLaporanType, onAdminDashboard, onProfil,
  onKalender,
}: SidebarProps) {
  const navItemClass = (isActive: boolean) =>
    `w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-all duration-200 rounded-lg mx-2 ${
      isActive
        ? 'bg-primary/10 text-primary font-semibold shadow-sm'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  const subItemClass = (isActive: boolean) =>
    `text-left pl-4 pr-3 py-2 text-xs flex items-center gap-2.5 rounded-md mx-2 transition-all duration-200 ${
      isActive
        ? 'bg-primary/10 text-primary font-semibold'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`;

  return (
    <aside className={`w-[240px] bg-card border-r border-border overflow-y-auto flex-shrink-0 transition-all duration-300 md:relative fixed left-0 top-16 h-[calc(100vh-4rem)] z-[999] ${visible ? 'translate-x-0' : '-translate-x-full md:hidden'}`}>
      <div className="px-4 pt-5 pb-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Menu Utama</p>
      </div>
      <nav className="flex flex-col gap-0.5 pb-4">
        {!isAdmin ? (
          <>
            <button onClick={onDashboard} className={navItemClass(activeView === 'dashboard')} style={{ width: 'calc(100% - 16px)' }}>
              <LayoutDashboard className="w-[18px] h-[18px]" /> Dashboard
            </button>
            <button onClick={onToggleSubmenu} className={navItemClass(activeView === 'input')} style={{ width: 'calc(100% - 16px)' }}>
              <PenSquare className="w-[18px] h-[18px]" />
              <span className="flex-1 text-left">Input Data</span>
              {submenuOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
            {submenuOpen && (
              <div className="ml-6 flex flex-col gap-0.5 mt-0.5">
                {submenuTypes.map(type => (
                  <button key={type} onClick={() => onSelectType(type)} className={subItemClass(activeView === 'input' && activeInputType === type)} style={{ width: 'calc(100% - 16px)' }}>
                    {typeIconMap[type]} {typeLabels[type]}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onKalender} className={navItemClass(activeView === 'kalender')} style={{ width: 'calc(100% - 16px)' }}>
              <Calendar className="w-[18px] h-[18px]" /> Kalender
            </button>
            <button onClick={onProfil} className={navItemClass(activeView === 'profil')} style={{ width: 'calc(100% - 16px)' }}>
              <UserCircle className="w-[18px] h-[18px]" /> Profil
            </button>
          </>
        ) : (
          <>
            <button onClick={onAdminDashboard} className={navItemClass(activeView === 'admin-dashboard')} style={{ width: 'calc(100% - 16px)' }}>
              <LayoutDashboard className="w-[18px] h-[18px]" /> Dashboard
            </button>

            {/* Input Data menu for Admin */}
            <button onClick={onToggleSubmenu} className={navItemClass(activeView === 'admin-input')} style={{ width: 'calc(100% - 16px)' }}>
              <PenSquare className="w-[18px] h-[18px]" />
              <span className="flex-1 text-left">Input Data</span>
              {submenuOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
            {submenuOpen && (
              <div className="ml-6 flex flex-col gap-0.5 mt-0.5">
                {submenuTypes.map(type => (
                  <button key={type} onClick={() => onSelectType(type)} className={subItemClass(activeView === 'admin-input' && activeInputType === type)} style={{ width: 'calc(100% - 16px)' }}>
                    {typeIconMap[type]} {typeLabels[type]}
                  </button>
                ))}
              </div>
            )}

            <button onClick={onToggleLaporanSubmenu} className={navItemClass(activeView === 'admin-laporan')} style={{ width: 'calc(100% - 16px)' }}>
              <FileText className="w-[18px] h-[18px]" />
              <span className="flex-1 text-left">Laporan</span>
              {laporanSubmenuOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
            {laporanSubmenuOpen && (
              <div className="ml-6 flex flex-col gap-0.5 mt-0.5">
                {submenuTypes.map(type => (
                  <button key={type} onClick={() => onSelectLaporanType(type)} className={subItemClass(activeView === 'admin-laporan' && activeLaporanType === type)} style={{ width: 'calc(100% - 16px)' }}>
                    {typeIconMap[type]} {typeLabels[type]}
                  </button>
                ))}
              </div>
            )}

            <button onClick={onKalender} className={navItemClass(activeView === 'admin-kalender')} style={{ width: 'calc(100% - 16px)' }}>
              <Calendar className="w-[18px] h-[18px]" /> Kalender
            </button>
            <button onClick={onProfil} className={navItemClass(activeView === 'admin-profil')} style={{ width: 'calc(100% - 16px)' }}>
              <UserCircle className="w-[18px] h-[18px]" /> Profil
            </button>
          </>
        )}
      </nav>
    </aside>
  );
}
