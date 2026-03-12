import { Switch, Route, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/lib/theme";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Workouts from "@/pages/workouts";
import WorkoutDetail from "@/pages/workout-detail";
import Nutrition from "@/pages/nutrition";
import Metrics from "@/pages/metrics";
import Goals from "@/pages/goals";
import Analytics from "@/pages/analytics";
import Profile from "@/pages/profile";
import Leaderboard from "@/pages/leaderboard";
import WeeklyPlan from "@/pages/weekly-plan";
import PersonalRecords from "@/pages/personal-records";
import Premium from "@/pages/premium";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useUser } from "@/hooks/use-auth";
import { Activity } from "lucide-react";

// Google Analytics page tracking for SPA
function useGAPageTracking() {
  const [location] = useLocation();
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("config", "G-70FETQ4VR8", {
        page_path: location,
      });
    }
  }, [location]);
}

function ProtectedRoute({ component: Component }: { component: any }) {
  const { data: user, isLoading } = useUser();
  if (isLoading) return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <Activity className="w-10 h-10 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Redirect to="/auth" />;
  return <Component />;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  useGAPageTracking();
  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem" } as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full relative min-w-0">
          <header className="flex md:hidden items-center gap-3 p-4 border-b border-border bg-card sticky top-0 z-40 shadow-sm">
            <SidebarTrigger className="text-foreground hover:bg-muted" />
            <span className="font-bold text-primary text-lg tracking-tight">FitSync</span>
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { data: user, isLoading } = useUser();
  if (isLoading) return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <Activity className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <Switch>
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/auth" component={AuthPage} />

      <Route path="/dashboard"><MainLayout><ProtectedRoute component={Dashboard} /></MainLayout></Route>
      <Route path="/workouts"><MainLayout><ProtectedRoute component={Workouts} /></MainLayout></Route>
      <Route path="/workouts/:id"><MainLayout><ProtectedRoute component={WorkoutDetail} /></MainLayout></Route>
      <Route path="/nutrition"><MainLayout><ProtectedRoute component={Nutrition} /></MainLayout></Route>
      <Route path="/metrics"><MainLayout><ProtectedRoute component={Metrics} /></MainLayout></Route>
      <Route path="/analytics"><MainLayout><ProtectedRoute component={Analytics} /></MainLayout></Route>
      <Route path="/goals"><MainLayout><ProtectedRoute component={Goals} /></MainLayout></Route>
      <Route path="/profile"><MainLayout><ProtectedRoute component={Profile} /></MainLayout></Route>
      <Route path="/leaderboard"><MainLayout><ProtectedRoute component={Leaderboard} /></MainLayout></Route>
      <Route path="/weekly-plan"><MainLayout><ProtectedRoute component={WeeklyPlan} /></MainLayout></Route>
      <Route path="/personal-records"><MainLayout><ProtectedRoute component={PersonalRecords} /></MainLayout></Route>
      <Route path="/premium"><MainLayout><ProtectedRoute component={Premium} /></MainLayout></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
