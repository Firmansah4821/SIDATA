export type DataType = 'surat_masuk' | 'surat_keluar' | 'buku_tamu' | 'inventaris_dokumen' | 'pengajuan_bpn' | 'perjalanan_dinas' | 'agenda_rapat' | 'lembur';

export const typeLabels: Record<DataType, string> = {
  surat_masuk: "Surat Masuk",
  surat_keluar: "Surat Keluar",
  buku_tamu: "Buku Tamu",
  inventaris_dokumen: "Inventaris Dokumen",
  pengajuan_bpn: "Pengajuan BPN",
  perjalanan_dinas: "Perjalanan Dinas",
  agenda_rapat: "Agenda Rapat",
  lembur: "Lembur",
};

export const typeIcons: Record<DataType, string> = {
  surat_masuk: "📨",
  surat_keluar: "📤",
  buku_tamu: "👤",
  inventaris_dokumen: "📁",
  pengajuan_bpn: "🏢",
  perjalanan_dinas: "🚗",
  agenda_rapat: "📅",
  lembur: "🕒",
};

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'textarea' | 'file' | 'tel' | 'time' | 'number' | 'html' | 'dependent_select' | 'checklist';
  options?: string[];
  accept?: string;
  multiple?: boolean;
  html?: string;
  dependsOn?: string;
  dependentOptions?: Record<string, string[]>;
}

export const namaPegawaiOptions = [
  "Amirullah",
  "Budiansani, ST",
  "Deden Kurniawan, SPWK",
  "Endang Aswari Astuti, S.Pd",
  "Farid, SE",
  "Ferry Asadullah, SE",
  "Firmansah, S.Kom",
  "Fizriati Ningsi, SPWK",
  "Iskandar Julkarnain, ST",
  "Linda Laraswati, SE",
  "Mayangsari, S.Ikom",
  "Muhammad Ilyas",
  "Muisliddinillah, S.HI",
  "Nurhaidah, SP",
  "Nurul Zihan, ST., MT",
  "Satya Miharja SPWK",
  "Sri Endang, SH",
  "Subyono",
  "Sumardin, S.HI",
  "Syahdan",
  "Tiara Zahra, ST",
  "Wandi Arwana, SH",
];

export const kecamatanOptions = [
  "Kecamatan Ambalawi", "Kecamatan Belo", "Kecamatan Bolo", "Kecamatan Donggo",
  "Kecamatan Lambu", "Kecamatan Lambitu", "Kecamatan Langgudu", "Kecamatan Madapangga",
  "Kecamatan Monta", "Kecamatan Palibelo", "Kecamatan Parado", "Kecamatan Sanggar",
  "Kecamatan Sape", "Kecamatan Soromandi", "Kecamatan Tambora", "Kecamatan Wawo",
  "Kecamatan Wera", "Kecamatan Woha"
];

