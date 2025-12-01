import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, CheckCircle, Wrench, TrendingUp, DollarSign, Clock, ArrowUp, ArrowDown } from "lucide-react";
import { useCompanyTheme } from "./CompanyThemeProvider";
import { usePermissions } from "@/hooks/use-permissions";

export function DashboardMetricsEnhanced() {
  const { changeIconColors } = useCompanyTheme();
  const { isVendedor } = usePermissions();
  
  const { data: metrics, isLoading } = useQuery<any>({
    queryKey: ["/api/metrics"],
  });

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  const readyForSale = vehicles.filter(v => v.status === "Pronto para Venda").length;
  const inProcess = vehicles.filter(v => 
    v.status !== "Pronto para Venda" && 
    v.status !== "Vendido" && 
    v.status !== "Arquivado"
  ).length;
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const soldThisMonth = vehicles.filter(v => {
    if (v.status !== "Vendido") return false;
    const soldDate = new Date(v.locationChangedAt || v.createdAt);
    return soldDate >= startOfMonth;
  }).length;

  let totalDays = 0;
  let countWithDays = 0;

  vehicles.forEach(v => {
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

  const avgMargin = metrics?.resultados?.margemLucro ? (metrics.resultados.margemLucro).toFixed(1) : "0.0";
  const avgDays = countWithDays > 0 ? Math.round(totalDays / countWithDays) : 0;

  const baseMetricsData = [
    {
      title: "Prontos para Venda",
      value: readyForSale,
      icon: CheckCircle,
      description: "Veículos disponíveis",
      gradientBg: "hsl(var(--badge-color-1))",
      iconBg: "hsl(var(--badge-color-1) / 0.1)",
      trend: readyForSale > 5 ? "up" : null,
    },
    {
      title: "Em Preparação",
      value: inProcess,
      icon: Wrench,
      description: "Sendo preparados",
      gradientBg: "hsl(var(--badge-color-2))",
      iconBg: "hsl(var(--badge-color-2) / 0.1)",
      trend: null,
    },
    {
      title: "Vendidos no Mês",
      value: soldThisMonth,
      icon: TrendingUp,
      description: new Date().toLocaleDateString('pt-BR', { month: 'long' }),
      gradientBg: "hsl(var(--badge-color-3))",
      iconBg: "hsl(var(--badge-color-3) / 0.1)",
      trend: soldThisMonth > 0 ? "up" : null,
    },
  ];

  const financeMetricsData = [
    {
      title: "Margem Média",
      value: `${avgMargin}%`,
      icon: DollarSign,
      description: "Lucro sobre venda",
      gradientBg: "hsl(var(--badge-color-4))",
      iconBg: "hsl(var(--badge-color-4) / 0.1)",
      trend: parseFloat(avgMargin) > 15 ? "up" : parseFloat(avgMargin) > 0 ? null : "down",
    },
    {
      title: "Dias Médios",
      value: avgDays,
      icon: Clock,
      description: "Tempo em estoque",
      gradientBg: "hsl(var(--badge-color-5))",
      iconBg: "hsl(var(--badge-color-5) / 0.1)",
      trend: avgDays < 30 ? "up" : avgDays > 60 ? "down" : null,
    },
    {
      title: "Total em Estoque",
      value: metrics?.totalVehicles || 0,
      icon: Car,
      description: "Todos os veículos",
      gradientBg: "hsl(var(--badge-color-6))",
      iconBg: "hsl(var(--badge-color-6) / 0.1)",
      trend: null,
    },
  ];

  const metricsData = isVendedor ? baseMetricsData : [...baseMetricsData, ...financeMetricsData];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {metricsData.map((metric, index) => (
        <Card 
          key={index} 
          className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundColor: metric.gradientBg }}></div>
          
          <CardHeader className="relative flex flex-row items-center justify-between gap-1 space-y-0 pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-semibold text-foreground/80">
              {metric.title}
            </CardTitle>
            <div className="p-2 sm:p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: metric.iconBg }}>
              <metric.icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: changeIconColors ? metric.gradientBg : "currentColor" }} />
            </div>
          </CardHeader>
          
          <CardContent className="relative p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <div className="text-2xl sm:text-4xl font-bold" style={{ color: changeIconColors ? metric.gradientBg : "inherit" }}>
                {metric.value}
              </div>
              {metric.trend && (
                <div className={`flex items-center text-sm font-medium ${metric.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {metric.trend === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 font-medium truncate">
              {metric.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
