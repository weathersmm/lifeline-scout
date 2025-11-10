import { Opportunity } from '@/types/opportunity';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, DollarSign, ExternalLink, Clock, Building2, X } from 'lucide-react';
import { format } from 'date-fns';

interface ComparisonViewProps {
  opportunities: Opportunity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (id: string) => void;
}

const priorityColors = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-muted text-muted-foreground'
};

export const ComparisonView = ({ opportunities, open, onOpenChange, onRemove }: ComparisonViewProps) => {
  if (opportunities.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Compare Opportunities ({opportunities.length})</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-x-auto">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${opportunities.length}, minmax(300px, 1fr))` }}>
            {opportunities.map((opp) => {
              const daysUntilDue = Math.ceil(
                (new Date(opp.keyDates.proposalDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <Card key={opp.id} className="p-4 relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => onRemove(opp.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <div className="space-y-4 mt-6">
                    {/* Priority & Contract Type */}
                    <div className="flex flex-wrap gap-2">
                      <Badge className={priorityColors[opp.priority]}>
                        {opp.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {opp.contractType}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-sm line-clamp-2">
                      {opp.title}
                    </h3>

                    {/* Agency */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      <span className="line-clamp-1">{opp.agency}</span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{opp.geography.city || opp.geography.county || opp.geography.state}</span>
                    </div>

                    {/* Service Tags */}
                    <div className="flex flex-wrap gap-1">
                      {opp.serviceTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Estimated Value */}
                    {opp.estimatedValue && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Est. Value
                        </div>
                        <div className="text-sm font-medium">
                          ${(opp.estimatedValue.min || 0).toLocaleString()} - 
                          ${(opp.estimatedValue.max || 0).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Proposal Due */}
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Proposal Due
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">
                          {format(new Date(opp.keyDates.proposalDue), 'MMM d, yyyy')}
                        </div>
                        {daysUntilDue <= 14 && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {daysUntilDue}d
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Term Length */}
                    {opp.termLength && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Term Length</div>
                        <div className="text-sm">{opp.termLength}</div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Summary</div>
                      <p className="text-xs line-clamp-3">{opp.summary}</p>
                    </div>

                    {/* Recommended Action */}
                    {opp.recommendedAction && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Recommended Action</div>
                        <p className="text-xs line-clamp-2">{opp.recommendedAction}</p>
                      </div>
                    )}

                    {/* Link */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(opp.link, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      View Source
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};