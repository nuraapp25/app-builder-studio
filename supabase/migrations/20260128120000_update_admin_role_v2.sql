-- Ensure admin@nura.com has the correct role in metadata and user_roles table

-- 1. Update auth.users metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@nura.com';

-- 2. Update public.user_roles
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@nura.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Delete existing role entry to avoid unique constraint conflict on upsert if strictly 1:1 isn't enforced or just to be clean
    -- (Schema says UNIQUE(user_id, role), but logic implies one role per user conceptually in basic design)
    -- Actually, if a user can have multiple roles, we should check.
    -- But the schema UNIQUE (user_id, role) allows multiple roles per user if they are different roles.
    -- However, the code generally assumes one main role. 
    -- SAFE BET: Remove 'field_recruiter' or other roles for this user and ensure 'admin' exists.
    
    DELETE FROM public.user_roles 
    WHERE user_id = v_user_id AND role != 'admin';

    -- Insert admin role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
