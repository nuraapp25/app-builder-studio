-- Add sign_out_latitude and sign_out_longitude columns to attendance_records
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS sign_out_latitude numeric,
ADD COLUMN IF NOT EXISTS sign_out_longitude numeric;