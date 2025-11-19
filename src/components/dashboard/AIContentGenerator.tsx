import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Copy, Save } from 'lucide-react';
import { Opportunity } from '@/types/opportunity';

interface AIContentGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity?: Opportunity | null;
  onContentGenerated?: (content: string, type: string) => void;
}

const CONTENT_TYPES = [
  { 
    value: 'past_performance', 
    label: 'Past Performance Narrative',
    prompt: 'Write a compelling past performance narrative highlighting relevant experience and successful outcomes'
  },
  { 
    value: 'technical_approach', 
    label: 'Technical Approach',
    prompt: 'Develop a detailed technical approach that addresses the requirements and demonstrates capability'
  },
  { 
    value: 'executive_summary', 
    label: 'Executive Summary',
    prompt: 'Create a concise executive summary that captures key value propositions and win themes'
  },
  { 
    value: 'management_approach', 
    label: 'Management Approach',
    prompt: 'Outline a comprehensive management approach including organizational structure and oversight'
  },
  { 
    value: 'quality_control', 
    label: 'Quality Control Plan',
    prompt: 'Develop a quality control and assurance plan with metrics and continuous improvement processes'
  },
  { 
    value: 'staffing_plan', 
    label: 'Staffing Plan',
    prompt: 'Create a staffing plan with key personnel, qualifications, and team structure'
  },
];

export const AIContentGenerator = ({
  open,
  onOpenChange,
  opportunity,
  onContentGenerated
}: AIContentGeneratorProps) => {
  const [contentType, setContentType] = useState<string>('past_performance');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!opportunity) {
      toast({
        title: "No opportunity selected",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const selectedType = CONTENT_TYPES.find(t => t.value === contentType);
      
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
          contentType: contentType,
          basePrompt: selectedType?.prompt || '',
          customPrompt: customPrompt,
        }
      });

      if (error) throw error;

      if (data?.content) {
        setGeneratedContent(data.content);
        toast({
          title: "Content generated",
          description: "AI has generated draft content for your review",
        });
      } else {
        throw new Error('No content returned from AI');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast({
      title: "Copied to clipboard",
    });
  };

  const handleSave = () => {
    if (onContentGenerated) {
      onContentGenerated(generatedContent, contentType);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Content Generator
          </DialogTitle>
          <DialogDescription>
            Generate draft proposal content based on opportunity requirements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Opportunity Context */}
          {opportunity && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Opportunity Context</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <p className="font-medium">{opportunity.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Agency:</span>
                  <p className="font-medium">{opportunity.agency}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {opportunity.serviceTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Content Type Selection */}
          <div>
            <Label>Content Type</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {CONTENT_TYPES.find(t => t.value === contentType)?.prompt}
            </p>
          </div>

          {/* Custom Prompt */}
          <div>
            <Label>Additional Instructions (Optional)</Label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Add specific requirements, tone preferences, or details to include..."
              className="min-h-[80px]"
            />
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !opportunity}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>

          {/* Generated Content */}
          {generatedContent && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Generated Content</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Content Block
                  </Button>
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {generatedContent}
                </pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
