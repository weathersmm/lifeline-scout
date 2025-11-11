import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Eye, ShieldCheck, Users, UserCheck } from "lucide-react";

interface RoleSwitcherProps {
  currentRole: string | null;
  previewRole: string | null;
  onRoleChange: (role: string | null) => void;
}

export function RoleSwitcher({ currentRole, previewRole, onRoleChange }: RoleSwitcherProps) {
  const isPreviewActive = previewRole !== null;
  const displayRole = previewRole || currentRole;

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="h-4 w-4" />;
      case "member":
        return <Users className="h-4 w-4" />;
      case "viewer":
        return <UserCheck className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string | null): "destructive" | "default" | "secondary" => {
    switch (role) {
      case "admin":
        return "destructive";
      case "member":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={isPreviewActive ? "default" : "outline"} 
          size="sm" 
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          {isPreviewActive ? "Previewing" : "View As"}
          <Badge variant={getRoleBadgeVariant(displayRole)} className="text-xs">
            {displayRole}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Preview As Role</span>
            <span className="text-xs text-muted-foreground">
              Your actual role: <Badge variant="outline" className="text-xs">{currentRole}</Badge>
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onRoleChange("admin")}
          className="gap-2"
        >
          <ShieldCheck className="h-4 w-4 text-destructive" />
          <span>Admin</span>
          {displayRole === "admin" && !previewRole && (
            <Badge variant="outline" className="ml-auto text-xs">Current</Badge>
          )}
          {previewRole === "admin" && (
            <Badge variant="default" className="ml-auto text-xs">Active</Badge>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onRoleChange("member")}
          className="gap-2"
        >
          <Users className="h-4 w-4 text-primary" />
          <span>Member</span>
          {displayRole === "member" && !previewRole && (
            <Badge variant="outline" className="ml-auto text-xs">Current</Badge>
          )}
          {previewRole === "member" && (
            <Badge variant="default" className="ml-auto text-xs">Active</Badge>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onRoleChange("viewer")}
          className="gap-2"
        >
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <span>Viewer</span>
          {displayRole === "viewer" && !previewRole && (
            <Badge variant="outline" className="ml-auto text-xs">Current</Badge>
          )}
          {previewRole === "viewer" && (
            <Badge variant="default" className="ml-auto text-xs">Active</Badge>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onRoleChange(null)}
          disabled={!isPreviewActive}
          className="gap-2 text-muted-foreground"
        >
          <Eye className="h-4 w-4" />
          <span>Reset to Actual Role</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
