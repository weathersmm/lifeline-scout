import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { LifecycleStage } from '@/types/opportunity';

interface Task {
  id: string;
  task_name: string;
  task_description?: string;
  lifecycle_stage: LifecycleStage;
  is_completed: boolean;
  due_date?: string;
  assigned_to?: string;
  completed_at?: string;
  completed_by?: string;
}

interface OpportunityTasksProps {
  opportunityId: string;
  currentStage: LifecycleStage;
  canEdit: boolean;
}

const STAGE_TEMPLATES: Record<LifecycleStage, string[]> = {
  identified: [
    'Initial opportunity assessment',
    'Preliminary fit analysis',
    'Stakeholder notification',
  ],
  bd_intel_deck: [
    'Market intelligence gathering',
    'Competitive landscape analysis',
    'Client background research',
    'Key decision maker identification',
    'SWOT analysis',
  ],
  capture_plan: [
    'Win strategy development',
    'Teaming strategy',
    'Price-to-win analysis',
    'Technical approach outline',
    'Risk assessment',
    'Resource planning',
  ],
  pre_drfp: [
    'RFP requirements analysis',
    'Baseline solution development',
    'Go/No-go decision',
    'Bid/No-bid presentation',
  ],
  drfp_kickoff: [
    'Kickoff meeting scheduled',
    'Volume assignments',
    'Proposal outline approved',
    'Color team schedule set',
    'Writing assignments distributed',
  ],
  proposal_development: [
    'Executive summary draft',
    'Technical volume draft',
    'Management volume draft',
    'Past performance references',
    'Cost volume development',
  ],
  pink_team: [
    'Pink team review scheduled',
    'All drafts submitted for review',
    'Pink team feedback documented',
    'Action items assigned',
  ],
  red_team: [
    'Red team review scheduled',
    'Updated drafts submitted',
    'Red team feedback documented',
    'Compliance matrix verified',
    'Win themes validated',
  ],
  gold_team: [
    'Gold team review scheduled',
    'Final quality check',
    'Executive review completed',
    'All volumes polished',
  ],
  final_review: [
    'Final compliance check',
    'All required forms completed',
    'Pricing verified',
    'Final proof reading',
    'Submission package assembled',
  ],
  submitted: [
    'Submission confirmation received',
    'Debrief scheduled',
    'Lessons learned documented',
  ],
  awaiting_award: [
    'Agency questions monitored',
    'Follow-up communications tracked',
    'Award notification monitoring',
  ],
  won: [
    'Transition plan created',
    'Contract review completed',
    'Kickoff meeting scheduled',
    'Lessons learned captured',
  ],
  lost: [
    'Debrief completed',
    'Loss analysis documented',
    'Lessons learned captured',
    'Relationship maintenance plan',
  ],
  no_bid: [
    'No-bid rationale documented',
    'Client notification sent',
    'Lessons learned captured',
  ],
};

export const OpportunityTasks = ({
  opportunityId,
  currentStage,
  canEdit
}: OpportunityTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [opportunityId, currentStage]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('opportunity_tasks')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .eq('lifecycle_stage', currentStage)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTemplateTask = async (taskName: string) => {
    if (!canEdit) return;

    try {
      const { error } = await supabase
        .from('opportunity_tasks')
        .insert({
          opportunity_id: opportunityId,
          lifecycle_stage: currentStage,
          task_name: taskName,
          is_completed: false,
        });

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Failed to add task",
        variant: "destructive",
      });
    }
  };

  const handleAddCustomTask = async () => {
    if (!newTaskName.trim() || !canEdit) return;

    try {
      const { error } = await supabase
        .from('opportunity_tasks')
        .insert({
          opportunity_id: opportunityId,
          lifecycle_stage: currentStage,
          task_name: newTaskName,
          is_completed: false,
        });

      if (error) throw error;
      setNewTaskName('');
      await fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Failed to add task",
        variant: "destructive",
      });
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (!canEdit) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('opportunity_tasks')
        .update({
          is_completed: !task.is_completed,
          completed_at: !task.is_completed ? new Date().toISOString() : null,
          completed_by: !task.is_completed ? user?.id : null,
        })
        .eq('id', task.id);

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!canEdit) return;

    try {
      const { error } = await supabase
        .from('opportunity_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const templateTasks = STAGE_TEMPLATES[currentStage] || [];
  const existingTaskNames = new Set(tasks.map(t => t.task_name));
  const availableTemplates = templateTasks.filter(t => !existingTaskNames.has(t));

  return (
    <div className="space-y-6">
      {/* Current Stage Tasks */}
      <div>
        <h3 className="font-semibold mb-3">Stage Tasks</h3>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tasks yet. Add tasks below.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={() => handleToggleTask(task)}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.task_name}
                  </p>
                  {task.task_description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.task_description}</p>
                  )}
                  {task.completed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed {format(new Date(task.completed_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Tasks */}
      {canEdit && (
        <>
          {/* Template Tasks */}
          {availableTemplates.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Suggested Tasks</h3>
              <div className="space-y-2">
                {availableTemplates.map((template, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <p className="text-sm">{template}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddTemplateTask(template)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Task */}
          <div>
            <h3 className="font-semibold mb-3">Add Custom Task</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Task name"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTask()}
              />
              <Button onClick={handleAddCustomTask} disabled={!newTaskName.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
