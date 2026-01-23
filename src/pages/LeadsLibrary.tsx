import { useState, useEffect } from "react";
import { Eye, Download, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateLeadDialog from "@/components/leads/CreateLeadDialog";

interface Lead {
  id: string;
  name: string;
  phone: string;
  badge_number: string | null;
  aadhar_number: string | null;
  dl_number: string | null;
  pan_number: string | null;
  bank_passbook_number: string | null;
  gas_bill_number: string | null;
  status: string;
  created_at: string;
}

interface LeadDocument {
  id: string;
  lead_id: string;
  document_type: string;
  file_path: string;
  file_name: string;
  extracted_id: string | null;
}

const LeadsLibrary = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [documents, setDocuments] = useState<Record<string, LeadDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [viewDocument, setViewDocument] = useState<{ url: string; name: string } | null>(null);
  const { toast } = useToast();
  const { isManager } = useAuth();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;

      const { data: docsData, error: docsError } = await supabase
        .from("lead_documents")
        .select("*");

      if (docsError) throw docsError;

      // Group documents by lead_id
      const docsMap: Record<string, LeadDocument[]> = {};
      docsData?.forEach((doc) => {
        if (!docsMap[doc.lead_id]) {
          docsMap[doc.lead_id] = [];
        }
        docsMap[doc.lead_id].push(doc);
      });

      setLeads(leadsData || []);
      setDocuments(docsMap);
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

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("leads").delete().eq("id", deleteId);
      if (error) throw error;

      setLeads(leads.filter((l) => l.id !== deleteId));
      toast({ title: "Lead deleted successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getDocumentByType = (leadId: string, type: string) => {
    return documents[leadId]?.find((d) => d.document_type === type);
  };

  const handleViewDocument = async (doc: LeadDocument) => {
    const { data } = supabase.storage
      .from("lead-documents")
      .getPublicUrl(doc.file_path);

    setViewDocument({ url: data.publicUrl, name: doc.file_name });
  };

  const handleDownloadDocument = async (doc: LeadDocument) => {
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

  const renderDocumentCell = (leadId: string, lead: Lead, docType: string, idField: keyof Lead) => {
    const doc = getDocumentByType(leadId, docType);
    const extractedId = lead[idField] as string | null;

    return (
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{extractedId || "-"}</span>
          {doc && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleViewDocument(doc)}
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleDownloadDocument(doc)}
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </TableCell>
    );
  };

  const getStatusBadge = (lead: Lead) => {
    const requiredDocs = ["aadhar", "driving_license", "pan_card", "bank_passbook", "gas_bill"];
    const leadDocs = documents[lead.id] || [];
    const uploadedTypes = leadDocs.map((d) => d.document_type);
    const hasAllDocs = requiredDocs.every((type) => uploadedTypes.includes(type));

    return hasAllDocs ? (
      <Badge className="bg-success/10 text-success border-success/20">
        <Check className="w-3 h-3 mr-1" />
        Complete
      </Badge>
    ) : (
      <Badge variant="outline" className="text-warning border-warning/20">
        <X className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
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
        <AppHeader title="Leads Library" subtitle={`${leads.length} leads`} />

        <div className="mx-4 mt-4">
          <ScrollArea className="w-full">
            <div className="min-w-[1400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">S.No.</TableHead>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Phone</TableHead>
                    <TableHead className="whitespace-nowrap">Aadhar Card</TableHead>
                    <TableHead className="whitespace-nowrap">Driving License</TableHead>
                    <TableHead className="whitespace-nowrap">Pan Card</TableHead>
                    <TableHead className="whitespace-nowrap">Bank Passbook</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No leads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead, index) => (
                      <TableRow key={lead.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.phone}</TableCell>
                        {renderDocumentCell(lead.id, lead, "aadhar", "aadhar_number")}
                        {renderDocumentCell(lead.id, lead, "driving_license", "dl_number")}
                        {renderDocumentCell(lead.id, lead, "pan_card", "pan_number")}
                        {renderDocumentCell(lead.id, lead, "bank_passbook", "bank_passbook_number")}
                        <TableCell>{getStatusBadge(lead)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditLead(lead)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isManager && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteId(lead.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this lead? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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

        {/* Edit Lead Dialog */}
        {editLead && (
          <CreateLeadDialog
            open={!!editLead}
            onOpenChange={() => setEditLead(null)}
            editLead={editLead}
            onSuccess={fetchLeads}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default LeadsLibrary;
