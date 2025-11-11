import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, TrendingDown, MinusCircle } from 'lucide-react';

interface SourceQuality {
  source_url: string;
  source_name: string;
  total_scrapes: number;
  successful_scrapes: number;
  failed_scrapes: number;
  success_rate: number;
  total_opportunities_found: number;
  total_opportunities_inserted: number;
  avg_opportunities_per_scrape: number;
  last_scraped_at: string;
  status: 'healthy' | 'warning' | 'problematic';
}

export const ScrapingQualityDashboard = () => {
  const [sourceQuality, setSourceQuality] = useState<SourceQuality[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    avgSuccessRate: 0,
    totalProblematicSources: 0,
    totalHealthySources: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchQualityData();
  }, []);

  const fetchQualityData = async () => {
    try {
      setLoading(true);

      // Fetch all scraping history
      const { data: history, error: historyError } = await supabase
        .from('scraping_history')
        .select('*')
        .order('started_at', { ascending: false });

      if (historyError) throw historyError;

      // Group by source and calculate metrics
      const sourceMap = new Map<string, SourceQuality>();

      history?.forEach((record) => {
        const key = record.source_url;
        const existing = sourceMap.get(key);

        if (existing) {
          existing.total_scrapes++;
          if (record.status === 'completed') {
            existing.successful_scrapes++;
            existing.total_opportunities_found += record.opportunities_found || 0;
            existing.total_opportunities_inserted += record.opportunities_inserted || 0;
          } else if (record.status === 'failed') {
            existing.failed_scrapes++;
          }
          
          // Update last scraped timestamp
          if (new Date(record.started_at) > new Date(existing.last_scraped_at)) {
            existing.last_scraped_at = record.started_at;
          }
        } else {
          sourceMap.set(key, {
            source_url: record.source_url,
            source_name: record.source_name,
            total_scrapes: 1,
            successful_scrapes: record.status === 'completed' ? 1 : 0,
            failed_scrapes: record.status === 'failed' ? 1 : 0,
            success_rate: 0,
            total_opportunities_found: record.opportunities_found || 0,
            total_opportunities_inserted: record.opportunities_inserted || 0,
            avg_opportunities_per_scrape: 0,
            last_scraped_at: record.started_at,
            status: 'healthy',
          });
        }
      });

      // Calculate derived metrics and status
      const sources = Array.from(sourceMap.values()).map((source) => {
        source.success_rate = (source.successful_scrapes / source.total_scrapes) * 100;
        source.avg_opportunities_per_scrape =
          source.successful_scrapes > 0
            ? source.total_opportunities_inserted / source.successful_scrapes
            : 0;

        // Determine health status
        if (source.success_rate < 50 || (source.successful_scrapes >= 3 && source.avg_opportunities_per_scrape === 0)) {
          source.status = 'problematic';
        } else if (source.success_rate < 80 || source.avg_opportunities_per_scrape < 1) {
          source.status = 'warning';
        } else {
          source.status = 'healthy';
        }

        return source;
      });

      // Sort by problematic first, then by success rate
      sources.sort((a, b) => {
        const statusOrder = { problematic: 0, warning: 1, healthy: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return b.success_rate - a.success_rate;
      });

      setSourceQuality(sources);

      // Calculate overall stats
      const avgSuccessRate =
        sources.length > 0
          ? sources.reduce((sum, s) => sum + s.success_rate, 0) / sources.length
          : 0;
      const totalProblematicSources = sources.filter((s) => s.status === 'problematic').length;
      const totalHealthySources = sources.filter((s) => s.status === 'healthy').length;

      setOverallStats({
        avgSuccessRate,
        totalProblematicSources,
        totalHealthySources,
      });
    } catch (error) {
      console.error('Error fetching quality data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch scraping quality data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'problematic':
        return <Badge variant="destructive">Problematic</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <MinusCircle className="h-4 w-4 text-yellow-500" />;
      case 'problematic':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Quality Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Success Rate</CardDescription>
            <CardTitle className="text-3xl">{overallStats.avgSuccessRate.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallStats.avgSuccessRate} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Healthy Sources</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-500" />
              {overallStats.totalHealthySources}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Problematic Sources</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              {overallStats.totalProblematicSources}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quality Table */}
      <Card>
        <CardHeader>
          <CardTitle>Source Quality Metrics</CardTitle>
          <CardDescription>
            Performance analysis of all scraping sources. Problematic sources have &lt;50% success rate or
            consistently return zero results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-center">Total Scrapes</TableHead>
                <TableHead className="text-center">Success Rate</TableHead>
                <TableHead className="text-center">Avg Opps/Scrape</TableHead>
                <TableHead className="text-center">Total Found</TableHead>
                <TableHead className="text-center">Total Inserted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceQuality.map((source) => (
                <TableRow key={source.source_url}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(source.status)}
                      {getStatusBadge(source.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium truncate">{source.source_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{source.source_url}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{source.total_scrapes}</TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <div className="font-medium">{source.success_rate.toFixed(1)}%</div>
                      <Progress value={source.success_rate} className="h-1 w-16 mx-auto" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {source.avg_opportunities_per_scrape.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-center">{source.total_opportunities_found}</TableCell>
                  <TableCell className="text-center">{source.total_opportunities_inserted}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
