import { useState, useEffect } from 'react';
import { DataType, typeLabels, formFields, SidataRecord, namaPegawaiOptions, type FormField } from '@/lib/sidata-config';
import { showSidataToast } from './Toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send, Loader2, AlertCircle, CheckCircle2, X, AlertTriangle, Settings2, FileText, FolderOpen, Paperclip, User, Users, ClipboardList, MapPin, Camera, Hash, Clock, Car, CalendarDays, Upload, type LucideIcon } from 'lucide-react';
import { usePegawaiOptions } from '@/hooks/usePegawaiOptions';
import { useAuth } from '@/hooks/useAuth';
import ManagePegawaiModal from './ManagePegawaiModal';

interface InputFormProps {
  type: DataType;
  onSubmit: (data: Record<string, any>) => void;
  onBack: () => void;
  editRecord?: SidataRecord | null;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES_PER_FIELD = 4;
const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;
const JPEG_QUALITY = 0.7;

async function compressImage(file: File): Promise<string> {
  // Prefer createImageBitmap (much faster, runs off main thread on most browsers)
  let bitmap: ImageBitmap | null = null;
  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file);
    }
  } catch {
    bitmap = null;
  }

  let width: number;
  let height: number;
  let drawSource: CanvasImageSource;

  if (bitmap) {
    width = bitmap.width;
    height = bitmap.height;
    drawSource = bitmap;
  } else {
    // Fallback: use HTMLImageElement via object URL (faster than base64)
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Gagal memuat gambar'));
        i.src = objectUrl;
      });
      width = img.naturalWidth;
      height = img.naturalHeight;
      drawSource = img;
    } finally {
      // Revoke later (after draw)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  }

  if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
    const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(drawSource, 0, 0, width, height);
  const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  if (bitmap && typeof bitmap.close === 'function') bitmap.close();
  return compressed;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

async function uploadFileToStorage(file: File, fieldId: string): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `uploads/${fieldId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage.from('sidata-uploads').upload(filePath, file, { upsert: true });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('sidata-uploads').getPublicUrl(filePath);
  return publicUrl;
}

async function uploadCompressedImage(originalName: string, fieldId: string, dataUrl: string): Promise<string> {
  const blob = await dataUrlToBlob(dataUrl);
  const timestamp = Date.now();
  const baseName = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'foto';
  const filePath = `uploads/${fieldId}/${timestamp}_${baseName}.jpg`;
  const { error } = await supabase.storage.from('sidata-uploads').upload(filePath, blob, {
    upsert: true,
    contentType: 'image/jpeg',
  });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('sidata-uploads').getPublicUrl(filePath);
  return publicUrl;
}

// ── Tampilan kartu seksi (Gambar B) — Murni presentasi/tata letak ────────
// Setiap field tetap dirender persis satu kali dan tetap pada urutan asli
// dari konfigurasi: rencana seksi hanyalah potongan berurutan dari `formFields`,
// sehingga urutan field, label, placeholder, logika, dan validasi tidak berubah.
type FormSection = { title: string; Icon: LucideIcon; fields: FormField[] };

const SECTION_PLANS: Partial<Record<DataType, { title: string; Icon: LucideIcon; ids: string[] }[]>> = {
  surat_masuk: [
    { title: 'Informasi Surat', Icon: FileText, ids: ['nomor_buku', 'asal_surat', 'nomor_surat', 'tanggal_surat', 'perihal', 'tanggal_terima'] },
    { title: 'Klasifikasi & Disposisi', Icon: FolderOpen, ids: ['jenis_surat', 'disposisi_kadis_sekdis', 'tanggapan_kabid'] },
    { title: 'Dokumen', Icon: Paperclip, ids: ['dokumen_surat'] },
    { title: 'Operator', Icon: User, ids: ['operator'] },
  ],
  surat_keluar: [
    { title: 'Informasi Surat', Icon: FileText, ids: ['nomor_buku', 'tujuan_surat', 'nomor_surat', 'tanggal_surat', 'perihal', 'tanggal_kirim'] },
    { title: 'Klasifikasi & Disposisi', Icon: FolderOpen, ids: ['jenis_surat'] },
    { title: 'Dokumen', Icon: Paperclip, ids: ['dokumen_surat'] },
    { title: 'Operator', Icon: User, ids: ['operator'] },
  ],
  buku_tamu: [
    { title: 'Identitas Tamu', Icon: User, ids: ['nama_tamu', 'jenis_kelamin', 'asal_tamu', 'kecamatan_tamu', 'desa_tamu'] },
    { title: 'Detail Kunjungan', Icon: ClipboardList, ids: ['nomor_hp_tamu', 'tujuan_tamu', 'tanggal_tamu'] },
    { title: 'Dokumen', Icon: Camera, ids: ['foto_tamu'] },
  ],
  inventaris_dokumen: [
    { title: 'Informasi Dokumen', Icon: FileText, ids: ['tanggal_input', 'kategori_dokumen', 'asal_dokumen', 'perihal_dokumen', 'tanggal_dokumen'] },
    { title: 'Lokasi & Status', Icon: MapPin, ids: ['lokasi_dokumen', 'desa_dokumen', 'status_dokumen'] },
    { title: 'Kode Dokumen', Icon: Hash, ids: ['kode_kategori', 'kode_tahun', 'kode_urutan'] },
    { title: 'Dokumen', Icon: Paperclip, ids: ['lampiran_inventaris'] },
  ],
  pengajuan_bpn: [
    { title: 'Informasi Pengajuan', Icon: FileText, ids: ['jenis_pengajuan', 'nomor_berkas_sps', 'tahun_berkas_sps', 'tanggal_terbit_sps'] },
    { title: 'Lokasi & Pemohon', Icon: MapPin, ids: ['kecamatan_bpn', 'desa_bpn', 'pemohon_bpn'] },
    { title: 'Keterangan & Dokumen', Icon: Paperclip, ids: ['keterangan_bpn', 'foto_sps_ttd'] },
  ],
  perjalanan_dinas: [
    { title: 'Informasi Perjalanan', Icon: Car, ids: ['tanggal_perjalanan', 'tujuan_perjalanan', 'desa_perjalanan', 'dalam_rangka'] },
    { title: 'Pelaku & Lokasi', Icon: MapPin, ids: ['pelaku_perjalanan', 'upload_lokasi'] },
    { title: 'Dokumen', Icon: Camera, ids: ['foto_perjalanan'] },
  ],
  agenda_rapat: [
    { title: 'Informasi Rapat', Icon: CalendarDays, ids: ['tanggal_rapat', 'waktu_rapat', 'tempat_rapat'] },
    { title: 'Agenda & Peserta', Icon: ClipboardList, ids: ['agenda_rapat_detail', 'peserta_rapat'] },
    { title: 'Dokumen', Icon: Paperclip, ids: ['upload_file_rapat'] },
  ],
  lembur: [
    { title: 'Informasi Lembur', Icon: Clock, ids: ['tanggal_lembur', 'jam_mulai_lembur', 'jam_selesai_lembur'] },
    { title: 'Pegawai & Bidang Unit', Icon: Users, ids: ['nama_pegawai_lembur', 'bidang_unit_lembur'] },
    { title: 'Pekerjaan & Persetujuan', Icon: ClipboardList, ids: ['uraian_pekerjaan_lembur', 'lokasi_lembur', 'atasan_menyetujui_lembur', 'catatan_lembur'] },
    { title: 'Dokumen', Icon: Camera, ids: ['foto_lembur'] },
  ],
};

const GRID_FIELD_TYPES = new Set<FormField['type']>(['text', 'date', 'tel', 'time', 'number']);
const isGridField = (f: FormField) => GRID_FIELD_TYPES.has(f.type);

function buildSections(type: DataType, fields: FormField[]): FormSection[] {
  const plan = SECTION_PLANS[type];
  const used = new Set<string>();
  const sections: FormSection[] = [];
  if (plan) {
    for (const p of plan) {
      const secFields = fields.filter(f => p.ids.includes(f.id) && !used.has(f.id));
      if (secFields.length === 0) continue;
      secFields.forEach(f => used.add(f.id));
      sections.push({ title: p.title, Icon: p.Icon, fields: secFields });
    }
  }
  // Jaring pengaman: field yang belum terpetakan tetap ikut tampil (urutan asli).
  const leftovers = fields.filter(f => !used.has(f.id));
  if (leftovers.length > 0) {
    sections.push({ title: plan ? 'Informasi Tambahan' : typeLabels[type], Icon: FileText, fields: leftovers });
  }
  return sections;
}

// Lebar kolom per field di dalam grid 2 kolom: input teks/tanggal/waktu berpasangan,
// sedangkan dropdown, textarea, checklist, peta, dan kotak unggah memenuhi 1 baris penuh.
// Bila sisa ganjil di akhir bagian, field terakhir memenuhi lebar penuh (tanpa ruang kosong).
function fieldSpans(secFields: FormField[]): Record<string, string> {
  const spans: Record<string, string> = {};
  let i = 0;
  while (i < secFields.length) {
    if (isGridField(secFields[i])) {
      let j = i;
      while (j < secFields.length && isGridField(secFields[j])) j++;
      const odd = (j - i) % 2 === 1;
      for (let k = i; k < j; k++) {
        spans[secFields[k].id] = odd && k === j - 1 ? 'col-span-1 sm:col-span-2' : 'col-span-1';
      }
      i = j;
    } else {
      spans[secFields[i].id] = 'col-span-1 sm:col-span-2';
      i++;
    }
  }
  return spans;
}

export default function InputForm({ type, onSubmit, onBack, editRecord }: InputFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, FileList | null>>({});
  const [processedFiles, setProcessedFiles] = useState<Record<string, string[]>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, { name: string; preview?: string }[]>>({});
  const [processingFiles, setProcessingFiles] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflictModal, setConflictModal] = useState<{
    open: boolean;
    date: string;
    targetKec: string;
    targetDesa: string;
    conflicts: Array<{ name: string; kecamatan: string; desa: string }>;
    pendingData: Record<string, any> | null;
  }>({ open: false, date: '', targetKec: '', targetDesa: '', conflicts: [], pendingData: null });
  const [managePegawaiOpen, setManagePegawaiOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { names: dynamicNames } = usePegawaiOptions();
  const fields = formFields[type] || [];
  const sections = buildSections(type, fields);

  // Fields that pull names from the managed "pegawai" list.
  const PEGAWAI_FIELDS = new Set(['pelaku_perjalanan', 'nama_pegawai_lembur']);
  const resolvedOptions = (fieldId: string, fallback?: string[]) =>
    PEGAWAI_FIELDS.has(fieldId) ? dynamicNames : (fallback || []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const defaults: Record<string, string> = {};
    const initFiles: Record<string, string[]> = {};
    const initPreviews: Record<string, { name: string; preview?: string }[]> = {};
    fields.forEach(f => {
      if (f.type === 'date') defaults[f.id] = today;
      if (editRecord && editRecord[f.id] !== undefined && editRecord[f.id] !== null && editRecord[f.id] !== '') {
        if (f.type === 'file') {
          const v = editRecord[f.id];
          const arr: string[] = Array.isArray(v) ? v : [v];
          const cleaned = arr.filter(Boolean);
          if (cleaned.length > 0) {
            initFiles[f.id] = cleaned;
            initPreviews[f.id] = cleaned.map(s => ({
              name: s.startsWith('data:') ? 'Foto' : decodeURIComponent((s.split('/').pop() || 'Dokumen').split('?')[0].replace(/^\d+_/, '')),
              preview: s.startsWith('data:image') || /\.(jpg|jpeg|png|webp)(\?|#|$)/i.test(s) ? s : undefined,
            }));
          }
        } else if (f.type !== 'html') {
          // For dates already in ISO, take date part
          const raw = String(editRecord[f.id]);
          defaults[f.id] = (f.type === 'date' && raw.length >= 10) ? raw.slice(0, 10) : raw;
        }
      }
    });
    setValues(defaults);
    setFiles({});
    setProcessedFiles(initFiles);
    setFilePreviews(initPreviews);
    setProcessingFiles({});
    setErrors({});
  }, [type, editRecord?.id]);

  const handleChange = (id: string, value: string) => {
    setValues(prev => {
      const next = { ...prev, [id]: value };
      // Clear dependent fields when parent changes
      fields.forEach(f => {
        if (f.type === 'dependent_select' && f.dependsOn === id) {
          next[f.id] = '';
        }
      });
      return next;
    });
    if (errors[id]) setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleFileChange = async (id: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return true;
    // Maksimal 4 file per kolom (termasuk file yang sudah dipilih sebelumnya).
    const existing = processedFiles[id]?.length || 0;
    if (existing + fileList.length > MAX_FILES_PER_FIELD) {
      setErrors(prev => ({
        ...prev,
        [id]: `Maksimal ${MAX_FILES_PER_FIELD} file per kolom — file ke-${MAX_FILES_PER_FIELD + 1} dan seterusnya ditolak.`,
      }));
      return false;
    }
    for (let i = 0; i < fileList.length; i++) {
      const sizeMB = fileList[i].size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        setErrors(prev => ({ ...prev, [id]: `File "${fileList[i].name}" terlalu besar (maks ${MAX_FILE_SIZE_MB}MB per file)` }));
        return false;
      }
    }

    setFiles(prev => ({ ...prev, [id]: fileList }));
    if (errors[id]) setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
    setProcessingFiles(prev => ({ ...prev, [id]: true }));

    // Process files immediately (compress images, upload non-images)
    try {
      const processed: string[] = [];
      const previews: { name: string; preview?: string }[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          // Upload compressed image to storage so it becomes a clickable URL
          // (instead of an inline base64 blob that can't be linked from PDF/Excel).
          const url = await uploadCompressedImage(file.name, id, compressed);
          processed.push(url);
          previews.push({ name: file.name, preview: compressed });
        } else {
          const url = await uploadFileToStorage(file, id);
          processed.push(url);
          previews.push({ name: file.name });
        }
      }
      // Tambahkan ke file yang sudah ada (bukan menimpa) agar bisa pilih berulang.
      const prevUrls = processedFiles[id] || [];
      const prevPreviews = filePreviews[id] || [];
      setProcessedFiles(prev => ({ ...prev, [id]: [...prevUrls, ...processed] }));
      setFilePreviews(prev => ({ ...prev, [id]: [...prevPreviews, ...previews] }));
      return true;
    } catch (err: any) {
      console.error('File processing error:', err);
      setErrors(prev => ({ ...prev, [id]: err.message || 'Gagal memproses file' }));
      return false;
    } finally {
      setProcessingFiles(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const removeFile = (id: string, index?: number) => {
    if (index === undefined) {
      setFiles(prev => { const n = { ...prev }; delete n[id]; return n; });
      setProcessedFiles(prev => { const n = { ...prev }; delete n[id]; return n; });
      setFilePreviews(prev => { const n = { ...prev }; delete n[id]; return n; });
      return;
    }
    // Hapus per file (tetap simpan file lainnya)
    setFiles(prev => { const n = { ...prev }; delete n[id]; return n; });
    setProcessedFiles(prev => {
      const cur = prev[id] || [];
      if (cur.length <= 1) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: cur.filter((_, i) => i !== index) };
    });
    setFilePreviews(prev => {
      const cur = prev[id] || [];
      if (cur.length <= 1) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: cur.filter((_, i) => i !== index) };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach(f => {
      if (f.type === 'html') return;
      if (f.type === 'file') return; // Files are optional
      const val = values[f.id]?.trim();
      if (!val) {
        newErrors[f.id] = `${f.label} belum diisi`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showSidataToast('Harap lengkapi semua kolom yang wajib diisi', 'error');
      return;
    }

    // Block submit while files are still processing
    const stillProcessing = Object.values(processingFiles).some(Boolean);
    if (stillProcessing) {
      showSidataToast('Foto masih diproses, mohon tunggu sebentar...', 'info');
      return;
    }

    setSubmitting(true);

    try {
      const submitData: Record<string, any> = { ...values };

      // Files have already been processed when picked — just attach
      for (const [id, processed] of Object.entries(processedFiles)) {
        if (processed && processed.length > 0) {
          submitData[id] = processed.length === 1 ? processed[0] : processed;
        }
      }

      // Conflict check for perjalanan_dinas: same employee, same date, different kecamatan/desa
      if (type === 'perjalanan_dinas') {
        const conflicts = await checkPerjalananConflicts(submitData);
        if (conflicts.length > 0) {
          setConflictModal({
            open: true,
            date: submitData.tanggal_perjalanan || '',
            targetKec: submitData.tujuan_perjalanan || '',
            targetDesa: submitData.desa_perjalanan || '',
            conflicts,
            pendingData: submitData,
          });
          setSubmitting(false);
          return;
        }
        // No conflicts → make sure any old flag is cleared on this record
        submitData.conflict_flag = false;
        submitData.conflict_info = '';
      }

      await onSubmit(submitData);
    } catch (err: any) {
      console.error('Submit error:', err);
      showSidataToast(err.message || 'Gagal mengirim data', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Parse pelaku list stored as ' | ' separated (or legacy comma)
  const parsePelaku = (raw: any): string[] => {
    const s = String(raw || '').trim();
    if (!s) return [];
    if (s.includes('|')) return s.split('|').map(x => x.trim()).filter(Boolean);
    const knownNames = Array.from(new Set([...dynamicNames, ...namaPegawaiOptions]));
    const matched = knownNames.filter(n => s.includes(n));
    if (matched.length > 0) return matched;
    return s.split(/[;\n]+/).map(x => x.trim()).filter(Boolean);
  };

  const checkPerjalananConflicts = async (data: Record<string, any>) => {
    const date = data.tanggal_perjalanan;
    const kec = (data.tujuan_perjalanan || '').trim();
    const desa = (data.desa_perjalanan || '').trim();
    const pelaku = parsePelaku(data.pelaku_perjalanan);
    if (!date || pelaku.length === 0) return [];

    const { data: rows, error } = await supabase
      .from('sidata_records')
      .select('id, data')
      .eq('type', 'perjalanan_dinas');
    if (error || !rows) return [];

    const conflicts: Array<{ name: string; kecamatan: string; desa: string }> = [];
    const seen = new Set<string>();
    for (const row of rows) {
      // Exclude the record being edited from the comparison set
      if (editRecord && row.id === editRecord.id) continue;
      const d: any = row.data || {};
      if (d.tanggal_perjalanan !== date) continue;
      const otherKec = (d.tujuan_perjalanan || '').trim();
      const otherDesa = (d.desa_perjalanan || '').trim();
      // Only flag when destination differs
      if (otherKec === kec && otherDesa === desa) continue;
      const otherPelaku = parsePelaku(d.pelaku_perjalanan);
      for (const name of pelaku) {
        if (otherPelaku.includes(name)) {
          const key = `${name}|${otherKec}|${otherDesa}`;
          if (seen.has(key)) continue;
          seen.add(key);
          conflicts.push({ name, kecamatan: otherKec || '-', desa: otherDesa || '-' });
        }
      }
    }
    return conflicts;
  };

  const confirmConflictSave = async () => {
    const pending = conflictModal.pendingData;
    if (!pending) return;
    setSubmitting(true);
    try {
      const payload = {
        ...pending,
        conflict_flag: true,
        conflict_info: conflictModal.conflicts
          .map(c => `${c.name} bentrok di ${c.kecamatan}${c.desa && c.desa !== '-' ? ` (${c.desa})` : ''}`)
          .join(' | '),
      };
      setConflictModal({ open: false, date: '', targetKec: '', targetDesa: '', conflicts: [], pendingData: null });
      await onSubmit(payload);
    } catch (err: any) {
      showSidataToast(err.message || 'Gagal mengirim data', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getFileAccept = (f: { id: string; accept?: string }) => {
    // Add Excel format support for dokumen_surat
    if (f.id === 'dokumen_surat') return 'image/*,.pdf,.xls,.xlsx';
    if (f.id === 'upload_file_rapat') return 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
    if (f.id === 'foto_tamu' || f.id === 'foto_perjalanan' || f.id === 'foto_sps_ttd') return 'image/*,.pdf';
    return f.accept || '';
  };

  const getFileHelpText = (id: string) => {
    if (id === 'dokumen_surat') return `📷 Kamera / 🖼️ Galeri — PDF, JPG, PNG, Excel (Maks. ${MAX_FILES_PER_FIELD} file, ${MAX_FILE_SIZE_MB}MB/file)`;
    if (id === 'foto_perjalanan' || id === 'upload_file_rapat') return `📷 Kamera / 🖼️ Galeri — JPG, PNG, PDF, Excel (Maks. ${MAX_FILES_PER_FIELD} file, ${MAX_FILE_SIZE_MB}MB/file)`;
    if (id === 'foto_tamu') return `📷 Kamera / 🖼️ Galeri — JPG, PNG (Maks. ${MAX_FILES_PER_FIELD} foto, ${MAX_FILE_SIZE_MB}MB/foto)`;
    if (id === 'foto_sps_ttd') return `📷 Kamera / 🖼️ Galeri — JPG, PNG, PDF (Maks. ${MAX_FILES_PER_FIELD} file, ${MAX_FILE_SIZE_MB}MB/file)`;
    return `📷 Kamera / 🖼️ Galeri — PDF, JPG, PNG (Maks. ${MAX_FILES_PER_FIELD} file, ${MAX_FILE_SIZE_MB}MB/file)`;
  };

  const inputClass = "w-full px-4 py-2.5 border border-input rounded-xl text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/10 transition-all";
  const errorInputClass = "w-full px-4 py-2.5 border border-destructive rounded-xl text-sm bg-card text-foreground focus:outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/10 transition-all";

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">{editRecord ? 'Edit Data' : 'Input Data'}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{typeLabels[type]}</p>
        </div>
        <button onClick={onBack} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:bg-muted transition-all flex items-center gap-2 active:scale-95">
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-8">
          {sections.map(sec => {
            const spans = fieldSpans(sec.fields);
            return (
              <section key={sec.title}>
                <div className="flex items-center gap-2.5 border-b border-border pb-3">
                  <sec.Icon className="w-5 h-5 shrink-0 text-foreground" />
                  <h3 className="text-base font-bold tracking-tight text-foreground">{sec.title}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 pt-4">
          {sec.fields.map(f => (
            <div key={f.id} className={spans[f.id] || 'col-span-1'}>
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  {f.label}
                  {f.type !== 'html' && f.type !== 'file' && <span className="text-destructive ml-1">*</span>}
                </label>
                {isAdmin && f.type === 'checklist' && PEGAWAI_FIELDS.has(f.id) && (
                  <button
                    type="button"
                    onClick={() => setManagePegawaiOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
                    title="Tambah, edit, atau hapus nama pegawai"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Kelola Daftar Nama
                  </button>
                )}
              </div>
              {f.type === 'html' ? (
                <div>
                  <div dangerouslySetInnerHTML={{ __html: f.html || '' }} className="rounded-xl overflow-hidden" />
                  {f.id === 'upload_lokasi' && (
                    <div className="mt-3">
                      <input
                        type="url"
                        value={values['lokasi_maps_url'] || ''}
                        onChange={e => handleChange('lokasi_maps_url', e.target.value)}
                        className={inputClass}
                        placeholder="Tempel link Google Maps lokasi (opsional)"
                      />
                      <small className="block mt-1 text-xs text-muted-foreground">Contoh: https://maps.google.com/...</small>
                    </div>
                  )}
                </div>
              ) : f.type === 'file' ? (
                <div>
                  <div className="rounded-xl border-2 border-dashed border-input bg-muted/20 px-4 py-3.5 transition-colors hover:border-primary/40 focus-within:border-primary">
                    <div className="flex items-center gap-3">
                      <span className="flex w-10 h-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Upload className="w-5 h-5" />
                      </span>
                      <input
                        type="file"
                        accept={getFileAccept(f)}
                        multiple
                        disabled={processingFiles[f.id]}
                        onChange={async e => {
                          const target = e.target;
                          const ok = await handleFileChange(f.id, target.files);
                          if (!ok) target.value = '';
                        }}
                        className="w-full min-w-0 text-sm text-foreground cursor-pointer focus:outline-none file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
                      />
                    </div>
                  </div>
                  <small className="block mt-2 text-xs text-muted-foreground">{getFileHelpText(f.id)}</small>
                  {processingFiles[f.id] && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-primary bg-primary/5 px-3 py-2 rounded-lg">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses & mengompres foto, mohon tunggu...</span>
                    </div>
                  )}
                  {!processingFiles[f.id] && filePreviews[f.id] && filePreviews[f.id].length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{filePreviews[f.id].length}/{MAX_FILES_PER_FIELD} file siap dikirim</span>
                        </div>
                        <button type="button" onClick={() => removeFile(f.id)} className="text-xs text-destructive hover:underline flex items-center gap-1">
                          <X className="w-3 h-3" /> Hapus Semua
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {filePreviews[f.id].map((p, i) => (
                          <div key={i} className="relative">
                            {p.preview ? (
                              <img src={p.preview} alt={p.name} className="w-16 h-16 object-cover rounded-lg border border-border" />
                            ) : (
                              <div className="px-2 py-1.5 bg-muted rounded-lg text-xs text-muted-foreground max-w-[180px] truncate" title={p.name}>📄 {p.name}</div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(f.id, i)}
                              aria-label={`Hapus file ${p.name}`}
                              title={`Hapus ${p.name}`}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:brightness-110 transition-all shadow"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {errors[f.id] && (
                    <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors[f.id]}
                    </p>
                  )}
                </div>
              ) : f.type === 'textarea' ? (
                <div>
                  <textarea
                    value={values[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                    className={`${errors[f.id] ? errorInputClass : inputClass} resize-y min-h-[100px]`}
                    placeholder={`Masukkan ${f.label.toLowerCase()}`}
                  />
                  {errors[f.id] && (
                    <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors[f.id]}
                    </p>
                  )}
                </div>
              ) : f.type === 'dependent_select' ? (
                <div>
                  <select
                    value={values[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                    className={`${errors[f.id] ? errorInputClass : inputClass} cursor-pointer`}
                    disabled={!f.dependsOn || !values[f.dependsOn]}
                  >
                    <option value="">{f.dependsOn && !values[f.dependsOn] ? `Pilih ${fields.find(x => x.id === f.dependsOn)?.label || 'Kecamatan'} terlebih dahulu` : `Pilih ${f.label}`}</option>
                    {(f.dependsOn && f.dependentOptions && values[f.dependsOn] ? (f.dependentOptions[values[f.dependsOn]] || []) : []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {errors[f.id] && (
                    <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors[f.id]}
                    </p>
                  )}
                </div>
              ) : f.type === 'checklist' ? (
                <div>
                  {(() => {
                     // Use ' | ' as separator because some names contain commas (e.g. "Firmansyah, S.Kom").
                     // Also support legacy comma-separated values by matching against the known options list.
                     const raw = values[f.id] || '';
                     const opts = resolvedOptions(f.id, f.options);
                     let selected: string[] = [];
                     if (raw.includes('|')) {
                       selected = raw.split('|').map(s => s.trim()).filter(Boolean);
                     } else if (raw) {
                       // Legacy: try to recover full option names from a comma-joined string
                       selected = opts.filter(o => raw.includes(o));
                       if (selected.length === 0) {
                         selected = raw.split(',').map(s => s.trim()).filter(Boolean);
                       }
                     }
                     const toggle = (name: string) => {
                       const set = new Set(selected);
                       if (set.has(name)) set.delete(name); else set.add(name);
                       handleChange(f.id, Array.from(set).join(' | '));
                     };
                    return (
                      <>
                        <div className={`${errors[f.id] ? 'border-destructive' : 'border-input'} border rounded-xl bg-card max-h-64 overflow-y-auto p-2 space-y-1`}>
                          {opts.map(name => {
                            const checked = selected.includes(name);
                            const cbId = `${f.id}-${name}`;
                            return (
                              <label
                                key={name}
                                htmlFor={cbId}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted/40 select-none"
                              >
                                <input
                                  id={cbId}
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggle(name)}
                                  className="w-4 h-4 rounded border-input accent-primary cursor-pointer"
                                />
                                <span className={`text-sm ${checked ? 'text-primary font-semibold' : 'text-foreground'}`}>{name}</span>
                              </label>
                            );
                          })}
                          {opts.length === 0 && (
                            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                              {PEGAWAI_FIELDS.has(f.id) ? 'Belum ada nama. Hubungi admin untuk menambahkan.' : 'Tidak ada opsi.'}
                            </div>
                          )}
                        </div>
                        <small className="block mt-1.5 text-xs text-muted-foreground">
                          {selected.length} dipilih — centang kotak untuk memilih, klik lagi untuk batal
                        </small>
                        {errors[f.id] && (
                          <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors[f.id]}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : f.type === 'select' ? (
                <div>
                  <select
                    value={values[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                    className={`${errors[f.id] ? errorInputClass : inputClass} cursor-pointer`}
                  >
                    <option value="">Pilih {f.label}</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {errors[f.id] && (
                    <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors[f.id]}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type={f.type === 'number' ? 'number' : f.type === 'tel' ? 'tel' : f.type === 'time' ? 'time' : f.type === 'date' ? 'date' : 'text'}
                    value={values[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                    className={errors[f.id] ? errorInputClass : inputClass}
                    placeholder={`Masukkan ${f.label.toLowerCase()}`}
                  />
                  {errors[f.id] && (
                    <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors[f.id]}
                    </p>
                  )}
                </div>
              )}
            </div>
                  ))}
                </div>
              </section>
            );
          })}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:brightness-110 hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editRecord ? 'Menyimpan...' : 'Mengirim...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {editRecord ? 'Simpan Perubahan' : 'Kirim Data'}
                </>
              )}
            </button>
            <button type="button" onClick={onBack} className="flex-1 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:bg-muted transition-all active:scale-[0.98]">
              Batal
            </button>
          </div>
        </form>
      </div>
      {conflictModal.open && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card rounded-2xl shadow-2xl border border-warning/40 max-w-md w-full overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 bg-warning/10 border-b border-warning/20">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h3 className="text-base font-bold text-foreground">Peringatan Bentrok Jadwal</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-foreground flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <span>Terjadi bentrok jadwal pada tanggal <strong>{new Date(conflictModal.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
              </p>
              <p className="text-sm text-muted-foreground">
                Anda akan memasukkan perjalanan ke <strong className="text-foreground">{conflictModal.targetKec || '-'}{conflictModal.targetDesa ? ` (${conflictModal.targetDesa})` : ''}</strong>, namun pegawai berikut sudah memiliki tugas di lokasi lain pada tanggal yang sama:
              </p>
              <ul className="space-y-1.5 bg-warning/5 border border-warning/20 rounded-xl p-3">
                {conflictModal.conflicts.map((c, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-warning mt-1">•</span>
                    <span><strong className="text-foreground">{c.name}</strong> <span className="text-muted-foreground">: sudah bertugas di {c.kecamatan}{c.desa && c.desa !== '-' ? ` (${c.desa})` : ''}</span></span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">Data tetap dapat disimpan dan akan ditandai sebagai <strong className="text-warning">bentrok jadwal</strong> di laporan. Apakah Anda tetap ingin menyimpan?</p>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setConflictModal(prev => ({ ...prev, open: false, pendingData: null }))}
                className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:bg-muted transition-all"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={confirmConflictSave}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-warning text-warning-foreground rounded-xl text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Tetap Simpan
              </button>
            </div>
          </div>
        </div>
      )}
      <ManagePegawaiModal open={managePegawaiOpen} onClose={() => setManagePegawaiOpen(false)} />
    </div>
  );
}
