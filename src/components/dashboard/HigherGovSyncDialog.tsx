import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrapingProgressMonitor } from "./ScrapingProgressMonitor";

export const HigherGovSyncDialog = () => {
  const [open, setOpen] = useState(false);
  const [sourceType, setSourceType] = useState<'sam' | 'sled'>('sled');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  const triggerBatchScraping = async (batchSessionId: string) => {
    try {
      // Get key global sources to scrape after HigherGov sync
      const globalSources = [
        { url: 'https://sam.gov/opp/search', name: 'SAM.gov' },
        { url: 'https://caleprocure.ca.gov/pages/index.aspx', name: 'CAleprocure' },
        { url: 'https://procurement.opengov.com/portal/ocgov', name: 'Orange County Procurement' },
      ];

      // Initialize progress tracking
      for (const source of globalSources) {
        await supabase
          .from('scraping_progress')
          .insert({
            session_id: batchSessionId,
            source_name: source.name,
            source_url: source.url,
            status: 'pending',
          });
      }

      let successCount = 0;
      for (const source of globalSources) {
        try {
          // Update status to in_progress
          await supabase
            .from('scraping_progress')
            .update({
              status: 'in_progress',
              started_at: new Date().toISOString(),
            })
            .eq('session_id', batchSessionId)
            .eq('source_url', source.url);

          await supabase.functions.invoke("scrape-opportunities", {
            body: {
              source_url: source.url,
              source_name: source.name,
              source_type: 'global',
            },
          });
          successCount++;

          // Update progress as completed
          await supabase
            .from('scraping_progress')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('session_id', batchSessionId)
            .eq('source_url', source.url);
        } catch (error) {
          console.error(`Failed to scrape ${source.name}:`, error);

          // Update progress as failed
          await supabase
            .from('scraping_progress')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date().toISOString(),
            })
            .eq('session_id', batchSessionId)
            .eq('source_url', source.url);
        }
      }

      toast({
        title: "Batch scraping completed",
        description: `Successfully scraped ${successCount}/${globalSources.length} additional sources`,
      });
    } catch (error) {
      console.error("Batch scraping error:", error);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    
    // Generate session ID for progress tracking
    const newSessionId = `highergov-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setSessionId(newSessionId);

    try {
      // Use predefined search IDs for ambulance opportunities
      const searchId = sourceType === 'sam' 
        ? 'Bvm7D2uxbydCmN2bJJ_rs'  // Federal ambulance search
        : 'jQDXT1Mj3rMe5qU0zdFOk-sl'; // State & Local ambulance search
      
      const { data, error } = await supabase.functions.invoke('fetch-highergov-opportunities', {
        body: {
          days_back: 30,
          search_id: searchId,
          source_type: sourceType,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "HigherGov sync completed",
        description: `Fetched ${data.stats.fetched} opportunities, classified ${data.stats.classified} as EMS-related, inserted ${data.stats.inserted}. Starting batch scraping...`,
      });

      // Chain batch scraping after HigherGov sync
      await triggerBatchScraping(newSessionId);

      setOpen(false);
      
      // Reload the page to show new opportunities
      window.location.reload();
    } catch (error) {
      console.error("HigherGov sync error:", error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Database className="h-4 w-4" />
          Sync HigherGov
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sync EMS Opportunities</DialogTitle>
          <DialogDescription>
            Discover new ambulance and EMS opportunities from government contracts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Choose Contract Type</Label>
            <Select value={sourceType} onValueChange={(value: 'sam' | 'sled') => setSourceType(value)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                <SelectItem value="sled">State & Local</SelectItem>
                <SelectItem value="sam">Federal</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Searches the last 30 days for ambulance contracts
            </p>
          </div>

          {isLoading && sessionId && (
            <ScrapingProgressMonitor 
              sessionId={sessionId} 
              onComplete={() => {
                toast({
                  title: "All operations completed",
                  description: "HigherGov sync and batch scraping finished",
                });
              }}
            />
          )}

          <Button onClick={handleSync} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              "Start Sync"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
