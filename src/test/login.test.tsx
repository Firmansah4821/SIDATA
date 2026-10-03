import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import AuthPage from '@/pages/Auth';
import { useAuth } from '@/hooks/useAuth';

// ── Mock Supabase client (dikontrol per uji coba) ────────────────────────
const h = vi.hoisted(() => {
  const state: any = {
    listeners: [] as any[],
    rpcResult: { data: null, error: null },
    signInResult: { data: null, error: null },
    signInImpl: null as null | (() => Promise<any>),
    rolesResult: [] as any[],
    rolesPromise: null as Promise<any> | null,
    profileResult: { data: null, error: null },
    session: null as any,
    signOutCalls: 0,
    signInCalls: 0,
  };

  const supabase: any = {
    rpc: async () => state.rpcResult,
    auth: {
      onAuthStateChange: (cb: any) => {
        state.listeners.push(cb);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: async () => ({ data: { session: state.session, error: null }, error: null }),
      signInWithPassword: async () => {
        state.signInCalls++;
        if (state.signInImpl) return state.signInImpl();
        return state.signInResult;
      },
      signOut: async () => {
        state.signOutCalls++;
        state.session = null;
        state.listeners.forEach(l => l('SIGNED_OUT', null));
        return { error: null };
      },
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          if (table === 'profiles') {
            return { maybeSingle: async () => state.profileResult };
          }
          if (state.rolesPromise) return state.rolesPromise;
          return Promise.resolve({ data: state.rolesResult, error: null });
        },
      }),
    }),
  };

  return { state, supabase };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: h.supabase }));

const resetState = () => {
  h.state.listeners.length = 0;
  h.state.rpcResult = { data: null, error: null };
  h.state.signInResult = { data: null, error: null };
  h.state.signInImpl = null;
  h.state.rolesResult = [];
  h.state.rolesPromise = null;
  h.state.profileResult = { data: null, error: null };
  h.state.session = null;
  h.state.signOutCalls = 0;
  h.state.signInCalls = 0;
};

