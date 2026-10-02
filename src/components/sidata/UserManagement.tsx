import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Trash2, Pencil, Loader2, Users, Shield, Eye, EyeOff, AlertTriangle, Save } from 'lucide-react';
import { showSidataToast } from '@/components/sidata/Toast';

interface ManagedUser {
  user_id: string;
  full_name: string | null;
  jabatan: string | null;
  username: string | null;
  role: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newJabatan, setNewJabatan] = useState('');
  const [newRole, setNewRole] = useState<'operator' | 'admin'>('operator');
  const [showPass, setShowPass] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Edit state
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editJabatan, setEditJabatan] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editShowPass, setEditShowPass] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, full_name, jabatan, username' as any);
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rErr) throw rErr;

      const roleMap = new Map<string, string>();
      (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      const merged: ManagedUser[] = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        jabatan: p.jabatan,
        username: p.username || null,
        role: roleMap.get(p.user_id) || 'operator',
      }));

      setUsers(merged);
    } catch (err) {
      console.error('Error fetching users:', err);
      showSidataToast('Gagal memuat data user', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = () => {
    setNewUsername('');
    setNewEmail('');
    setNewPassword('');
    setNewFullName('');
    setNewJabatan('');
    setNewRole('operator');
    setShowForm(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword || !newFullName.trim()) return;

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername.trim())) {
      showSidataToast('Username hanya boleh berisi huruf, angka, dan underscore', 'error');
      return;
    }

    if (newRole === 'admin' && !newEmail.trim()) {
      showSidataToast('Email diperlukan untuk akun admin', 'error');
      return;
    }

    setFormLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('admin-create-user', {
        body: {
          username: newUsername.trim(),
          email: newRole === 'admin' ? newEmail.trim() : null,
          password: newPassword,
          full_name: newFullName.trim(),
          jabatan: newJabatan.trim() || null,
          role: newRole,
        },
      });

      if (res.error) throw new Error(res.error.message || 'Gagal menambahkan user');
      if (res.data?.error) throw new Error(res.data.error);

      showSidataToast(`User ${newFullName.trim()} berhasil ditambahkan`, 'success');
      resetForm();
      await fetchUsers();
    } catch (err: any) {
      console.error('Error adding user:', err);
      showSidataToast(err.message || 'Gagal menambahkan user', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete state
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState<string | null>(null);
  const [deleteUserRole, setDeleteUserRole] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const confirmDeleteUser = (userId: string, name: string | null, role: string) => {
    if (userId === currentUserId) {
      showSidataToast('Tidak dapat menghapus akun Anda sendiri', 'error');
      return;
    }
    setDeleteUserId(userId);
    setDeleteUserName(name);
    setDeleteUserRole(role);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    setDeleteLoading(true);
    const userId = deleteUserId;
    const name = deleteUserName;

    try {
      const res = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
      });

      if (res.error) throw new Error(res.error.message || 'Gagal menghapus user');
      if (res.data?.error) throw new Error(res.data.error);

      showSidataToast(`User ${name || ''} berhasil dihapus`, 'success');
      setDeleteUserId(null);
      setDeleteUserName(null);
      setDeleteUserRole(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      showSidataToast(err.message || 'Gagal menghapus user', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Edit handlers
  const openEditModal = (u: ManagedUser) => {
    setEditUser(u);
    setEditFullName(u.full_name || '');
    setEditJabatan(u.jabatan || '');
    setEditUsername(u.username || '');
    setEditPassword('');
    setEditShowPass(false);
    setShowEditConfirm(false);
  };

  const closeEditModal = () => {
    setEditUser(null);
    setShowEditConfirm(false);
  };

  const handleEditSubmit = async () => {
    if (!editUser) return;
    if (!editFullName.trim() || !editUsername.trim()) {
      showSidataToast('Nama dan username wajib diisi', 'error');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(editUsername.trim())) {
      showSidataToast('Username hanya boleh berisi huruf, angka, dan underscore', 'error');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      showSidataToast('Password minimal 6 karakter', 'error');
      return;
    }

    setEditLoading(true);
    try {
      const res = await supabase.functions.invoke('admin-update-user', {
        body: {
          user_id: editUser.user_id,
          full_name: editFullName.trim(),
          jabatan: editJabatan.trim() || null,
          username: editUsername.trim(),
          password: editPassword || undefined,
        },
      });

      if (res.error) throw new Error(res.error.message || 'Gagal mengupdate user');
      if (res.data?.error) throw new Error(res.data.error);

      showSidataToast(`Data ${editFullName.trim()} berhasil diperbarui`, 'success');
      closeEditModal();
      await fetchUsers();
    } catch (err: any) {
      console.error('Error updating user:', err);
      showSidataToast(err.message || 'Gagal mengupdate user', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/10 transition-all";

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Kelola User</h2>
            <p className="text-sm text-muted-foreground">Tambah, edit, dan hapus akun user</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4">Tambah User Baru</h3>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Nama Lengkap *</label>
              <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)} className={inputClass} placeholder="Nama lengkap" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Jabatan</label>
              <input type="text" value={newJabatan} onChange={e => setNewJabatan(e.target.value)} className={inputClass} placeholder="Jabatan (opsional)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Username *</label>
              <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className={inputClass} placeholder="Username (contoh: operator1)" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Password *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`${inputClass} pr-10`} placeholder="Min 6 karakter" required minLength={6} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className={inputClass}>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {newRole === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email * <span className="normal-case text-[10px]">(untuk verifikasi admin)</span></label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={inputClass} placeholder="email@kantor.go.id" required />
              </div>
            )}
            <div className={`flex items-end ${newRole === 'admin' ? 'md:col-span-2' : ''}`}>
              <button type="submit" disabled={formLoading} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan User
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">No</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Username</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Jabatan</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Role</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada user terdaftar</td></tr>
                ) : (
                  users.map((u, idx) => (
                    <tr key={u.user_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{u.full_name || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{u.username || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.jabatan || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.role === 'admin'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-accent text-accent-foreground'
                        }`}>
                          {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                          {u.role === 'admin' ? 'Admin' : 'Operator'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.user_id === currentUserId ? (
                          <span className="text-xs text-muted-foreground italic">Anda</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                              title="Edit user"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDeleteUser(u.user_id, u.full_name, u.role)}
                              className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                              title="Hapus user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUserId && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { if (!deleteLoading) { setDeleteUserId(null); setDeleteUserName(null); setDeleteUserRole(null); } }}>
          <div className="bg-card rounded-2xl p-6 max-w-[480px] w-full shadow-2xl animate-slide-up border border-border" onClick={e => e.stopPropagation()}>
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Hapus {deleteUserRole === 'admin' ? 'Admin' : 'Operator'}?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Tindakan ini tidak dapat dibatalkan. {deleteUserRole === 'admin' ? 'Admin' : 'Operator'} "<strong>{deleteUserName || 'Unknown'}</strong>" akan dihapus secara permanen dan tidak bisa login lagi.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteUserId(null); setDeleteUserName(null); setDeleteUserRole(null); }}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:bg-muted transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && !showEditConfirm && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { if (!editLoading) closeEditModal(); }}>
          <div className="bg-card rounded-2xl p-6 max-w-[520px] w-full shadow-2xl animate-slide-up border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Edit {editUser.role === 'admin' ? 'Admin' : 'Operator'}
                </h3>
                <p className="text-xs text-muted-foreground">Perbarui data {editUser.role === 'admin' ? 'admin' : 'operator'} ini</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Nama Lengkap *</label>
                <input type="text" value={editFullName} onChange={e => setEditFullName(e.target.value)} className={inputClass} placeholder="Nama lengkap" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Username *</label>
                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} className={inputClass} placeholder="Username" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Jabatan</label>
                <input type="text" value={editJabatan} onChange={e => setEditJabatan(e.target.value)} className={inputClass} placeholder="Jabatan (opsional)" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Password Baru <span className="normal-case text-[10px]">(kosongkan jika tidak diubah)</span></label>
                <div className="relative">
                  <input type={editShowPass ? 'text' : 'password'} value={editPassword} onChange={e => setEditPassword(e.target.value)} className={`${inputClass} pr-10`} placeholder="Min 6 karakter" minLength={6} />
                  <button type="button" onClick={() => setEditShowPass(!editShowPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                    {editShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditModal}
                disabled={editLoading}
                className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:bg-muted transition-all active:scale-[0.98] disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={() => setShowEditConfirm(true)}
                disabled={editLoading || !editFullName.trim() || !editUsername.trim()}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirmation Modal */}
      {editUser && showEditConfirm && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { if (!editLoading) setShowEditConfirm(false); }}>
          <div className="bg-card rounded-2xl p-6 max-w-[480px] w-full shadow-2xl animate-slide-up border border-border" onClick={e => e.stopPropagation()}>
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Pencil className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Simpan Perubahan {editUser.role === 'admin' ? 'Admin' : 'Operator'}?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Data {editUser.role === 'admin' ? 'admin' : 'operator'} "<strong>{editFullName}</strong>" akan diperbarui.
                {editPassword ? ' Password juga akan diubah.' : ''}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditConfirm(false)}
                  disabled={editLoading}
                  className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:bg-muted transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  Kembali
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={editLoading}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
