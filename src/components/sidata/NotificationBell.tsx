import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell } from 'lucide-react';
import { typeLabels, DataType } from '@/lib/sidata-config';

interface Notification {
  id: string;
  message: string;
  time: Date;
  recordType: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sidata-viewed-records');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const ref = useRef<HTMLDivElement>(null);

  // Load unviewed records on mount
  const loadUnviewedRecords = useCallback(async () => {
    const { data } = await supabase
      .from('sidata_records')
      .select('id, type, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const unviewed = data
        .filter((r: any) => !viewedIds.has(r.id))
        .map((r: any) => ({
          id: r.id,
          message: `Data baru: ${typeLabels[r.type as DataType] || r.type}`,
          time: new Date(r.created_at),
          recordType: r.type,
        }));
      setNotifications(unviewed);
    }
  }, [viewedIds]);

  useEffect(() => {
    loadUnviewedRecords();
  }, []);

  // Realtime listener for new records
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sidata_records' },
        (payload) => {
          const newRecord = payload.new as any;
          if (!viewedIds.has(newRecord.id)) {
            const typeLabel = typeLabels[newRecord.type as DataType] || newRecord.type;
            const notif: Notification = {
              id: newRecord.id,
              message: `Data baru: ${typeLabel}`,
              time: new Date(),
              recordType: newRecord.type,
            };
            setNotifications(prev => [notif, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [viewedIds]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Mark all as viewed when opening notification panel
  const handleMarkViewed = () => {
    const newViewed = new Set(viewedIds);
    notifications.forEach(n => newViewed.add(n.id));
    setViewedIds(newViewed);
    localStorage.setItem('sidata-viewed-records', JSON.stringify([...newViewed]));
    setNotifications([]);
    setOpen(false);
  };

  // Also expose a method to mark viewed when records are opened in laporan
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.recordId) {
        setViewedIds(prev => {
          const next = new Set(prev);
          next.add(e.detail.recordId);
          localStorage.setItem('sidata-viewed-records', JSON.stringify([...next]));
          return next;
        });
        setNotifications(prev => prev.filter(n => n.id !== e.detail.recordId));
      }
    };
    window.addEventListener('sidata-record-viewed' as any, handler);
    return () => window.removeEventListener('sidata-record-viewed' as any, handler);
  }, []);

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-foreground/[0.07] transition-all duration-200 active:scale-95 relative"
        title="Notifikasi"
      >
        <Bell className="w-[18px] h-[18px] text-foreground/75" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl w-80 shadow-xl z-50 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Notifikasi {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkViewed} className="text-[10px] text-primary hover:underline font-semibold">
                Tandai sudah dibaca
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Tidak ada data baru</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="px-4 py-3 border-b border-border/50 last:border-0 bg-primary/5">
                  <p className="text-xs text-foreground font-medium">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {n.time.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
