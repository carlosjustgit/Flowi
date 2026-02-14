-- Create storage bucket for file artifacts
INSERT INTO storage.buckets (id, name, public)
VALUES ('flow-artifacts', 'flow-artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - authenticated users can read artifacts
CREATE POLICY "Authenticated users can read flow-artifacts" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'flow-artifacts' AND
    auth.role() = 'authenticated'
  );

-- Create RLS policy - service role can insert artifacts
CREATE POLICY "Service role can insert flow-artifacts" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'flow-artifacts' AND
    (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );

-- Create RLS policy - service role can update artifacts
CREATE POLICY "Service role can update flow-artifacts" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'flow-artifacts' AND
    (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  )
  WITH CHECK (
    bucket_id = 'flow-artifacts' AND
    (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );

-- Create RLS policy - service role can delete artifacts
CREATE POLICY "Service role can delete flow-artifacts" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'flow-artifacts' AND
    (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );
