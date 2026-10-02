
-- Add RLS policies for sidata-uploads storage bucket to allow authenticated uploads
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sidata-uploads');

CREATE POLICY "Anyone can view uploaded files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sidata-uploads');
