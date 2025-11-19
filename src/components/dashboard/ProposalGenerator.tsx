import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Loader2, Download, Save, Sparkles, Copy } from 'lucide-react';
import { Opportunity } from '@/types/opportunity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  sections?: TemplateSection[];
}

interface TemplateSection {
  id: string;
  section_order: number;
  section_title: string;
  section_description: string;
  required_content_type: string;
  word_count_target: number;
  suggested_content_blocks?: string[];
}

interface ProposalGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity;
  template: ProposalTemplate;
}

interface SectionContent {
  sectionId: string;
  content: string;
  contentBlockId?: string;
}

export const ProposalGenerator = ({
  open,
  onOpenChange,
  opportunity,
  template
}: ProposalGeneratorProps) => {
  const [proposalTitle, setProposalTitle] = useState('');
  const [sectionContents, setSectionContents] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && template) {
      // Initialize with default title
      setProposalTitle(`${template.name} - ${opportunity.title}`);
      
      // Initialize section contents
      const initialContents: Record<string, string> = {};
      template.sections?.forEach(section => {
        initialContents[section.id] = '';
      });
      setSectionContents(initialContents);
      
      // Fetch suggested content blocks
      fetchSuggestedContent();
    }
  }, [open, template, opportunity]);

  const fetchSuggestedContent = async () => {
    if (!template.sections) return;

    for (const section of template.sections) {
      if (section.required_content_type) {
        // Fetch content blocks matching this section's type
        const { data, error } = await supabase
          .from('proposal_content_blocks')
          .select('id, title, content')
          .eq('content_type', section.required_content_type as any)
          .limit(3);

        if (!error && data && data.length > 0) {
          // Auto-populate first matching content block
          setSectionContents(prev => ({
            ...prev,
            [section.id]: prev[section.id] || data[0].content
          }));
        }
      }
    }
  };

  const handleSectionContentChange = (sectionId: string, content: string) => {
    setSectionContents(prev => ({
      ...prev,
      [sectionId]: content
    }));
  };

  const handleGenerateSection = async (sectionId: string, section: TemplateSection) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-proposal-content', {
        body: {
          opportunity: {
            title: opportunity.title,
            agency: opportunity.agency,
            summary: opportunity.summary,
            serviceTypes: opportunity.serviceTags,
            estimatedValue: opportunity.estimatedValue,
            location: opportunity.geography,
            lifecycle_notes: opportunity.lifecycleNotes,
          },
          contentType: section.required_content_type,
          basePrompt: `Generate content for the section "${section.section_title}". ${section.section_description}`,
          customPrompt: `Target word count: ${section.word_count_target} words.`,
        }
      });

      if (error) throw error;

      if (data?.content) {
        handleSectionContentChange(sectionId, data.content);
        toast({
          title: "Section generated",
          description: `AI generated content for ${section.section_title}`,
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProposal = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('proposal_instances' as any)
        .insert({
          opportunity_id: opportunity.id,
          template_id: template.id,
          title: proposalTitle,
          content: sectionContents,
          status: 'draft',
        } as any);

      if (error) throw error;

      toast({
        title: "Proposal saved",
        description: "Proposal draft has been saved successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportProposal = () => {
    // Generate complete proposal text
    let fullText = `${proposalTitle}\n\n`;
    fullText += `Opportunity: ${opportunity.title}\n`;
    fullText += `Agency: ${opportunity.agency}\n\n`;
    fullText += `${'='.repeat(80)}\n\n`;

    template.sections?.forEach(section => {
      fullText += `${section.section_order}. ${section.section_title.toUpperCase()}\n\n`;
      fullText += `${sectionContents[section.id] || '[Content to be added]'}\n\n`;
      fullText += `${'-'.repeat(80)}\n\n`;
    });

    // Create download
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proposalTitle.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Proposal exported",
      description: "Proposal has been downloaded as text file",
    });
  };

  const totalWords = Object.values(sectionContents).reduce((sum, content) => {
    return sum + (content?.split(/\s+/).filter(Boolean).length || 0);
  }, 0);

  const targetWords = template.sections?.reduce((sum, section) => {
    return sum + (section.word_count_target || 0);
  }, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Generate Proposal: {template.name}</DialogTitle>
          <DialogDescription>
            Create and edit content for each section of your proposal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Proposal Title */}
          <div>
            <Label>Proposal Title</Label>
            <Input
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              placeholder="Enter proposal title"
            />
          </div>

          {/* Progress Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Words</p>
                    <p className="text-2xl font-bold">{totalWords.toLocaleString()}</p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div>
                    <p className="text-sm text-muted-foreground">Target</p>
                    <p className="text-2xl font-bold">{targetWords.toLocaleString()}</p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-2xl font-bold">
                      {targetWords > 0 ? Math.round((totalWords / targetWords) * 100) : 0}%
                    </p>
                  </div>
                </div>
                <Badge variant={totalWords >= targetWords ? 'default' : 'secondary'}>
                  {template.sections?.length || 0} Sections
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Tabs defaultValue="0" className="w-full">
            <TabsList className="w-full overflow-x-auto justify-start">
              {template.sections?.map((section, index) => (
                <TabsTrigger key={section.id} value={index.toString()}>
                  {section.section_order}. {section.section_title}
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              {template.sections?.map((section, index) => (
                <TabsContent key={section.id} value={index.toString()} className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{section.section_title}</h3>
                      <p className="text-sm text-muted-foreground">{section.section_description}</p>
                      {section.word_count_target && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Target: ~{section.word_count_target} words • 
                          Current: {(sectionContents[section.id]?.split(/\s+/).filter(Boolean).length || 0)} words
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateSection(section.id, section)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      AI Generate
                    </Button>
                  </div>

                  <Textarea
                    value={sectionContents[section.id] || ''}
                    onChange={(e) => handleSectionContentChange(section.id, e.target.value)}
                    placeholder={`Enter content for ${section.section_title}...`}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportProposal}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProposal} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
