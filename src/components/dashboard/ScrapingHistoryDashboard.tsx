import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, RefreshCw, TrendingUp, Database, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ScrapingHistory {
  id: string;
  source_url: string;
  source_name: string;
  source_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  opportunities_found: number;
  opportunities_inserted: number;
  error_message: string | null;
  user_id: string;
  metadata: any;
  created_at: string;
}

export const ScrapingHistoryDashboard = () => {
  const [history, setHistory] = useState<ScrapingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalScrapes: 0,
    successfulScrapes: 0,
    failedScrapes: 0,
    totalOpportunities: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scraping_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setHistory(data || []);

      // Calculate stats
      const totalScrapes = data?.length || 0;
      const successfulScrapes = data?.filter(h => h.status === 'completed').length || 0;
      const failedScrapes = data?.filter(h => h.status === 'failed').length || 0;
      const totalOpportunities = data?.reduce((sum, h) => sum + (h.opportunities_inserted || 0), 0) || 0;

      setStats({
        totalScrapes,
        successfulScrapes,
        failedScrapes,
        totalOpportunities,
      });
    } catch (error) {
      console.error('Error fetching scraping history:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch scraping history.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRescrape = async (record: ScrapingHistory) => {
    try {
      const { error } = await supabase.functions.invoke('scrape-opportunities', {
        body: {
          source_url: record.source_url,
          source_name: record.source_name,
          source_type: record.source_type,
        },
      });

      if (error) throw error;

      toast({
        title: 'Re-scraping initiated',
        description: `Started re-scraping ${record.source_name}`,
      });

      // Refresh history after a short delay
      setTimeout(fetchHistory, 2000);
    } catch (error) {
      console.error('Error re-scraping:', error);
      toast({
        variant: 'destructive',
        title: 'Re-scraping failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case 'local':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'global':
        return <Globe className="h-4 w-4 text-purple-500" />;
      default:
        return <Globe className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Running</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scrapes</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              {stats.totalScrapes}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Successful</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              {stats.successfulScrapes}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              {stats.failedScrapes}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Opportunities Found</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              {stats.totalOpportunities}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scraping History</CardTitle>
              <CardDescription>View all scraping attempts and their results</CardDescription>
            </div>
            <Button onClick={fetchHistory} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Found</TableHead>
                  <TableHead>Inserted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => {
                  const duration = record.completed_at
                    ? Math.round(
                        (new Date(record.completed_at).getTime() -
                          new Date(record.started_at).getTime()) /
                          1000
                      )
                    : null;

                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          {getStatusBadge(record.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium truncate">{record.source_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {record.source_url}
                          </p>
                          {record.error_message && (
                            <p className="text-xs text-red-500 mt-1">{record.error_message}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSourceTypeIcon(record.source_type)}
                          <span className="text-sm capitalize">{record.source_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(record.started_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {duration !== null ? `${duration}s` : '-'}
                      </TableCell>
                      <TableCell className="text-center">{record.opportunities_found}</TableCell>
                      <TableCell className="text-center">
                        {record.opportunities_inserted}
                      </TableCell>
                      <TableCell>
                        {record.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRescrape(record)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
