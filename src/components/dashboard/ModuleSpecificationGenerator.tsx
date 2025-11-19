import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ModuleSpecificationGeneratorProps {
  opportunityId: string;
  opportunity: any;
  requirements: any[];
}

export function ModuleSpecificationGenerator({ 
  opportunityId, 
  opportunity,
  requirements 
}: ModuleSpecificationGeneratorProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [moduleSpec, setModuleSpec] = useState<any>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      toast({
        title: "Generating module specification...",
        description: "Creating strategic guidance for proposal writers",
      });

      // Fetch competitor intelligence if available
      const { data: competitorData } = await supabase
        .from('competitive_assessments')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .single();

      const { data, error } = await supabase.functions.invoke('generate-module-specification', {
        body: {
          opportunity: {
            title: opportunity.title,
            agency: opportunity.agency,
            geography: opportunity.geography,
            serviceTags: opportunity.serviceTags,
            contractType: opportunity.contractType,
            summary: opportunity.summary
          },
          requirements: requirements || [],
          competitorIntel: competitorData,
          swotAnalysis: competitorData ? {
            strengths: competitorData.strengths,
            weaknesses: competitorData.weaknesses,
            opportunities: competitorData.opportunities,
            threats: competitorData.threats
          } : null
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate module specification');
      }

      setModuleSpec(data.moduleSpec);
      
      toast({
        title: "Module specification generated",
        description: "Strategic guidance ready for proposal team",
      });

    } catch (error) {
      console.error('Error generating module specification:', error);
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    if (!moduleSpec) return;

    const blob = new Blob([moduleSpec], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `module-spec-${opportunityId}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Module specification downloaded",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Module Specification Generator
        </CardTitle>
        <CardDescription>
          Generate strategic guidance document for proposal writers (8-question template)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Module Spec"
            )}
          </Button>
          
          {moduleSpec && (
            <Button
              variant="outline"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>

        {moduleSpec && (
          <Tabs defaultValue="formatted" className="w-full">
            <TabsList>
              <TabsTrigger value="formatted">Formatted View</TabsTrigger>
              <TabsTrigger value="raw">Raw Content</TabsTrigger>
            </TabsList>
            
            <TabsContent value="formatted" className="mt-4">
              <ScrollArea className="h-[600px] rounded-md border">
                <div className="p-6 prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ 
                    __html: moduleSpec.replace(/\n/g, '<br/>') 
                  }} />
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="raw" className="mt-4">
              <ScrollArea className="h-[600px] rounded-md border">
                <pre className="p-4 text-xs">{moduleSpec}</pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
