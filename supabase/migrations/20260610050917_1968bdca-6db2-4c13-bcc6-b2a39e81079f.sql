CREATE TABLE public.pegawai_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pegawai_options TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pegawai_options TO authenticated;
GRANT ALL ON public.pegawai_options TO service_role;

ALTER TABLE public.pegawai_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pegawai options"
ON public.pegawai_options FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert pegawai options"
ON public.pegawai_options FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pegawai options"
ON public.pegawai_options FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pegawai options"
ON public.pegawai_options FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pegawai_options_updated_at
BEFORE UPDATE ON public.pegawai_options
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pegawai_options (name) VALUES
  ('Amirullah'),
  ('Budiansani, ST'),
  ('Deden Kurniawan, SPWK'),
  ('Endang Aswari Astuti, S.Pd'),
  ('Farid, SE'),
  ('Ferry Asadullah, SE'),
  ('Firmansah, S.Kom'),
  ('Fizriati Ningsi, SPWK'),
  ('Iskandar Julkarnain, ST'),
  ('Linda Laraswati, SE'),
  ('Mayangsari, S.Ikom'),
  ('Muhammad Ilyas'),
  ('Muisliddinillah, S.HI'),
  ('Nurhaidah, SP'),
  ('Nurul Zihan, ST., MT'),
  ('Satya Miharja SPWK'),
  ('Sri Endang, SH'),
  ('Subyono'),
  ('Sumardin, S.HI'),
  ('Syahdan'),
  ('Tiara Zahra, ST'),
  ('Wandi Arwana, SH')
ON CONFLICT (name) DO NOTHING;