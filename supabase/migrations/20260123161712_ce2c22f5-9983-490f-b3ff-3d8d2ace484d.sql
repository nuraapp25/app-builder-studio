-- Add status field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add password reset tracking fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS temp_password_expires_at timestamp with time zone;

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Update the handle_new_user function to include role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  signup_role text;
BEGIN
  -- Get role from metadata, default to field_recruiter
  signup_role := COALESCE(NEW.raw_user_meta_data->>'role', 'field_recruiter');
  
  -- Validate role
  IF signup_role NOT IN ('admin', 'ops_manager', 'field_recruiter') THEN
    signup_role := 'field_recruiter';
  END IF;

  INSERT INTO public.profiles (id, name, email, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'), NEW.email, 'active');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, signup_role::app_role);
  
  RETURN NEW;
END;
$function$;