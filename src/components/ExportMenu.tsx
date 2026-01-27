import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadExcel, shareToWhatsApp } from "@/utils/exportToExcel";
import { useToast } from "@/hooks/use-toast";

interface ExportMenuProps {
  data: any[];
  filename: string;
  sheetName?: string;
  disabled?: boolean;
}

const ExportMenu = ({ data, filename, sheetName, disabled }: ExportMenuProps) => {
  const { toast } = useToast();

  const handleDownload = () => {
    if (data.length === 0) {
      toast({
        title: "No data",
        description: "There is no data to export",
        variant: "destructive",
      });
      return;
    }
    
    downloadExcel(data, { filename, sheetName });
    toast({
      title: "Downloaded",
      description: `${filename}.xlsx has been downloaded`,
    });
  };

  const handleShare = async () => {
    if (data.length === 0) {
      toast({
        title: "No data",
        description: "There is no data to export",
        variant: "destructive",
      });
      return;
    }

    const shared = await shareToWhatsApp(data, { filename, sheetName });
    if (!shared) {
      toast({
        title: "Downloaded",
        description: "File downloaded. You can share it via WhatsApp manually.",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share to WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportMenu;
