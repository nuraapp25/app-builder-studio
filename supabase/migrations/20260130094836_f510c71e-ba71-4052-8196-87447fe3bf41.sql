-- Add monthly onboarding target column to field_recruiter_targets table
ALTER TABLE public.field_recruiter_targets 
ADD COLUMN monthly_onboarding_target integer NOT NULL DEFAULT 0;