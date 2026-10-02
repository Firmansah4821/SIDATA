import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Trash2, Save, Loader2, User } from 'lucide-react';
import { showSidataToast } from '@/components/sidata/Toast';

interface ProfileSectionProps {
  userId: string;
  currentProfile: {
    full_name: string | null;
    jabatan: string | null;
  };
  onProfileUpdate: () => void;
}

export default function ProfileSection({ userId, currentProfile, onProfileUpdate }: ProfileSectionProps) {
  const [fullName, setFullName] = useState(currentProfile.full_name || '');
  const [jabatan, setJabatan] = useState(currentProfile.jabatan || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAvatar();
  }, [userId]);

  const loadAvatar = async () => {
    const { data } = await supabase.from('profiles').select('avatar_url' as any).eq('user_id', userId).maybeSingle();
    if (data && (data as any).avatar_url) {
      setAvatarUrl((data as any).avatar_url);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showSidataToast('Ukuran foto maksimal 2MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const urlWithCacheBust = publicUrl + '?t=' + Date.now();

      await supabase.from('profiles').update({ avatar_url: urlWithCacheBust } as any).eq('user_id', userId);
      setAvatarUrl(urlWithCacheBust);
      showSidataToast('Foto profil berhasil diperbarui', 'success');
    } catch (err: any) {
      showSidataToast(err.message || 'Gagal mengunggah foto', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      const { data: files } = await supabase.storage.from('avatars').list(userId);
      if (files && files.length > 0) {
        await supabase.storage.from('avatars').remove(files.map(f => `${userId}/${f.name}`));
      }
      await supabase.from('profiles').update({ avatar_url: null } as any).eq('user_id', userId);
      setAvatarUrl(null);
      showSidataToast('Foto profil dihapus', 'success');
    } catch (err: any) {
      showSidataToast(err.message || 'Gagal menghapus foto', 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: fullName.trim() || null,
        jabatan: jabatan.trim() || null,
      }).eq('user_id', userId);
      if (error) throw error;
      showSidataToast('Profil berhasil diperbarui', 'success');
      onProfileUpdate();
    } catch (err: any) {
      showSidataToast(err.message || 'Gagal memperbarui profil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/10 transition-all";

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-foreground mb-6">Profil Saya</h3>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:brightness-110 transition-all flex items-center gap-1.5">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              {uploading ? 'Uploading...' : 'Ubah Foto'}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
            </label>
            {avatarUrl && (
              <button onClick={handleDeleteAvatar} className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-semibold hover:bg-destructive/20 transition-all flex items-center gap-1.5">
                <Trash2 className="w-3 h-3" /> Hapus
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 space-y-4 w-full">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Nama Lengkap</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} placeholder="Nama lengkap" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Jabatan</label>
            <input type="text" value={jabatan} onChange={e => setJabatan(e.target.value)} className={inputClass} placeholder="Jabatan" />
          </div>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:brightness-110 transition-all disabled:opacity-60 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}
