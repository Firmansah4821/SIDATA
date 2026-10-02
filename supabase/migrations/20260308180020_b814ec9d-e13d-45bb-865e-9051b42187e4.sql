
-- Create sidata_records table
CREATE TABLE public.sidata_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('surat_masuk', 'buku_tamu', 'inventaris_dokumen', 'pengajuan_bpn', 'perjalanan_dinas', 'agenda_rapat')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sidata_records ENABLE ROW LEVEL SECURITY;

-- Public read/write (app uses custom admin login, not Supabase auth)
CREATE POLICY "Anyone can read records" ON public.sidata_records FOR SELECT USING (true);
CREATE POLICY "Anyone can insert records" ON public.sidata_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete records" ON public.sidata_records FOR DELETE USING (true);

-- Create admin_accounts table
CREATE TABLE public.admin_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- Public access (app handles auth logic internally)
CREATE POLICY "Anyone can read admins" ON public.admin_accounts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert admins" ON public.admin_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete admins" ON public.admin_accounts FOR DELETE USING (true);
CREATE POLICY "Anyone can update admins" ON public.admin_accounts FOR UPDATE USING (true);

-- Insert default admin account
INSERT INTO public.admin_accounts (username, password_hash) VALUES ('admin', 'admin123');

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('sidata-uploads', 'sidata-uploads', true);

-- Storage policies
CREATE POLICY "Public read sidata uploads" ON storage.objects FOR SELECT USING (bucket_id = 'sidata-uploads');
CREATE POLICY "Anyone can upload to sidata" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sidata-uploads');
CREATE POLICY "Anyone can delete sidata uploads" ON storage.objects FOR DELETE USING (bucket_id = 'sidata-uploads');