export const desaByKecamatan: Record<string, string[]> = {
  "Kecamatan Ambalawi": ["Desa Kole", "Desa Mawu", "Desa Nipa", "Desa Rite", "Desa Talapiti", "Desa Tolowata"],
  "Kecamatan Belo": ["Desa Diha", "Desa Cenggu", "Desa Lido", "Desa Ncera", "Desa Ngali", "Desa Renda", "Desa Roka", "Desa Runggu", "Desa Soki"],
  "Kecamatan Bolo": ["Desa Bontokape", "Desa Darussalam", "Desa Kananga", "Desa Kara", "Desa Leu", "Desa Nggembe", "Desa Rada", "Desa Rasabou", "Desa Rato", "Desa Sanolo", "Desa Sondosia", "Desa Tambe", "Desa Timu", "Desa Tumpu"],
  "Kecamatan Donggo": ["Desa Bumipajo", "Desa Doridungga", "Desa Kala", "Desa Mbawa", "Desa Mpili", "Desa Ndano Na'e", "Desa O'O", "Desa Plama", "Desa Rora"],
  "Kecamatan Lambu": ["Desa Hidirasa", "Desa Kaleo", "Desa Lambu", "Desa Lanta", "Desa Lanta Barat", "Desa Mangge", "Desa Melayu", "Desa Monta Baru", "Desa Nggelu", "Desa Rato", "Desa Sangga", "Desa Simpasai", "Desa Soro", "Desa Sumi"],
  "Kecamatan Lambitu": ["Desa Kaboro", "Desa Kaowa", "Desa Kuta", "Desa Londu", "Desa Sambori", "Desa Teta"],
  "Kecamatan Langgudu": ["Desa Doro O'o", "Desa Dumu", "Desa Kalodu", "Desa Kangga", "Desa Karampi", "Desa Karumbu", "Desa Kawuwu", "Desa Laju", "Desa Pusu", "Desa Rompo", "Desa Rupe", "Desa Sambane", "Desa Sarae Ruma", "Desa Waduruka", "Desa Waworada"],
  "Kecamatan Madapangga": ["Desa Bolo", "Desa Campa", "Desa Dena", "Desa Mandawau", "Desa Monggo", "Desa Mpuri", "Desa Ncandi", "Desa Ndano", "Desa Rade", "Desa Tonda", "Desa Woro"],
  "Kecamatan Monta": ["Desa Baralau", "Desa Monta", "Desa Nontotera", "Desa Pela", "Desa Sekuru", "Desa Sie", "Desa Simpasai", "Desa Sondo", "Desa Tangga", "Desa Tangga Baru", "Desa Tolotangga", "Desa Tolouwi", "Desa Waro", "Desa Wilamaci"],
  "Kecamatan Palibelo": ["Desa Belo", "Desa Bre", "Desa Dore", "Desa Nata", "Desa Ntonggu", "Desa Panda", "Desa Padolo", "Desa Ragi", "Desa Roi", "Desa Teke", "Desa Tolongondoa", "Desa Tonggorisa"],
  "Kecamatan Parado": ["Desa Kanca", "Desa Kuta", "Desa Lere", "Desa Paradorato", "Desa Paradowane"],
  "Kecamatan Sanggar": ["Desa Boro", "Desa Kore", "Desa Oi Saro", "Desa Piong", "Desa Sandue", "Desa Taloko"],
  "Kecamatan Sape": ["Desa Bajo Pulau", "Desa Boke", "Desa Bugis", "Desa Buncu", "Desa Jia", "Desa Kowo", "Desa Lamere", "Desa Nae", "Desa Naru Barat", "Desa Naru Timur", "Desa Oi Maci", "Desa Parangina", "Desa Poja", "Desa Rai Oi", "Desa Rasabou", "Desa Sangia", "Desa Sari", "Desa Tanah Putih"],
  "Kecamatan Soromandi": ["Desa Bajo", "Desa Kananta", "Desa Lewintana", "Desa Punti", "Desa Sai", "Desa Sampungu", "Desa Wadukopa"],
  "Kecamatan Tambora": ["Desa Kawinda Nae", "Desa Kawinda Toi", "Desa Labuhan Kananga", "Desa Oi Bura", "Desa Oi Katupa", "Desa Oi Panihi", "Desa Rasabou"],
  "Kecamatan Wawo": ["Desa Kambilo", "Desa Kombo", "Desa Maria", "Desa Maria Utara", "Desa Ntori", "Desa Pesa", "Desa Raba", "Desa Riamau", "Desa Tarlawi"],
  "Kecamatan Wera": ["Desa Bala", "Desa Hidirasa", "Desa Kalajena", "Desa Mandala", "Desa Nanga Wera", "Desa Ntoke", "Desa Nunggi", "Desa Oitui", "Desa Pai", "Desa Ranggasolo", "Desa Sangiang", "Desa Tadewa", "Desa Tawali", "Desa Wora"],
  "Kecamatan Woha": ["Desa Dadibou", "Desa Donggobolo", "Desa Kalampa", "Desa Keli", "Desa Naru", "Desa Nisa", "Desa Pandai", "Desa Penapali", "Desa Rabakodo", "Desa Risa", "Desa Samili", "Desa Talabiu", "Desa Tenga", "Desa Tente", "Desa Waduwani"],
};

