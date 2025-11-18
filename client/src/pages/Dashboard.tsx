import { useQuery } from "@tanstack/react-query";
import { DashboardMetricsEnhanced } from "@/components/DashboardMetricsEnhanced";
import { DashboardAlerts } from "@/components/DashboardAlerts";
import { FinancialSummary } from "@/components/FinancialSummary";
import { RecentActivity } from "@/components/RecentActivity";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: vehicles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  return (
    <div className="flex h-full flex-col p-8">
      
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel de Controle</h1>
          <p className="mt-2 text-muted-foreground">
            Visão geral completa do estoque e movimentação
          </p>
        </div>
        <AddVehicleDialog onAdd={(data) => console.log("Novo veículo:", data)} />
      </div>

      <div className="space-y-6 mb-8">
        {/* Métricas MELHORADAS - 6 cards com métricas essenciais */}
        <DashboardMetricsEnhanced />
        
        {/* Resumo Financeiro */}
        <FinancialSummary />
        
        {/* Alertas e Avisos */}
        <DashboardAlerts />
        
        {/* Atividade Recente */}
        <RecentActivity />
      </div>

      {/* Kanban Board - mantido */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard vehicles={vehicles} />
        </div>
      )}
    </div>
  );
}
