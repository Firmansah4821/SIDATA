import { useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

// Penanda "sesi berakhir karena tidak ada aktivitas" — ditulis tepat sebelum
// logout otomatis, lalu dibaca (dan dihapus) oleh halaman login untuk menampilkan
// pesan. sessionStorage: lintas navigasi dalam satu tab, ikut tertutup saat tab ditutup.
const SESSION_EXPIRED_KEY = 'sidata.session_expired';

export function markSessionExpired() {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
  } catch {
    // storage tidak tersedia — pesan login cukup dilewati
  }
}

export function consumeSessionExpired(): boolean {
  try {
    const value = sessionStorage.getItem(SESSION_EXPIRED_KEY);
    if (value) sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return !!value;
  } catch {
    return false;
  }
}

export function useIdleTimeout(onTimeout: () => void, enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (enabled) {
      timerRef.current = setTimeout(onTimeout, IDLE_TIMEOUT_MS);
    }
  }, [onTimeout, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer, enabled]);
}
