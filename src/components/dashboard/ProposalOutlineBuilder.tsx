import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from 'xlsx';

interface ProposalOutlineBuilderProps {
  opportunityId: string;
  documents: any[];
  onRequirementsExtracted?: (requirements: any[]) => void;
}

interface Requirement {
  id: string;
  section: string;
  subsection: string;
  text: string;
  type: string;
  category?: string;
  tags?: string[];
  pageLimit?: number;
}

interface DeliverableSpecs {
  pageLimit?: number;
  format?: string;
  margins?: string;
  font?: string;
  fontSize?: string;
  volumes?: string[];
  sections?: string[];
}

interface ExtractedData {
  requirements: Requirement[];
  deliverableSpecs?: DeliverableSpecs;
  submissionDetails?: any;
  evaluationCriteria?: any[];
  rawContent?: string;
  error?: string;
}

export function ProposalOutlineBuilder({ opportunityId, documents, onRequirementsExtracted }: ProposalOutlineBuilderProps) {
  const { toast } = useToast();
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const handleExtractRequirements = async () => {
    if (!documents || documents.length === 0) {
      toast({
        title: "No documents",
        description: "Upload an RFP document first to extract requirements",
        variant: "destructive",
      });
      return;
    }

    setExtracting(true);
    try {
      const rfpDoc = documents[0]; // Use first document for now
      
      toast({
        title: "Extracting requirements...",
        description: `Analyzing ${rfpDoc.name} with AI`,
      });

      const { data, error } = await supabase.functions.invoke('extract-proposal-requirements', {
        body: {
          documentUrl: rfpDoc.file_path,
          documentName: rfpDoc.name,
          opportunityId
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to extract requirements');
      }

      setExtractedData(data.data);
      
      // Notify parent component of extracted requirements
      if (onRequirementsExtracted && data.data.requirements) {
        onRequirementsExtracted(data.data.requirements);
      }
      
      toast({
        title: "Requirements extracted",
        description: `Found ${data.data.requirements?.length || 0} requirements`,
      });

    } catch (error) {
      console.error('Error extracting requirements:', error);
      toast({
        title: "Extraction failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleExportToExcel = () => {
    if (!extractedData || !extractedData.requirements) return;

    const worksheetData = extractedData.requirements.map(req => ({
      'Requirement ID': req.id,
      'Section': req.section,
      'Subsection': req.subsection,
      'Requirement Text': req.text,
      'Type': req.type,
      'Category': req.category || '',
      'Tags': req.tags?.join(', ') || '',
      'Page Limit': req.pageLimit || '',
      'Proposal Section': '',
      'Comments': ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Requirements');

    // Add deliverable specs sheet
    if (extractedData.deliverableSpecs) {
      const specsData = Object.entries(extractedData.deliverableSpecs).map(([key, value]) => ({
        'Specification': key,
        'Requirement': Array.isArray(value) ? value.join(', ') : value
      }));
      const specsWorksheet = XLSX.utils.json_to_sheet(specsData);
      XLSX.utils.book_append_sheet(workbook, specsWorksheet, 'Deliverable Specs');
    }

    XLSX.writeFile(workbook, `compliance-matrix-${opportunityId}.xlsx`);
    
    toast({
      title: "Export successful",
      description: "Compliance matrix downloaded as Excel file",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Proposal Outline & Compliance Matrix
        </CardTitle>
        <CardDescription>
          Extract requirements and deliverable specifications from RFP documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleExtractRequirements}
            disabled={extracting || !documents?.length}
          >
            {extracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              "Extract Requirements"
            )}
          </Button>
          
          {extractedData && (
            <Button
              variant="outline"
              onClick={handleExportToExcel}
            >
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          )}
        </div>

        {extractedData?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{extractedData.error}</AlertDescription>
          </Alert>
        )}

        {extractedData?.deliverableSpecs && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Deliverable Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {extractedData.deliverableSpecs.pageLimit && (
                <div className="flex justify-between">
                  <span className="font-medium">Page Limit:</span>
                  <span>{extractedData.deliverableSpecs.pageLimit} pages</span>
                </div>
              )}
              {extractedData.deliverableSpecs.format && (
                <div className="flex justify-between">
                  <span className="font-medium">Format:</span>
                  <span>{extractedData.deliverableSpecs.format}</span>
                </div>
              )}
              {extractedData.deliverableSpecs.font && (
                <div className="flex justify-between">
                  <span className="font-medium">Font:</span>
                  <span>{extractedData.deliverableSpecs.font} ({extractedData.deliverableSpecs.fontSize})</span>
                </div>
              )}
              {extractedData.deliverableSpecs.margins && (
                <div className="flex justify-between">
                  <span className="font-medium">Margins:</span>
                  <span>{extractedData.deliverableSpecs.margins}</span>
                </div>
              )}
              {extractedData.deliverableSpecs.volumes && (
                <div>
                  <span className="font-medium">Volumes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {extractedData.deliverableSpecs.volumes.map((vol, idx) => (
                      <Badge key={idx} variant="secondary">{vol}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {extractedData?.requirements && extractedData.requirements.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Requirements ({extractedData.requirements.length})
            </h3>
            <ScrollArea className="h-[400px] rounded-md border">
              <div className="p-4 space-y-3">
                {extractedData.requirements.map((req, idx) => (
                  <Card key={idx} className="bg-muted/30">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline">{req.id}</Badge>
                        <Badge>{req.type}</Badge>
                      </div>
                      {req.category && (
                        <Badge variant="secondary" className="mr-2">
                          {req.category}
                        </Badge>
                      )}
                      {req.tags && req.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {req.tags.map((tag, tagIdx) => (
                            <Badge key={tagIdx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {req.subsection && (
                        <p className="text-sm font-medium text-muted-foreground">
                          {req.subsection}
                        </p>
                      )}
                      <p className="text-sm">{req.text}</p>
                      {req.pageLimit && (
                        <p className="text-xs text-muted-foreground">
                          Page limit: {req.pageLimit}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {extractedData?.rawContent && !extractedData?.requirements?.length && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Requirements extracted but structured parsing failed. Export to see raw content.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
