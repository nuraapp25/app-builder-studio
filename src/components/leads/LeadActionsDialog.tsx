import { Pencil, Share2, Phone, MessageCircle, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Lead {
  id: string;
  name: string;
  phone: string;
  badge_number: string | null;
}

interface LeadActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onEdit: () => void;
  onDelete: () => void;
  isManager: boolean;
}

const LeadActionsDialog = ({
  open,
  onOpenChange,
  lead,
  onEdit,
  onDelete,
  isManager,
}: LeadActionsDialogProps) => {
  if (!lead) return null;

  const handleCall = () => {
    window.location.href = `tel:${lead.phone}`;
    onOpenChange(false);
  };

  const handleWhatsAppMessage = () => {
    const phoneNumber = lead.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
    onOpenChange(false);
  };

  const handleShare = () => {
    const shareText = `Lead Details:\nName: ${lead.name}\nPhone: ${lead.phone}${lead.badge_number ? `\nBadge: ${lead.badge_number}` : ""}`;
    const phoneNumber = lead.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
    onOpenChange(false);
  };

  const handleEdit = () => {
    onOpenChange(false);
    onEdit();
  };

  const handleDelete = () => {
    onOpenChange(false);
    onDelete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{lead.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleEdit}
          >
            <Pencil className="w-5 h-5 text-primary" />
            Edit Lead
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleCall}
          >
            <Phone className="w-5 h-5 text-green-500" />
            Call {lead.phone}
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleWhatsAppMessage}
          >
            <MessageCircle className="w-5 h-5 text-green-500" />
            Message on WhatsApp
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleShare}
          >
            <Share2 className="w-5 h-5 text-blue-500" />
            Share on WhatsApp
          </Button>
          
          {isManager && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-5 h-5" />
              Delete Lead
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadActionsDialog;
