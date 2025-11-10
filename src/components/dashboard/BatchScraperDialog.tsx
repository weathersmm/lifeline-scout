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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Globe, Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

// Predefined California county/city procurement URLs
const ALAMEDA_SOURCES = [
  { name: "Alameda County", url: "https://www.acgov.org/gsa/purchasing/" },
  { name: "Alameda City", url: "https://www.alamedaca.gov/business/bids-contracts" },
  { name: "Albany", url: "https://www.albanyca.org/government/bids-rfps" },
  { name: "Berkeley", url: "https://www.berkeleyca.gov/doing-business/city-contracts-bidding-opportunities" },
  { name: "Dublin", url: "https://www.dublin.ca.gov/105/Bids-RFPs" },
  { name: "Emeryville", url: "https://www.emeryville.org/156/Bids-and-RFPs" },
  { name: "Fremont", url: "https://www.fremont.gov/105/Bids-RFPs" },
  { name: "Hayward", url: "https://www.hayward-ca.gov/business/bids-and-contracts" },
  { name: "Livermore", url: "https://www.livermoreca.gov/business/bids-and-rfps" },
  { name: "Newark", url: "https://www.newark.org/business/bids-and-proposals" },
  { name: "Oakland", url: "https://www.oaklandca.gov/services/businesses/contracts-and-purchasing" },
  { name: "Piedmont", url: "https://www.piedmont.ca.gov/government/bids_rfps" },
  { name: "Pleasanton", url: "https://www.cityofpleasantonca.gov/business/bids.asp" },
  { name: "San Leandro", url: "https://www.sanleandro.org/depts/finance/purchasing/bids.asp" },
  { name: "Union City", url: "https://www.unioncity.org/105/Bids-RFPs" },
];

export const BatchScraperDialog = () => {
  const [open, setOpen] = useState(false);
  const [customUrls, setCustomUrls] = useState("");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const toggleSource = (url: string) => {
    const newSelected = new Set(selectedSources);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedSources(newSelected);
  };

  const handleBatchScrape = async () => {
    const customUrlList = customUrls
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.startsWith("http"));

    const allUrls = [...Array.from(selectedSources), ...customUrlList];

    if (allUrls.length === 0) {
      toast({
        title: "No sources selected",
        description: "Please select at least one source or enter custom URLs",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;
    let totalInserted = 0;

    try {
      for (const url of allUrls) {
        try {
          const sourceName = ALAMEDA_SOURCES.find((s) => s.url === url)?.name || new URL(url).hostname;
          
          const { data, error } = await supabase.functions.invoke("scrape-opportunities", {
            body: {
              source_url: url,
              source_name: sourceName,
            },
          });

          if (error) throw error;

          successCount++;
          totalInserted += data.stats.inserted || 0;
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error);
          failCount++;
        }
      }

      toast({
        title: "Batch scraping completed",
        description: `Successfully scraped ${successCount} sources, inserted ${totalInserted} opportunities. ${failCount} failed.`,
      });

      setCustomUrls("");
      setSelectedSources(new Set());
      setOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Batch scraping error:", error);
      toast({
        title: "Batch scraping failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectAll = () => {
    setSelectedSources(new Set(ALAMEDA_SOURCES.map((s) => s.url)));
  };

  const clearAll = () => {
    setSelectedSources(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Globe className="h-4 w-4" />
          Batch Scrape
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Scrape Procurement Sites</DialogTitle>
          <DialogDescription>
            Select multiple sources to scrape at once. This will extract EMS opportunities from all selected sites.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Predefined sources */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Alameda County Sources</Label>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  <Plus className="h-3 w-3 mr-1" />
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
              {ALAMEDA_SOURCES.map((source) => (
                <Badge
                  key={source.url}
                  variant={selectedSources.has(source.url) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSource(source.url)}
                >
                  {source.name}
                  {selectedSources.has(source.url) && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom URLs */}
          <div className="space-y-2">
            <Label htmlFor="custom-urls">Custom URLs (one per line)</Label>
            <Textarea
              id="custom-urls"
              placeholder="https://procurement.opengov.com/portal/ocgov&#10;https://example.com/bids"
              value={customUrls}
              onChange={(e) => setCustomUrls(e.target.value)}
              disabled={isLoading}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Enter additional procurement URLs to scrape (e.g., OpenGov portals, SAM.gov, etc.)
            </p>
          </div>

          <Button onClick={handleBatchScrape} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping {Array.from(selectedSources).length + customUrls.split("\n").filter((l) => l.trim().startsWith("http")).length} sources...
              </>
            ) : (
              "Start Batch Scraping"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
