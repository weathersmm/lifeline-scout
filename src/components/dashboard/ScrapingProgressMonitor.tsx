import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProgressItem {
  id: string;
  source_name: string;
  source_url: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying';
  opportunities_found: number;
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
}

interface ScrapingProgressMonitorProps {
  sessionId: string | null;
  onComplete?: () => void;
}

export const ScrapingProgressMonitor = ({ sessionId, onComplete }: ScrapingProgressMonitorProps) => {
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    // Initial fetch
    const fetchProgress = async () => {
      const { data } = await supabase
        .from('scraping_progress')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (data) {
        setProgress(data as ProgressItem[]);
        checkCompletion(data as ProgressItem[]);
      }
    };

    fetchProgress();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`scraping-progress-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraping_progress',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setProgress((current) => {
            const updated = [...current];
            const newData = payload.new as any;
            const index = updated.findIndex((item) => item.id === newData?.id);
            
            if (index >= 0 && newData) {
              updated[index] = newData as ProgressItem;
            } else if (payload.eventType === 'INSERT' && newData) {
              updated.push(newData as ProgressItem);
            }
            
            checkCompletion(updated);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const checkCompletion = (items: ProgressItem[]) => {
    const allComplete = items.length > 0 && items.every(
      (item) => item.status === 'completed' || item.status === 'failed'
    );

    if (allComplete && !isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'retrying':
        return <Loader2 className="h-4 w-4 animate-spin text-warning" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success';
      case 'failed':
        return 'text-destructive';
      case 'in_progress':
        return 'text-primary';
      case 'retrying':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const completedCount = progress.filter((p) => p.status === 'completed').length;
  const failedCount = progress.filter((p) => p.status === 'failed').length;
  const totalCount = progress.length;
  const percentComplete = totalCount > 0 ? ((completedCount + failedCount) / totalCount) * 100 : 0;
  const totalOpportunities = progress.reduce((sum, p) => sum + (p.opportunities_found || 0), 0);

  if (!sessionId || progress.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Scraping Progress</span>
          <span className="text-muted-foreground">
            {completedCount + failedCount} / {totalCount} sources
          </span>
        </div>
        <Progress value={percentComplete} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {completedCount} successful, {failedCount} failed
          </span>
          <span className="font-medium text-foreground">
            {totalOpportunities} opportunities found
          </span>
        </div>
      </div>

      <ScrollArea className="h-48">
        <div className="space-y-2">
          {progress.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm"
            >
              <div className="flex-shrink-0">{getStatusIcon(item.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.source_name}</div>
                {item.status === 'completed' && item.opportunities_found > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {item.opportunities_found} opportunities
                  </div>
                )}
                {item.status === 'failed' && item.error_message && (
                  <div className="text-xs text-destructive truncate">
                    {item.error_message}
                  </div>
                )}
                {item.status === 'retrying' && (
                  <div className="text-xs text-warning">
                    Retry attempt {item.retry_count}
                  </div>
                )}
              </div>
              <div className={`text-xs font-medium ${getStatusColor(item.status)}`}>
                {item.status.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
