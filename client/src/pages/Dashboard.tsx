import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardMetricsEnhanced } from "@/components/DashboardMetricsEnhanced";
import { DashboardAlerts } from "@/components/DashboardAlerts";
import { FinancialSummary } from "@/components/FinancialSummary";
import { RecentActivity } from "@/components/RecentActivity";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { SellerDashboard } from "@/components/SellerDashboard";
import { SetSalesTargetDialog } from "@/components/SetSalesTargetDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Clock, Target } from "lucide-react";
import { useCompanyTheme } from "@/components/CompanyThemeProvider";
import { usePermissions } from "@/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";

export default function Dashboard() {
  const { t } = useI18n();
  const { changeIconColors, primaryColor } = useCompanyTheme();
  const { isVendedor } = usePermissions();
  const [setTargetOpen, setSetTargetOpen] = useState(false);
  const { data: vehicles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-background to-muted/20">
      <div className="border-b bg-gradient-to-r from-primary/5 to-secondary/5 px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t("dashboard.title")}
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground flex items-center gap-2">
              <TrendingUp 
                className="h-4 w-4"
                style={changeIconColors ? { color: primaryColor } : undefined}
              />
              <span className="hidden sm:inline">{t("dashboard.overview")}</span>
              <span className="sm:hidden">{t("dashboard.overviewShort")}</span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isVendedor && (
              <Button
                onClick={() => setSetTargetOpen(true)}
                variant="outline"
                className="gap-2"
                size="sm"
                data-testid="button-set-target"
              >
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.setTarget")}</span>
                <span className="sm:hidden">{t("dashboard.target")}</span>
              </Button>
            )}
            <AddVehicleDialog onAdd={(data) => console.log("Novo veículo:", data)} />
          </div>
        </div>
      </div>

      <SetSalesTargetDialog open={setTargetOpen} onOpenChange={setSetTargetOpen} />

      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="space-y-6 sm:space-y-8 max-w-[1800px] mx-auto">
          {isVendedor && (
            <div className="animate-fade-in">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">{t("dashboard.myTargetCommissions")}</h2>
              </div>
              <SellerDashboard />
            </div>
          )}
          
          <div className="animate-fade-in">
            <DashboardMetricsEnhanced />
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6">
              <FinancialSummary />
              <DashboardAlerts />
            </div>
            
            <div className="space-y-6">
              <RecentActivity />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
              <h2 className="text-2xl font-bold">{t("dashboard.vehiclePipeline")}</h2>
              <div className="h-1 flex-1 bg-gradient-to-r from-secondary/20 to-transparent rounded-full"></div>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : (
              <div className="bg-card/50 backdrop-blur-sm rounded-xl border p-6">
                <KanbanBoard vehicles={vehicles} />
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