export const formFields: Record<DataType, FormField[]> = {
  surat_masuk: [
    { id: "nomor_buku", label: "Nomor Buku", type: "text" },
    { id: "asal_surat", label: "Asal Surat", type: "text" },
    { id: "nomor_surat", label: "Nomor Surat", type: "text" },
    { id: "tanggal_surat", label: "Tanggal Surat", type: "date" },
    { id: "perihal", label: "Perihal", type: "text" },
    { id: "tanggal_terima", label: "Tanggal Terima", type: "date" },
    { id: "jenis_surat", label: "Jenis Surat", type: "select", options: ["Langsung", "Tembusan", "Disposisi"] },
    { id: "disposisi_kadis_sekdis", label: "Unggah Disposisi Kadis/Sekdis", type: "file", accept: ".pdf,.jpg,.jpeg,.png" },
    { id: "tanggapan_kabid", label: "Tanggapan Kabid", type: "select", options: ["Disposisi", "Arsip"] },
    { id: "dokumen_surat", label: "Unggah Dokumen/Surat", type: "file", accept: ".pdf,.jpg,.jpeg,.png,.xls,.xlsx" },
    { id: "operator", label: "Operator", type: "text" },
  ],
  surat_keluar: [
    { id: "nomor_buku", label: "Nomor Buku", type: "text" },
    { id: "tujuan_surat", label: "Tujuan Surat", type: "text" },
    { id: "nomor_surat", label: "Nomor Surat", type: "text" },
    { id: "tanggal_surat", label: "Tanggal Surat", type: "date" },
    { id: "perihal", label: "Perihal", type: "text" },
    { id: "tanggal_kirim", label: "Tanggal Kirim", type: "date" },
    { id: "jenis_surat", label: "Jenis Surat", type: "select", options: ["Biasa", "Edaran", "Undangan", "Pengantar", "Keputusan", "Lainnya"] },
    { id: "dokumen_surat", label: "Unggah Dokumen/Surat", type: "file", accept: ".pdf,.jpg,.jpeg,.png,.xls,.xlsx" },
    { id: "operator", label: "Operator", type: "text" },
  ],
  buku_tamu: [
    { id: "nama_tamu", label: "Nama Tamu", type: "text" },
    { id: "jenis_kelamin", label: "Jenis Kelamin", type: "select", options: ["Laki-laki", "Perempuan"] },
    { id: "asal_tamu", label: "Asal", type: "select", options: ["Kota Bima", "Kabupaten Bima"] },
    { id: "kecamatan_tamu", label: "Kecamatan", type: "select", options: kecamatanOptions },
    { id: "desa_tamu", label: "Desa", type: "dependent_select", dependsOn: "kecamatan_tamu", dependentOptions: desaByKecamatan },
    { id: "nomor_hp_tamu", label: "Nomor HP", type: "tel" },
    { id: "tujuan_tamu", label: "Tujuan Kunjungan", type: "text" },
    { id: "tanggal_tamu", label: "Tanggal", type: "date" },
    { id: "foto_tamu", label: "Foto Tamu", type: "file", accept: ".jpg,.jpeg,.png", multiple: true },
  ],
  inventaris_dokumen: [
    { id: "tanggal_input", label: "Tanggal Input", type: "date" },
    { id: "kategori_dokumen", label: "Kategori Dokumen", type: "select", options: ["A. Pengadaan Tanah", "B. Sengketa Tanah", "C. Penataan Tanah", "D. Sertipikasi", "E. Umum"] },
    { id: "asal_dokumen", label: "Asal Dokumen", type: "text" },
    { id: "perihal_dokumen", label: "Perihal", type: "text" },
    { id: "tanggal_dokumen", label: "Tanggal Dokumen", type: "date" },
    { id: "lokasi_dokumen", label: "Kecamatan", type: "select", options: kecamatanOptions },
    { id: "desa_dokumen", label: "Desa", type: "dependent_select", dependsOn: "lokasi_dokumen", dependentOptions: desaByKecamatan },
    { id: "status_dokumen", label: "Status", type: "select", options: ["Aktif", "Arsip", "Hilang"] },
    { id: "kode_kategori", label: "Kode A/B/C/D/E", type: "text" },
    { id: "kode_tahun", label: "Kode Tahun", type: "number" },
    { id: "kode_urutan", label: "Kode Urutan", type: "number" },
  ],
  pengajuan_bpn: [
    { id: "jenis_pengajuan", label: "Jenis Pengajuan", type: "select", options: ["Sertipikat Pertama Kali", "Pengapusan/Pelepasan Hak", "Pengukuran", "Ganti Hilang", "SKPT"] },
    { id: "nomor_berkas_sps", label: "Nomor Berkas SPS/TTD", type: "text" },
    { id: "tahun_berkas_sps", label: "Tahun Berkas SPS/TTD", type: "number" },
    { id: "tanggal_terbit_sps", label: "Tanggal Terbit SPS/TTD", type: "date" },
    { id: "kecamatan_bpn", label: "Kecamatan", type: "select", options: kecamatanOptions },
    { id: "desa_bpn", label: "Desa", type: "dependent_select", dependsOn: "kecamatan_bpn", dependentOptions: desaByKecamatan },
    { id: "pemohon_bpn", label: "Pemohon", type: "text" },
    { id: "keterangan_bpn", label: "Keterangan", type: "textarea" },
    { id: "foto_sps_ttd", label: "Unggah Foto SPS dan TTD", type: "file", accept: ".jpg,.jpeg,.png,.pdf" },
  ],
  perjalanan_dinas: [
    { id: "tanggal_perjalanan", label: "Tanggal Perjalanan", type: "date" },
    { id: "tujuan_perjalanan", label: "Tujuan (Kecamatan)", type: "select", options: kecamatanOptions },
    { id: "desa_perjalanan", label: "Desa", type: "dependent_select", dependsOn: "tujuan_perjalanan", dependentOptions: desaByKecamatan },
    { id: "dalam_rangka", label: "Dalam Rangka", type: "text" },
    { id: "pelaku_perjalanan", label: "Yang Melakukan Perjalanan", type: "checklist", options: namaPegawaiOptions },
    { id: "upload_lokasi", label: "Lokasi (Google Maps)", type: "html", html: '<div style="margin-top: 8px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><iframe src="https://maps.google.com/maps?q=Kabupaten+Bima&output=embed" style="width: 100%; height: 250px; border: none;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>' },
    { id: "foto_perjalanan", label: "Unggah Foto Perjalanan", type: "file", accept: ".jpg,.jpeg,.png,.pdf", multiple: true },
  ],
  agenda_rapat: [
    { id: "tanggal_rapat", label: "Tanggal Rapat", type: "date" },
    { id: "waktu_rapat", label: "Waktu", type: "time" },
    { id: "tempat_rapat", label: "Tempat", type: "text" },
    { id: "agenda_rapat_detail", label: "Agenda", type: "textarea" },
    { id: "peserta_rapat", label: "Peserta", type: "textarea" },
    { id: "upload_file_rapat", label: "Unggah File/Foto", type: "file", accept: ".jpg,.jpeg,.png,.pdf,.doc,.docx", multiple: true },
  ],
  lembur: [
    { id: "tanggal_lembur", label: "Tanggal Lembur", type: "date" },
    { id: "jam_mulai_lembur", label: "Jam Mulai", type: "time" },
    { id: "jam_selesai_lembur", label: "Jam Selesai", type: "time" },
    { id: "nama_pegawai_lembur", label: "Nama Pegawai", type: "checklist", options: namaPegawaiOptions },
    { id: "bidang_unit_lembur", label: "Bidang / Unit Kerja", type: "select", options: [
      "Tata Usaha",
      "Survei dan Pemetaan",
      "Penetapan Hak dan Pendaftaran",
      "Pengaturan dan Penataan Pertanahan",
      "Pengadaan Tanah",
      "Pengendalian dan Penanganan Sengketa",
      "Lainnya",
    ] },
    { id: "uraian_pekerjaan_lembur", label: "Uraian Pekerjaan", type: "textarea" },
    { id: "lokasi_lembur", label: "Lokasi Pelaksanaan", type: "text" },
    { id: "atasan_menyetujui_lembur", label: "Atasan yang Menyetujui", type: "checklist", options: ["Budiansani, ST"] },
    { id: "catatan_lembur", label: "Catatan", type: "textarea" },
    { id: "foto_lembur", label: "Unggah Foto Dokumentasi", type: "file", accept: ".jpg,.jpeg,.png,.pdf", multiple: true },
  ],
};

