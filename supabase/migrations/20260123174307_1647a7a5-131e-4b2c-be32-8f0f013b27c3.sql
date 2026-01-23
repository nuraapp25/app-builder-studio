-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  badge_number TEXT,
  aadhar_number TEXT,
  dl_number TEXT,
  pan_number TEXT,
  bank_passbook_number TEXT,
  gas_bill_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_documents table
CREATE TABLE public.lead_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  extracted_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for leads
CREATE POLICY "All authenticated users can view leads"
ON public.leads FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can create leads"
ON public.leads FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update leads"
ON public.leads FOR UPDATE
USING (is_manager() OR auth.uid() = created_by);

CREATE POLICY "Only managers can delete leads"
ON public.leads FOR DELETE
USING (is_manager());

-- RLS policies for lead_documents
CREATE POLICY "All authenticated users can view lead documents"
ON public.lead_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can create lead documents"
ON public.lead_documents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update lead documents"
ON public.lead_documents FOR UPDATE
USING (is_manager());

CREATE POLICY "Only managers can delete lead documents"
ON public.lead_documents FOR DELETE
USING (is_manager());

-- Create storage bucket for lead documents
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-documents', 'lead-documents', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload lead documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lead-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view lead documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'lead-documents');

CREATE POLICY "Managers can delete lead documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'lead-documents' AND is_manager());

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();