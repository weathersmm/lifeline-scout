import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import * as XLSX from 'xlsx';
import { z } from 'zod';

// Validation schema for uploaded opportunities
const opportunitySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  agency: z.string().trim().min(1, "Agency is required").max(200),
  geography_state: z.string().trim().min(1, "State is required").max(100),
  geography_county: z.string().trim().max(100).optional().nullable(),
  geography_city: z.string().trim().max(100).optional().nullable(),
  service_tags: z.string().trim().optional().nullable(), // Will be parsed as array
  contract_type: z.enum(['RFP', 'RFQ', 'RFI', 'Sources Sought', 'Pre-solicitation', 'Sole-Source Notice']).optional().default('RFP'),
  estimated_value_min: z.number().optional().nullable(),
  estimated_value_max: z.number().optional().nullable(),
  issue_date: z.string().optional().nullable(),
  questions_due: z.string().optional().nullable(),
  pre_bid_meeting: z.string().optional().nullable(),
  proposal_due: z.string().min(1, "Proposal due date is required"),
  term_length: z.string().trim().max(100).optional().nullable(),
  link: z.string().url("Must be a valid URL").max(2048),
  summary: z.string().trim().min(1, "Summary is required").max(2000),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  source: z.string().trim().max(100).optional().default('Manual Upload'),
});

export const OpportunityUploadDialog = () => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const parseServiceTags = (tagsString: string | null | undefined): string[] => {
    if (!tagsString) return [];
    
    // Handle comma-separated, semicolon-separated, or pipe-separated tags
    const tags = tagsString
      .split(/[,;|]/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    return tags;
  };

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;
    
    try {
      // Handle Excel date serial numbers
      if (typeof dateValue === 'number') {
        const date = XLSX.SSF.parse_date_code(dateValue);
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
      
      // Handle string dates
      if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const parseNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setProgress(10);

    try {
      // Read file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        throw new Error("The uploaded file is empty or has no valid data");
      }

      setProgress(30);

      // Parse and validate opportunities
      const opportunities = [];
      const errors = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        
        try {
          const opportunity = {
            title: row.title || row.Title || '',
            agency: row.agency || row.Agency || '',
            geography_state: row.state || row.State || row.geography_state || '',
            geography_county: row.county || row.County || row.geography_county || null,
            geography_city: row.city || row.City || row.geography_city || null,
            service_tags: row.service_tags || row['Service Tags'] || row.serviceTags || '',
            contract_type: row.contract_type || row['Contract Type'] || row.contractType || 'RFP',
            estimated_value_min: parseNumber(row.estimated_value_min || row['Est Value Min'] || row.estimatedValueMin),
            estimated_value_max: parseNumber(row.estimated_value_max || row['Est Value Max'] || row.estimatedValueMax),
            issue_date: parseDate(row.issue_date || row['Issue Date'] || row.issueDate),
            questions_due: parseDate(row.questions_due || row['Questions Due'] || row.questionsDue),
            pre_bid_meeting: parseDate(row.pre_bid_meeting || row['Pre-Bid Meeting'] || row.preBidMeeting),
            proposal_due: parseDate(row.proposal_due || row['Proposal Due'] || row.proposalDue) || '',
            term_length: row.term_length || row['Term Length'] || row.termLength || null,
            link: row.link || row.Link || row.url || row.URL || '',
            summary: row.summary || row.Summary || row.description || row.Description || '',
            priority: (row.priority || row.Priority || 'medium').toLowerCase(),
            source: row.source || row.Source || 'Manual Upload - LA28 Olympics',
          };

          // Validate
          const validated = opportunitySchema.parse(opportunity);
          
          // Parse service tags
          const serviceTags = parseServiceTags(validated.service_tags);
          
          opportunities.push({
            ...validated,
            service_tags: serviceTags,
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(`Row ${i + 2}: ${error.errors.map(e => e.message).join(', ')}`);
          } else {
            errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      setProgress(60);

      if (opportunities.length === 0) {
        throw new Error(`No valid opportunities found. Errors:\n${errors.slice(0, 5).join('\n')}`);
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to upload opportunities");

      // Insert opportunities into database
      const opportunitiesWithUser = opportunities.map(opp => ({
        ...opp,
        created_by: user.id,
        status: 'new' as const,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('opportunities')
        .insert(opportunitiesWithUser)
        .select();

      if (insertError) throw insertError;

      setProgress(100);

      toast({
        title: "Upload successful",
        description: `Successfully imported ${inserted?.length || 0} opportunities${errors.length > 0 ? ` (${errors.length} rows had errors)` : ''}`,
      });

      // Show errors if any
      if (errors.length > 0 && errors.length < 10) {
        console.error('Upload errors:', errors);
        toast({
          title: "Some rows had errors",
          description: errors.slice(0, 3).join('\n'),
          variant: "destructive",
        });
      }

      setOpen(false);
      setFile(null);
      setProgress(0);
      
      // Reload page to show new opportunities
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload opportunities",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Opportunities
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Upload LA28 Olympics & Opportunities
          </DialogTitle>
          <DialogDescription>
            Import opportunities from Excel or CSV files. Perfect for LA28 Olympics, Paralympics, FIFA World Cup, and other manually sourced opportunities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: CSV, XLSX, XLS (max 20MB)
            </p>
          </div>

          {file && (
            <div className="rounded-lg border border-border p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">
                Uploading and processing... {progress}%
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border p-4 bg-muted/50 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground">File Format Guide</h4>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/templates/opportunity-upload-template.csv';
                  link.download = 'opportunity-upload-template.csv';
                  link.click();
                }}
              >
                Download Template
              </Button>
            </div>
            <h4 className="text-sm font-semibold text-foreground">Required Columns:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>title</strong> - Opportunity title</li>
              <li><strong>agency</strong> - Government agency name</li>
              <li><strong>state</strong> - State (e.g., California, CA)</li>
              <li><strong>proposal_due</strong> - Due date (YYYY-MM-DD)</li>
              <li><strong>link</strong> - URL to opportunity</li>
              <li><strong>summary</strong> - Brief description</li>
            </ul>
            <h4 className="text-sm font-semibold text-foreground mt-3">Optional Columns:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>county, city</strong> - Geographic details</li>
              <li><strong>service_tags</strong> - Comma-separated tags (e.g., "LA28 Olympics, Paralympics")</li>
              <li><strong>priority</strong> - high, medium, or low</li>
              <li><strong>contract_type</strong> - RFP, RFQ, RFI, etc.</li>
              <li><strong>estimated_value_min, estimated_value_max</strong> - Dollar amounts</li>
              <li><strong>source</strong> - Source name (defaults to "Manual Upload")</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setFile(null);
              setProgress(0);
            }}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "Uploading..." : "Upload & Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
