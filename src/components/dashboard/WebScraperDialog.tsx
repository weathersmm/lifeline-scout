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
import { Globe, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const WebScraperDialog = () => {
  const [open, setOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleScrape = async () => {
    if (!sourceUrl || !sourceName) {
      toast({
        title: "Missing information",
        description: "Please provide both URL and source name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "scrape-opportunities",
        {
          body: {
            source_url: sourceUrl,
            source_name: sourceName,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Scraping completed",
        description: `Found ${data.stats.extracted} opportunities, inserted ${data.stats.inserted}`,
      });

      setSourceUrl("");
      setSourceName("");
      setOpen(false);
      
      // Reload the page to show new opportunities
      window.location.reload();
    } catch (error) {
      console.error("Scraping error:", error);
      toast({
        title: "Scraping failed",
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
        <Button variant="outline" className="gap-2">
          <Globe className="h-4 w-4" />
          Scrape Website
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scrape Procurement Website</DialogTitle>
          <DialogDescription>
            Enter a URL from SAM.gov, highergov.com, or other procurement sites
            to automatically extract and classify EMS opportunities.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              placeholder="https://sam.gov/opportunities/..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Source Name</Label>
            <Input
              id="name"
              placeholder="SAM.gov"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleScrape}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping...
              </>
            ) : (
              "Start Scraping"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
