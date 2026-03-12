import { Link, useLocation } from "wouter";
import {
  Activity, LayoutDashboard, Dumbbell, Apple, LineChart,
  BarChart3, Target, User as UserIcon, Trophy, CalendarDays, Medal, Sun, Moon, Crown,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { useUser } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme";

const NAV_MAIN = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Workouts", url: "/workouts", icon: Dumbbell },
  { title: "Nutrition", url: "/nutrition", icon: Apple },
  { title: "Metrics", url: "/metrics", icon: LineChart },
];

const NAV_TOOLS = [
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Weekly Plan", url: "/weekly-plan", icon: CalendarDays },
  { title: "PRs", url: "/personal-records", icon: Medal },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
];

function getLevelColor(level: number) {
  if (level >= 20) return "text-yellow-500";
  if (level >= 10) return "text-purple-500";
  if (level >= 5) return "text-blue-500";
  return "text-primary";
}

function getLevelTitle(level: number) {
  if (level >= 20) return "Elite Athlete";
  if (level >= 15) return "Advanced";
  if (level >= 10) return "Intermediate";
  if (level >= 5) return "Dedicated";
  return "Beginner";
}

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { theme, toggle } = useTheme();

  if (!user) return null;

  const isActive = (url: string) =>
    location === url || (url !== "/" && location.startsWith(`${url}/`));

  const xp = user.xp || 0;
  const level = user.level || 1;
  const xpIntoLevel = xp % 500;
  const xpPct = Math.min((xpIntoLevel / 500) * 100, 100);

  return (
    <Sidebar className="border-r border-border/40">
      <SidebarContent className="flex flex-col h-full overflow-y-auto">
        {/* Logo + Dark Mode */}
        <div className="p-4 pb-3 shrink-0 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">FitSync</span>
          </Link>
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
            title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        {/* XP / Level Bar */}
        <div className="mx-3 mb-3 p-3 rounded-xl bg-muted/30 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`text-lg font-black ${getLevelColor(level)}`}>Lv.{level}</span>
              <span className="text-xs text-muted-foreground font-medium">{getLevelTitle(level)}</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{xpIntoLevel}/{500} XP</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-1000"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground/70 mt-1.5 text-center">{xp} total XP</div>
        </div>

        {/* Main Nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-widest text-muted-foreground/60 font-bold px-3 mb-1">
            Tracking
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV_MAIN.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="py-2.5 px-3 rounded-xl font-medium transition-all">
                    <Link href={item.url} className="flex items-center gap-3" data-testid={`nav-${item.title.toLowerCase()}`}>
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools Nav */}
        <SidebarGroup className="mt-3">
          <SidebarGroupLabel className="text-xs uppercase tracking-widest text-muted-foreground/60 font-bold px-3 mb-1">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV_TOOLS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="py-2.5 px-3 rounded-xl font-medium transition-all">
                    <Link href={item.url} className="flex items-center gap-3" data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Premium CTA (for non-premium users) */}
        {!user.isPremium && (
          <div className="mx-3 mt-3">
            <Link href="/premium">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/15 to-orange-500/10 border border-yellow-500/25 cursor-pointer hover:border-yellow-500/40 transition-all group">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Upgrade to Premium</span>
                </div>
                <p className="text-xs text-muted-foreground">AI Food Scanner + Coaching</p>
                <div className="text-xs font-bold text-yellow-500 mt-1 group-hover:underline">€9.99/month →</div>
              </div>
            </Link>
          </div>
        )}

        <div className="flex-1" />

        {/* Profile Footer */}
        <SidebarFooter className="border-t border-border/40 p-3 shrink-0">
          <Link href="/profile">
            <div className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isActive("/profile") ? "bg-primary/10" : "hover:bg-muted/50"}`}>
              <Avatar className="w-9 h-9 border-2 border-primary/20 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">{user.name}</span>
                  {user.isPremium && (
                    <Badge className="text-[10px] px-1 py-0 h-4 bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                      <Crown className="w-2.5 h-2.5 mr-0.5" /> PRO
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              </div>
            </div>
          </Link>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
