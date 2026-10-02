import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

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

  const fetchProfileAndRole = useCallback(async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('full_name, jabatan, username, avatar_url' as any).eq('user_id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    const pData = profileRes.data as any;
    const profile: Profile = pData
      ? { full_name: pData.full_name, jabatan: pData.jabatan, username: pData.username || null, avatar_url: pData.avatar_url || null }
      : { full_name: null, jabatan: null, username: null, avatar_url: null };

    const isAdmin = (roleRes.data || []).some((r: any) => r.role === 'admin');

    return { profile, isAdmin };
  }, []);

  useEffect(() => {
    let mounted = true;

    const setUnauthed = () => {
      if (!mounted) return;
      setState({ user: null, session: null, profile: null, isAdmin: false, loading: false });
    };

    const setAuthed = async (session: Session) => {
      try {
        const profileTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('profile_timeout')), 5000)
        );

        const { profile, isAdmin } = await Promise.race([
          fetchProfileAndRole(session.user.id),
          profileTimeout,
        ]);

        if (!mounted) return;
        setState({ user: session.user, session, profile, isAdmin, loading: false });
      } catch {
        if (!mounted) return;
        setState({ user: session.user, session, profile: null, isAdmin: false, loading: false });
      }
    };

    const safetyTimer = setTimeout(() => {
      if (!mounted) return;
      setState((s) => ({ ...s, loading: false }));
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) void setAuthed(session);
      else setUnauthed();
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
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfileAndRole]);

  const signIn = async (username: string, password: string, role?: 'admin' | 'operator') => {
    // Look up email by username using RPC
    const { data: email, error: rpcError } = await supabase.rpc('get_email_by_username' as any, { _username: username });

    const loginEmail = !rpcError && email ? (email as string) : username;
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error || !role || !data.user) return error;

    // Verify selected role against existing user_roles
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
    const isAdminUser = (roles || []).some((r: any) => r.role === 'admin');
    const matches = role === 'admin' ? isAdminUser : !isAdminUser;
    if (!matches) {
      await supabase.auth.signOut();
      return { message: 'ROLE_MISMATCH', status: 403 } as any;
    }
    return null;
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
