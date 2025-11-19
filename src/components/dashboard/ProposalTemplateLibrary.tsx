import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Eye, Copy, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  lifecycle_stages: string[];
  is_default: boolean;
  sections?: TemplateSection[];
}

interface TemplateSection {
  id: string;
  section_order: number;
  section_title: string;
  section_description: string;
  required_content_type: string;
  word_count_target: number;
}

interface ProposalTemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId?: string;
  currentStage?: string;
  onTemplateSelected?: (template: ProposalTemplate) => void;
}

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  bd_intel_deck: 'BD Intel Deck',
  capture_plan: 'Capture Plan',
  competitive_assessment: 'Competitive Assessment',
  proposal_volume: 'Proposal Volume',
  executive_summary: 'Executive Summary',
  gate_review: 'Gate Review',
};

export const ProposalTemplateLibrary = ({
  open,
  onOpenChange,
  opportunityId,
  currentStage,
  onTemplateSelected
}: ProposalTemplateLibraryProps) => {
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('proposal_templates' as any)
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (templatesError) throw templatesError;

      // Fetch sections for each template
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('proposal_template_sections' as any)
        .select('*')
        .order('section_order');

      if (sectionsError) throw sectionsError;

      // Combine templates with their sections
      const templatesWithSections = (templatesData as any[])?.map((template: any) => ({
        ...template,
        sections: (sectionsData as any[])?.filter((s: any) => s.template_id === template.id) || []
      })) || [];

      setTemplates(templatesWithSections);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTemplate = (template: ProposalTemplate) => {
    if (onTemplateSelected) {
      onTemplateSelected(template);
      onOpenChange(false);
    }
  };

  const handlePreview = (template: ProposalTemplate) => {
    setSelectedTemplate(template);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Proposal Template Library</DialogTitle>
          <DialogDescription>
            Select a template to structure your proposal or capture document
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 h-[600px]">
          {/* Template List */}
          <div className="col-span-1 border-r pr-4">
            <ScrollArea className="h-full">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading templates...</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates available</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => handlePreview(template)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          {template.is_default && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <CardDescription className="text-xs">
                          {TEMPLATE_TYPE_LABELS[template.template_type] || template.template_type}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          {template.sections?.length || 0} sections
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Template Preview */}
          <div className="col-span-2">
            {selectedTemplate ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                  </div>
                  <Button onClick={() => handleUseTemplate(selectedTemplate)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </div>

                <Separator className="mb-4" />

                <ScrollArea className="flex-1">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Template Sections</h4>
                      <div className="space-y-3">
                        {selectedTemplate.sections?.map((section, index) => (
                          <Card key={section.id}>
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-start gap-3">
                                <Badge variant="outline" className="text-xs">
                                  {section.section_order}
                                </Badge>
                                <div className="flex-1">
                                  <CardTitle className="text-sm">
                                    {section.section_title}
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-1">
                                    {section.section_description}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-2">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {section.required_content_type?.replace(/_/g, ' ')}
                                </div>
                                {section.word_count_target && (
                                  <div>
                                    Target: ~{section.word_count_target} words
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {selectedTemplate.lifecycle_stages?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Applicable Stages</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedTemplate.lifecycle_stages.map((stage) => (
                            <Badge key={stage} variant="secondary" className="text-xs">
                              {stage.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Select a template to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
