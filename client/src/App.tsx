import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ModeToggle } from "@/components/ModeToggle";
import Dashboard from "@/pages/Dashboard";
import VehicleDetails from "@/pages/VehicleDetails";
import Vehicles from "@/pages/Vehicles";
import Reports from "@/pages/Reports";
import Notes from "@/pages/Notes";
import Checklists from "@/pages/Checklists";
import Settings from "@/pages/Settings";
import Users from "@/pages/Users";
import FirstTimeSetup from "@/pages/FirstTimeSetup";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/not-found";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { useCurrentCompany } from "@/hooks/use-company";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

function MainAppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/veiculos" component={Vehicles} />
      <Route path="/veiculo/:id" component={VehicleDetails} />
      <Route path="/vehicles/:id" component={VehicleDetails} />
      <Route path="/relatorios" component={Reports} />
      <Route path="/anotacoes" component={Notes} />
      <Route path="/checklists" component={Checklists} />
      <Route path="/usuarios" component={Users} />
      <Route path="/configuracoes" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { ThemeProvider } from "@/components/theme-provider";
import { CompanyThemeProvider, useCompanyTheme } from "@/components/CompanyThemeProvider";

function AppContent() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasCompany, isLoading: companyLoading } = useCurrentCompany();
  const { logoUrl, companyName } = useCompanyTheme();

  const isLoading = authLoading || companyLoading;

  // Redirect logic: not authenticated → landing, authenticated without company → setup
  useEffect(() => {
    if (!authLoading && isAuthenticated && !companyLoading && !hasCompany && location !== "/setup") {
      setLocation("/setup");
    }
  }, [hasCompany, isAuthenticated, authLoading, companyLoading, location, setLocation]);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Show login/signup pages without auth check
  if (location === "/login") {
    return <Login />;
  }
  if (location === "/signup") {
    return <Signup />;
  }

  // Show landing page if not authenticated or still loading auth
  if (authLoading || !isAuthenticated) {
    return <Landing />;
  }

  // Show onboarding if authenticated but no company setup
  if (location === "/setup") {
    return <FirstTimeSetup />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <ModeToggle />
              <img 
                src={logoUrl || "/velostock-logo.svg"} 
                alt={companyName} 
                className="h-10 w-auto object-contain"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
                className="text-muted-foreground hover:text-foreground"
              >
                Sair
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <MainAppRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="velo-theme">
        <CompanyThemeProvider>
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </CompanyThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