export interface SidataRecord {
  id: string;
  type: DataType;
  submitted_at: string;
  [key: string]: any;
}

export interface AdminAccount {
  username: string;
  password: string;
}

export function getDetailFields(item: SidataRecord): { label: string; value: string }[] {
  const fields = formFields[item.type] || [];
  return fields
    .filter(f => f.type !== 'html' && f.type !== 'file')
    .map(f => ({
      label: f.label,
      value: item[f.id] || '-',
    }));
}

export function getSummary(item: SidataRecord): string {
  switch (item.type) {
    case 'surat_masuk': return `${item.nomor_surat || '-'} | ${item.asal_surat || '-'} | ${item.perihal || '-'}`;
    case 'surat_keluar': return `${item.nomor_surat || '-'} | ${item.tujuan_surat || '-'} | ${item.perihal || '-'}`;
    case 'buku_tamu': return `${item.nama_tamu || '-'} | ${item.asal_tamu || '-'} | ${item.keperluan || '-'}`;
    case 'inventaris_dokumen': return `${item.kategori_dokumen || '-'} | ${item.asal_dokumen || '-'} | ${item.perihal_dokumen || item.nama_dokumen || '-'}`;
    case 'pengajuan_bpn': return `${item.jenis_pengajuan || '-'} | ${item.nomor_berkas_sps || '-'} | ${item.pemohon_bpn || '-'}`;
    case 'perjalanan_dinas': return `${item.tujuan_perjalanan || '-'} | ${item.pelaku_perjalanan || '-'} | ${item.dalam_rangka || '-'}`;
    case 'agenda_rapat': return `${item.tempat_rapat || '-'} | ${item.agenda_rapat_detail || '-'}`;
    case 'lembur': return `${item.nama_pegawai_lembur || '-'} | ${item.uraian_pekerjaan_lembur || '-'}`;
    default: return '-';
  }
}