// ── Halaman login (AuthPage) ─────────────────────────────────────────────
describe('AuthPage — validasi & pesan', () => {
  const fillForm = (container: HTMLElement, role?: string) => {
    fireEvent.change(container.querySelector('#login-username')!, { target: { value: 'bima' } });
    fireEvent.change(container.querySelector('#login-password')!, { target: { value: 'rahasia123' } });
    if (role) fireEvent.change(container.querySelector('#login-role')!, { target: { value: role } });
  };

  it('dropdown role default placeholder "Silakan pilih peran" dengan pilihan Admin & Petugas', () => {
    const { container } = render(<AuthPage onSignIn={vi.fn()} />);
    const select = container.querySelector('#login-role') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(select).toHaveTextContent('Silakan pilih peran');
    const labels = Array.from(select.options).map(o => o.textContent?.trim());
    expect(labels).toContain('Admin');
    expect(labels).toContain('Petugas');
  });

  it('submit tanpa memilih peran menampilkan "Silakan pilih peran dulu" tanpa memanggil autentikasi', async () => {
    const onSignIn = vi.fn().mockResolvedValue(null);
    const { container } = render(<AuthPage onSignIn={onSignIn} />);
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText('Silakan pilih peran dulu')).toBeInTheDocument();
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it('kredensial salah mempertahankan pesan error generik', async () => {
    const onSignIn = vi.fn().mockResolvedValue({ message: 'Invalid login credentials' });
    const { container } = render(<AuthPage onSignIn={onSignIn} />);
    fillForm(container, 'admin');
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText('Username atau password salah. Silakan coba lagi.')).toBeInTheDocument();
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('peran tidak cocok (akun Petugas) menampilkan pesan terdaftar sebagai Petugas', async () => {
    const onSignIn = vi.fn().mockResolvedValue({ message: 'ROLE_MISMATCH', actualRole: 'operator' });
    const { container } = render(<AuthPage onSignIn={onSignIn} />);
    fillForm(container, 'admin');
    fireEvent.submit(container.querySelector('form')!);
    expect(
      await screen.findByText('Akun ini terdaftar sebagai Petugas — pilih Petugas untuk masuk')
    ).toBeInTheDocument();
  });

  it('peran tidak cocok (akun Admin) menampilkan pesan terdaftar sebagai Admin', async () => {
    const onSignIn = vi.fn().mockResolvedValue({ message: 'ROLE_MISMATCH', actualRole: 'admin' });
    const { container } = render(<AuthPage onSignIn={onSignIn} />);
    fillForm(container, 'operator');
    fireEvent.submit(container.querySelector('form')!);
    expect(
      await screen.findByText('Akun ini terdaftar sebagai Admin — pilih Admin untuk masuk')
    ).toBeInTheDocument();
  });

  it('tombol MASUK menampilkan loading selama verifikasi berjalan', async () => {
    let resolveSignIn: (v: any) => void = () => {};
    const onSignIn = vi.fn(() => new Promise<any>(res => { resolveSignIn = res; }));
    const { container } = render(<AuthPage onSignIn={onSignIn} />);
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    fillForm(container, 'admin');
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(submitBtn).toBeDisabled());
    await act(async () => { resolveSignIn(null); });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
  });
});

// ── useAuth — logika signIn + gerbang listener ───────────────────────────
describe('useAuth.signIn — verifikasi peran', () => {
  beforeEach(() => {
    resetState();
  });

  it('peran cocok (Admin): sesi ditahan selama verifikasi, lalu state terupdate setelah verifikasi lolos', async () => {
    let releaseRoles: () => void = () => {};
    h.state.rolesPromise = new Promise(res => {
      releaseRoles = () => res({ data: [{ role: 'admin' }], error: null });
    });
    h.state.signInImpl = async () => {
      // Listener auth menembak tepat setelah sign-in, sebelum verifikasi peran selesai.
      h.state.listeners.forEach(l => l('SIGNED_IN', { user: { id: 'user-1' } }));
      return { data: { user: { id: 'user-1' } }, error: null };
    };

    const { result, unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let pending!: Promise<any>;
    act(() => {
      pending = result.current.signIn('bima', 'rahasia123', 'admin');
    });

    // Verifikasi belum selesai → sesi ditahan, tidak ada navigasi.
    await new Promise(r => setTimeout(r, 20));
    expect(result.current.user).toBeNull();

    let err: any;
    await act(async () => {
      releaseRoles();
      err = await pending;
    });
    expect(err).toBeNull();
    await waitFor(() => expect(result.current.user).not.toBeNull());
    expect(result.current.user?.id).toBe('user-1');
    unmount();
  });

  it('peran cocok (Petugas): login berhasil untuk akun non-admin', async () => {
    h.state.rolesResult = [{ role: 'operator' }];
    h.state.signInImpl = async () => {
      h.state.listeners.forEach(l => l('SIGNED_IN', { user: { id: 'user-2' } }));
      return { data: { user: { id: 'user-2' } }, error: null };
    };

    const { result, unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: any;
    await act(async () => {
      err = await result.current.signIn('bima', 'rahasia123', 'operator');
    });
    expect(err).toBeNull();
    await waitFor(() => expect(result.current.user?.id).toBe('user-2'));
    unmount();
  });

  it('peran salah (akun Petugas dipilih Admin): sesi dibersihkan, tanpa navigasi', async () => {
    h.state.rolesResult = [{ role: 'operator' }];
    h.state.signInImpl = async () => {
      h.state.listeners.forEach(l => l('SIGNED_IN', { user: { id: 'user-1' } }));
      return { data: { user: { id: 'user-1' } }, error: null };
    };

    const { result, unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: any;
    await act(async () => {
      err = await result.current.signIn('bima', 'rahasia123', 'admin');
    });
    expect(err.message).toBe('ROLE_MISMATCH');
    expect(err.actualRole).toBe('operator');
    expect(h.state.signOutCalls).toBe(1);
    expect(result.current.user).toBeNull();
    unmount();
  });

  it('peran salah (akun Admin dipilih Petugas): sesi dibersihkan, actualRole admin', async () => {
    h.state.rolesResult = [{ role: 'admin' }];
    h.state.signInImpl = async () => {
      h.state.listeners.forEach(l => l('SIGNED_IN', { user: { id: 'user-3' } }));
      return { data: { user: { id: 'user-3' } }, error: null };
    };

    const { result, unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: any;
    await act(async () => {
      err = await result.current.signIn('bima', 'rahasia123', 'operator');
    });
    expect(err.message).toBe('ROLE_MISMATCH');
    expect(err.actualRole).toBe('admin');
    expect(h.state.signOutCalls).toBe(1);
    expect(result.current.user).toBeNull();
    unmount();
  });

  it('kredensial salah: mengembalikan error autentikasi apa adanya, tanpa signOut', async () => {
    h.state.signInResult = { data: null, error: { message: 'Invalid login credentials' } };

    const { result, unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: any;
    await act(async () => {
      err = await result.current.signIn('bima', 'salah', 'admin');
    });
    expect(err.message).toBe('Invalid login credentials');
    expect(h.state.signInCalls).toBe(1);
    expect(h.state.signOutCalls).toBe(0);
    expect(result.current.user).toBeNull();
    unmount();
  });
});
