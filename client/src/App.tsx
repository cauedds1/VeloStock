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
import NotFound from "@/pages/not-found";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";

function Router() {
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

export default function App() {
  const { settings } = useSettings();
  
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-1 flex-col">
              <header className="flex h-14 items-center justify-between border-b border-border px-4">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-3">
                  <NotificationCenter />
                  <img 
                    src="/logo.png" 
                    alt="Capoeiras Automóveis" 
                    className="h-8 w-auto object-contain"
                    style={{ mixBlendMode: 'screen' }}
                  />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
