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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  MapPin,
  DollarSign,
  ExternalLink,
  Building2,
  FileText,
  Clock,
  Target,
  History,
  Upload,
  GitBranch
} from 'lucide-react';
import { format } from 'date-fns';
import { OpportunityChangeHistory } from './OpportunityChangeHistory';
import { OpportunityDocuments } from './OpportunityDocuments';
import { OpportunityLifecycle } from './OpportunityLifecycle';
import { OpportunityTasks } from './OpportunityTasks';
import { ProposalContentRepository } from './ProposalContentRepository';
import { useAuth } from '@/hooks/useAuth';

interface OpportunityDetailDialogProps {
  opportunity: Opportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export const OpportunityDetailDialog = ({
  opportunity,
  open,
  onOpenChange,
  onUpdate
}: OpportunityDetailDialogProps) => {
  const { effectiveRole } = useAuth();
  const canEdit = effectiveRole === 'admin' || effectiveRole === 'member';

  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{opportunity.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4" />
                {opportunity.agency}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(opportunity.link, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="documents">
              <Upload className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="lifecycle">
              <GitBranch className="w-4 h-4 mr-2" />
              Lifecycle
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <FileText className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="content">
              <Target className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={
                opportunity.priority === 'high' ? 'bg-destructive text-destructive-foreground' :
                opportunity.priority === 'medium' ? 'bg-warning text-warning-foreground' :
                'bg-muted text-muted-foreground'
              }>
                {opportunity.priority.toUpperCase()} PRIORITY
              </Badge>
              <Badge variant="outline">{opportunity.contractType}</Badge>
              <Badge variant="secondary">{opportunity.status}</Badge>
            </div>

            {/* Geography */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Location</h3>
                <p className="text-muted-foreground">
                  {[
                    opportunity.geography.city,
                    opportunity.geography.county,
                    opportunity.geography.state
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>

            {/* Service Tags */}
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Service Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {opportunity.serviceTags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {opportunity.summary}
                </p>
              </div>
            </div>

            <Separator />

            {/* Financial Details */}
            {opportunity.estimatedValue && (
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Estimated Value</h3>
                  <p className="text-muted-foreground">
                    ${opportunity.estimatedValue.min?.toLocaleString()} - 
                    ${opportunity.estimatedValue.max?.toLocaleString()}
                  </p>
                  {opportunity.termLength && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Term: {opportunity.termLength}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Key Dates */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-3">Key Dates</h3>
                <div className="space-y-2">
                  {opportunity.keyDates.issueDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Issue Date</span>
                      <span className="font-medium">
                        {format(new Date(opportunity.keyDates.issueDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {opportunity.keyDates.preBidMeeting && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pre-Bid Meeting</span>
                      <span className="font-medium">
                        {format(new Date(opportunity.keyDates.preBidMeeting), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {opportunity.keyDates.questionsDue && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Questions Due</span>
                      <span className="font-medium">
                        {format(new Date(opportunity.keyDates.questionsDue), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-foreground font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Proposal Due
                    </span>
                    <span className="font-semibold text-primary">
                      {format(new Date(opportunity.keyDates.proposalDue), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Action */}
            {opportunity.recommendedAction && (
              <>
                <Separator />
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-primary">Recommended Action</h3>
                  <p className="text-sm text-muted-foreground">
                    {opportunity.recommendedAction}
                  </p>
                </div>
              </>
            )}

            {/* Footer Info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
              <span>Source: {opportunity.source}</span>
              <span>ID: {opportunity.id}</span>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <OpportunityDocuments
              opportunityId={opportunity.id}
              documents={opportunity.documents || []}
              onDocumentsUpdate={() => onUpdate?.()}
              canEdit={canEdit}
            />
          </TabsContent>

          <TabsContent value="lifecycle" className="mt-4">
            <OpportunityLifecycle
              opportunityId={opportunity.id}
              currentStage={opportunity.lifecycleStage || 'identified'}
              lifecycleNotes={opportunity.lifecycleNotes}
              onUpdate={() => onUpdate?.()}
              canEdit={canEdit}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <OpportunityTasks
              opportunityId={opportunity.id}
              currentStage={opportunity.lifecycleStage || 'identified'}
              canEdit={canEdit}
            />
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <ProposalContentRepository
              currentStage={opportunity.lifecycleStage || 'identified'}
              opportunityId={opportunity.id}
              opportunity={opportunity}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <OpportunityChangeHistory opportunityId={opportunity.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
