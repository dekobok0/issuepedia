import { Home, Plus, User, Library, Award } from "lucide-react";
import { Link, useLocation } from "wouter";
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  {
    title: "Browse Prompts",
    url: "/",
    icon: Home,
    testId: "link-browse",
  },
  {
    title: "Create Prompt",
    url: "/create",
    icon: Plus,
    testId: "link-create",
  },
  {
    title: "Techniques",
    url: "/techniques",
    icon: Library,
    testId: "link-techniques",
  },
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: Award,
    testId: "link-leaderboard",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Library className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-app-name">
              Issuepedia
            </h2>
            <p className="text-xs text-muted-foreground">Prompt Engineering Hub</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link to={item.url} data-testid={item.testId}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        {user ? (
          <Link to="/profile" className="flex items-center gap-3 hover-elevate rounded-lg p-2" data-testid="link-profile">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImageUrl} />
              <AvatarFallback>
                {user.username?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate" data-testid="text-username">
                {user.username}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-reputation">
                {user.reputation || 0} points
              </p>
            </div>
          </Link>
        ) : (
          <a
            href="/api/login"
            className="flex items-center gap-2 hover-elevate rounded-lg p-2"
            data-testid="link-login"
          >
            <User className="h-4 w-4" />
            <span>Sign In</span>
          </a>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
