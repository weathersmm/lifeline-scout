import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  TrendingUp,
  FileText
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ComplianceCheckResult {
  totalRequirements: number;
  requirementsCompleted: number;
  requirementsPartial: number;
  requirementsMissing: number;
  totalWordCount: number;
  complianceScore: number;
  missingCategories: string[];
  details: {
    requirementId: string;
    requirementText: string;
    status: 'complete' | 'partial' | 'missing';
    wordCount: number;
    pageLimit?: number;
    estimatedPages: number;
    isOverLimit: boolean;
    category?: string;
  }[];
}

interface ComplianceCheckerProps {
  opportunityId: string;
  requirements: any[];
}

export function ComplianceChecker({ opportunityId, requirements }: ComplianceCheckerProps) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ComplianceCheckResult | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    loadLatestCheck();
  }, [opportunityId]);

  const loadLatestCheck = async () => {
    try {
      const { data, error } = await supabase
        .from('proposal_compliance_checks')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setResult({
          totalRequirements: data.total_requirements,
          requirementsCompleted: data.requirements_completed,
          requirementsPartial: data.requirements_partial,
          requirementsMissing: data.requirements_missing,
          totalWordCount: data.total_word_count,
          complianceScore: typeof data.compliance_score === 'number' 
            ? data.compliance_score 
            : parseFloat(String(data.compliance_score)),
          missingCategories: data.missing_categories || [],
          details: (data.check_data as any)?.details || []
        });
        setLastChecked(new Date(data.checked_at));
      }
    } catch (error) {
      console.error('Error loading latest check:', error);
    }
  };

  const runComplianceCheck = async () => {
    setChecking(true);
    try {
      toast({
        title: "Running compliance check...",
        description: "Analyzing proposal coverage",
      });

      // Load requirement mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('proposal_requirement_mappings')
        .select('*')
        .eq('opportunity_id', opportunityId);

      if (mappingsError) throw mappingsError;

      // Analyze each requirement
      const details = requirements.map(req => {
        const mapping = mappings?.find(m => m.requirement_id === req.id);
        const wordCount = mapping?.word_count || 0;
        const wordsPerPage = 250;
        const estimatedPages = wordCount / wordsPerPage;
        const hasContent = wordCount > 0 || (mapping?.content_block_ids?.length || 0) > 0;
        const isComplete = mapping?.is_complete || false;
        
        let status: 'complete' | 'partial' | 'missing' = 'missing';
        if (isComplete && hasContent) {
          status = 'complete';
        } else if (hasContent) {
          status = 'partial';
        }

        return {
          requirementId: req.id,
          requirementText: req.text,
          status,
          wordCount,
          pageLimit: req.pageLimit,
          estimatedPages,
          isOverLimit: req.pageLimit ? estimatedPages > req.pageLimit : false,
          category: req.category
        };
      });

      const completed = details.filter(d => d.status === 'complete').length;
      const partial = details.filter(d => d.status === 'partial').length;
      const missing = details.filter(d => d.status === 'missing').length;
      const totalWords = details.reduce((sum, d) => sum + d.wordCount, 0);

      // Calculate compliance score (weighted: complete=1, partial=0.5, missing=0)
      const score = ((completed + (partial * 0.5)) / requirements.length) * 100;

      // Identify missing categories
      const categoriesWithMissing = details
        .filter(d => d.status === 'missing' && d.category)
        .map(d => d.category!)
        .filter((cat, idx, arr) => arr.indexOf(cat) === idx);

      const checkResult: ComplianceCheckResult = {
        totalRequirements: requirements.length,
        requirementsCompleted: completed,
        requirementsPartial: partial,
        requirementsMissing: missing,
        totalWordCount: totalWords,
        complianceScore: parseFloat(score.toFixed(2)),
        missingCategories: categoriesWithMissing,
        details
      };

      setResult(checkResult);
      setLastChecked(new Date());

      // Save to database
      const { error: saveError } = await supabase
        .from('proposal_compliance_checks')
        .insert({
          opportunity_id: opportunityId,
          total_requirements: checkResult.totalRequirements,
          requirements_completed: checkResult.requirementsCompleted,
          requirements_partial: checkResult.requirementsPartial,
          requirements_missing: checkResult.requirementsMissing,
          total_word_count: checkResult.totalWordCount,
          compliance_score: checkResult.complianceScore,
          missing_categories: checkResult.missingCategories,
          check_data: { details: checkResult.details },
          checked_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (saveError) throw saveError;

      toast({
        title: "Compliance check complete",
        description: `Compliance score: ${score.toFixed(0)}%`,
      });

    } catch (error) {
      console.error('Error running compliance check:', error);
      toast({
        title: "Check failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-500';
      case 'partial': return 'text-yellow-500';
      case 'missing': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'missing': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Compliance Checker
            </CardTitle>
            <CardDescription>
              Validate proposal coverage against RFP requirements
            </CardDescription>
          </div>
          <Button onClick={runComplianceCheck} disabled={checking}>
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? "Checking..." : "Run Check"}
          </Button>
        </div>

        {lastChecked && (
          <p className="text-xs text-muted-foreground mt-2">
            Last checked: {lastChecked.toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {result && (
          <>
            {/* Overall Score */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold">
                    {result.complianceScore}%
                  </div>
                  <p className="text-sm text-muted-foreground">Compliance Score</p>
                  <Progress value={result.complianceScore} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-green-500">
                      {result.requirementsCompleted}
                    </div>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-yellow-500">
                      {result.requirementsPartial}
                    </div>
                    <p className="text-xs text-muted-foreground">Partial</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-red-500">
                      {result.requirementsMissing}
                    </div>
                    <p className="text-xs text-muted-foreground">Missing</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm">
                    <span className="font-semibold">{result.totalWordCount.toLocaleString()}</span>
                    {' '}total words (~{(result.totalWordCount / 250).toFixed(1)} pages)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Missing Categories Alert */}
            {result.missingCategories.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Missing categories:</strong> {result.missingCategories.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {/* Detailed Requirements */}
            <div>
              <h3 className="font-semibold mb-2">Requirement Details</h3>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {result.details.map((detail, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getStatusIcon(detail.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {detail.requirementId}
                            </Badge>
                            {detail.category && (
                              <Badge variant="secondary" className="text-xs">
                                {detail.category}
                              </Badge>
                            )}
                            <Badge className={getStatusColor(detail.status)}>
                              {detail.status}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{detail.requirementText}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {detail.wordCount} words (~{detail.estimatedPages.toFixed(1)} pages)
                            </span>
                            {detail.pageLimit && (
                              <span className={detail.isOverLimit ? 'text-red-500 font-semibold' : ''}>
                                {detail.isOverLimit && '⚠️ '}
                                Limit: {detail.pageLimit} pages
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {!result && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Run a compliance check to validate your proposal</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
