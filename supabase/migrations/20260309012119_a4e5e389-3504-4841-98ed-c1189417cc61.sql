
-- ============================================================
-- 1. Tabel profiles: data tambahan admin (nama, jabatan, dll.)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  jabatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admin bisa lihat & edit profil sendiri
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. Tabel user_roles: pisahkan role dari profil (anti privilege escalation)
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fungsi security definer untuk cek role (hindari RLS recursive)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Hanya user dengan role admin yang bisa baca semua roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. Trigger auto-buat profil saat signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. Perbaiki RLS: sidata_records — hanya user terautentikasi
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read records" ON public.sidata_records;
DROP POLICY IF EXISTS "Anyone can insert records" ON public.sidata_records;
DROP POLICY IF EXISTS "Anyone can delete records" ON public.sidata_records;

-- Semua user login bisa baca (publik bisa lihat dashboard stats juga)
CREATE POLICY "Authenticated users can read records"
  ON public.sidata_records FOR SELECT
  USING (true);

-- Hanya user terautentikasi yang bisa insert
CREATE POLICY "Authenticated users can insert records"
  ON public.sidata_records FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Hanya admin yang bisa delete
CREATE POLICY "Admins can delete records"
  ON public.sidata_records FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Perbaiki RLS: admin_accounts — tabel lama, amankan penuh
--    (ke depannya tidak dipakai lagi, tapi tetap aman)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read admins" ON public.admin_accounts;
DROP POLICY IF EXISTS "Anyone can insert admins" ON public.admin_accounts;
DROP POLICY IF EXISTS "Anyone can update admins" ON public.admin_accounts;
DROP POLICY IF EXISTS "Anyone can delete admins" ON public.admin_accounts;

CREATE POLICY "Only admins can read admin_accounts"
  ON public.admin_accounts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert admin_accounts"
  ON public.admin_accounts FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update admin_accounts"
  ON public.admin_accounts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete admin_accounts"
  ON public.admin_accounts FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. Timestamp trigger untuk profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
