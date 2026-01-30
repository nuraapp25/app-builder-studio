-- Create field planning assignments table for location calendar
CREATE TABLE public.field_planning_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_date DATE NOT NULL,
  field_recruiter_id UUID NOT NULL,
  manager_id UUID NOT NULL,
  location_name TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  comments TEXT,
  target INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create field recruiter targets table for separate target management
CREATE TABLE public.field_recruiter_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_recruiter_id UUID NOT NULL,
  daily_target INTEGER NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.field_planning_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_recruiter_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies for field_planning_assignments
CREATE POLICY "Managers can view all assignments"
ON public.field_planning_assignments
FOR SELECT
USING (is_manager());

CREATE POLICY "Managers can create assignments"
ON public.field_planning_assignments
FOR INSERT
WITH CHECK (is_manager());

CREATE POLICY "Managers can update assignments"
ON public.field_planning_assignments
FOR UPDATE
USING (is_manager());

CREATE POLICY "Managers can delete assignments"
ON public.field_planning_assignments
FOR DELETE
USING (is_manager());

-- Field recruiters can view their own assignments
CREATE POLICY "Field recruiters can view own assignments"
ON public.field_planning_assignments
FOR SELECT
USING (auth.uid() = field_recruiter_id);

-- RLS policies for field_recruiter_targets
CREATE POLICY "Managers can view all targets"
ON public.field_recruiter_targets
FOR SELECT
USING (is_manager());

CREATE POLICY "Managers can create targets"
ON public.field_recruiter_targets
FOR INSERT
WITH CHECK (is_manager());

CREATE POLICY "Managers can update targets"
ON public.field_recruiter_targets
FOR UPDATE
USING (is_manager());

CREATE POLICY "Managers can delete targets"
ON public.field_recruiter_targets
FOR DELETE
USING (is_manager());

-- Field recruiters can view their own targets
CREATE POLICY "Field recruiters can view own targets"
ON public.field_recruiter_targets
FOR SELECT
USING (auth.uid() = field_recruiter_id);

-- Add triggers for updated_at
CREATE TRIGGER update_field_planning_assignments_updated_at
BEFORE UPDATE ON public.field_planning_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_field_recruiter_targets_updated_at
BEFORE UPDATE ON public.field_recruiter_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();