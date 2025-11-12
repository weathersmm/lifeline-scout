import { Opportunity } from '@/types/opportunity';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, MapPin, DollarSign, ExternalLink, Clock, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onViewDetails: (opportunity: Opportunity) => void;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  showCompareCheckbox?: boolean;
}

const priorityColors = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-muted text-muted-foreground'
};

const contractTypeColors = {
  'RFP': 'bg-primary/10 text-primary border-primary/20',
  'RFQ': 'bg-info/10 text-info border-info/20',
  'RFI': 'bg-success/10 text-success border-success/20',
  'Sources Sought': 'bg-warning/10 text-warning border-warning/20',
  'Pre-solicitation': 'bg-muted text-muted-foreground border-muted',
  'Sole-Source Notice': 'bg-secondary text-secondary-foreground border-secondary'
};

export const OpportunityCard = ({ 
  opportunity, 
  onViewDetails,
  isSelected = false,
  onSelectionChange,
  showCompareCheckbox = false
}: OpportunityCardProps) => {
  const daysUntilDue = Math.ceil(
    (new Date(opportunity.keyDates.proposalDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const isUrgent = daysUntilDue <= 14 && daysUntilDue >= 0;
  const isPastDue = daysUntilDue < 0;

  // Determine badge styling based on days remaining
  const getDaysRemainingBadge = () => {
    if (isPastDue) {
      return {
        className: "bg-muted/50 text-muted-foreground border-muted",
        text: `${Math.abs(daysUntilDue)}d overdue`
      };
    } else if (isUrgent) {
      return {
        className: "bg-destructive/10 text-destructive border-destructive/20",
        text: `${daysUntilDue}d left`
      };
    } else if (daysUntilDue <= 30) {
      return {
        className: "bg-warning/10 text-warning border-warning/20",
        text: `${daysUntilDue}d left`
      };
    } else {
      return {
        className: "bg-success/10 text-success border-success/20",
        text: `${daysUntilDue}d left`
      };
    }
  };

  const daysRemainingBadge = getDaysRemainingBadge();

  return (
    <Card className={`p-6 hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          {showCompareCheckbox && onSelectionChange && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              className="mt-1"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={priorityColors[opportunity.priority]}>
                {opportunity.priority.toUpperCase()}
              </Badge>
              <Badge variant="outline" className={contractTypeColors[opportunity.contractType]}>
                {opportunity.contractType}
              </Badge>
              <Badge variant="outline" className={daysRemainingBadge.className}>
                <Clock className="w-3 h-3 mr-1" />
                {daysRemainingBadge.text}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {opportunity.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {opportunity.agency}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {opportunity.geography.city || opportunity.geography.county || opportunity.geography.state}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(opportunity.link, '_blank')}
            className="shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {/* Service Tags */}
        <div className="flex flex-wrap gap-2">
          {opportunity.serviceTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {opportunity.summary}
        </p>

        {/* Key Info */}
        <div className="grid grid-cols-2 gap-4 py-3 border-t border-border">
          {opportunity.estimatedValue && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-success" />
              <div>
                <div className="text-muted-foreground text-xs">Est. Value</div>
                <div className="font-medium">
                  ${(opportunity.estimatedValue.min || 0).toLocaleString()} - 
                  ${(opportunity.estimatedValue.max || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <div>
              <div className="text-muted-foreground text-xs">Proposal Due</div>
              <div className="font-medium">
                {format(new Date(opportunity.keyDates.proposalDue), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Source: {opportunity.source}
          </span>
          <Button
            onClick={() => onViewDetails(opportunity)}
            size="sm"
          >
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
};
