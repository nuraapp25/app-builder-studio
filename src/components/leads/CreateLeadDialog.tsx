import { useState, useRef, useEffect, useCallback } from "react";
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
  front: { file: File | null; preview: string | null };
  back: { file: File | null; preview: string | null };
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
  const [phoneExists, setPhoneExists] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);

  const [documents, setDocuments] = useState<Record<string, DocumentUpload>>({
    aadhar: { front: { file: null, preview: null }, back: { file: null, preview: null } },
    driving_license: { front: { file: null, preview: null }, back: { file: null, preview: null } },
    pan_card: { front: { file: null, preview: null }, back: { file: null, preview: null } },
    bank_passbook: { front: { file: null, preview: null }, back: { file: null, preview: null } },
    gas_bill: { front: { file: null, preview: null }, back: { file: null, preview: null } },
  });

  const [extractedIds, setExtractedIds] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Debounced phone duplicate check
  const checkPhoneDuplicate = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber.trim() || phoneNumber.length < 5) {
      setPhoneExists(false);
      return;
    }

    // Skip check if editing and phone hasn't changed
    if (editLead && editLead.phone === phoneNumber.trim()) {
      setPhoneExists(false);
      return;
    }

    setCheckingPhone(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id")
        .eq("phone", phoneNumber.trim())
        .maybeSingle();

      if (error) throw error;
      setPhoneExists(!!data);
    } catch (error) {
      console.error("Error checking phone:", error);
      setPhoneExists(false);
    } finally {
      setCheckingPhone(false);
    }
  }, [editLead]);

  // Debounce effect for phone check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkPhoneDuplicate(phone);
    }, 500);

    return () => clearTimeout(timer);
  }, [phone, checkPhoneDuplicate]);

  const documentLabels: Record<string, string> = {
    aadhar: "Aadhar Card",
    driving_license: "Driving License",
    pan_card: "Pan Card",
    bank_passbook: "Bank Passbook",
    gas_bill: "Gas Bill",
  };

  const handleFileChange = async (docType: string, side: "front" | "back", file: File | null) => {
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
      [docType]: {
        ...prev[docType],
        [side]: { file, preview },
      },
    }));

    // Only trigger OCR for front images
    if (side === "front") {
      await performOCR(docType, file);
    }
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

  const removeDocument = (docType: string, side: "front" | "back") => {
    const doc = documents[docType][side];
    if (doc.preview) {
      URL.revokeObjectURL(doc.preview);
    }
    setDocuments((prev) => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        [side]: { file: null, preview: null },
      },
    }));
    // Only clear extracted ID if removing front image
    if (side === "front") {
      setExtractedIds((prev) => {
        const newIds = { ...prev };
        delete newIds[docType];
        return newIds;
      });
    }
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

      // Upload documents (both front and back)
      for (const [docType, doc] of Object.entries(documents)) {
        // Upload front image
        if (doc.front.file) {
          const fileExt = doc.front.file.name.split(".").pop();
          const fileName = `${name.replace(/\s+/g, "_")}_${docType}_front.${fileExt}`;
          const filePath = `${leadId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("lead-documents")
            .upload(filePath, doc.front.file, { upsert: true });

          if (uploadError) throw uploadError;

          // Save document record for front
          await supabase.from("lead_documents").insert({
            lead_id: leadId,
            document_type: `${docType}_front`,
            file_path: filePath,
            file_name: fileName,
            extracted_id: extractedIds[docType] || null,
          });
        }

        // Upload back image
        if (doc.back.file) {
          const fileExt = doc.back.file.name.split(".").pop();
          const fileName = `${name.replace(/\s+/g, "_")}_${docType}_back.${fileExt}`;
          const filePath = `${leadId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("lead-documents")
            .upload(filePath, doc.back.file, { upsert: true });

          if (uploadError) throw uploadError;

          // Save document record for back (no extracted ID)
          await supabase.from("lead_documents").insert({
            lead_id: leadId,
            document_type: `${docType}_back`,
            file_path: filePath,
            file_name: fileName,
            extracted_id: null,
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
      aadhar: { front: { file: null, preview: null }, back: { file: null, preview: null } },
      driving_license: { front: { file: null, preview: null }, back: { file: null, preview: null } },
      pan_card: { front: { file: null, preview: null }, back: { file: null, preview: null } },
      bank_passbook: { front: { file: null, preview: null }, back: { file: null, preview: null } },
      gas_bill: { front: { file: null, preview: null }, back: { file: null, preview: null } },
    });
    setExtractedIds({});
  };

  const renderDocumentUpload = (docType: string, side: "front" | "back") => {
    const doc = documents[docType][side];
    const inputKey = `${docType}_${side}`;
    const sideLabel = side === "front" ? "Front" : "Back";

    return (
      <div className="flex gap-2 items-center">
        {doc.preview ? (
          <div className="relative flex-1">
            <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
              <img
                src={doc.preview}
                alt={`${documentLabels[docType]} ${sideLabel}`}
                className="w-10 h-10 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{doc.file?.name}</p>
                {side === "front" && extractedIds[docType] && (
                  <p className="text-xs text-muted-foreground">
                    ID: {extractedIds[docType]}
                  </p>
                )}
                {side === "front" && ocrLoading === docType && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Extracting...
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeDocument(docType, side)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 justify-start text-xs h-8"
            onClick={() => fileInputRefs.current[inputKey]?.click()}
          >
            <Upload className="w-3 h-3 mr-1" />
            {sideLabel}
          </Button>
        )}
        <input
          type="file"
          ref={(el) => (fileInputRefs.current[inputKey] = el)}
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={(e) => handleFileChange(docType, side, e.target.files?.[0] || null)}
        />
      </div>
    );
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
                className={phoneExists ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {checkingPhone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking...
                </p>
              )}
              {phoneExists && !checkingPhone && (
                <p className="text-xs text-destructive font-medium">
                  Phone number already exists
                </p>
              )}
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
              <p className="text-xs text-muted-foreground mb-4">
                Upload front and back of each document. ID is extracted from the front image only.
              </p>
              <div className="space-y-4">
                {Object.entries(documentLabels).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-sm">{label}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {renderDocumentUpload(key, "front")}
                      {renderDocumentUpload(key, "back")}
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
              <Button type="submit" className="flex-1" disabled={loading || phoneExists}>
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
