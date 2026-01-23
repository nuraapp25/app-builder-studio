import { useState, useRef } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lead {
  id: string;
  name: string;
  phone: string;
  badge_number: string | null;
}

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editLead?: Lead | null;
  onSuccess?: () => void;
}

interface DocumentUpload {
  file: File | null;
  preview: string | null;
}

const CreateLeadDialog = ({
  open,
  onOpenChange,
  editLead,
  onSuccess,
}: CreateLeadDialogProps) => {
  const [name, setName] = useState(editLead?.name || "");
  const [phone, setPhone] = useState(editLead?.phone || "");
  const [badgeNumber, setBadgeNumber] = useState(editLead?.badge_number || "");
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState<string | null>(null);

  const [documents, setDocuments] = useState<Record<string, DocumentUpload>>({
    aadhar: { file: null, preview: null },
    driving_license: { file: null, preview: null },
    pan_card: { file: null, preview: null },
    bank_passbook: { file: null, preview: null },
    gas_bill: { file: null, preview: null },
  });

  const [extractedIds, setExtractedIds] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const documentLabels: Record<string, string> = {
    aadhar: "Aadhar Card",
    driving_license: "Driving License",
    pan_card: "Pan Card",
    bank_passbook: "Bank Passbook",
    gas_bill: "Gas Bill",
  };

  const handleFileChange = async (docType: string, file: File | null) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG)",
        variant: "destructive",
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    setDocuments((prev) => ({
      ...prev,
      [docType]: { file, preview },
    }));

    // Trigger OCR
    await performOCR(docType, file);
  };

  const performOCR = async (docType: string, file: File) => {
    setOcrLoading(docType);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call OCR edge function
      const { data, error } = await supabase.functions.invoke("extract-document-id", {
        body: { image: base64, documentType: docType },
      });

      if (error) throw error;

      if (data?.extractedId) {
        setExtractedIds((prev) => ({
          ...prev,
          [docType]: data.extractedId,
        }));
        toast({
          title: "ID Extracted",
          description: `Successfully extracted ID from ${documentLabels[docType]}`,
        });
      }
    } catch (error: any) {
      console.error("OCR Error:", error);
      toast({
        title: "OCR Failed",
        description: "Could not extract ID. You can enter it manually.",
        variant: "destructive",
      });
    } finally {
      setOcrLoading(null);
    }
  };

  const removeDocument = (docType: string) => {
    if (documents[docType].preview) {
      URL.revokeObjectURL(documents[docType].preview!);
    }
    setDocuments((prev) => ({
      ...prev,
      [docType]: { file: null, preview: null },
    }));
    setExtractedIds((prev) => {
      const newIds = { ...prev };
      delete newIds[docType];
      return newIds;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and Phone Number are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create or update lead
      const leadData = {
        name: name.trim(),
        phone: phone.trim(),
        badge_number: badgeNumber.trim() || null,
        aadhar_number: extractedIds.aadhar || null,
        dl_number: extractedIds.driving_license || null,
        pan_number: extractedIds.pan_card || null,
        bank_passbook_number: extractedIds.bank_passbook || null,
        gas_bill_number: extractedIds.gas_bill || null,
        created_by: user?.id,
      };

      let leadId: string;

      if (editLead) {
        const { error } = await supabase
          .from("leads")
          .update(leadData)
          .eq("id", editLead.id);
        if (error) throw error;
        leadId = editLead.id;
      } else {
        const { data, error } = await supabase
          .from("leads")
          .insert(leadData)
          .select("id")
          .single();
        if (error) throw error;
        leadId = data.id;
      }

      // Upload documents
      for (const [docType, doc] of Object.entries(documents)) {
        if (doc.file) {
          const fileExt = doc.file.name.split(".").pop();
          const fileName = `${name.replace(/\s+/g, "_")}_${docType}.${fileExt}`;
          const filePath = `${leadId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("lead-documents")
            .upload(filePath, doc.file, { upsert: true });

          if (uploadError) throw uploadError;

          // Save document record
          await supabase.from("lead_documents").insert({
            lead_id: leadId,
            document_type: docType,
            file_path: filePath,
            file_name: fileName,
            extracted_id: extractedIds[docType] || null,
          });
        }
      }

      toast({
        title: editLead ? "Lead Updated" : "Lead Created",
        description: `Successfully ${editLead ? "updated" : "created"} lead for ${name}`,
      });

      onSuccess?.();
      onOpenChange(false);
      resetForm();
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

  const resetForm = () => {
    setName("");
    setPhone("");
    setBadgeNumber("");
    setDocuments({
      aadhar: { file: null, preview: null },
      driving_license: { file: null, preview: null },
      pan_card: { file: null, preview: null },
      bank_passbook: { file: null, preview: null },
      gas_bill: { file: null, preview: null },
    });
    setExtractedIds({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{editLead ? "Edit Lead" : "Create New Lead"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter driver name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge">Badge Number</Label>
              <Input
                id="badge"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="Enter badge number"
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Document Uploads (Optional)</p>
              <div className="space-y-3">
                {Object.entries(documentLabels).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <div className="flex gap-2 items-center">
                      {documents[key].preview ? (
                        <div className="relative flex-1">
                          <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                            <img
                              src={documents[key].preview!}
                              alt={label}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{documents[key].file?.name}</p>
                              {extractedIds[key] && (
                                <p className="text-xs text-muted-foreground">
                                  ID: {extractedIds[key]}
                                </p>
                              )}
                              {ocrLoading === key && (
                                <p className="text-xs text-primary flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Extracting ID...
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeDocument(key)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 justify-start"
                          onClick={() => fileInputRefs.current[key]?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload {label}
                        </Button>
                      )}
                      <input
                        type="file"
                        ref={(el) => (fileInputRefs.current[key] = el)}
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                        onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editLead ? "Updating..." : "Creating..."}
                  </>
                ) : editLead ? (
                  "Update Lead"
                ) : (
                  "Create Lead"
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLeadDialog;
