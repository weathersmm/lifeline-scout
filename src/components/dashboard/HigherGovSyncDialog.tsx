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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const HigherGovSyncDialog = () => {
  const [open, setOpen] = useState(false);
  const [daysBack, setDaysBack] = useState("7");
  const [keywords, setKeywords] = useState("EMS ambulance emergency medical services");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "fetch-highergov-opportunities",
        {
          body: {
            days_back: parseInt(daysBack) || 7,
            search_keywords: keywords,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "HigherGov sync completed",
        description: `Fetched ${data.stats.fetched} opportunities, classified ${data.stats.classified} as EMS-related, inserted ${data.stats.inserted}`,
      });

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync HigherGov Opportunities</DialogTitle>
          <DialogDescription>
            Automatically fetch and classify EMS opportunities from HigherGov API.
            AI will filter for relevant EMS opportunities only.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="days">Days Back</Label>
            <Input
              id="days"
              type="number"
              placeholder="7"
              value={daysBack}
              onChange={(e) => setDaysBack(e.target.value)}
              disabled={isLoading}
              min="1"
              max="90"
            />
            <p className="text-xs text-muted-foreground">
              Fetch opportunities posted in the last N days (1-90)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keywords">Search Keywords (optional)</Label>
            <Input
              id="keywords"
              placeholder="EMS ambulance emergency medical services"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use default EMS-related keywords
            </p>
          </div>
          <Button
            onClick={handleSync}
            disabled={isLoading}
            className="w-full"
          >
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
