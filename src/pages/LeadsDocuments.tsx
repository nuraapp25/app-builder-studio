import { useState, useEffect } from "react";
import { ChevronRight, Eye, Download, FolderOpen, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Lead {
  id: string;
  name: string;
  phone: string;
}

interface LeadDocument {
  id: string;
  lead_id: string;
  document_type: string;
  file_path: string;
  file_name: string;
}

const documentTypeLabels: Record<string, string> = {
  aadhar: "Aadhar Card",
  driving_license: "Driving License",
  pan_card: "Pan Card",
  bank_passbook: "Bank Passbook",
  gas_bill: "Gas Bill",
};

const LeadsDocuments = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDocument, setViewDocument] = useState<{ url: string; name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone")
        .order("name");

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from("lead_documents")
        .select("*")
        .eq("lead_id", leadId);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectLead = async (lead: Lead) => {
    setSelectedLead(lead);
    await fetchDocuments(lead.id);
  };

  const handleViewDocument = (doc: LeadDocument) => {
    const { data } = supabase.storage
      .from("lead-documents")
      .getPublicUrl(doc.file_path);

    setViewDocument({ url: data.publicUrl, name: doc.file_name });
  };

  const handleDownloadDocument = (doc: LeadDocument) => {
    const { data } = supabase.storage
      .from("lead-documents")
      .getPublicUrl(doc.file_path);

    const link = document.createElement("a");
    link.href = data.publicUrl;
    link.download = doc.file_name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-24 safe-area-top">
        <AppHeader
          title="Leads Documents"
          subtitle={selectedLead ? selectedLead.name : `${leads.length} leads`}
        />

        <div className="mx-4 mt-4">
          <AnimatePresence mode="wait">
            {!selectedLead ? (
              <motion.div
                key="leads-list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2"
              >
                {leads.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    No leads found
                  </Card>
                ) : (
                  leads.map((lead, index) => (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSelectLead(lead)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FolderOpen className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{lead.name}</p>
                              <p className="text-sm text-muted-foreground">{lead.phone}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="documents-list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Button
                  variant="ghost"
                  className="mb-4 -ml-2"
                  onClick={() => {
                    setSelectedLead(null);
                    setDocuments([]);
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Leads
                </Button>

                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground">
                      No documents uploaded for this lead
                    </Card>
                  ) : (
                    documents.map((doc, index) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {documentTypeLabels[doc.document_type] || doc.document_type}
                              </p>
                              <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleViewDocument(doc)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDownloadDocument(doc)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View Document Dialog */}
        <Dialog open={!!viewDocument} onOpenChange={() => setViewDocument(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{viewDocument?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={viewDocument?.url}
                alt={viewDocument?.name}
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default LeadsDocuments;
