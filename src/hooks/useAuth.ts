import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

// ── Gerbang verifikasi peran login ──────────────────────────────────────
// Selama signIn() memverifikasi peran, listener onAuthStateChange menahan
// sesi (tidak memperbarui state) agar halaman tidak berpindah/berkedip
// sebelum verifikasi selesai. Sesi yang ditahan diterapkan tepat satu kali
// setelah verifikasi lolos.
let loginVerificationPending = false;
let heldSessionDuringVerification: Session | null = null;
let applySessionToState: ((session: Session, knownIsAdmin?: boolean) => Promise<void>) | null = null;

export interface Profile {
  full_name: string | null;
  jabatan: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isAdmin: false,
    loading: true,
  });

  // Query profil — hanya satu tempat agar tidak dobel saat login maupun muat ulang.
  const fetchProfile = useCallback(async (userId: string): Promise<Profile> => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, jabatan, username, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();
    return data
      ? { full_name: data.full_name, jabatan: data.jabatan, username: data.username || null, avatar_url: data.avatar_url || null }
      : { full_name: null, jabatan: null, username: null, avatar_url: null };
  }, []);

  const fetchProfileAndRole = useCallback(async (userId: string, knownIsAdmin?: boolean) => {
    // Saat login, peran sudah diverifikasi oleh signIn() → lewati query user_roles
    // kedua agar tidak ada fetch berlebih sebelum dashboard tampil.
    if (knownIsAdmin !== undefined) {
      return { profile: await fetchProfile(userId), isAdmin: knownIsAdmin };
    }

    const [profile, roleRes] = await Promise.all([
      fetchProfile(userId),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    const isAdmin = (roleRes.data || []).some(r => r.role === 'admin');

    return { profile, isAdmin };
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const setUnauthed = () => {
      if (!mounted) return;
      setState({ user: null, session: null, profile: null, isAdmin: false, loading: false });
    };

    const setAuthed = async (session: Session, knownIsAdmin?: boolean) => {
      try {
        const profileTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('profile_timeout')), 5000)
        );

        const { profile, isAdmin } = await Promise.race([
          fetchProfileAndRole(session.user.id, knownIsAdmin),
          profileTimeout,
        ]);

        if (!mounted) return;
        setState({ user: session.user, session, profile, isAdmin, loading: false });
      } catch {
        if (!mounted) return;
        setState({ user: session.user, session, profile: null, isAdmin: false, loading: false });
      }
    };

    applySessionToState = setAuthed;

    const safetyTimer = setTimeout(() => {
      if (!mounted) return;
      setState((s) => ({ ...s, loading: false }));
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        // Tahan sesi selama verifikasi peran login masih berjalan.
        if (loginVerificationPending) {
          heldSessionDuringVerification = session;
          return;
        }
        void setAuthed(session);
      } else {
        heldSessionDuringVerification = null;
        setUnauthed();
      }
    });

    const init = async () => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('session_timeout')), 5000)
      );

      try {
        const result = (await Promise.race([
          supabase.auth.getSession(),
          timeout,
        ])) as Awaited<ReturnType<typeof supabase.auth.getSession>>;

        if (!mounted) return;
        const { data: { session }, error } = result;

        if (error || !session?.user) {
          setUnauthed();
          return;
        }

        await setAuthed(session);
      } catch {
        setUnauthed();
      } finally {
        clearTimeout(safetyTimer);
      }
    };

    void init();

    return () => {
      mounted = false;
      applySessionToState = null;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfileAndRole]);

  const signIn = async (username: string, password: string, role?: 'admin' | 'operator') => {
    loginVerificationPending = true;
    heldSessionDuringVerification = null;
    try {
      // Look up email by username using RPC
      const { data: email, error: rpcError } = await supabase.rpc('get_email_by_username' as any, { _username: username });

      const loginEmail = !rpcError && email ? (email as string) : username;
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error || !data.user) return error;
      if (!role) {
        // Tanpa peran terpilih: jangan biarkan sesi tanpa verifikasi peran.
        await supabase.auth.signOut();
        return { message: 'ROLE_REQUIRED', status: 400 } as any;
      }

      // Verify selected role against existing user_roles
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
      const isAdminUser = (roles || []).some((r: any) => r.role === 'admin');
      const matches = role === 'admin' ? isAdminUser : !isAdminUser;
      if (!matches) {
        // Peran tidak cocok: bersihkan sesi yang baru terbentuk, tanpa navigasi.
        await supabase.auth.signOut();
        return { message: 'ROLE_MISMATCH', status: 403, actualRole: isAdminUser ? 'admin' : 'operator' } as any;
      }

      // Verifikasi lolos — rilis gerbang lalu terapkan sesi (navigasi satu kali).
      loginVerificationPending = false;
      let session = heldSessionDuringVerification;
      heldSessionDuringVerification = null;
      if (!session) {
        const { data: current } = await supabase.auth.getSession();
        session = current.session;
      }
      if (session && applySessionToState) await applySessionToState(session, isAdminUser);
      return null;
    } finally {
      loginVerificationPending = false;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (!state.user) return;
    const { profile, isAdmin } = await fetchProfileAndRole(state.user.id);
    setState(s => ({ ...s, profile, isAdmin }));
  };

  return { ...state, signIn, signUp, signOut, refreshProfile };
}
