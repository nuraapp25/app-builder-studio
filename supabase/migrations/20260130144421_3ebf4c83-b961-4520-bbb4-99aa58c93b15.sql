-- Add break tracking columns to attendance_records
ALTER TABLE public.attendance_records
ADD COLUMN break1_start timestamp with time zone,
ADD COLUMN break1_end timestamp with time zone,
ADD COLUMN break2_start timestamp with time zone,
ADD COLUMN break2_end timestamp with time zone,
ADD COLUMN lunch_start timestamp with time zone,
ADD COLUMN lunch_end timestamp with time zone;