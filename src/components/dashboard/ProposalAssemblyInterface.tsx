import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  DndContext, 
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, GripVertical, Plus, Trash2, CheckCircle2, AlertCircle, Download, FileDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { exportProposalToPDF, exportProposalToDOCX } from "@/utils/proposalExportUtils";
import { RequirementGapAnalysis } from "./RequirementGapAnalysis";
import { FormatValidationDialog } from "./FormatValidationDialog";
import { ProposalQualityScorer } from "./ProposalQualityScorer";

interface RequirementSlot {
  id: string;
  requirementId: string;
  requirementText: string;
  category?: string;
  pageLimit?: number;
  contentBlockIds: string[];
  customContent: string;
  wordCount: number;
  isComplete: boolean;
}

interface ContentBlock {
  id: string;
  title: string;
  content: string;
  content_type: string;
  wordCount: number;
}

interface ProposalAssemblyInterfaceProps {
  opportunityId: string;
  requirements: any[];
}

function SortableContentBlock({ block, onRemove }: { block: ContentBlock; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-muted/50 rounded border"
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{block.title}</p>
        <p className="text-xs text-muted-foreground">{block.wordCount} words</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RequirementSlotCard({ 
  slot, 
  contentBlocks,
  availableBlocks,
  onAddBlock,
  onRemoveBlock,
  onCustomContentChange,
  onToggleComplete
}: {
  slot: RequirementSlot;
  contentBlocks: ContentBlock[];
  availableBlocks: ContentBlock[];
  onAddBlock: (slotId: string, blockId: string) => void;
  onRemoveBlock: (slotId: string, blockId: string) => void;
  onCustomContentChange: (slotId: string, content: string) => void;
  onToggleComplete: (slotId: string) => void;
}) {
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const totalWords = slot.wordCount;
  const pageLimit = slot.pageLimit || 0;
  const wordsPerPage = 250; // Approximate
  const estimatedPages = totalWords / wordsPerPage;
  const isOverLimit = pageLimit > 0 && estimatedPages > pageLimit;

  return (
    <Card className={slot.isComplete ? "border-green-500" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{slot.requirementId}</Badge>
              {slot.category && <Badge variant="secondary">{slot.category}</Badge>}
            </div>
            <CardTitle className="text-sm">{slot.requirementText}</CardTitle>
          </div>
          <Button
            variant={slot.isComplete ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleComplete(slot.id)}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Word/Page Count */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>
              {totalWords} words (~{estimatedPages.toFixed(1)} pages)
            </span>
            {pageLimit > 0 && (
              <span className={isOverLimit ? "text-red-500 font-semibold" : ""}>
                Limit: {pageLimit} pages
              </span>
            )}
          </div>
          {pageLimit > 0 && (
            <Progress 
              value={(estimatedPages / pageLimit) * 100} 
              className={isOverLimit ? "[&>div]:bg-red-500" : ""}
            />
          )}
        </div>

        <Separator />

        {/* Content Blocks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Content Blocks</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBlockSelector(!showBlockSelector)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {showBlockSelector && (
            <ScrollArea className="h-32 border rounded p-2">
              {availableBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available content blocks
                </p>
              ) : (
                <div className="space-y-1">
                  {availableBlocks.map((block) => (
                    <Button
                      key={block.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        onAddBlock(slot.id, block.id);
                        setShowBlockSelector(false);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {block.title}
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          {contentBlocks.length > 0 && (
            <div className="space-y-1">
              {contentBlocks.map((block) => (
                <SortableContentBlock
                  key={block.id}
                  block={block}
                  onRemove={() => onRemoveBlock(slot.id, block.id)}
                />
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Custom Content */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Custom Content</span>
          <Textarea
            placeholder="Add custom proposal text here..."
            value={slot.customContent}
            onChange={(e) => onCustomContentChange(slot.id, e.target.value)}
            rows={4}
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProposalAssemblyInterface({ opportunityId, requirements }: ProposalAssemblyInterfaceProps) {
  const { toast } = useToast();
  const [requirementSlots, setRequirementSlots] = useState<RequirementSlot[]>([]);
  const [allContentBlocks, setAllContentBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
  }, [opportunityId, requirements]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load existing mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('proposal_requirement_mappings')
        .select('*')
        .eq('opportunity_id', opportunityId);

      if (mappingsError) throw mappingsError;

      // Load all content blocks
      const { data: blocks, error: blocksError } = await supabase
        .from('proposal_content_blocks')
        .select('*')
        .order('created_at', { ascending: false });

      if (blocksError) throw blocksError;

      // Calculate word counts for blocks
      const blocksWithWordCount = blocks?.map(block => ({
        ...block,
        wordCount: block.content.split(/\s+/).length
      })) || [];

      setAllContentBlocks(blocksWithWordCount);

      // Initialize slots from requirements
      const slots: RequirementSlot[] = requirements.map((req) => {
        const existing = mappings?.find(m => m.requirement_id === req.id);
        const wordCount = (existing?.custom_content?.split(/\s+/).length || 0) +
          (existing?.content_block_ids?.reduce((sum, blockId) => {
            const block = blocksWithWordCount.find(b => b.id === blockId);
            return sum + (block?.wordCount || 0);
          }, 0) || 0);

        return {
          id: existing?.id || crypto.randomUUID(),
          requirementId: req.id,
          requirementText: req.text,
          category: req.category,
          pageLimit: req.pageLimit,
          contentBlockIds: existing?.content_block_ids || [],
          customContent: existing?.custom_content || '',
          wordCount,
          isComplete: existing?.is_complete || false
        };
      });

      setRequirementSlots(slots);
    } catch (error) {
      console.error('Error loading assembly data:', error);
      toast({
        title: "Failed to load",
        description: "Could not load proposal assembly data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = (slotId: string, blockId: string) => {
    setRequirementSlots(prev => prev.map(slot => {
      if (slot.id === slotId) {
        const newBlockIds = [...slot.contentBlockIds, blockId];
        const block = allContentBlocks.find(b => b.id === blockId);
        const newWordCount = slot.wordCount + (block?.wordCount || 0);
        
        return {
          ...slot,
          contentBlockIds: newBlockIds,
          wordCount: newWordCount
        };
      }
      return slot;
    }));
  };

  const handleRemoveBlock = (slotId: string, blockId: string) => {
    setRequirementSlots(prev => prev.map(slot => {
      if (slot.id === slotId) {
        const newBlockIds = slot.contentBlockIds.filter(id => id !== blockId);
        const block = allContentBlocks.find(b => b.id === blockId);
        const newWordCount = slot.wordCount - (block?.wordCount || 0);
        
        return {
          ...slot,
          contentBlockIds: newBlockIds,
          wordCount: newWordCount
        };
      }
      return slot;
    }));
  };

  const handleCustomContentChange = (slotId: string, content: string) => {
    setRequirementSlots(prev => prev.map(slot => {
      if (slot.id === slotId) {
        const customWordCount = content.split(/\s+/).filter(w => w).length;
        const blocksWordCount = slot.contentBlockIds.reduce((sum, blockId) => {
          const block = allContentBlocks.find(b => b.id === blockId);
          return sum + (block?.wordCount || 0);
        }, 0);
        
        return {
          ...slot,
          customContent: content,
          wordCount: customWordCount + blocksWordCount
        };
      }
      return slot;
    }));
  };

  const handleToggleComplete = (slotId: string) => {
    setRequirementSlots(prev => prev.map(slot =>
      slot.id === slotId ? { ...slot, isComplete: !slot.isComplete } : slot
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Upsert all requirement mappings
      const mappingsToSave = requirementSlots.map(slot => ({
        id: slot.id,
        opportunity_id: opportunityId,
        requirement_id: slot.requirementId,
        requirement_text: slot.requirementText,
        requirement_category: slot.category,
        page_limit: slot.pageLimit,
        content_block_ids: slot.contentBlockIds,
        custom_content: slot.customContent,
        word_count: slot.wordCount,
        is_complete: slot.isComplete,
        last_updated_by: userData.user?.id
      }));

      const { error } = await supabase
        .from('proposal_requirement_mappings')
        .upsert(mappingsToSave);

      if (error) throw error;

      toast({
        title: "Saved successfully",
        description: "Proposal assembly saved",
      });
    } catch (error) {
      console.error('Error saving assembly:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportWithValidation = (format: "PDF" | "DOCX", templateName: string) => {
    try {
      const mappingsWithBlocks = requirementSlots.map(slot => ({
        ...slot,
        contentBlocks: getSlotContentBlocks(slot)
      }));

      if (format === "PDF") {
        exportProposalToPDF(
          `Proposal - Opportunity ${opportunityId}`,
          mappingsWithBlocks,
          `proposal-${opportunityId}.pdf`
        );
      } else {
        exportProposalToDOCX(
          `Proposal - Opportunity ${opportunityId}`,
          mappingsWithBlocks,
          `proposal-${opportunityId}.docx`,
          templateName
        );
      }
      
      toast({
        title: `${format} exported`,
        description: `Proposal exported with ${templateName} formatting`,
      });
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
      toast({
        title: "Export failed",
        description: `Failed to export ${format}`,
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    const mappingsWithBlocks = requirementSlots.map(slot => ({
      ...slot,
      contentBlocks: getSlotContentBlocks(slot)
    }));
    
    exportProposalToPDF(
      `Proposal - Opportunity ${opportunityId}`,
      mappingsWithBlocks,
      `proposal-${opportunityId}.pdf`
    );
    
    toast({
      title: "PDF exported",
      description: "Proposal document downloaded successfully",
    });
  };

  const handleExportDOCX = async () => {
    const mappingsWithBlocks = requirementSlots.map(slot => ({
      ...slot,
      contentBlocks: getSlotContentBlocks(slot)
    }));
    
    await exportProposalToDOCX(
      `Proposal - Opportunity ${opportunityId}`,
      mappingsWithBlocks,
      `proposal-${opportunityId}.docx`
    );
    
    toast({
      title: "DOCX exported",
      description: "Proposal document downloaded successfully",
    });
  };

  const getSlotContentBlocks = (slot: RequirementSlot): ContentBlock[] => {
    return slot.contentBlockIds
      .map(id => allContentBlocks.find(b => b.id === id))
      .filter(Boolean) as ContentBlock[];
  };

  const getAvailableBlocks = (slot: RequirementSlot): ContentBlock[] => {
    return allContentBlocks.filter(block => 
      !slot.contentBlockIds.includes(block.id) &&
      (!slot.category || block.content_type === slot.category)
    );
  };

  const totalWords = requirementSlots.reduce((sum, slot) => sum + slot.wordCount, 0);
  const completedCount = requirementSlots.filter(s => s.isComplete).length;
  const completionRate = requirementSlots.length > 0 
    ? (completedCount / requirementSlots.length) * 100 
    : 0;

  if (loading) {
    return <div className="text-center py-8">Loading assembly interface...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Proposal Assembly</CardTitle>
              <CardDescription>
                Drag content blocks into requirements to build your proposal
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowValidationDialog(true)} variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Validate & Export
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Progress"}
              </Button>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion: {completedCount}/{requirementSlots.length} requirements</span>
              <span>Total: {totalWords.toLocaleString()} words</span>
            </div>
            <Progress value={completionRate} />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {requirementSlots.map((slot) => (
                <RequirementSlotCard
                  key={slot.id}
                  slot={slot}
                  contentBlocks={getSlotContentBlocks(slot)}
                  availableBlocks={getAvailableBlocks(slot)}
                  onAddBlock={handleAddBlock}
                  onRemoveBlock={handleRemoveBlock}
                  onCustomContentChange={handleCustomContentChange}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <ProposalQualityScorer opportunityId={opportunityId} />

      <FormatValidationDialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
        wordCount={totalWords}
        requirements={requirementSlots}
        onExport={handleExportWithValidation}
      />
    </div>
  );
}
