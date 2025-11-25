import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, CheckCircle, Wrench, TrendingUp, DollarSign, Clock, ArrowUp, ArrowDown } from "lucide-react";

export function DashboardMetricsEnhanced() {
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

  let totalMargin = 0;
  let totalDays = 0;
  let countWithMargin = 0;
  let countWithDays = 0;

  vehicles.forEach(v => {
    if (v.status === "Vendido" && v.salePrice) {
      const purchasePrice = Number(v.purchasePrice) || 0;
      const operationalCosts = Number(v.totalCost) || 0;
      const totalCost = purchasePrice + operationalCosts;
      const margin = v.salePrice - totalCost;
      if (v.salePrice > 0) {
        totalMargin += (margin / v.salePrice) * 100;
        countWithMargin++;
      }
    }

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
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
      iconColor: "text-green-600 dark:text-green-400",
      trend: readyForSale > 5 ? "up" : null,
    },
    {
      title: "Em Preparação",
      value: inProcess,
      icon: Wrench,
      description: "Sendo preparados",
      gradient: "from-blue-500 to-cyan-600",
      bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      trend: null,
    },
    {
      title: "Vendidos no Mês",
      value: soldThisMonth,
      icon: TrendingUp,
      description: new Date().toLocaleDateString('pt-BR', { month: 'long' }),
      gradient: "from-purple-500 to-pink-600",
      bgGradient: "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      trend: soldThisMonth > 0 ? "up" : null,
    },
    {
      title: "Margem Média",
      value: `${avgMargin}%`,
      icon: DollarSign,
      description: "Lucro sobre venda",
      gradient: "from-emerald-500 to-green-600",
      bgGradient: "from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      trend: parseFloat(avgMargin) > 15 ? "up" : parseFloat(avgMargin) > 0 ? null : "down",
    },
    {
      title: "Dias Médios",
      value: avgDays,
      icon: Clock,
      description: "Tempo em estoque",
      gradient: "from-orange-500 to-amber-600",
      bgGradient: "from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      trend: avgDays < 30 ? "up" : avgDays > 60 ? "down" : null,
    },
    {
      title: "Total em Estoque",
      value: metrics?.totalVehicles || 0,
      icon: Car,
      description: "Todos os veículos",
      gradient: "from-slate-500 to-gray-600",
      bgGradient: "from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20",
      iconColor: "text-slate-600 dark:text-slate-400",
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {metricsData.map((metric, index) => (
        <Card 
          key={index} 
          className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${metric.bgGradient} opacity-50`}></div>
          
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">
              {metric.title}
            </CardTitle>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.gradient} shadow-md group-hover:scale-110 transition-transform duration-300`}>
              <metric.icon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          
          <CardContent className="relative">
            <div className="flex items-baseline gap-2">
              <div className={`text-4xl font-bold bg-gradient-to-br ${metric.gradient} bg-clip-text text-transparent`}>
                {metric.value}
              </div>
              {metric.trend && (
                <div className={`flex items-center text-sm font-medium ${metric.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {metric.trend === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              {metric.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
