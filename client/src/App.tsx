import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ModeToggle } from "@/components/ModeToggle";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import Dashboard from "@/pages/Dashboard";
import DriverDashboard from "@/pages/DriverDashboard";
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
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/not-found";
import Leads from "@/pages/Leads";
import Bills from "@/pages/Bills";
import AdminPanel from "@/pages/AdminPanel";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { useCurrentCompany } from "@/hooks/use-company";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/use-permissions";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BetaBanner } from "@/components/BetaBanner";

function MainAppRouter() {
  const { isMotorista, can } = usePermissions();
  
  return (
    <Switch>
      <Route path="/" component={isMotorista ? DriverDashboard : Dashboard} />
      <Route path="/veiculos" component={Vehicles} />
      <Route path="/veiculo/:id" component={VehicleDetails} />
      <Route path="/vehicles/:id" component={VehicleDetails} />
      <Route path="/relatorios">
        <ProtectedRoute requiredPermissions={["viewFinancialReports", "viewOperationalReports"]}>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/anotacoes" component={Notes} />
      <Route path="/checklists" component={Checklists} />
      <Route path="/leads">
        <ProtectedRoute requiredPermission="viewLeads">
          <Leads />
        </ProtectedRoute>
      </Route>
      <Route path="/contas">
        <ProtectedRoute requiredPermission="viewBills">
          <Bills />
        </ProtectedRoute>
      </Route>
      <Route path="/usuarios">
        <ProtectedRoute requiredPermission="manageUsers">
          <Users />
        </ProtectedRoute>
      </Route>
      <Route path="/configuracoes">
        <ProtectedRoute requiredPermission="companySettings">
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/admin" component={AdminPanel} />
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

  // Show admin panel without sidebar (independent interface with its own auth)
  if (location.startsWith("/admin")) {
    return <AdminPanel />;
  }

  // Show login/signup/password recovery pages without auth check
  if (location === "/login") {
    return <Login />;
  }
  if (location === "/signup") {
    return <Signup />;
  }
  if (location === "/forgot-password") {
    return <ForgotPassword />;
  }
  if (location === "/reset-password") {
    return <ResetPassword />;
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
    <>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <header className="flex h-14 items-center justify-between border-b border-border px-2 sm:px-4 gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-1 sm:gap-3 flex-wrap justify-end">
                <NotificationCenter />
                <ModeToggle />
                <img 
                  src={logoUrl || "/velostock-logo.svg"} 
                  alt={companyName} 
                  className="h-6 sm:h-10 w-auto object-contain max-w-[80px] sm:max-w-none"
                />
                <ProfileDropdown />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <MainAppRouter />
            </main>
          </div>
        </div>
      </SidebarProvider>
      <ChatbotWidget />
      <BetaBanner />
    </>
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
