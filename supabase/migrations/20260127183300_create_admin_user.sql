-- Create a default admin user if it doesn't exist
-- This uses the pgcrypto extension to hash the password securely

-- 1. Enable pgcrypto extension to use 'crypt' function
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Insert the user into auth.users
-- We use DO block to allow IF NOT EXISTS logic comfortably or just INSERT ON CONFLICT
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@nura.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at, -- SETTING THIS VERIFIES THE EMAIL INSTANTLY
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000', -- Default instance UUID in some Supabase setups, or NULL. Usually safer to omit or use generic. Let's try standard insert.
      'admin@nura.com',
      crypt('Nura@1234$', gen_salt('bf')), -- Hash the password "Nura@1234$"
      now(), -- Confirmed NOW
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "System Admin", "role": "admin"}', -- This triggers the handle_new_user function to set role=admin
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      ''
    );
  END IF;
END $$;

-- Force verify the admin user
-- This runs safely even if the user was already verified.
-- It fixes the issue where the user existed but was stuck in "unconfirmed" state.

UPDATE auth.users
SET 
  email_confirmed_at = now(),
  updated_at = now(),
  -- optional: ensure password is reset if needed, but not strictly required if they know it.
  -- ensure status is active
  last_sign_in_at = now(),
  raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'
WHERE email = 'admin@nura.com';
