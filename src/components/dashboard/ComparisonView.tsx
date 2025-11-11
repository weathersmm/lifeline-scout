import { Opportunity } from '@/types/opportunity';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Calendar, DollarSign, MapPin, Building2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface ComparisonViewProps {
  opportunities: Opportunity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (oppId: string) => void;
}

export const ComparisonView = ({
  opportunities,
  open,
  onOpenChange,
  onRemove
}: ComparisonViewProps) => {
  if (opportunities.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Compare Opportunities ({opportunities.length})</DialogTitle>
          <DialogDescription>
            Side-by-side comparison of selected opportunities
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {opportunities.map((opp) => (
              <Card key={opp.id} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6"
                  onClick={() => onRemove(opp.id)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <CardHeader className="pb-3">
                  <CardTitle className="text-base line-clamp-2 pr-8">
                    {opp.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {opp.agency}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Priority Badge */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={
                      opp.priority === 'high' ? 'bg-destructive text-destructive-foreground' :
                      opp.priority === 'medium' ? 'bg-warning text-warning-foreground' :
                      'bg-muted text-muted-foreground'
                    }>
                      {opp.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{opp.contractType}</Badge>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {[
                        opp.geography.city,
                        opp.geography.county,
                        opp.geography.state
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>

                  {/* Estimated Value */}
                  {opp.estimatedValue && (
                    <div className="flex items-start gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        ${opp.estimatedValue.min?.toLocaleString()} - 
                        ${opp.estimatedValue.max?.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Due Date */}
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Proposal Due</div>
                      <div className="font-medium text-primary">
                        {format(new Date(opp.keyDates.proposalDue), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>

                  {/* Service Tags */}
                  <div className="flex flex-wrap gap-1">
                    {opp.serviceTags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {opp.serviceTags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{opp.serviceTags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {opp.summary}
                  </p>

                  {/* Link */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(opp.link, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};