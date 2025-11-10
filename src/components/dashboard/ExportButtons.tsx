import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { Opportunity } from "@/types/opportunity";
import { exportToCSV, exportToPDF } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonsProps {
  opportunities: Opportunity[];
  filename?: string;
}

export const ExportButtons = ({ opportunities, filename = "opportunities" }: ExportButtonsProps) => {
  const { toast } = useToast();

  const handleExportCSV = () => {
    try {
      exportToCSV(opportunities, `${filename}.csv`);
      toast({
        title: "Export successful",
        description: `Exported ${opportunities.length} opportunities to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data to CSV",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(opportunities, `${filename}.pdf`);
      toast({
        title: "Export successful",
        description: `Exported ${opportunities.length} opportunities to PDF`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data to PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
