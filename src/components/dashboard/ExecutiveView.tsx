import { Opportunity } from '@/types/opportunity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, TrendingUp, Calendar, DollarSign, Clock, Trophy, Flame, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, differenceInDays } from 'date-fns';

interface ExecutiveViewProps {
  opportunities: Opportunity[];
  onViewDetails: (opp: Opportunity) => void;
}

export const ExecutiveView = ({ opportunities, onViewDetails }: ExecutiveViewProps) => {
  // Deduplicate opportunities by ID
  const uniqueOpportunities = Array.from(
    new Map(opportunities.map(opp => [opp.id, opp])).values()
  );

  // California opportunities
  const caOpportunities = uniqueOpportunities.filter(opp => 
    opp.geography.state.toLowerCase().includes('california') || 
    opp.geography.state.toLowerCase() === 'ca'
  );
  
  const otherOpportunities = uniqueOpportunities.filter(opp => 
    !opp.geography.state.toLowerCase().includes('california') && 
    opp.geography.state.toLowerCase() !== 'ca'
  );

  // Major sporting events opportunities
  const majorEventsOpportunities = uniqueOpportunities.filter(opp => 
    opp.serviceTags.some(tag => 
      ['LA28 Olympics', 'Paralympics', 'FIFA World Cup', 'Soccer/Football'].includes(tag)
    )
  );

  // Service tag breakdown
  const serviceTagCounts = uniqueOpportunities.reduce((acc, opp) => {
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
    { name: 'High', value: uniqueOpportunities.filter(o => o.priority === 'high').length, color: 'hsl(var(--destructive))' },
    { name: 'Medium', value: uniqueOpportunities.filter(o => o.priority === 'medium').length, color: 'hsl(var(--warning))' },
    { name: 'Low', value: uniqueOpportunities.filter(o => o.priority === 'low').length, color: 'hsl(var(--muted))' }
  ];

  // County breakdown for California opportunities
  const countyBreakdown = caOpportunities.reduce((acc, opp) => {
    const county = opp.geography.county || 'Unknown';
    acc[county] = (acc[county] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countyData = Object.entries(countyBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 counties

  // HOT Opportunities - time-sensitive, high-value opportunities with deadlines in next 30 days
  const hotOpportunities = uniqueOpportunities
    .filter(opp => {
      const daysUntil = differenceInDays(new Date(opp.keyDates.proposalDue), new Date());
      const hasHighValue = (opp.estimatedValue?.max || opp.estimatedValue?.min || 0) >= 1000000;
      const isHighPriority = opp.priority === 'high';
      return daysUntil <= 30 && daysUntil >= 0 && (hasHighValue || isHighPriority);
    })
    .sort((a, b) => new Date(a.keyDates.proposalDue).getTime() - new Date(b.keyDates.proposalDue).getTime());

  // High-priority CA opportunities timeline
  const highPriorityCAOpps = caOpportunities
    .filter(opp => opp.priority === 'high')
    .sort((a, b) => new Date(a.keyDates.proposalDue).getTime() - new Date(b.keyDates.proposalDue).getTime());

  const getUrgencyColor = (dueDate: string) => {
    const daysUntil = differenceInDays(new Date(dueDate), new Date());
    if (daysUntil <= 7) return 'hsl(var(--destructive))';
    if (daysUntil <= 14) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  const getUrgencyBadge = (daysUntil: number) => {
    if (daysUntil <= 7) return { variant: 'destructive' as const, label: `${daysUntil}d`, icon: AlertTriangle };
    if (daysUntil <= 14) return { variant: 'default' as const, label: `${daysUntil}d`, icon: Clock };
    return { variant: 'secondary' as const, label: `${daysUntil}d`, icon: Calendar };
  };

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

  const HotOpportunityCard = ({ opp }: { opp: Opportunity }) => {
    const daysUntil = differenceInDays(new Date(opp.keyDates.proposalDue), new Date());
    const badge = getUrgencyBadge(daysUntil);
    const IconComponent = badge.icon;
    
    return (
      <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-destructive/30 bg-gradient-to-br from-destructive/5 to-warning/5" onClick={() => onViewDetails(opp)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={badge.variant} className="font-bold flex items-center gap-1">
                  <IconComponent className="w-3 h-3" />
                  {badge.label}
                </Badge>
                <Badge variant={opp.priority === 'high' ? 'destructive' : 'default'} className="text-xs">
                  {opp.priority}
                </Badge>
              </div>
              <h4 className="font-bold text-foreground text-base mb-1 line-clamp-2">{opp.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">{opp.agency}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {opp.geography.city ? `${opp.geography.city}, ` : ''}{opp.geography.state}
              </div>
            </div>
          </div>
          
          <div className="space-y-2 pt-3 border-t border-border">
            {opp.estimatedValue && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">
                  {formatCurrency(opp.estimatedValue.min || opp.estimatedValue.max || 0)}
                  {opp.estimatedValue.min && opp.estimatedValue.max && ' - ' + formatCurrency(opp.estimatedValue.max)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-semibold text-destructive">
                Due: {format(new Date(opp.keyDates.proposalDue), 'MMM d, yyyy')}
              </span>
            </div>
            {opp.serviceTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {opp.serviceTags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
      {/* HOT Opportunities Section */}
      {hotOpportunities.length > 0 && (
        <Card className="p-6 border-2 border-destructive bg-gradient-to-r from-red-50/80 to-orange-50/80 dark:from-red-950/30 dark:to-orange-950/30 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Flame className="h-7 w-7 text-destructive animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                🔥 HOT Opportunities
                <Badge variant="destructive" className="text-sm font-bold">
                  {hotOpportunities.length} Urgent
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                High-value opportunities with deadlines in the next 30 days
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotOpportunities.slice(0, 6).map((opp) => (
              <HotOpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>
          {hotOpportunities.length > 6 && (
            <div className="mt-4 text-center">
              <Button variant="destructive" size="sm" className="font-semibold">
                View All {hotOpportunities.length} HOT Opportunities
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* LA28 Olympics & Major Events Section */}
      {majorEventsOpportunities.length > 0 && (
        <Card className="p-6 border-2 border-amber-500/50 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl font-bold text-foreground">LA28 Olympics & Major Sporting Events</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Opportunities related to LA28 Olympic & Paralympic Games, FIFA World Cup, and major sporting events including Games Transportation Program Integrator (GTPI) and event medical services
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {majorEventsOpportunities.slice(0, 6).map((opp) => (
              <OpportunityMiniCard key={opp.id} opp={opp} />
            ))}
          </div>
          {majorEventsOpportunities.length > 6 && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm">
                View All {majorEventsOpportunities.length} Major Event Opportunities
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Executive Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">California Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{caOpportunities.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {uniqueOpportunities.length > 0 ? ((caOpportunities.length / uniqueOpportunities.length) * 100).toFixed(0) : 0}% of total
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

      {/* County Breakdown Chart */}
      {countyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              California County Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={countyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  width={120}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Showing top 10 counties by opportunity count
            </p>
          </CardContent>
        </Card>
      )}

      {/* High-Priority CA Timeline */}
      {highPriorityCAOpps.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-destructive" />
                High-Priority CA Timeline
              </CardTitle>
              <Badge variant="destructive" className="text-sm">
                {highPriorityCAOpps.length} Urgent
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {highPriorityCAOpps.map((opp) => {
                const dueDate = new Date(opp.keyDates.proposalDue);
                const daysUntil = differenceInDays(dueDate, new Date());
                const urgencyColor = getUrgencyColor(opp.keyDates.proposalDue);
                
                return (
                  <div 
                    key={opp.id}
                    className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onViewDetails(opp)}
                  >
                    <div className="flex flex-col items-center justify-center min-w-[80px] p-3 rounded-lg" style={{ backgroundColor: `${urgencyColor}15` }}>
                      <div className="text-2xl font-bold" style={{ color: urgencyColor }}>
                        {format(dueDate, 'MMM')}
                      </div>
                      <div className="text-3xl font-bold" style={{ color: urgencyColor }}>
                        {format(dueDate, 'd')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {daysUntil <= 0 ? 'DUE' : `${daysUntil}d`}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground mb-1 line-clamp-1">
                        {opp.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {opp.agency} • {opp.geography.county}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {opp.serviceTags.slice(0, 4).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {opp.estimatedValue && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(opp.estimatedValue.max || opp.estimatedValue.min || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Est. Value</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {highPriorityCAOpps.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No high-priority California opportunities with upcoming due dates
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
