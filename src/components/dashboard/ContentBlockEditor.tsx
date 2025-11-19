import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { X, Plus } from 'lucide-react';
import { LifecycleStage } from '@/types/opportunity';

interface ContentBlock {
  id: string;
  title: string;
  content: string;
  content_type: string;
  lifecycle_stages: LifecycleStage[];
  tags: string[];
  is_template: boolean;
}

interface ContentBlockEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block?: ContentBlock | null;
  onSaved: () => void;
}

const CONTENT_TYPES = [
  { value: 'past_performance', label: 'Past Performance' },
  { value: 'technical_approach', label: 'Technical Approach' },
  { value: 'team_bio', label: 'Team Bio' },
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'management_approach', label: 'Management Approach' },
  { value: 'quality_control', label: 'Quality Control' },
  { value: 'staffing_plan', label: 'Staffing Plan' },
  { value: 'other', label: 'Other' },
];

const LIFECYCLE_STAGES = [
  { value: 'bd_intel_deck', label: 'BD Intel Deck' },
  { value: 'capture_plan', label: 'Capture Plan' },
  { value: 'pre_drfp', label: 'Pre-DRFP' },
  { value: 'drfp_kickoff', label: 'DRFP Kickoff' },
  { value: 'proposal_development', label: 'Proposal Development' },
  { value: 'pink_team', label: 'Pink Team' },
  { value: 'red_team', label: 'Red Team' },
  { value: 'gold_team', label: 'Gold Team' },
  { value: 'final_review', label: 'Final Review' },
];

type ContentBlockType = 
  | 'past_performance'
  | 'technical_approach'
  | 'team_bio'
  | 'executive_summary'
  | 'management_approach'
  | 'quality_control'
  | 'staffing_plan'
  | 'other';

export const ContentBlockEditor = ({
  open,
  onOpenChange,
  block,
  onSaved
}: ContentBlockEditorProps) => {
  const [title, setTitle] = useState(block?.title || '');
  const [content, setContent] = useState(block?.content || '');
  const [contentType, setContentType] = useState<ContentBlockType>((block?.content_type as ContentBlockType) || 'other');
  const [selectedStages, setSelectedStages] = useState<LifecycleStage[]>(block?.lifecycle_stages || []);
  const [tags, setTags] = useState<string[]>(block?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isTemplate, setIsTemplate] = useState(block?.is_template || false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Validation error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        title,
        content,
        content_type: contentType,
        lifecycle_stages: selectedStages,
        tags,
        is_template: isTemplate,
      };

      if (block?.id) {
        const { error } = await supabase
          .from('proposal_content_blocks')
          .update(data)
          .eq('id', block.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('proposal_content_blocks')
          .insert(data);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Content block ${block ? 'updated' : 'created'} successfully`,
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: "Failed to save content block",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStage = (stage: LifecycleStage) => {
    setSelectedStages(prev =>
      prev.includes(stage)
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{block ? 'Edit' : 'Create'} Content Block</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., City of Oakland EMS Operations - Past Performance"
            />
          </div>

          <div>
            <Label>Content Type</Label>
            <Select value={contentType} onValueChange={(value) => setContentType(value as ContentBlockType)}>
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
          </div>

          <div>
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the reusable content here..."
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use this as a template. You can copy/paste into proposals and customize as needed.
            </p>
          </div>

          <div>
            <Label>Applicable Lifecycle Stages</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {LIFECYCLE_STAGES.map((stage) => (
                <Badge
                  key={stage.value}
                  variant={selectedStages.includes(stage.value as LifecycleStage) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleStage(stage.value as LifecycleStage)}
                >
                  {stage.label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add tag (e.g., 911, California, Urban)"
              />
              <Button onClick={addTag} size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
