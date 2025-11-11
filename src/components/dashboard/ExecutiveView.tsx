import { Opportunity } from '@/types/opportunity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface ExecutiveViewProps {
  opportunities: Opportunity[];
  onViewDetails: (opp: Opportunity) => void;
}

export const ExecutiveView = ({ opportunities, onViewDetails }: ExecutiveViewProps) => {
  // California opportunities
  const caOpportunities = opportunities.filter(opp => 
    opp.geography.state.toLowerCase().includes('california') || 
    opp.geography.state.toLowerCase() === 'ca'
  );
  
  const otherOpportunities = opportunities.filter(opp => 
    !opp.geography.state.toLowerCase().includes('california') && 
    opp.geography.state.toLowerCase() !== 'ca'
  );

  // Service tag breakdown
  const serviceTagCounts = opportunities.reduce((acc, opp) => {
    opp.serviceTags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const serviceTagData = Object.entries(serviceTagCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Priority breakdown
  const priorityData = [
    { name: 'High', value: opportunities.filter(o => o.priority === 'high').length, color: 'hsl(var(--destructive))' },
    { name: 'Medium', value: opportunities.filter(o => o.priority === 'medium').length, color: 'hsl(var(--warning))' },
    { name: 'Low', value: opportunities.filter(o => o.priority === 'low').length, color: 'hsl(var(--muted))' }
  ];

  // Calculate total estimated value for CA opportunities
  const caEstimatedValue = caOpportunities.reduce((sum, opp) => {
    const value = opp.estimatedValue?.max || opp.estimatedValue?.min || 0;
    return sum + value;
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const OpportunityMiniCard = ({ opp }: { opp: Opportunity }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails(opp)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">{opp.title}</h4>
            <p className="text-xs text-muted-foreground">{opp.agency}</p>
          </div>
          <Badge variant={opp.priority === 'high' ? 'destructive' : opp.priority === 'medium' ? 'default' : 'secondary'} className="shrink-0">
            {opp.priority}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {opp.serviceTags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{opp.geography.county || opp.geography.state}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(opp.keyDates.proposalDue).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Executive Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">California Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{caOpportunities.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((caOpportunities.length / opportunities.length) * 100).toFixed(0)}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CA Est. Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatCurrency(caEstimatedValue / 1000000)}M</div>
            <p className="text-xs text-muted-foreground mt-1">Total pipeline value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Priority CA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {caOpportunities.filter(o => o.priority === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Require immediate action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Other States</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{otherOpportunities.length}</div>
            <p className="text-xs text-muted-foreground mt-1">National opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* California Opportunities Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              California Opportunities
            </CardTitle>
            <Badge variant="default" className="text-sm">{caOpportunities.length} Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {caOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caOpportunities.slice(0, 6).map(opp => (
                <OpportunityMiniCard key={opp.id} opp={opp} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No California opportunities found
            </div>
          )}
          {caOpportunities.length > 6 && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm">
                View All {caOpportunities.length} CA Opportunities
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Tag Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceTagData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* National Opportunities (if any) */}
      {otherOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                Other State Opportunities
              </CardTitle>
              <Badge variant="secondary" className="text-sm">{otherOpportunities.length} Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherOpportunities.slice(0, 3).map(opp => (
                <OpportunityMiniCard key={opp.id} opp={opp} />
              ))}
            </div>
            {otherOpportunities.length > 3 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  View All {otherOpportunities.length} National Opportunities
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
