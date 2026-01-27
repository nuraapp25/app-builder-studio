-- Create a table to store GPS location history for field recruiters
CREATE TABLE public.location_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attendance_record_id uuid REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  area_name text,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create an index for faster queries
CREATE INDEX idx_location_tracking_user_id ON public.location_tracking(user_id);
CREATE INDEX idx_location_tracking_attendance_record_id ON public.location_tracking(attendance_record_id);
CREATE INDEX idx_location_tracking_recorded_at ON public.location_tracking(recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE public.location_tracking ENABLE ROW LEVEL SECURITY;

-- Field recruiters can insert their own location data
CREATE POLICY "Users can insert own location"
ON public.location_tracking
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Field recruiters can view their own locations, managers can view all
CREATE POLICY "Users can view own or managers can view all locations"
ON public.location_tracking
FOR SELECT
USING ((auth.uid() = user_id) OR is_manager());

-- Managers can delete location records
CREATE POLICY "Only managers can delete locations"
ON public.location_tracking
FOR DELETE
USING (is_manager());