import { LayoutDashboard, BarChart3, Shield, Bell, Upload, Settings, LogOut, User, Eye, Flame } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, effectiveRole, previewRole, signOut, isAdmin } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const mainItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  ];

  if (isAdmin) {
    mainItems.push({ title: 'Admin', url: '/admin', icon: Shield });
  }

  const isActive = (path: string) => currentPath === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border p-4">
        {!collapsed ? (
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              PipeLine Scout
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              EMS BD Intelligence
            </p>
          </div>
        ) : (
          <Flame className="w-6 h-6 text-primary mx-auto" />
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className={collapsed ? "mx-auto" : "mr-2 h-4 w-4"} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={collapsed ? "w-full px-2" : "w-full justify-start gap-2"}>
              <User className={collapsed ? "h-4 w-4 mx-auto" : "h-4 w-4"} />
              {!collapsed && (
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-xs font-medium truncate w-full">{user?.email}</span>
                  <Badge variant="secondary" className="text-xs mt-0.5">
                    {effectiveRole}
                  </Badge>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{user?.email}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-fit text-xs">
                    {effectiveRole}
                  </Badge>
                  {previewRole && (
                    <Badge variant="outline" className="w-fit text-xs">
                      Preview Mode
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