// ─── Extra filter dropdowns per data type ───
// `multi` indicates the underlying field stores multiple values separated by ' | '
export interface ExtraFilter {
  field: string;
  label: string;
  multi?: boolean;
  type?: 'select' | 'date';
  /** Static option list — always shown in dropdown even if no records exist yet. */
  options?: string[];
  /** Placeholder shown for date filters when empty. */
  placeholder?: string;
}

export const extraFilters: Record<DataType, ExtraFilter[]> = {
  surat_masuk: [
    { field: 'jenis_surat', label: 'Jenis Surat', options: ["Langsung", "Tembusan", "Disposisi"] },
  ],
  surat_keluar: [
    { field: 'jenis_surat', label: 'Jenis Surat', options: ["Biasa", "Edaran", "Undangan", "Pengantar", "Keputusan", "Lainnya"] },
  ],
  buku_tamu: [
    { field: 'kecamatan_tamu', label: 'Kecamatan', options: kecamatanOptions },
  ],
  inventaris_dokumen: [
    { field: 'kategori_dokumen', label: 'Kategori Dokumen', options: ["A. Pengadaan Tanah", "B. Sengketa Tanah", "C. Penataan Tanah", "D. Sertipikasi", "E. Umum"] },
  ],
  pengajuan_bpn: [
    { field: 'kecamatan_bpn', label: 'Kecamatan', options: kecamatanOptions },
  ],
  perjalanan_dinas: [
    { field: 'tujuan_perjalanan', label: 'Kecamatan', options: kecamatanOptions },
  ],
  agenda_rapat: [
    { field: 'tanggal_rapat', label: 'Tanggal Rapat', type: 'date', placeholder: 'Cari tanggal rapat' },
  ],
  lembur: [
    { field: 'bidang_unit_lembur', label: 'Bidang/Unit', options: [
      "Tata Usaha",
      "Survei dan Pemetaan",
      "Penetapan Hak dan Pendaftaran",
      "Pengaturan dan Penataan Pertanahan",
      "Pengadaan Tanah",
      "Pengendalian dan Penanganan Sengketa",
      "Lainnya",
    ] },
  ],
};
