import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, FileCheck } from "lucide-react";
import {
  FormatSpecification,
  FormatValidationResult,
  TEMPLATE_PRESETS,
  validateProposalFormat,
} from "@/utils/proposalFormatValidation";

interface FormatValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wordCount: number;
  requirements: Array<{ pageLimit?: number }>;
  onExport: (format: "PDF" | "DOCX", templateName: string) => void;
}

export const FormatValidationDialog = ({
  open,
  onOpenChange,
  wordCount,
  requirements,
  onExport,
}: FormatValidationDialogProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("Arial 10pt");
  const [validationResult, setValidationResult] =
    useState<FormatValidationResult | null>(null);

  const handleValidate = () => {
    const formatSpec = TEMPLATE_PRESETS[selectedTemplate];
    const result = validateProposalFormat(wordCount, formatSpec, requirements);
    setValidationResult(result);
  };

  const handleExport = (format: "PDF" | "DOCX") => {
    onExport(format, selectedTemplate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Format Validation & Export
          </DialogTitle>
          <DialogDescription>
            Validate your proposal against RFP formatting requirements before export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template Format</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(TEMPLATE_PRESETS).map((template) => (
                  <SelectItem key={template} value={template}>
                    {template}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select the template that matches RFP formatting requirements
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Font</p>
              <p className="text-sm text-muted-foreground">
                {TEMPLATE_PRESETS[selectedTemplate].fontFamily}{" "}
                {TEMPLATE_PRESETS[selectedTemplate].fontSize}pt
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Page Size</p>
              <p className="text-sm text-muted-foreground">
                {TEMPLATE_PRESETS[selectedTemplate].pageSize}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Margins</p>
              <p className="text-sm text-muted-foreground">
                {TEMPLATE_PRESETS[selectedTemplate].margins.top}" all sides
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Line Spacing</p>
              <p className="text-sm text-muted-foreground">
                {TEMPLATE_PRESETS[selectedTemplate].lineSpacing}
              </p>
            </div>
          </div>

          <Button onClick={handleValidate} className="w-full">
            Validate Format
          </Button>

          {validationResult && (
            <div className="space-y-3">
              {validationResult.isValid ? (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    All formatting requirements met! Ready to export.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Format validation failed. Please review errors below.
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.errors.map((error, idx) => (
                <Alert key={idx} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}

              {validationResult.warnings.map((warning, idx) => (
                <Alert key={idx} className="border-amber-500 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    {warning}
                  </AlertDescription>
                </Alert>
              ))}

              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Estimated Pages</p>
                  <p className="text-2xl font-bold">
                    {validationResult.details.estimatedPages}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Words</p>
                  <p className="text-2xl font-bold">
                    {validationResult.details.totalWords.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Words/Page</p>
                  <p className="text-2xl font-bold">
                    {validationResult.details.averageWordsPerPage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => handleExport("PDF")}
            disabled={!validationResult || !validationResult.isValid}
          >
            Export as PDF
          </Button>
          <Button
            onClick={() => handleExport("DOCX")}
            disabled={!validationResult || !validationResult.isValid}
          >
            Export as DOCX
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
