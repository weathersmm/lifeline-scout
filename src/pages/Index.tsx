import { useState, useEffect } from 'react';
import { Opportunity, ServiceTag, Priority, ContractType } from '@/types/opportunity';
import { OpportunityCard } from '@/components/dashboard/OpportunityCard';
import { OpportunityFilters } from '@/components/dashboard/OpportunityFilters';
import { OpportunityDetailDialog } from '@/components/dashboard/OpportunityDetailDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, FileText, Calendar, LogOut, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceTags, setSelectedServiceTags] = useState<ServiceTag[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'all'>('all');
  const [selectedContractType, setSelectedContractType] = useState<ContractType | 'all'>('all');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("priority", { ascending: false })
        .order("proposal_due", { ascending: true });

      if (error) throw error;

      // Transform database data to match Opportunity type
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
        estimatedValue: item.estimated_value_min || item.estimated_value_max
          ? {
              min: item.estimated_value_min || undefined,
              max: item.estimated_value_max || undefined,
            }
          : undefined,
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
      }));

      setOpportunities(transformedData);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      toast({
        title: "Error loading opportunities",
        description: "Failed to fetch opportunities from the database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      toast({
        title: "Generating report",
        description: "Please wait while we generate the weekly report...",
      });

      const { error } = await supabase.functions.invoke("generate-weekly-report");

      if (error) throw error;

      toast({
        title: "Report generated",
        description: "Weekly report has been generated successfully.",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error generating report",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    }
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = !searchQuery || 
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.agency.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.summary.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesServiceTags = selectedServiceTags.length === 0 ||
      selectedServiceTags.some(tag => opp.serviceTags.includes(tag));

    const matchesPriority = selectedPriority === 'all' || opp.priority === selectedPriority;

    const matchesContractType = selectedContractType === 'all' || opp.contractType === selectedContractType;

    return matchesSearch && matchesServiceTags && matchesPriority && matchesContractType;
  });

  // Stats
  const highPriorityCount = filteredOpportunities.filter(o => o.priority === 'high').length;
  const newOpportunitiesCount = filteredOpportunities.filter(o => o.status === 'new').length;
  const urgentCount = filteredOpportunities.filter(o => {
    const daysUntilDue = Math.ceil(
      (new Date(o.keyDates.proposalDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilDue <= 14;
  }).length;

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedServiceTags([]);
    setSelectedPriority('all');
    setSelectedContractType('all');
  };

  const handleServiceTagToggle = (tag: ServiceTag) => {
    setSelectedServiceTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                LifeLine Pipeline Scout
              </h1>
              <p className="text-muted-foreground mt-1">
                EMS Business Development Opportunity Intelligence
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleGenerateReport}>
                <Calendar className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    {user?.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{user?.email}</span>
                      <Badge variant="secondary" className="w-fit text-xs">
                        {userRole}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{filteredOpportunities.length}</p>
                <p className="text-sm text-muted-foreground">Total Opportunities</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{highPriorityCount}</p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Badge className="bg-success text-success-foreground">NEW</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{newOpportunitiesCount}</p>
                <p className="text-sm text-muted-foreground">New This Week</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{urgentCount}</p>
                <p className="text-sm text-muted-foreground">Due Within 14 Days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Opportunities</TabsTrigger>
            <TabsTrigger value="high-priority">High Priority</TabsTrigger>
            <TabsTrigger value="new">New This Week</TabsTrigger>
            <TabsTrigger value="urgent">Urgent</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <OpportunityFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedServiceTags={selectedServiceTags}
              onServiceTagToggle={handleServiceTagToggle}
              selectedPriority={selectedPriority}
              onPriorityChange={setSelectedPriority}
              selectedContractType={selectedContractType}
              onContractTypeChange={setSelectedContractType}
              onClearFilters={handleClearFilters}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onViewDetails={setSelectedOpportunity}
                />
              ))}
            </div>

            {filteredOpportunities.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
                <p className="text-muted-foreground mb-4">
                  {opportunities.length === 0 
                    ? "No opportunities in the database yet. Start by adding opportunities through the backend."
                    : "Try adjusting your filters to see more results"}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="high-priority" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredOpportunities.filter(o => o.priority === 'high').map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onViewDetails={setSelectedOpportunity}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredOpportunities.filter(o => o.status === 'new').map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onViewDetails={setSelectedOpportunity}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="urgent" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredOpportunities.filter(o => {
                const daysUntilDue = Math.ceil(
                  (new Date(o.keyDates.proposalDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                return daysUntilDue <= 14;
              }).map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onViewDetails={setSelectedOpportunity}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Detail Dialog */}
      <OpportunityDetailDialog
        opportunity={selectedOpportunity}
        open={!!selectedOpportunity}
        onOpenChange={(open) => !open && setSelectedOpportunity(null)}
      />
    </div>
  );
};

export default Index;