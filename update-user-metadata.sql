-- Update existing user to belong to Flow AI
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{app_origin}',
  '"flow-ai"'
)
WHERE email = 'carlos@witfy.social';

-- Verify it worked
SELECT email, raw_user_meta_data->'app_origin' as app_origin
FROM auth.users 
WHERE email = 'carlos@witfy.social';
