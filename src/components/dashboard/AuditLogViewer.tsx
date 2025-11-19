import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, User, Database } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  user_id: string | null;
  table_name: string;
  record_id: string | null;
  action: string;
  accessed_at: string;
  user_role: string | null;
  ip_address: string | null;
  metadata: any;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("accessed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error loading audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const getSensitivityBadge = (tableName: string) => {
    const restrictedTables = [
      "ml_training_data",
      "ptw_analyses",
      "competitive_assessments",
      "go_no_go_evaluations",
      "win_loss_history",
      "competitor_intelligence"
    ];
    
    if (restrictedTables.includes(tableName)) {
      return <Badge variant="destructive">Restricted</Badge>;
    }
    return <Badge variant="secondary">Internal</Badge>;
  };

  const getRoleBadge = (role: string | null) => {
    if (role === "admin") return <Badge>Admin</Badge>;
    if (role === "member") return <Badge variant="secondary">Member</Badge>;
    return <Badge variant="outline">Viewer</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Logs
          </CardTitle>
          <CardDescription>Loading access logs...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Audit Logs
        </CardTitle>
        <CardDescription>
          Tracking access to sensitive pricing and competitive intelligence data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Sensitivity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {format(new Date(log.accessed_at), "MMM d, yyyy HH:mm:ss")}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {log.user_id?.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(log.user_role)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Database className="h-3 w-3" />
                        <span className="font-mono text-xs">{log.table_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getSensitivityBadge(log.table_name)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.metadata?.access_type || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div>Showing last 100 access logs</div>
          <div>Total: {logs.length}</div>
        </div>
      </CardContent>
    </Card>
  );
}
