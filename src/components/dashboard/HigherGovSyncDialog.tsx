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

export const HigherGovSyncDialog = () => {
  const [open, setOpen] = useState(false);
  const [daysBack, setDaysBack] = useState("7");
  const [keywords, setKeywords] = useState("ambulance");
  const [searchId, setSearchId] = useState("Bvm7D2uxbydCmN2bJJ_rs");
  const [sourceType, setSourceType] = useState<'sam' | 'all'>('sam');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-highergov-opportunities', {
        body: {
          days_back: parseInt(daysBack),
          search_keywords: keywords || undefined,
          search_id: searchId || undefined,
          source_type: sourceType,
        },
      });

      if (error) {
        throw error;
      }

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sync HigherGov Opportunities</DialogTitle>
          <DialogDescription>
            Automatically fetch and classify EMS opportunities from HigherGov API.
            Configure federal search or use date-based filtering.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="source-type">Source Type</Label>
            <Select value={sourceType} onValueChange={(value: 'sam' | 'all') => setSourceType(value)}>
              <SelectTrigger id="source-type">
                <SelectValue placeholder="Select source type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sam">Federal (SAM.gov only)</SelectItem>
                <SelectItem value="all">All Sources</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Federal includes SAM.gov, GSA contracts, and federal procurement
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-id">Search ID (Optional)</Label>
            <Input
              id="search-id"
              type="text"
              placeholder="Bvm7D2uxbydCmN2bJJ_rs"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Use a saved HigherGov search ID for specific queries
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="days-back">Days Back</Label>
            <Input
              id="days-back"
              type="number"
              placeholder="7"
              min="1"
              max="90"
              value={daysBack}
              onChange={(e) => setDaysBack(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Fetch opportunities from the last N days (1-90)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (Optional)</Label>
            <Input
              id="keywords"
              type="text"
              placeholder="ambulance EMS paramedic"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Additional keywords to filter opportunities
            </p>
          </div>

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
