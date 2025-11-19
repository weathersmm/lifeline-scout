import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Filter, CheckSquare, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type SensitivityLevel = "public" | "internal" | "restricted";
type TableType = "opportunities" | "competitive_assessments" | "ptw_analyses" | "go_no_go_evaluations" | "win_loss_history" | "competitor_intelligence";

interface ClassifiableRecord {
  id: string;
  title?: string;
  competitor_name?: string;
  opportunity_id?: string;
  created_at: string;
  sensitivity_level: SensitivityLevel;
  agency?: string;
  estimated_value_min?: number;
  estimated_value_max?: number;
}

export function BulkSensitivityClassifier() {
  const [tableType, setTableType] = useState<TableType>("opportunities");
  const [records, setRecords] = useState<ClassifiableRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [currentSensitivity, setCurrentSensitivity] = useState<SensitivityLevel | "all">("all");
  
  // Target classification
  const [targetSensitivity, setTargetSensitivity] = useState<SensitivityLevel>("internal");

  useEffect(() => {
    loadRecords();
  }, [tableType]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setSelectedIds(new Set());
      
      let query = supabase.from(tableType).select("*");
      
      // Apply filters
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo);
      }
      if (currentSensitivity !== "all") {
        query = query.eq("sensitivity_level", currentSensitivity);
      }
      
      // Table-specific filters
      if (tableType === "opportunities") {
        if (agencyFilter) {
          query = query.ilike("agency", `%${agencyFilter}%`);
        }
        if (minValue) {
          query = query.gte("estimated_value_min", parseFloat(minValue));
        }
        if (maxValue) {
          query = query.lte("estimated_value_max", parseFloat(maxValue));
        }
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      console.error("Error loading records:", error);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map(r => r.id)));
    }
  };

  const handleSelectRecord = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one record");
      return;
    }

    try {
      setUpdating(true);
      const updates = Array.from(selectedIds).map(id =>
        supabase
          .from(tableType)
          .update({ sensitivity_level: targetSensitivity })
          .eq("id", id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} records`);
      }

      toast.success(`Successfully reclassified ${selectedIds.size} records as ${targetSensitivity}`);
      setSelectedIds(new Set());
      loadRecords();
    } catch (error: any) {
      console.error("Error bulk updating:", error);
      toast.error(error.message || "Failed to update records");
    } finally {
      setUpdating(false);
    }
  };

  const getSensitivityBadge = (level: SensitivityLevel) => {
    switch (level) {
      case "public":
        return <Badge variant="outline">Public</Badge>;
      case "internal":
        return <Badge variant="secondary">Internal</Badge>;
      case "restricted":
        return <Badge variant="destructive">Restricted</Badge>;
    }
  };

  const getRecordTitle = (record: ClassifiableRecord) => {
    if (record.title) return record.title;
    if (record.competitor_name) return record.competitor_name;
    return `Record ${record.id.substring(0, 8)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Bulk Sensitivity Classification
        </CardTitle>
        <CardDescription>
          Reclassify multiple records at once based on filters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Table Type Selection */}
        <div className="space-y-2">
          <Label>Data Type</Label>
          <Select value={tableType} onValueChange={(v) => setTableType(v as TableType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opportunities">Opportunities</SelectItem>
              <SelectItem value="competitive_assessments">Competitive Assessments</SelectItem>
              <SelectItem value="ptw_analyses">Price-to-Win Analyses</SelectItem>
              <SelectItem value="go_no_go_evaluations">Go/No-Go Evaluations</SelectItem>
              <SelectItem value="win_loss_history">Win/Loss History</SelectItem>
              <SelectItem value="competitor_intelligence">Competitor Intelligence</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filters */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-medium">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Current Sensitivity</Label>
              <Select value={currentSensitivity} onValueChange={(v) => setCurrentSensitivity(v as SensitivityLevel | "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {tableType === "opportunities" && (
              <>
                <div className="space-y-2">
                  <Label>Agency</Label>
                  <Input
                    placeholder="Search agency..."
                    value={agencyFilter}
                    onChange={(e) => setAgencyFilter(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Min Value ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Value ($)</Label>
                  <Input
                    type="number"
                    placeholder="1000000"
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          
          <Button onClick={loadRecords} disabled={loading} variant="secondary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
            Apply Filters
          </Button>
        </div>

        {/* Bulk Action Controls */}
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <h3 className="font-medium">Bulk Classification</h3>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label>Set Sensitivity Level</Label>
              <Select value={targetSensitivity} onValueChange={(v) => setTargetSensitivity(v as SensitivityLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                onClick={handleBulkUpdate}
                disabled={selectedIds.size === 0 || updating}
                className="w-full"
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Update {selectedIds.size} Selected
              </Button>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === records.length && records.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                {tableType === "opportunities" && <TableHead>Agency</TableHead>}
                <TableHead>Current Level</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading records...</p>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No records found matching filters
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={() => handleSelectRecord(record.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {getRecordTitle(record)}
                    </TableCell>
                    {tableType === "opportunities" && (
                      <TableCell className="text-sm text-muted-foreground">
                        {record.agency || "-"}
                      </TableCell>
                    )}
                    <TableCell>
                      {getSensitivityBadge(record.sensitivity_level)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(record.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {selectedIds.size > 0 && (
              <span className="font-medium text-foreground">
                {selectedIds.size} of {records.length} selected
              </span>
            )}
          </div>
          <div>Total: {records.length} records</div>
        </div>
      </CardContent>
    </Card>
  );
}
