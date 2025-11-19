import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Opportunity } from "@/types/opportunity";
import { format, subDays, startOfWeek, endOfWeek, eachWeekOfInterval, subMonths } from "date-fns";
import { Loader2, TrendingUp, Target, BarChart3, PieChart as PieChartIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Analytics() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedData: Opportunity[] = (data || []).map((item) => ({
        id: item.id,
        title: item.title,
        agency: item.agency,
        geography: {
          state: item.geography_state,
          county: item.geography_county || undefined,
          city: item.geography_city || undefined,
        },
        serviceTags: item.service_tags as any[],
        contractType: item.contract_type as any,
        estimatedValue: {
          min: item.estimated_value_min || undefined,
          max: item.estimated_value_max || undefined,
        },
        keyDates: {
          issueDate: item.issue_date || undefined,
          questionsDue: item.questions_due || undefined,
          preBidMeeting: item.pre_bid_meeting || undefined,
          proposalDue: item.proposal_due,
        },
        termLength: item.term_length || undefined,
        link: item.link,
        summary: item.summary,
        priority: item.priority as any,
        status: item.status as any,
        source: item.source,
        recommendedAction: item.recommended_action || undefined,
        isHot: (item as any).is_hot || false,
        hotFlaggedType: (item as any).hot_flagged_type || undefined,
        lifecycleStage: (item as any).lifecycle_stage || 'identified',
        documents: (item as any).documents || [],
        lifecycleNotes: (item as any).lifecycle_notes || undefined,
      }));

      setOpportunities(transformedData);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Priority distribution
  const priorityData = [
    { name: "High", value: opportunities.filter((o) => o.priority === "high").length, color: "#ef4444" },
    { name: "Medium", value: opportunities.filter((o) => o.priority === "medium").length, color: "#f59e0b" },
    { name: "Low", value: opportunities.filter((o) => o.priority === "low").length, color: "#10b981" },
  ];

  // Status distribution
  const statusData = [
    { name: "New", value: opportunities.filter((o) => o.status === "new").length, color: "#3b82f6" },
    { name: "Monitoring", value: opportunities.filter((o) => o.status === "monitoring").length, color: "#8b5cf6" },
    { name: "In Pipeline", value: opportunities.filter((o) => o.status === "in-pipeline").length, color: "#06b6d4" },
    { name: "Archived", value: opportunities.filter((o) => o.status === "archived").length, color: "#6b7280" },
  ];

  // Weekly trends (last 12 weeks)
  const weeklyData = (() => {
    const weeks = eachWeekOfInterval({
      start: subMonths(new Date(), 3),
      end: new Date(),
    });

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart);
      const count = opportunities.filter((o) => {
        const createdAt = new Date(o.keyDates.issueDate || "");
        return createdAt >= weekStart && createdAt <= weekEnd;
      }).length;

      return {
        week: format(weekStart, "MMM dd"),
        opportunities: count,
      };
    });
  })();

  // Contract type distribution
  const contractTypeData = [
    { name: "RFP", value: opportunities.filter((o) => o.contractType === "RFP").length },
    { name: "RFQ", value: opportunities.filter((o) => o.contractType === "RFQ").length },
    { name: "RFI", value: opportunities.filter((o) => o.contractType === "RFI").length },
    { name: "Sources Sought", value: opportunities.filter((o) => o.contractType === "Sources Sought").length },
    { name: "Pre-solicitation", value: opportunities.filter((o) => o.contractType === "Pre-solicitation").length },
    { name: "Sole-Source", value: opportunities.filter((o) => o.contractType === "Sole-Source Notice").length },
  ].filter((item) => item.value > 0);

  // Service tag distribution
  const serviceTagData = (() => {
    const tagCounts: Record<string, number> = {};
    opportunities.forEach((opp) => {
      opp.serviceTags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  })();

  // Calculate win rate (opportunities in-pipeline / total)
  const winRate = opportunities.length > 0
    ? ((opportunities.filter((o) => o.status === "in-pipeline").length / opportunities.length) * 100).toFixed(1)
    : "0.0";

  // Calculate average opportunity value
  const avgValue = (() => {
    const withValues = opportunities.filter((o) => o.estimatedValue?.max);
    if (withValues.length === 0) return 0;
    const total = withValues.reduce((sum, o) => sum + (o.estimatedValue?.max || 0), 0);
    return (total / withValues.length).toFixed(0);
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track trends, pipeline metrics, and opportunity insights</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all statuses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">In pipeline vs total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{priorityData[0].value}</div>
            <p className="text-xs text-muted-foreground mt-1">Requiring immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Value</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(avgValue).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Est. max value average</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="tags">Service Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Opportunity Trends</CardTitle>
              <CardDescription>New opportunities discovered over the last 12 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="opportunities" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
                <CardDescription>Breakdown by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contract Types</CardTitle>
                <CardDescription>Distribution by contract type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contractTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Status</CardTitle>
              <CardDescription>Current status of all opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Service Tags</CardTitle>
              <CardDescription>Most common service categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={serviceTagData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
