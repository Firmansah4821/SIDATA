import { useState } from 'react';
import { X, Plus, Pencil, Trash2, Loader2, Check, AlertCircle, Users } from 'lucide-react';
import { usePegawaiOptions, type PegawaiOption } from '@/hooks/usePegawaiOptions';
import { showSidataToast } from './Toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ManagePegawaiModal({ open, onClose }: Props) {
  const { items, loading, add, update, remove } = usePegawaiOptions();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PegawaiOption | null>(null);
  const [search, setSearch] = useState('');

  if (!open) return null;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await add(newName);
      setNewName('');
      showSidataToast('Nama berhasil ditambahkan', 'success');
    } catch (e: any) {
      showSidataToast(e.message || 'Gagal menambahkan nama', 'error');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item: PegawaiOption) => {
    setEditId(item.id);
    setEditValue(item.name);
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    try {
      await update(id, editValue);
      setEditId(null);
      setEditValue('');
      showSidataToast('Nama berhasil diperbarui', 'success');
    } catch (e: any) {
      showSidataToast(e.message || 'Gagal memperbarui nama', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      await remove(confirmDelete.id);
      setConfirmDelete(null);
      showSidataToast('Nama berhasil dihapus', 'success');
    } catch (e: any) {
      showSidataToast(e.message || 'Gagal menghapus nama', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-primary/10 border-b border-primary/20">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">Kelola Daftar Nama Pegawai</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Tambah Nama Baru</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAdd(); } }}
                placeholder="Contoh: Budi Santoso, S.Kom"
                className="flex-1 px-4 py-2.5 border border-input rounded-xl text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/10 transition-all"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding || !newName.trim()}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Tambah
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Daftar Nama ({items.length})</label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama..."
                className="w-44 px-3 py-1.5 border border-input rounded-lg text-xs bg-card text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div className="border border-border rounded-xl bg-card max-h-[45vh] overflow-y-auto divide-y divide-border">
              {loading && items.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Memuat daftar nama...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Belum ada nama.</div>
              ) : (
                filtered.map(item => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    {editId === item.id ? (
                      <>
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void saveEdit(item.id); } }}
                          autoFocus
                          className="flex-1 px-3 py-1.5 border border-primary rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/10"
                        />
                        <button
                          type="button"
                          onClick={() => void saveEdit(item.id)}
                          disabled={busyId === item.id}
                          className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 disabled:opacity-60"
                          title="Simpan"
                        >
                          {busyId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditId(null); setEditValue(''); }}
                          className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/70"
                          title="Batal"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-foreground truncate" title={item.name}>{item.name}</span>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="p-1.5 rounded-lg text-primary hover:bg-primary/10"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(item)}
                          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Perubahan langsung tampil di form Perjalanan Dinas dan Lembur untuk semua pengguna.</span>
          </p>
        </div>

        <div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:bg-muted transition-all"
          >
            Tutup
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl border border-destructive/30 max-w-sm w-full overflow-hidden">
            <div className="px-5 py-4 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2.5">
              <Trash2 className="w-5 h-5 text-destructive" />
              <h4 className="text-base font-bold text-foreground">Hapus Nama</h4>
            </div>
            <div className="p-5 text-sm text-foreground">
              Yakin ingin menghapus <strong>{confirmDelete.name}</strong> dari daftar?
              <p className="mt-2 text-xs text-muted-foreground">Data laporan yang sudah ada tidak akan terpengaruh.</p>
            </div>
            <div className="flex gap-2 px-5 py-3 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:bg-muted transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={busyId === confirmDelete.id}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busyId === confirmDelete.id && <Loader2 className="w-4 h-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}