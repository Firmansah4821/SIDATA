import { DataType, typeLabels } from '@/lib/sidata-config';
import { LayoutDashboard, PenSquare, FileText, ChevronDown, ChevronRight, Mail, MailOpen, UserCheck, FolderArchive, Building2, Car, CalendarDays, UserCircle, Clock, Calendar } from 'lucide-react';
import logoBima from '@/assets/logo-bima.png';

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
    `w-full text-left px-3.5 py-2.5 text-[14.5px] flex items-center gap-3 rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-[#f7f3e6] text-[#16233b] font-bold shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)]'
        : 'text-white/75 font-medium hover:bg-white/10 hover:text-white'
    }`;

  const subItemClass = (isActive: boolean) =>
    `text-left pl-9 pr-3 py-2 text-[13px] flex items-center gap-2.5 rounded-lg transition-all duration-200 ${
      isActive
        ? 'bg-white/15 text-white font-semibold'
        : 'text-white/55 hover:text-white hover:bg-white/10'
    }`;

  return (
    <aside
      className={`sidata-sidebar w-[268px] shrink-0 overflow-y-auto flex flex-col fixed inset-y-0 left-0 z-[999] transition-transform duration-300 md:static md:z-auto ${
        visible ? 'translate-x-0' : '-translate-x-full md:hidden'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <img src={logoBima} alt="Logo Kabupaten Bima" className="w-10 h-10 object-contain shrink-0 drop-shadow-sm" />
        <div className="leading-tight min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-wide leading-none text-white">SIDATA</h1>
          <p className="text-[9.5px] text-white/60 mt-1 font-medium whitespace-nowrap tracking-[0.01em]">Sistem Informasi Data Pertanahan</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3 pb-6">
        {!isAdmin ? (
          <>
            <button onClick={onDashboard} className={navItemClass(activeView === 'dashboard')}>
              <LayoutDashboard className={`w-[19px] h-[19px] shrink-0 ${activeView === 'dashboard' ? 'text-teal-600' : ''}`} /> Dashboard
            </button>
            <button onClick={onToggleSubmenu} className={navItemClass(activeView === 'input')}>
              <PenSquare className={`w-[19px] h-[19px] shrink-0 ${activeView === 'input' ? 'text-teal-600' : ''}`} />
              <span className="flex-1 text-left">Input Data</span>
              {submenuOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
            {submenuOpen && (
              <div className="flex flex-col gap-0.5 mt-1 mb-1">
                {submenuTypes.map(type => (
                  <button key={type} onClick={() => onSelectType(type)} className={subItemClass(activeView === 'input' && activeInputType === type)}>
                    {typeIconMap[type]} {typeLabels[type]}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onKalender} className={navItemClass(activeView === 'kalender')}>
              <Calendar className={`w-[19px] h-[19px] shrink-0 ${activeView === 'kalender' ? 'text-teal-600' : ''}`} /> Kalender
            </button>
            <button onClick={onProfil} className={navItemClass(activeView === 'profil')}>
              <UserCircle className={`w-[19px] h-[19px] shrink-0 ${activeView === 'profil' ? 'text-teal-600' : ''}`} /> Profil
            </button>
          </>
        ) : (
          <>
            <button onClick={onAdminDashboard} className={navItemClass(activeView === 'admin-dashboard')}>
              <LayoutDashboard className={`w-[19px] h-[19px] shrink-0 ${activeView === 'admin-dashboard' ? 'text-teal-600' : ''}`} /> Dashboard Admin
            </button>

            {/* Input Data menu for Admin */}
            <button onClick={onToggleSubmenu} className={navItemClass(activeView === 'admin-input')}>
              <PenSquare className={`w-[19px] h-[19px] shrink-0 ${activeView === 'admin-input' ? 'text-teal-600' : ''}`} />
              <span className="flex-1 text-left">Input Data</span>
              {submenuOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
            {submenuOpen && (
              <div className="flex flex-col gap-0.5 mt-1 mb-1">
                {submenuTypes.map(type => (
                  <button key={type} onClick={() => onSelectType(type)} className={subItemClass(activeView === 'admin-input' && activeInputType === type)}>
                    {typeIconMap[type]} {typeLabels[type]}
                  </button>
                ))}
              </div>
            )}

            <button onClick={onToggleLaporanSubmenu} className={navItemClass(activeView === 'admin-laporan')}>
              <FileText className={`w-[19px] h-[19px] shrink-0 ${activeView === 'admin-laporan' ? 'text-teal-600' : ''}`} />
              <span className="flex-1 text-left">Laporan</span>
              {laporanSubmenuOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
            {laporanSubmenuOpen && (
              <div className="flex flex-col gap-0.5 mt-1 mb-1">
                {submenuTypes.map(type => (
                  <button key={type} onClick={() => onSelectLaporanType(type)} className={subItemClass(activeView === 'admin-laporan' && activeLaporanType === type)}>
                    {typeIconMap[type]} {typeLabels[type]}
                  </button>
                ))}
              </div>
            )}

            <button onClick={onKalender} className={navItemClass(activeView === 'admin-kalender')}>
              <Calendar className={`w-[19px] h-[19px] shrink-0 ${activeView === 'admin-kalender' ? 'text-teal-600' : ''}`} /> Kalender
            </button>
            <button onClick={onProfil} className={navItemClass(activeView === 'admin-profil')}>
              <UserCircle className={`w-[19px] h-[19px] shrink-0 ${activeView === 'admin-profil' ? 'text-teal-600' : ''}`} /> Profil
            </button>
          </>
        )}
      </nav>
    </aside>
  );
}
