ALTER TABLE public.sidata_records DROP CONSTRAINT IF EXISTS sidata_records_type_check;

ALTER TABLE public.sidata_records ADD CONSTRAINT sidata_records_type_check
CHECK (type = ANY (ARRAY[
  'surat_masuk'::text,
  'buku_tamu'::text,
  'inventaris_dokumen'::text,
  'pengajuan_bpn'::text,
  'perjalanan_dinas'::text,
  'agenda_rapat'::text,
  'lembur'::text
]));