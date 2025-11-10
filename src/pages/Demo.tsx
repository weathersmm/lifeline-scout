import { useState } from 'react';
import { Opportunity, ServiceTag, Priority, ContractType } from '@/types/opportunity';
import { OpportunityCard } from '@/components/dashboard/OpportunityCard';
import { OpportunityFilters } from '@/components/dashboard/OpportunityFilters';
import { OpportunityDetailDialog } from '@/components/dashboard/OpportunityDetailDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, FileText, Eye } from 'lucide-react';
import { mockOpportunities } from '@/data/mockOpportunities';
import { Link } from 'react-router-dom';

const Demo = () => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceTags, setSelectedServiceTags] = useState<ServiceTag[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'all'>('all');
  const [selectedContractType, setSelectedContractType] = useState<ContractType | 'all'>('all');
  
  const opportunities = mockOpportunities;

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

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Banner */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Demo Mode - Viewing Sample Data</span>
            </div>
            <Link to="/auth">
              <Button variant="secondary" size="sm">
                Sign In for Full Access
              </Button>
            </Link>
          </div>
        </div>
      </div>

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
                  Try adjusting your filters to see more results
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

export default Demo;
