import { DataType, typeLabels } from '@/lib/sidata-config';
import { LayoutDashboard, PenSquare, FileText, ChevronDown, ChevronRight, Calendar, UserCircle, Settings } from 'lucide-react';
import logoBima from '@/assets/logo-bima.png';

const submenuTypes: DataType[] = ['surat_masuk', 'surat_keluar', 'buku_tamu', 'inventaris_dokumen', 'pengajuan_bpn', 'perjalanan_dinas', 'agenda_rapat', 'lembur'];

export type PengaturanItem = 'log-aktivitas' | 'backup-restore';

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
  /** Admin only — Pengaturan submenu state */
  pengaturanSubmenuOpen?: boolean;
  onTogglePengaturanSubmenu?: () => void;
  onSelectPengaturan?: (item: PengaturanItem) => void;
}

export default function Sidebar({
  visible, isAdmin, activeView, activeInputType, activeLaporanType,
  submenuOpen, laporanSubmenuOpen,
  onToggleSubmenu, onToggleLaporanSubmenu,
  onDashboard, onSelectType, onSelectLaporanType, onAdminDashboard, onProfil,
  onKalender,
  pengaturanSubmenuOpen = false,
  onTogglePengaturanSubmenu = () => {},
  onSelectPengaturan,
}: SidebarProps) {
  // Active item = chip warna aksen (--sidebar-active-bg/fg).
  // Parent with an open submenu (not active) = tint aksen via .sidata-nav-open.
  const navItemClass = (isActive: boolean, isOpen = false) =>
    `w-full text-left px-3.5 py-2.5 text-[14.5px] flex items-center gap-3 rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)] font-bold shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)]'
        : isOpen
          ? 'sidata-nav-open text-white font-semibold'
          : 'text-white/75 font-medium hover:bg-white/10 hover:text-white'
    }`;

  // Submenu items: teks saja (tanpa ikon), indent rapat.
  const subItemClass = (isActive: boolean) =>
    `text-left pl-9 pr-3 py-2 text-[13px] flex items-center gap-2.5 rounded-lg transition-all duration-200 ${
      isActive
        ? 'sidata-nav-sub-active text-white font-semibold'
        : 'text-white/60 hover:text-white hover:bg-white/10'
    }`;

  const activeIconCls = 'text-[var(--sidebar-active-fg)]';

  const chevron = (open: boolean) =>
    open ? <ChevronDown className="w-4 h-4 opacity-50 shrink-0" /> : <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />;
  const leafChevron = <ChevronRight className="w-4 h-4 opacity-50 shrink-0 ml-auto" />;

  const pengaturanActive =
    activeView === 'admin-log-aktivitas' || activeView === 'admin-backup-restore';

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
              <LayoutDashboard className={`w-[19px] h-[19px] shrink-0 ${activeView === 'dashboard' ? activeIconCls : ''}`} /> Dashboard
            </button>
            <button
              onClick={onToggleSubmenu}
              aria-expanded={submenuOpen}
              className={navItemClass(activeView === 'input', submenuOpen)}
            >
              <PenSquare className={`w-[19px] h-[19px] shrink-0 ${activeView === 'input' ? activeIconCls : ''}`} />
              <span className="flex-1 text-left">Input Data</span>
              {chevron(submenuOpen)}
            </button>
            {submenuOpen && (
              <div className="flex flex-col gap-0.5 mt-1 mb-1">
                {submenuTypes.map(type => (
                  <button key={type} onClick={() => onSelectType(type)} className={subItemClass(activeView === 'input' && activeInputType === type)}>
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onKalender} className={navItemClass(activeView === 'kalender')}>
              <Calendar className={`w-[19px] h-[19px] shrink-0 ${activeView === 'kalender' ? activeIconCls : ''}`} />
              <span className="flex-1 text-left">Kalender</span>
              {leafChevron}
            </button>
            <button onClick={onProfil} className={navItemClass(activeView === 'profil')}>
              <UserCircle className={`w-[19px] h-[19px] shrink-0 ${activeView === 'profil' ? activeIconCls : ''}`} />
              <span className="flex-1 text-left">Profil</span>
              {leafChevron}
            </button>
          </>
        ) : (
          <>
            <button onClick={onAdminDashboard} className={navItemClass(activeView === 'admin-dashboard')}>
              <LayoutDashboard className={`w-[19px] h-[19px] shrink-0 ${activeView === 'admin-dashboard' ? activeIconCls : ''}`} /> Dashboard Admin
            </button>

            {/* Input Data menu for Admin — submenu tertutup default */}
            <button
              onClick={onToggleSubmenu}
              aria-expanded={submenuOpen}
              className={navItemClass(activeView === 'admin-input', submenuOpen)}
            >
              <PenSquare className={`w-[19px] h-[19px] shrink-0 ${activeView === 'admin-input' ? activeIconCls : ''}`} />
              <span className="flex-1 text-left">Input Data</span>
              {chevron(submenuOpen)}
            </button>
            {submenuOpen && (
              <div className="flex flex-col gap-0.5 mt-1 mb-1">
                {submenuTypes.map(type => (
                  <button key={type} onClick={() => onSelectType(type)} className={subItemClass(activeView === 'admin-input' && activeInputType === type)}>
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
            )}

            {/* Laporan — submenu terbuka default */}
            <button
              onClick={onToggleLaporanSubmenu}
              aria-expanded={laporanSubmenuOpen}
              className={navItemClass(activeView === 'admin-laporan', laporanSubmenuOpen)}
            >
              <FileText className={`w-[19px] h-[19px] shrink-0 ${activeView === 'admin-laporan' ? activeIconCls : ''}`} />
              <span className="flex-1 text-left">Laporan</span>
              {chevron(laporanSubmenuOpen)}
            </button>
            {laporanSubmenuOpen && (
              <div className="flex flex-col gap-0.5 mt-1 mb-1">
                {submenuTypes.map(type => (
                  <button key={type} onClick={() => onSelectLaporanType(type)} className={subItemClass(activeView === 'admin-laporan' && activeLaporanType === type)}>
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
            )}

            <button onClick={onKalender} className={navItemClass(activeView === 'admin-kalender')}>
              <Calendar className={`w-[19px] h-[19px] shrink-0 ${activeView === 'admin-kalender' ? activeIconCls : ''}`} />
              <span className="flex-1 text-left">Kalender</span>
              {leafChevron}
            </button>
            <button onClick={onProfil} className={navItemClass(activeView === 'admin-profil')}>
              <UserCircle className={`w-[19px] h-[19px] shrink-0 ${activeView === 'admin-profil' ? activeIconCls : ''}`} />
              <span className="flex-1 text-left">Profil</span>
              {leafChevron}
            </button>

            {/* Pengaturan — khusus Admin, di bawah Profil */}
            <button
              onClick={onTogglePengaturanSubmenu}
              aria-expanded={pengaturanSubmenuOpen}
              className={navItemClass(pengaturanActive, pengaturanSubmenuOpen)}
            >
              <Settings className={`w-[19px] h-[19px] shrink-0 ${pengaturanActive ? activeIconCls : ''}`} />
              <span className="flex-1 text-left">Pengaturan</span>
              {chevron(pengaturanSubmenuOpen)}
            </button>
            {pengaturanSubmenuOpen && (
              <div className="flex flex-col gap-0.5 mt-1 mb-1">
                <button
                  onClick={() => onSelectPengaturan?.('log-aktivitas')}
                  className={subItemClass(activeView === 'admin-log-aktivitas')}
                >
                  Log Aktivitas
                </button>
                <button
                  onClick={() => onSelectPengaturan?.('backup-restore')}
                  className={subItemClass(activeView === 'admin-backup-restore')}
                >
                  Backup &amp; Restore
                </button>
              </div>
            )}
          </>
        )}
      </nav>
    </aside>
  );
}
