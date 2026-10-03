/**
 * SQL setup statis untuk tabel public.log_aktivitas (layar "Belum Aktif").
 *
 * Semua objek yang direferensikan diverifikasi dari skema proyek:
 * - public.profiles(user_id UUID, full_name TEXT)  → migration 20260309012119 + types.ts
 * - public.user_roles(user_id, role public.app_role) → migration 20260309012119 + types.ts
 * - public.has_role(_user_id UUID, _role public.app_role) → migration 20260309012119 + types.ts
 * - public.sidata_records(id, type) → migration 20260308180020 + types.ts
 * - Konvensi RLS & trigger proyek: SECURITY DEFINER + SET search_path = public,
 *   policy USING (public.has_role(auth.uid(), 'admin')).
 *
 * Definisi tabel log_aktivitas TIDAK ada di proyek (dijalankan manual di database),
 * jadi tabel dibuat mengikuti kontrak kolom yang dibaca aplikasi di
 * src/components/sidata/LogAktivitas.tsx (created_at, user_id, nama_user, role,
 * aksi, tabel, detail, id). Semua bersifat idempotent (IF NOT EXISTS / DROP IF
 * EXISTS) sehingga aman dijalankan berulang. Aplikasi HANYA menyalin/mengunduh
 * file ini — tidak pernah menjalankannya.
 */
export const LOG_SETUP_SQL = `-- =================================================================
-- SIDATA — Setup Log Aktivitas (idempotent, aman dijalankan berulang)
-- =================================================================
-- Tujuan : membuat tabel public.log_aktivitas + trigger + RLS
--          agar halaman Pengaturan > Log Aktivitas aktif.
-- Cara   : Supabase Dashboard → SQL Editor → Tempel → Run.
-- Catatan: Aplikasi SIDATA hanya menyalin/mengunduh file ini,
--          TIDAK pernah menjalankannya. Periksa dulu sebelum Run.
-- =================================================================

-- 1. Tabel log_aktivitas (kolom sesuai yang dibaca aplikasi)
CREATE TABLE IF NOT EXISTS public.log_aktivitas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,
  nama_user  TEXT,
  role       TEXT,
  aksi       TEXT NOT NULL,
  tabel      TEXT NOT NULL,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RLS: hanya Admin yang boleh membaca log
ALTER TABLE public.log_aktivitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view log_aktivitas" ON public.log_aktivitas;
CREATE POLICY "Admins can view log_aktivitas"
  ON public.log_aktivitas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Fungsi pencatat perubahan data (pola SECURITY DEFINER sama dengan
--    migrasi proyek; membaca profiles.user_id/full_name & user_roles.role)
CREATE OR REPLACE FUNCTION public.log_aktivitas_catat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_nama  TEXT;
  v_role  TEXT;
  v_aksi  TEXT;
  v_detail JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_aksi  := 'Tambah';
    v_detail := jsonb_build_object('record_type', NEW.type, 'record_id', NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    v_aksi  := 'Ubah';
    v_detail := jsonb_build_object('record_type', NEW.type, 'record_id', NEW.id);
  ELSE
    v_aksi  := 'Hapus';
    v_detail := jsonb_build_object('record_type', OLD.type, 'record_id', OLD.id);
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT full_name INTO v_nama
      FROM public.profiles
     WHERE user_id = v_uid;
    SELECT role::text INTO v_role
      FROM public.user_roles
     WHERE user_id = v_uid
     LIMIT 1;
  END IF;

  INSERT INTO public.log_aktivitas (user_id, nama_user, role, aksi, tabel, detail)
  VALUES (v_uid, v_nama, v_role, v_aksi, TG_TABLE_NAME, v_detail);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Trigger pada tabel data utama (sidata_records) — idempotent
DROP TRIGGER IF EXISTS log_aktivitas_catat ON public.sidata_records;
CREATE TRIGGER log_aktivitas_catat
  AFTER INSERT OR UPDATE OR DELETE ON public.sidata_records
  FOR EACH ROW
  EXECUTE FUNCTION public.log_aktivitas_catat();

-- Selesai. Kembali ke SIDATA lalu klik "Coba Lagi".
`;
