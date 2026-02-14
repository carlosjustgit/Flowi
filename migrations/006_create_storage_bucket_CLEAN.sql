-- Migration 006: Create Storage Bucket
-- Run this last (after 005)

INSERT INTO storage.buckets (id, name, public)
VALUES ('flow-artifacts', 'flow-artifacts', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read flow-artifacts" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'flow-artifacts' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Service role can insert flow-artifacts" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'flow-artifacts' AND
    (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );

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

CREATE POLICY "Service role can delete flow-artifacts" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'flow-artifacts' AND
    (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );
