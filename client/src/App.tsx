import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import Dashboard from "@/pages/Dashboard";
import VehicleDetails from "@/pages/VehicleDetails";
import Vehicles from "@/pages/Vehicles";
import Reports from "@/pages/Reports";
import Notes from "@/pages/Notes";
import Checklists from "@/pages/Checklists";
import Settings from "@/pages/Settings";
import FirstTimeSetup from "@/pages/FirstTimeSetup";
import NotFound from "@/pages/not-found";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { useCurrentCompany } from "@/hooks/use-company";
import { useLocation } from "wouter";

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
      <Route path="/configuracoes" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

function AppContent() {
  const [location, setLocation] = useLocation();
  const { hasCompany, isLoading } = useCurrentCompany();
  const { logoUrl, companyName } = useTheme();

  useEffect(() => {
    if (!isLoading && !hasCompany && location !== "/setup") {
      setLocation("/setup");
    }
  }, [hasCompany, isLoading, location, setLocation]);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

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
              <img 
                src={logoUrl || "/autoflow-logo.png"} 
                alt={companyName} 
                className="h-8 w-auto object-contain"
              />
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
  const { settings } = useSettings();
  
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
