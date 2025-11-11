import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowRight, Calendar, DollarSign, FileText, MapPin, Tag, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OpportunityChange {
  id: string;
  opportunity_id: string;
  changed_by: string | null;
  changed_at: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_type: string;
}

interface OpportunityChangeHistoryProps {
  opportunityId: string;
}

const fieldDisplayNames: Record<string, string> = {
  proposal_due: "Proposal Due Date",
  estimated_value_min: "Minimum Estimated Value",
  estimated_value_max: "Maximum Estimated Value",
  title: "Title",
  summary: "Description",
  status: "Status",
  priority: "Priority",
  agency: "Agency",
  geography_state: "State",
  geography_county: "County",
  created: "Created",
  deleted: "Deleted",
};

const getFieldIcon = (fieldName: string) => {
  switch (fieldName) {
    case "proposal_due":
      return <Calendar className="h-4 w-4" />;
    case "estimated_value_min":
    case "estimated_value_max":
      return <DollarSign className="h-4 w-4" />;
    case "title":
    case "summary":
      return <FileText className="h-4 w-4" />;
    case "status":
    case "priority":
      return <TrendingUp className="h-4 w-4" />;
    case "geography_state":
    case "geography_county":
      return <MapPin className="h-4 w-4" />;
    default:
      return <Tag className="h-4 w-4" />;
  }
};

const formatValue = (fieldName: string, value: string | null): string => {
  if (!value) return "Not set";
  
  if (fieldName.includes("estimated_value")) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(num);
    }
  }
  
  if (fieldName === "proposal_due") {
    try {
      return new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return value;
    }
  }
  
  return value;
};

export function OpportunityChangeHistory({ opportunityId }: OpportunityChangeHistoryProps) {
  const [changes, setChanges] = useState<OpportunityChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChanges();
  }, [opportunityId]);

  const fetchChanges = async () => {
    try {
      const { data, error } = await supabase
        .from("opportunity_changes")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      setChanges(data || []);
    } catch (error) {
      console.error("Error fetching opportunity changes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No change history available for this opportunity yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {changes.map((change, index) => (
          <Card key={change.id} className="relative">
            {index < changes.length - 1 && (
              <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-border -mb-4" />
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {getFieldIcon(change.field_name)}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base font-medium">
                    {fieldDisplayNames[change.field_name] || change.field_name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {formatDistanceToNow(new Date(change.changed_at), { addSuffix: true })}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    change.change_type === "created"
                      ? "default"
                      : change.change_type === "deleted"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {change.change_type}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              {change.change_type === "updated" && (
                <div className="flex items-center gap-4">
                  <div className="flex-1 rounded-lg bg-destructive/10 p-3 border border-destructive/20">
                    <p className="text-xs text-muted-foreground mb-1">Previous</p>
                    <p className="text-sm font-medium line-through text-muted-foreground">
                      {formatValue(change.field_name, change.old_value)}
                    </p>
                  </div>
                  
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 rounded-lg bg-primary/10 p-3 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Current</p>
                    <p className="text-sm font-medium text-primary">
                      {formatValue(change.field_name, change.new_value)}
                    </p>
                  </div>
                </div>
              )}

              {change.change_type === "created" && (
                <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    {change.new_value}
                  </p>
                </div>
              )}

              {change.change_type === "deleted" && (
                <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20">
                  <p className="text-sm text-muted-foreground">
                    {change.old_value}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}