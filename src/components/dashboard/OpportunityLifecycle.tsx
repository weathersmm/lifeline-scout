import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Circle, ChevronRight, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type LifecycleStage = 
  | 'identified'
  | 'bd_intel_deck'
  | 'capture_plan'
  | 'pre_drfp'
  | 'drfp_kickoff'
  | 'proposal_development'
  | 'pink_team'
  | 'red_team'
  | 'gold_team'
  | 'final_review'
  | 'submitted'
  | 'awaiting_award'
  | 'won'
  | 'lost'
  | 'no_bid';

interface OpportunityLifecycleProps {
  opportunityId: string;
  currentStage: LifecycleStage;
  lifecycleNotes?: string;
  onUpdate: () => void;
  canEdit: boolean;
}

const LIFECYCLE_STAGES: { value: LifecycleStage; label: string; description: string }[] = [
  { value: 'identified', label: 'Identified', description: 'Opportunity discovered and logged' },
  { value: 'bd_intel_deck', label: 'BD Intel Deck', description: 'Business development intelligence gathering' },
  { value: 'capture_plan', label: 'Capture Plan', description: 'Strategy and competitive analysis' },
  { value: 'pre_drfp', label: 'Pre-DRFP', description: 'Baseline development and bid/no-bid decision' },
  { value: 'drfp_kickoff', label: 'DRFP Kickoff', description: 'Outline, assignments, and strategy finalization' },
  { value: 'proposal_development', label: 'Proposal Development', description: 'Active proposal writing and development' },
  { value: 'pink_team', label: 'Pink Team', description: 'Preliminary proposal review' },
  { value: 'red_team', label: 'Red Team', description: 'Competitive proposal review' },
  { value: 'gold_team', label: 'Gold Team', description: 'Final quality review' },
  { value: 'final_review', label: 'Final Review', description: 'Last checks before submission' },
  { value: 'submitted', label: 'Submitted', description: 'Proposal submitted to agency' },
  { value: 'awaiting_award', label: 'Awaiting Award', description: 'Decision pending' },
  { value: 'won', label: 'Won', description: 'Contract awarded' },
  { value: 'lost', label: 'Lost', description: 'Not selected for award' },
  { value: 'no_bid', label: 'No Bid', description: 'Decision made not to pursue' },
];

export const OpportunityLifecycle = ({
  opportunityId,
  currentStage,
  lifecycleNotes,
  onUpdate,
  canEdit
}: OpportunityLifecycleProps) => {
  const [notes, setNotes] = useState(lifecycleNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const currentStageIndex = LIFECYCLE_STAGES.findIndex(s => s.value === currentStage);

  const handleStageChange = async (newStage: LifecycleStage) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ lifecycle_stage: newStage })
        .eq('id', opportunityId);

      if (error) throw error;

      toast({
        title: "Stage updated",
        description: `Moved to ${LIFECYCLE_STAGES.find(s => s.value === newStage)?.label}`,
      });

      onUpdate();
    } catch (error) {
      console.error('Stage update error:', error);
      toast({
        title: "Update failed",
        description: "Failed to update lifecycle stage",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotesUpdate = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ lifecycle_notes: notes })
        .eq('id', opportunityId);

      if (error) throw error;

      toast({
        title: "Notes saved",
        description: "Lifecycle notes have been updated",
      });

      onUpdate();
    } catch (error) {
      console.error('Notes update error:', error);
      toast({
        title: "Save failed",
        description: "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Stage */}
      <div className="space-y-2">
        <h3 className="font-semibold">Current Stage</h3>
        {canEdit ? (
          <Select value={currentStage} onValueChange={handleStageChange} disabled={isSaving}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIFECYCLE_STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="text-base py-2 px-4">
            {LIFECYCLE_STAGES.find(s => s.value === currentStage)?.label}
          </Badge>
        )}
        <p className="text-sm text-muted-foreground">
          {LIFECYCLE_STAGES.find(s => s.value === currentStage)?.description}
        </p>
      </div>

      {/* Lifecycle Progress */}
      <div className="space-y-2">
        <h3 className="font-semibold">Lifecycle Progress</h3>
        <div className="space-y-1">
          {LIFECYCLE_STAGES.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const isTerminal = ['won', 'lost', 'no_bid'].includes(stage.value);

            return (
              <div
                key={stage.value}
                className={`flex items-center gap-3 p-2 rounded transition-colors ${
                  isCurrent ? 'bg-primary/10' : isCompleted ? 'bg-muted/50' : ''
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                ) : isCurrent ? (
                  <Circle className="w-5 h-5 text-primary fill-primary flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
                    {stage.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                </div>
                {isTerminal && (
                  <Badge variant={stage.value === 'won' ? 'default' : 'secondary'}>
                    {stage.value === 'won' ? 'Success' : 'End State'}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lifecycle Notes */}
      <div className="space-y-2">
        <h3 className="font-semibold">Lifecycle Notes</h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this opportunity's progress, key decisions, risks, or action items..."
          className="min-h-32"
          disabled={!canEdit || isSaving}
        />
        {canEdit && (
          <Button
            onClick={handleNotesUpdate}
            disabled={isSaving || notes === lifecycleNotes}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Notes'
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
