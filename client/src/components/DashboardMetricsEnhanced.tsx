import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, CheckCircle, Wrench, TrendingUp, DollarSign, Clock } from "lucide-react";

export function DashboardMetricsEnhanced() {
  const { data: metrics, isLoading } = useQuery<any>({
    queryKey: ["/api/metrics"],
  });

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  // Calcular métricas avançadas
  const readyForSale = vehicles.filter(v => v.status === "Pronto para Venda").length;
  const inProcess = vehicles.filter(v => 
    v.status !== "Pronto para Venda" && 
    v.status !== "Vendido" && 
    v.status !== "Arquivado"
  ).length;
  
  // Vendidos no mês atual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const soldThisMonth = vehicles.filter(v => {
    if (v.status !== "Vendido") return false;
    const soldDate = new Date(v.locationChangedAt || v.createdAt);
    return soldDate >= startOfMonth;
  }).length;

  // Calcular margem média e dias médios
  let totalMargin = 0;
  let totalDays = 0;
  let countWithMargin = 0;
  let countWithDays = 0;

  vehicles.forEach(v => {
    // Margem média (apenas veículos vendidos com preço)
    if (v.status === "Vendido" && v.salePrice) {
      const costs = v.totalCost || 0;
      const margin = v.salePrice - costs;
      if (margin > 0) {
        totalMargin += (margin / v.salePrice) * 100;
        countWithMargin++;
      }
    }

    // Dias médios em estoque (apenas veículos vendidos)
    if (v.status === "Vendido") {
      const created = new Date(v.createdAt);
      const sold = new Date(v.locationChangedAt || v.createdAt);
      const days = Math.floor((sold.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        totalDays += days;
        countWithDays++;
      }
    }
  });

  const avgMargin = countWithMargin > 0 ? (totalMargin / countWithMargin).toFixed(1) : "0.0";
  const avgDays = countWithDays > 0 ? Math.round(totalDays / countWithDays) : 0;

  const metricsData = [
    {
      title: "Prontos para Venda",
      value: readyForSale,
      icon: CheckCircle,
      description: "Veículos disponíveis",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Em Preparação",
      value: inProcess,
      icon: Wrench,
      description: "Sendo preparados",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Vendidos no Mês",
      value: soldThisMonth,
      icon: TrendingUp,
      description: new Date().toLocaleDateString('pt-BR', { month: 'long' }),
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Margem Média",
      value: `${avgMargin}%`,
      icon: DollarSign,
      description: "Lucro sobre venda",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Dias Médios",
      value: avgDays,
      icon: Clock,
      description: "Tempo em estoque",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Total em Estoque",
      value: metrics?.totalVehicles || 0,
      icon: Car,
      description: "Todos os veículos",
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metricsData.map((metric, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            <div className={`${metric.bgColor} p-2 rounded-lg`}>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metric.color}`}>
              {metric.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metric.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
