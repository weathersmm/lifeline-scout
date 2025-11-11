import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Activity, Users, TrendingUp, Clock, Shield, CheckCircle, XCircle, UserCog, Database, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ScrapingHistoryDashboard } from '@/components/dashboard/ScrapingHistoryDashboard';
import { ScrapingQualityDashboard } from '@/components/dashboard/ScrapingQualityDashboard';

interface RateLimitRecord {
  id: string;
  user_id: string;
  action: string;
  created_at: string;
}

interface UserStats {
  user_id: string;
  email: string;
  total_calls: number;
  actions: Record<string, number>;
  last_activity: string;
}

interface ActionStats {
  action: string;
  count: number;
  users: number;
}

interface UserAccount {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'member' | 'viewer';
  has_mfa: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const AdminDashboard = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rateLimits, setRateLimits] = useState<RateLimitRecord[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [actionStats, setActionStats] = useState<ActionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
      });
    }
  }, [isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchRateLimitData();
      fetchUserAccounts();
    }
  }, [isAdmin, timeRange]);

  const getTimeRangeDate = () => {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const fetchRateLimitData = async () => {
    try {
      setLoading(true);
      const startDate = getTimeRangeDate();

      // Fetch rate limit records
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .from('rate_limits')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (rateLimitError) throw rateLimitError;

      setRateLimits(rateLimitData || []);

      // Fetch user profiles for email mapping
      const userIds = [...new Set((rateLimitData || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      // Calculate user stats
      const userStatsMap = new Map<string, UserStats>();
      (rateLimitData || []).forEach(record => {
        const existing = userStatsMap.get(record.user_id);
        if (existing) {
          existing.total_calls++;
          existing.actions[record.action] = (existing.actions[record.action] || 0) + 1;
          if (new Date(record.created_at) > new Date(existing.last_activity)) {
            existing.last_activity = record.created_at;
          }
        } else {
          userStatsMap.set(record.user_id, {
            user_id: record.user_id,
            email: emailMap.get(record.user_id) || 'Unknown',
            total_calls: 1,
            actions: { [record.action]: 1 },
            last_activity: record.created_at,
          });
        }
      });

      setUserStats(Array.from(userStatsMap.values()).sort((a, b) => b.total_calls - a.total_calls));

      // Calculate action stats
      const actionStatsMap = new Map<string, ActionStats>();
      (rateLimitData || []).forEach(record => {
        const existing = actionStatsMap.get(record.action);
        if (existing) {
          existing.count++;
          existing.users = new Set([...Array(existing.users), record.user_id]).size;
        } else {
          actionStatsMap.set(record.action, {
            action: record.action,
            count: 1,
            users: 1,
          });
        }
      });

      setActionStats(Array.from(actionStatsMap.values()).sort((a, b) => b.count - a.count));
    } catch (error) {
      console.error('Error fetching rate limit data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch rate limit data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAccounts = async () => {
    try {
      setLoadingUsers(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-users-admin`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users');
      }

      const { users } = await response.json();
      setUserAccounts(users || []);
    } catch (error) {
      console.error('Error fetching user accounts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch user accounts.',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'member' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Role updated',
        description: 'User role has been successfully updated.',
      });

      // Refresh user accounts
      await fetchUserAccounts();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user role.',
      });
    }
  };

  const totalCalls = rateLimits.length;
  const uniqueUsers = new Set(rateLimits.map(r => r.user_id)).size;
  const uniqueActions = new Set(rateLimits.map(r => r.action)).size;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground mt-1">Rate Limit & API Usage Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={timeRange === '24h' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('24h')}
              >
                24h
              </Button>
              <Button
                variant={timeRange === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('7d')}
              >
                7d
              </Button>
              <Button
                variant={timeRange === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('30d')}
              >
                30d
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total API Calls</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Activity className="w-6 h-6 text-primary" />
                  {totalCalls}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Users</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  {uniqueUsers}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Unique Actions</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  {uniqueActions}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Calls/User</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Clock className="w-6 h-6 text-primary" />
                  {uniqueUsers > 0 ? Math.round(totalCalls / uniqueUsers) : 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scraping-history">
              <Database className="w-4 h-4 mr-2" />
              Scraping History
            </TabsTrigger>
            <TabsTrigger value="scraping-quality">
              <BarChart3 className="w-4 h-4 mr-2" />
              Quality Metrics
            </TabsTrigger>
            <TabsTrigger value="user-management">
              <UserCog className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Calls by Action</CardTitle>
                  <CardDescription>Distribution of API calls across different actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      count: { label: 'Calls', color: 'hsl(var(--chart-1))' },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={actionStats}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="action" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Action Distribution</CardTitle>
                  <CardDescription>Percentage breakdown of API calls</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      count: { label: 'Calls' },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={actionStats}
                          dataKey="count"
                          nameKey="action"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {actionStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scraping-history">
            <ScrapingHistoryDashboard />
          </TabsContent>

          <TabsContent value="scraping-quality">
            <ScrapingQualityDashboard />
          </TabsContent>

          <TabsContent value="user-management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Internal Staff Accounts</CardTitle>
                <CardDescription>Manage user roles and view MFA enrollment status</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>MFA Status</TableHead>
                        <TableHead>Last Sign In</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.email}</TableCell>
                          <TableCell>{account.full_name || '-'}</TableCell>
                          <TableCell>
                            <Select
                              value={account.role}
                              onValueChange={(value: 'admin' | 'member' | 'viewer') => 
                                updateUserRole(account.id, value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <Badge variant="destructive" className="text-xs">Admin</Badge>
                                </SelectItem>
                                <SelectItem value="member">
                                  <Badge variant="default" className="text-xs">Member</Badge>
                                </SelectItem>
                                <SelectItem value="viewer">
                                  <Badge variant="secondary" className="text-xs">Viewer</Badge>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {account.has_mfa ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="text-sm text-green-600">Enabled</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 text-amber-500" />
                                  <span className="text-sm text-amber-600">Not Enabled</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {account.last_sign_in_at 
                              ? new Date(account.last_sign_in_at).toLocaleString()
                              : 'Never'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchUserAccounts()}
                            >
                              Refresh
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>API usage breakdown by user</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead className="text-right">Total Calls</TableHead>
                      <TableHead>Actions</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userStats.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{user.total_calls}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(user.actions).map(([action, count]) => (
                              <Badge key={action} variant="outline" className="text-xs">
                                {action}: {count}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.last_activity).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Action Statistics</CardTitle>
                <CardDescription>Detailed breakdown of each action type</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Total Calls</TableHead>
                      <TableHead className="text-right">Unique Users</TableHead>
                      <TableHead className="text-right">Avg Calls/User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actionStats.map((action) => (
                      <TableRow key={action.action}>
                        <TableCell className="font-medium">{action.action}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{action.count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{action.users}</TableCell>
                        <TableCell className="text-right">
                          {Math.round(action.count / action.users)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest API calls across all users</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateLimits.slice(0, 50).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-sm">
                          {new Date(record.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{record.user_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.action}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
