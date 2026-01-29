import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Eye, Download, Check, X, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import LeadActionsDialog from "@/components/leads/LeadActionsDialog";
import ExportMenu from "@/components/ExportMenu";

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
  const [searchQuery, setSearchQuery] = useState("");

  // Filter leads based on search query
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const query = searchQuery.toLowerCase().trim();
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(query) ||
        lead.phone.includes(query)
    );
  }, [leads, searchQuery]);

  // Prepare export data - must be before any early returns
  const exportData = useMemo(() => {
    return filteredLeads.map((lead, index) => ({
      "S.No.": index + 1,
      "Name": lead.name,
      "Phone": lead.phone,
      "Badge No.": lead.badge_number || "-",
      "Aadhar Number": lead.aadhar_number || "-",
      "DL Number": lead.dl_number || "-",
      "PAN Number": lead.pan_number || "-",
      "Gas Bill Number": lead.gas_bill_number || "-",
      "Bank Passbook Number": lead.bank_passbook_number || "-",
      "Status": lead.status,
      "Created At": new Date(lead.created_at).toLocaleDateString(),
    }));
  }, [filteredLeads]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [viewDocument, setViewDocument] = useState<{ url: string; name: string } | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showActionsDialog, setShowActionsDialog] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  const handleDeleteRequest = (leadId: string) => {
    console.log('Delete requested for lead:', leadId);
    setDeleteId(leadId);
    setConfirmDelete(false);
  };

  const handleFirstConfirm = () => {
    console.log('First confirmation for delete');
    setConfirmDelete(true);
  };

  const handleFinalDelete = async () => {
    if (!deleteId) return;

    console.log('Executing final delete for lead:', deleteId);

    try {
      // First delete associated documents from storage and database
      const leadDocs = documents[deleteId] || [];
      
      // Delete files from storage
      for (const doc of leadDocs) {
        const { error: storageError } = await supabase.storage
          .from("lead-documents")
          .remove([doc.file_path]);
        
        if (storageError) {
          console.error('Failed to delete file from storage:', storageError);
        }
      }

      // Delete document records from database
      const { error: docsError } = await supabase
        .from("lead_documents")
        .delete()
        .eq("lead_id", deleteId);
      
      if (docsError) {
        console.error('Failed to delete document records:', docsError);
        // Continue with lead deletion even if document deletion fails
      }

      // Now delete the lead
      const { error } = await supabase.from("leads").delete().eq("id", deleteId);
      if (error) {
        console.error('Lead delete error:', error);
        throw error;
      }

      // Update local state
      setLeads(leads.filter((l) => l.id !== deleteId));
      const newDocs = { ...documents };
      delete newDocs[deleteId];
      setDocuments(newDocs);
      
      toast({ title: "Lead deleted successfully" });
    } catch (error: any) {
      console.error('Delete operation failed:', error);
      toast({
        title: "Error deleting lead",
        description: error.message || "Failed to delete lead. You may not have permission.",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
      setConfirmDelete(false);
    }
  };

  const cancelDelete = () => {
    setDeleteId(null);
    setConfirmDelete(false);
  };

  const getDocumentByType = (leadId: string, type: string) => {
    // Check for both old format (e.g., "aadhar") and new format (e.g., "aadhar_front")
    return documents[leadId]?.find(
      (d) => d.document_type === type || d.document_type === `${type}_front`
    );
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

  const handleDeleteDocument = async (doc: LeadDocument, leadId: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("lead-documents")
        .remove([doc.file_path]);

      if (storageError) {
        console.error("Failed to delete file from storage:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("lead_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      // Update local state
      setDocuments((prev) => {
        const updated = { ...prev };
        updated[leadId] = updated[leadId].filter((d) => d.id !== doc.id);
        return updated;
      });

      toast({ title: "Document deleted successfully" });
    } catch (error: any) {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const renderDocumentCell = (leadId: string, lead: Lead, docType: string, idField: keyof Lead) => {
    const doc = getDocumentByType(leadId, docType);
    const extractedId = lead[idField] as string | null;

    return (
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs max-w-[100px] truncate">{extractedId || "-"}</span>
          {doc && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDocument(doc);
                }}
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadDocument(doc);
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
              {isManager && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDocument(doc, leadId);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </TableCell>
    );
  };

  const getStatusBadge = (lead: Lead) => {
    const requiredDocs = ["aadhar", "driving_license", "pan_card", "bank_passbook", "gas_bill"];
    const leadDocs = documents[lead.id] || [];
    const uploadedTypes = leadDocs.map((d) => d.document_type.replace("_front", "").replace("_back", ""));
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

  // Long press handlers
  const handleTouchStart = useCallback((lead: Lead) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectedLead(lead);
      setShowActionsDialog(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, lead: Lead) => {
    e.preventDefault();
    setSelectedLead(lead);
    setShowActionsDialog(true);
  }, []);

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
        <AppHeader title="Leads Library" subtitle={`${filteredLeads.length} of ${leads.length} leads`} />

        {/* Search Bar and Export */}
        <div className="px-4 mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <ExportMenu
            data={exportData}
            filename="Leads_Library"
            sheetName="Leads"
          />
        </div>

        <div className="mt-4 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="min-w-[1600px] px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">S.No.</TableHead>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Phone</TableHead>
                  <TableHead className="whitespace-nowrap">Badge No.</TableHead>
                  <TableHead className="whitespace-nowrap">Aadhar Card</TableHead>
                  <TableHead className="whitespace-nowrap">Driving License</TableHead>
                  <TableHead className="whitespace-nowrap">Pan Card</TableHead>
                  <TableHead className="whitespace-nowrap">Gas Bill</TableHead>
                  <TableHead className="whitespace-nowrap">Bank Passbook</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  {isManager && <TableHead className="whitespace-nowrap">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isManager ? 11 : 10} className="text-center text-muted-foreground py-8">
                      {searchQuery ? "No leads match your search" : "No leads found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead, index) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer select-none"
                      onTouchStart={() => handleTouchStart(lead)}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      onContextMenu={(e) => handleContextMenu(e, lead)}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.phone}</TableCell>
                      <TableCell className="font-mono text-xs">{lead.badge_number || "-"}</TableCell>
                      {renderDocumentCell(lead.id, lead, "aadhar", "aadhar_number")}
                      {renderDocumentCell(lead.id, lead, "driving_license", "dl_number")}
                      {renderDocumentCell(lead.id, lead, "pan_card", "pan_number")}
                      {renderDocumentCell(lead.id, lead, "gas_bill", "gas_bill_number")}
                      {renderDocumentCell(lead.id, lead, "bank_passbook", "bank_passbook_number")}
                      <TableCell>{getStatusBadge(lead)}</TableCell>
                      {isManager && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRequest(lead.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Long Press Actions Dialog */}
        <LeadActionsDialog
          open={showActionsDialog}
          onOpenChange={setShowActionsDialog}
          lead={selectedLead}
          onEdit={() => {
            if (selectedLead) {
              setEditLead(selectedLead);
            }
          }}
          onDelete={() => {
            if (selectedLead) {
              handleDeleteRequest(selectedLead.id);
            }
          }}
          isManager={isManager}
        />

        {/* First Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId && !confirmDelete} onOpenChange={cancelDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this lead? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleFirstConfirm} className="bg-destructive text-destructive-foreground">
                Yes, Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Second Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId && confirmDelete} onOpenChange={cancelDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Final Confirmation</AlertDialogTitle>
              <AlertDialogDescription>
                This is your final confirmation. The lead and all associated documents will be permanently deleted. Are you absolutely sure?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinalDelete} className="bg-destructive text-destructive-foreground">
                Delete Permanently
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
