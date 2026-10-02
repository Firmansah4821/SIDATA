import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastListener: ((t: ToastData) => void) | null = null;

export function showSidataToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  toastListener?.({ id: crypto.randomUUID(), message, type });
}

const typeConfig = {
  success: { bg: 'bg-success', icon: CheckCircle2 },
  error: { bg: 'bg-destructive', icon: XCircle },
  info: { bg: 'bg-info', icon: Info },
};

export default function SidataToast() {
  const [toasts, setToasts] = useState<(ToastData & { hiding?: boolean })[]>([]);

  useEffect(() => {
    toastListener = (t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => {
        setToasts(prev => prev.map(x => x.id === t.id ? { ...x, hiding: true } : x));
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 300);
      }, 3000);
    };
    return () => { toastListener = null; };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-[2000] flex flex-col gap-2">
      {toasts.map(t => {
        const config = typeConfig[t.type];
        const Icon = config.icon;
        return (
          <div
            key={t.id}
            className={`${config.bg} text-primary-foreground px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2.5 ${t.hiding ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="whitespace-pre-line">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
