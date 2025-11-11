import { useState, useEffect } from "react";
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
import { Globe, Loader2, Plus, X, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { pipelineScoutDataService, type MunicipalityData } from "@/services/pipelineScoutDataService";
import { ScrapingProgressMonitor } from "./ScrapingProgressMonitor";

export const BatchScraperDialog = () => {
  const [open, setOpen] = useState(false);
  const [customUrls, setCustomUrls] = useState("");
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<Set<string>>(new Set());
  const [selectedGlobalSources, setSelectedGlobalSources] = useState<Set<string>>(new Set());
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [counties, setCounties] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        await pipelineScoutDataService.loadWorkbook();
        setCounties(pipelineScoutDataService.getCounties());
      } catch (error) {
        console.error('Failed to load pipeline scout data:', error);
        toast({
          title: "Data loading failed",
          description: "Could not load California county/city data",
          variant: "destructive",
        });
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const toggleMunicipality = (key: string) => {
    const newSelected = new Set(selectedMunicipalities);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedMunicipalities(newSelected);
  };

  const toggleGlobalSource = (url: string) => {
    const newSelected = new Set(selectedGlobalSources);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedGlobalSources(newSelected);
  };

  const handleBatchScrape = async () => {
    const customUrlList = customUrls
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.startsWith("http"));

    // Collect municipality URLs
    const municipalityUrls: Array<{ url: string; name: string; county: string }> = [];
    selectedMunicipalities.forEach(key => {
      const [county, type, name] = key.split('::');
      const countyGroup = pipelineScoutDataService.getCountyGroup(county);
      if (!countyGroup) return;

      const muni = type === 'County' 
        ? countyGroup.countyData 
        : countyGroup.cities.find(c => c.county === name);

      if (muni) {
        const urls = pipelineScoutDataService.getMunicipalityUrls(muni);
        urls.forEach(url => {
          municipalityUrls.push({
            url,
            name: type === 'County' ? `${county} County` : name,
            county,
          });
        });
      }
    });

    // Collect global source URLs
    const globalUrls = Array.from(selectedGlobalSources);

    // Combine all URLs
    const allUrls = [
      ...municipalityUrls.map(m => ({ url: m.url, name: m.name, type: 'local' as const })),
      ...globalUrls.map(url => {
        const source = pipelineScoutDataService.getGlobalSources().find(s => s.url === url);
        return { url, name: source?.name || new URL(url).hostname, type: 'global' as const };
      }),
      ...customUrlList.map(url => ({ url, name: new URL(url).hostname, type: 'custom' as const })),
    ];

    // Deduplicate URLs
    const uniqueUrls = Array.from(
      new Map(allUrls.map(item => [item.url, item])).values()
    );

    if (uniqueUrls.length === 0) {
      toast({
        title: "No sources selected",
        description: "Please select at least one county/city, global source, or enter custom URLs",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Generate unique session ID for progress tracking
    const newSessionId = `batch-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setSessionId(newSessionId);

    // Initialize progress tracking
    for (const { url, name } of uniqueUrls) {
      await supabase
        .from('scraping_progress')
        .insert({
          session_id: newSessionId,
          source_name: name,
          source_url: url,
          status: 'pending',
        });
    }

    let successCount = 0;
    let failCount = 0;
    let totalInserted = 0;

    try {
      for (const { url, name } of uniqueUrls) {
        try {
          // Update status to in_progress
          await supabase
            .from('scraping_progress')
            .update({
              status: 'in_progress',
              started_at: new Date().toISOString(),
            })
            .eq('session_id', newSessionId)
            .eq('source_url', url);

          const { data, error } = await supabase.functions.invoke("scrape-opportunities", {
            body: {
              source_url: url,
              source_name: name,
              source_type: uniqueUrls.find(u => u.url === url)?.type || 'custom',
            },
          });

          if (error) throw error;

          successCount++;
          totalInserted += data.stats.inserted || 0;

          // Update progress as completed
          await supabase
            .from('scraping_progress')
            .update({
              status: 'completed',
              opportunities_found: data.stats.inserted || 0,
              completed_at: new Date().toISOString(),
            })
            .eq('session_id', newSessionId)
            .eq('source_url', url);
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error);
          failCount++;

          // Update progress as failed
          await supabase
            .from('scraping_progress')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date().toISOString(),
            })
            .eq('session_id', newSessionId)
            .eq('source_url', url);
        }
      }

      toast({
        title: "Batch scraping completed",
        description: `Successfully scraped ${successCount} sources, inserted ${totalInserted} opportunities. ${failCount} failed.`,
      });

      setCustomUrls("");
      setSelectedMunicipalities(new Set());
      setSelectedGlobalSources(new Set());
      setSelectedCounty(null);
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

  const selectAllInCounty = () => {
    if (!selectedCounty) return;
    const countyGroup = pipelineScoutDataService.getCountyGroup(selectedCounty);
    if (!countyGroup) return;

    const newSelected = new Set(selectedMunicipalities);
    newSelected.add(`${selectedCounty}::County::${selectedCounty}`);
    countyGroup.cities.forEach(city => {
      newSelected.add(`${selectedCounty}::City::${city.county}`);
    });
    setSelectedMunicipalities(newSelected);
  };

  const clearAllInCounty = () => {
    if (!selectedCounty) return;
    const countyGroup = pipelineScoutDataService.getCountyGroup(selectedCounty);
    if (!countyGroup) return;

    const newSelected = new Set(selectedMunicipalities);
    newSelected.delete(`${selectedCounty}::County::${selectedCounty}`);
    countyGroup.cities.forEach(city => {
      newSelected.delete(`${selectedCounty}::City::${city.county}`);
    });
    setSelectedMunicipalities(newSelected);
  };

  const selectAllGlobal = () => {
    setSelectedGlobalSources(new Set(pipelineScoutDataService.getGlobalSources().map(s => s.url)));
  };

  const clearAllGlobal = () => {
    setSelectedGlobalSources(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Globe className="h-4 w-4" />
          Batch Scrape
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>EMS Opportunity Scout - Batch Scrape</DialogTitle>
          <DialogDescription>
            Select California counties/cities and global sources to scrape for EMS-relevant opportunities.
          </DialogDescription>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="counties" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="counties">CA Counties & Cities</TabsTrigger>
              <TabsTrigger value="global">Global Sources</TabsTrigger>
              <TabsTrigger value="custom">Custom URLs</TabsTrigger>
            </TabsList>

            <TabsContent value="counties" className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <div className="space-y-2">
                <Label>Select County</Label>
                <ScrollArea className="h-32 border rounded-md p-3">
                  <div className="flex flex-wrap gap-2">
                    {counties.map((county) => (
                      <Badge
                        key={county}
                        variant={selectedCounty === county ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedCounty(county)}
                      >
                        {county} County
                        {selectedCounty === county && <ChevronRight className="h-3 w-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {selectedCounty && (
                <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between">
                    <Label>{selectedCounty} County & Cities</Label>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" onClick={selectAllInCounty}>
                        <Plus className="h-3 w-3 mr-1" />
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearAllInCounty}>
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 border rounded-md p-3">
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const countyGroup = pipelineScoutDataService.getCountyGroup(selectedCounty);
                        if (!countyGroup) return null;

                        const countyKey = `${selectedCounty}::County::${selectedCounty}`;
                        const items = [
                          <Badge
                            key={countyKey}
                            variant={selectedMunicipalities.has(countyKey) ? "default" : "outline"}
                            className="cursor-pointer font-semibold"
                            onClick={() => toggleMunicipality(countyKey)}
                          >
                            {selectedCounty} County
                            {selectedMunicipalities.has(countyKey) && <X className="h-3 w-3 ml-1" />}
                          </Badge>
                        ];

                        countyGroup.cities.forEach(city => {
                          const cityKey = `${selectedCounty}::City::${city.county}`;
                          items.push(
                            <Badge
                              key={cityKey}
                              variant={selectedMunicipalities.has(cityKey) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleMunicipality(cityKey)}
                            >
                              {city.county}
                              {selectedMunicipalities.has(cityKey) && <X className="h-3 w-3 ml-1" />}
                            </Badge>
                          );
                        });

                        return items;
                      })()}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>

            <TabsContent value="global" className="flex-1 flex flex-col space-y-3 overflow-hidden">
              <div className="flex items-center justify-between">
                <Label>National & State Procurement Portals</Label>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={selectAllGlobal}>
                    <Plus className="h-3 w-3 mr-1" />
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAllGlobal}>
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 border rounded-md p-3">
                <div className="flex flex-wrap gap-2">
                  {pipelineScoutDataService.getGlobalSources().map((source) => (
                    <Badge
                      key={source.url}
                      variant={selectedGlobalSources.has(source.url) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleGlobalSource(source.url)}
                    >
                      {source.name}
                      {selectedGlobalSources.has(source.url) && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="custom" className="flex-1 flex flex-col space-y-2">
              <Label htmlFor="custom-urls">Custom URLs (one per line)</Label>
              <Textarea
                id="custom-urls"
                placeholder="https://procurement.opengov.com/portal/ocgov&#10;https://example.com/bids"
                value={customUrls}
                onChange={(e) => setCustomUrls(e.target.value)}
                disabled={isLoading}
                className="flex-1 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter additional procurement URLs to scrape (e.g., OpenGov portals, SAM.gov, county/city sites)
              </p>
            </TabsContent>
          </Tabs>
        )}

        {isLoading && sessionId && (
          <ScrapingProgressMonitor 
            sessionId={sessionId} 
            onComplete={() => {
              toast({
                title: "Scraping completed",
                description: "All sources have been processed",
              });
            }}
          />
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedMunicipalities.size} local + {selectedGlobalSources.size} global + {customUrls.split("\n").filter(l => l.trim().startsWith("http")).length} custom
          </p>
          <Button onClick={handleBatchScrape} disabled={isLoading || dataLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping...
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
