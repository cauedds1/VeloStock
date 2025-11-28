import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Clock, DollarSign, Package, CheckCircle2, AlertCircle, TrendingDown, Calendar, Search, Car, Wallet, CreditCard, User } from "lucide-react";
import { subMonths, startOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { checklistItems, getChecklistStats, normalizeChecklistData, hasChecklistStarted } from "@shared/checklistUtils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/use-permissions";
import { motion } from "framer-motion";
import { CommissionDetailsButton } from "@/components/CommissionDetailsButton";
import { FinancialReportPDF } from "@/components/FinancialReportPDF";

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

type FinancialMetrics = {
  periodo: { mes: number; ano: number };
  vendas: { quantidade: number; receita: number; ticketMedio: number };
  custos: { veiculos: number; operacionais: number; comissoes: number; total: number };
  resultados: { lucroLiquido: number; margemLucro: number };
  comissoes: { total: number; pagas: number; aPagar: number };
};

type SellerRanking = {
  vendedorId: string;
  vendedorNome: string;
  vendedorEmail: string;
  quantidadeVendas: number;
  receitaTotal: string;
  ticketMedio: string;
  comissaoTotal: string;
};

type BillsDashboard = {
  totalAPagar: { valor: string; quantidade: number };
  totalAReceber: { valor: string; quantidade: number };
  vencidas: { quantidade: number; total: string };
  proximosVencimentos: { quantidade: number; total: string };
  pagosMes: { totalPago: string; totalRecebido: string };
  saldoPrevisto: string;
};

export default function Reports() {
  const [dateFilter, setDateFilter] = useState<string>("current-month");
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistDialogType, setChecklistDialogType] = useState<"completed" | "missing">("missing");
  const [observationsDialogOpen, setObservationsDialogOpen] = useState(false);
  const [observationsDialogType, setObservationsDialogType] = useState<"pending" | "resolved">("pending");
  
  // Estados para filtros da aba Custos
  const [costSearchTerm, setCostSearchTerm] = useState("");
  const [costCategoryFilter, setCostCategoryFilter] = useState<string>("all");
  const [costPaymentMethodFilter, setCostPaymentMethodFilter] = useState<string>("all");

  const { user } = useAuth();
  const { can, isFinanceiro, isProprietario, isVendedor } = usePermissions();
  const hasFinancialAccess = can.viewFinancialReports; // Proprietário e Financeiro

  const getPeriodFromFilter = () => {
    const now = new Date();
    switch (dateFilter) {
      case "current-month":
        return { mes: now.getMonth() + 1, ano: now.getFullYear() };
      case "last-month": {
        const lastMonth = subMonths(now, 1);
        return { mes: lastMonth.getMonth() + 1, ano: lastMonth.getFullYear() };
      }
      case "last-3-months":
        return { startDate: subMonths(now, 3).toISOString(), endDate: now.toISOString() };
      case "last-6-months":
        return { startDate: subMonths(now, 6).toISOString(), endDate: now.toISOString() };
      case "all":
        return { startDate: new Date(2000, 0, 1).toISOString(), endDate: now.toISOString() };
      default:
        return { mes: now.getMonth() + 1, ano: now.getFullYear() };
    }
  };

  const periodParams = getPeriodFromFilter();

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: allCosts = [], isLoading: isLoadingCosts } = useQuery<any[]>({
    queryKey: ["/api/costs/all"],
  });

  const { data: observations = [] } = useQuery<any[]>({
    queryKey: ["/api/store-observations"],
  });

  // Construir query string manualmente para passar parâmetros corretamente
  const buildMetricsUrl = () => {
    const params = new URLSearchParams();
    if ('mes' in periodParams) {
      params.set('mes', String(periodParams.mes));
      params.set('ano', String(periodParams.ano));
    } else {
      params.set('startDate', periodParams.startDate);
      params.set('endDate', periodParams.endDate);
    }
    return `/api/financial/metrics?${params.toString()}`;
  };

  const buildRankingUrl = () => {
    const params = new URLSearchParams();
    if ('mes' in periodParams) {
      params.set('mes', String(periodParams.mes));
      params.set('ano', String(periodParams.ano));
    } else {
      params.set('startDate', periodParams.startDate);
      params.set('endDate', periodParams.endDate);
    }
    return `/api/financial/sellers/ranking?${params.toString()}`;
  };

  const { data: financialMetrics, isLoading: isLoadingMetrics } = useQuery<FinancialMetrics>({
    queryKey: ["/api/financial/metrics", dateFilter],
    queryFn: async () => {
      const url = buildMetricsUrl();
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
    enabled: hasFinancialAccess,
  });

  const { data: sellersRanking = [], isLoading: isLoadingRanking } = useQuery<SellerRanking[]>({
    queryKey: ["/api/financial/sellers/ranking", dateFilter],
    queryFn: async () => {
      const url = buildRankingUrl();
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch ranking");
      return response.json();
    },
    enabled: hasFinancialAccess,
  });

  const { data: billsDashboard } = useQuery<BillsDashboard>({
    queryKey: ["/api/bills/dashboard"],
    enabled: hasFinancialAccess,
  });

  const getFilteredData = () => {
    const now = new Date();
    let startDate: Date;

    switch (dateFilter) {
      case "current-month":
        startDate = startOfMonth(now);
        break;
      case "last-month":
        startDate = startOfMonth(subMonths(now, 1));
        break;
      case "last-3-months":
        startDate = subMonths(now, 3);
        break;
      case "last-6-months":
        startDate = subMonths(now, 6);
        break;
      case "all":
      default:
        startDate = new Date(0);
    }

    const filteredVehicles = vehicles.filter((v) => {
      const createdAt = new Date(v.createdAt);
      return createdAt >= startDate;
    });

    const filteredCosts = allCosts.filter((c) => {
      const costDate = new Date(c.date);
      return costDate >= startDate;
    });

    return { vehicles: filteredVehicles, costs: filteredCosts };
  };

  const { vehicles: filteredVehicles, costs: filteredCosts } = getFilteredData();

  const getVehiclesByStatusData = () => {
    const statusCount = new Map<string, number>();
    const statuses = ["Entrada", "Em Reparos", "Em Higienização", "Pronto para Venda", "Vendido", "Arquivado"];
    
    statuses.forEach(status => statusCount.set(status, 0));
    
    filteredVehicles.forEach((v) => {
      const status = v.status || v.location || "Entrada";
      statusCount.set(status, (statusCount.get(status) || 0) + 1);
    });

    return Array.from(statusCount.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  };

  const getCostsByCategoryData = () => {
    const categoryMap = new Map<string, number>();
    
    filteredCosts.forEach((cost) => {
      const current = categoryMap.get(cost.category) || 0;
      categoryMap.set(cost.category, current + Number(cost.value));
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const getAvgTimePerStageData = () => {
    const stageTime = new Map<string, { total: number; count: number }>();
    const statuses = ["Entrada", "Em Reparos", "Em Higienização", "Pronto para Venda"];

    filteredVehicles.forEach((v) => {
      const status = v.status || v.location || "Entrada";
      const daysInStatus = v.daysInStatus || 0; // Usar valor calculado corretamente pela API

      const current = stageTime.get(status) || { total: 0, count: 0 };
      stageTime.set(status, {
        total: current.total + daysInStatus,
        count: current.count + 1,
      });
    });

    return statuses
      .map((status) => {
        const data = stageTime.get(status);
        return {
          name: status,
          dias: data ? Math.round(data.total / data.count) : 0,
        };
      })
      .filter(item => item.dias > 0);
  };

  const getVehiclesWithLongestTime = () => {
    return filteredVehicles
      .map((v) => {
        const daysInStatus = v.daysInStatus || 0; // Usar valor calculado corretamente pela API
        
        return {
          id: v.id,
          name: `${v.brand} ${v.model}`,
          status: v.status || v.location,
          days: daysInStatus,
          plate: v.plate,
        };
      })
      .filter(v => v.status !== "Vendido" && v.status !== "Arquivado")
      .sort((a, b) => b.days - a.days)
      .slice(0, 10);
  };

  const vehiclesByStatus = getVehiclesByStatusData();
  const costsByCategory = getCostsByCategoryData();
  const avgTimePerStage = getAvgTimePerStageData();
  const vehiclesWithLongestTime = getVehiclesWithLongestTime();
  const totalCosts = filteredCosts.reduce((sum, c) => sum + Number(c.value), 0);

  const isLoading = isLoadingVehicles || isLoadingCosts;

  const inventoryContent = (
    <>
      {isLoading ? (
        <div className="grid gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="space-y-6 overflow-y-auto pb-8">
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-muted/40">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/20 transition-transform duration-300 hover:scale-110">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Veículos</p>
                  <p className="text-2xl font-bold text-foreground">{filteredVehicles.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-muted/40">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/20 transition-transform duration-300 hover:scale-110">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Prontos p/ Venda</p>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredVehicles.filter(v => v.status === "Pronto para Venda").length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-muted/40">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/20 transition-transform duration-300 hover:scale-110">
                  <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Custos Totais</p>
                  <p className="text-2xl font-bold text-foreground">R$ {totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-muted/40">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/20 transition-transform duration-300 hover:scale-110">
                  <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Média de Dias</p>
                  <p className="text-2xl font-bold text-foreground">
                    {avgTimePerStage.length > 0
                      ? Math.round(avgTimePerStage.reduce((sum, s) => sum + s.dias, 0) / avgTimePerStage.length)
                      : 0}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6 transition-all duration-300 hover:shadow-lg border-muted/40">
            <h3 className="mb-6 text-lg font-semibold flex items-center gap-2 text-foreground">
              <BarChart className="h-5 w-5 text-primary" />
              Movimentação de Veículos por Status
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vehiclesByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Veículos" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 transition-all duration-300 hover:shadow-lg border-muted/40">
              <h3 className="mb-6 text-lg font-semibold flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                Tempo Médio por Etapa
              </h3>
              {avgTimePerStage.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={avgTimePerStage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="dias" stroke="#8b5cf6" name="Dias" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-12">
                  Nenhum dado disponível
                </p>
              )}
            </Card>

            <Card className="p-6 transition-all duration-300 hover:shadow-lg border-muted/40">
              <h3 className="mb-6 text-lg font-semibold flex items-center gap-2 text-foreground">
                <DollarSign className="h-5 w-5 text-primary" />
                Análise de Custos por Categoria
              </h3>
              {costsByCategory.length > 0 ? (
                <div className="flex flex-col md:flex-row gap-6">
                  <ResponsiveContainer width="100%" height={300} minWidth={200}>
                    <PieChart>
                      <Pie
                        data={costsByCategory}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {costsByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `R$ ${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 md:w-48 overflow-y-auto max-h-80">
                    <div className="space-y-2 text-sm">
                      {costsByCategory.map((entry, index) => (
                        <div key={`legend-${index}`} className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-muted-foreground truncate">{entry.name}:</span>
                          <span className="font-semibold text-foreground whitespace-nowrap">R$ {entry.value.toLocaleString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-12">
                  Nenhum custo registrado
                </p>
              )}
            </Card>
          </div>

          <Card className="p-6 transition-all duration-300 hover:shadow-lg border-muted/40">
            <h3 className="mb-6 text-lg font-semibold flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5 text-primary" />
              Veículos com Maior Tempo em Status Atual
            </h3>
            {vehiclesWithLongestTime.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold text-sm">Veículo</th>
                      <th className="text-left p-3 font-semibold text-sm">Placa</th>
                      <th className="text-left p-3 font-semibold text-sm">Status Atual</th>
                      <th className="text-right p-3 font-semibold text-sm">Dias no Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehiclesWithLongestTime.map((vehicle) => (
                      <tr key={vehicle.id} className="border-b border-border/40 hover:bg-muted/50 transition-colors duration-200">
                        <td className="p-3 text-sm font-medium text-foreground">{vehicle.name}</td>
                        <td className="p-3 text-sm font-mono text-muted-foreground">{vehicle.plate}</td>
                        <td className="p-3 text-sm">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {vehicle.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-right font-bold text-foreground">
                          {vehicle.days} {vehicle.days === 1 ? 'dia' : 'dias'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum veículo encontrado
              </p>
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 transition-all duration-300 hover:shadow-lg border-muted/40">
              <h3 className="mb-6 text-lg font-semibold flex items-center gap-2 text-foreground">
                <Package className="h-5 w-5 text-primary" />
                Status do Checklist dos Veículos
              </h3>
              <div className="space-y-4">
                {(() => {
                  // Classificar veículos por status de checklist
                  const vehiclesWithoutChecklist: any[] = [];
                  const vehiclesWithCompleteChecklist: any[] = [];
                  const vehiclesWithIncompleteChecklist: any[] = [];
                  
                  filteredVehicles.forEach((v) => {
                    if (!hasChecklistStarted(v.checklist, v.vehicleType || "Carro")) {
                      vehiclesWithoutChecklist.push(v);
                    } else {
                      const normalized = normalizeChecklistData(v.checklist, v.vehicleType || "Carro");
                      const stats = getChecklistStats(normalized, v.checklist, v.vehicleType || "Carro");
                      
                      if (stats.totalItems > 0 && stats.checkedItems === stats.totalItems) {
                        vehiclesWithCompleteChecklist.push(v);
                      } else {
                        vehiclesWithIncompleteChecklist.push(v);
                      }
                    }
                  });

                  const totalVehicles = filteredVehicles.length;
                  const completedVehicles = vehiclesWithCompleteChecklist.length;
                  const missingVehicles = vehiclesWithoutChecklist.length + vehiclesWithIncompleteChecklist.length;
                  
                  const completionRate = totalVehicles > 0 
                    ? Math.round((completedVehicles / totalVehicles) * 100) 
                    : 0;

                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Taxa de Conclusão Geral</span>
                        <span className="text-2xl font-bold text-primary">{completionRate}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Total de Carros</p>
                          <p className="text-2xl font-bold">{totalVehicles}</p>
                        </div>
                        <Button
                          variant="outline"
                          className="h-auto p-3 flex flex-col items-center gap-1 bg-green-500/10 hover:bg-green-500/20 border-green-600/20"
                          onClick={() => {
                            setChecklistDialogType("completed");
                            setChecklistDialogOpen(true);
                          }}
                        >
                          <p className="text-xs text-muted-foreground">Concluídos</p>
                          <p className="text-2xl font-bold text-green-600">{completedVehicles}</p>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto p-3 flex flex-col items-center gap-1 bg-red-500/10 hover:bg-red-500/20 border-red-600/20"
                          onClick={() => {
                            setChecklistDialogType("missing");
                            setChecklistDialogOpen(true);
                          }}
                        >
                          <p className="text-xs text-muted-foreground">Faltando</p>
                          <p className="text-2xl font-bold text-red-600">{missingVehicles}</p>
                        </Button>
                      </div>

                      {/* Dialog para mostrar lista de veículos */}
                      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {checklistDialogType === "completed" ? (
                                <>
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  Carros com Checklist Concluído ({completedVehicles})
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-5 w-5 text-red-600" />
                                  Carros com Checklist Faltando ({missingVehicles})
                                </>
                              )}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            {checklistDialogType === "completed" ? (
                              vehiclesWithCompleteChecklist.length > 0 ? (
                                <div className="space-y-2">
                                  {vehiclesWithCompleteChecklist.map((v) => (
                                    <div key={v.id} className="p-3 border rounded-lg hover:bg-muted/50 flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">{v.brand} {v.model}</p>
                                        <p className="text-sm text-muted-foreground">{v.plate} • {v.status}</p>
                                      </div>
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-center text-muted-foreground py-8">Nenhum carro com checklist concluído</p>
                              )
                            ) : (
                              (vehiclesWithoutChecklist.length + vehiclesWithIncompleteChecklist.length) > 0 ? (
                                <div className="space-y-2">
                                  {vehiclesWithoutChecklist.map((v) => (
                                    <div key={v.id} className="p-3 border border-red-600/20 rounded-lg hover:bg-muted/50 flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">{v.brand} {v.model}</p>
                                        <p className="text-sm text-muted-foreground">{v.plate} • {v.status}</p>
                                        <p className="text-xs text-red-600 mt-1">Sem checklist iniciado</p>
                                      </div>
                                      <AlertCircle className="h-5 w-5 text-red-600" />
                                    </div>
                                  ))}
                                  {vehiclesWithIncompleteChecklist.map((v) => {
                                    const normalized = normalizeChecklistData(v.checklist, v.vehicleType || "Carro");
                                    const stats = getChecklistStats(normalized, v.checklist, v.vehicleType || "Carro");
                                    const pending = stats.totalItems - stats.checkedItems;
                                    return (
                                      <div key={v.id} className="p-3 border border-yellow-600/20 rounded-lg hover:bg-muted/50 flex items-center justify-between">
                                        <div>
                                          <p className="font-medium">{v.brand} {v.model}</p>
                                          <p className="text-sm text-muted-foreground">{v.plate} • {v.status}</p>
                                          <p className="text-xs text-yellow-600 mt-1">{pending} {pending === 1 ? 'item pendente' : 'itens pendentes'}</p>
                                        </div>
                                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-center text-muted-foreground py-8">Todos os carros têm checklist concluído</p>
                              )
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  );
                })()}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-6 text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Observações Gerais da Loja
              </h3>
              <div className="space-y-4">
                {(() => {
                  const pendingObs = observations.filter((o: any) => o.status === "Pendente");
                  const resolvedObs = observations.filter((o: any) => o.status === "Resolvido");
                  const totalObs = observations.length;
                  
                  const resolutionRate = totalObs > 0 
                    ? Math.round((resolvedObs.length / totalObs) * 100) 
                    : 0;

                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Taxa de Resolução</span>
                        <span className="text-2xl font-bold text-primary">{resolutionRate}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${resolutionRate}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Total de Observações</p>
                          <p className="text-2xl font-bold">{totalObs}</p>
                        </div>
                        <Button
                          variant="outline"
                          className="h-auto p-3 flex flex-col items-center gap-1 bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-600/20"
                          onClick={() => {
                            setObservationsDialogType("pending");
                            setObservationsDialogOpen(true);
                          }}
                        >
                          <p className="text-xs text-muted-foreground">Pendentes</p>
                          <p className="text-2xl font-bold text-yellow-600">{pendingObs.length}</p>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto p-3 flex flex-col items-center gap-1 bg-green-500/10 hover:bg-green-500/20 border-green-600/20"
                          onClick={() => {
                            setObservationsDialogType("resolved");
                            setObservationsDialogOpen(true);
                          }}
                        >
                          <p className="text-xs text-muted-foreground">Resolvidas</p>
                          <p className="text-2xl font-bold text-green-600">{resolvedObs.length}</p>
                        </Button>
                      </div>

                      {/* Dialog para mostrar lista de observações */}
                      <Dialog open={observationsDialogOpen} onOpenChange={setObservationsDialogOpen}>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {observationsDialogType === "pending" ? (
                                <>
                                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                                  Observações Pendentes ({pendingObs.length})
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  Observações Resolvidas ({resolvedObs.length})
                                </>
                              )}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            {observationsDialogType === "pending" ? (
                              pendingObs.length > 0 ? (
                                <div className="space-y-2">
                                  {pendingObs.map((obs: any) => (
                                    <div key={obs.id} className="p-4 border border-yellow-500/20 rounded-lg bg-yellow-500/5 hover:bg-yellow-500/10">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <p className="font-medium text-card-foreground">{obs.title}</p>
                                          {obs.description && (
                                            <p className="text-sm text-muted-foreground mt-1">{obs.description}</p>
                                          )}
                                          <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-700">
                                              {obs.category || "Sem categoria"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(obs.createdAt).toLocaleDateString('pt-BR')}
                                            </span>
                                          </div>
                                        </div>
                                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-center text-muted-foreground py-8">Nenhuma observação pendente</p>
                              )
                            ) : (
                              resolvedObs.length > 0 ? (
                                <div className="space-y-2">
                                  {resolvedObs.map((obs: any) => (
                                    <div key={obs.id} className="p-4 border border-green-500/20 rounded-lg bg-green-500/5 hover:bg-green-500/10">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <p className="font-medium text-card-foreground">{obs.title}</p>
                                          {obs.description && (
                                            <p className="text-sm text-muted-foreground mt-1">{obs.description}</p>
                                          )}
                                          <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-700">
                                              {obs.category || "Sem categoria"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(obs.createdAt).toLocaleDateString('pt-BR')}
                                            </span>
                                          </div>
                                        </div>
                                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-center text-muted-foreground py-8">Nenhuma observação resolvida</p>
                              )
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  );
                })()}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="mt-2 text-muted-foreground">
            Análise e estatísticas do estoque
          </p>
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="current-month">Mês atual</SelectItem>
            <SelectItem value="last-month">Mês passado</SelectItem>
            <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
            <SelectItem value="last-6-months">Últimos 6 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasFinancialAccess ? (
        <Tabs defaultValue="estoque" className="flex-1">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <TabsList>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="custos">Custos</TabsTrigger>
            </TabsList>
            <FinancialReportPDF />
          </div>
          
          <TabsContent value="estoque" className="mt-0">
            {inventoryContent}
          </TabsContent>
          
          <TabsContent value="financeiro" className="mt-0">
            {isLoadingMetrics ? (
              <div className="grid gap-6">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
              </div>
            ) : (
              <div className="space-y-6 overflow-y-auto pb-8">
                <motion.div 
                  className="grid gap-6 md:grid-cols-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, staggerChildren: 0.1 }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                  >
                    <Card className="p-6 hover-elevate transition-all duration-300 cursor-default" data-testid="card-receita-total">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-500/10 transition-colors">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600 transition-all">
                        R$ {financialMetrics?.vendas.receita.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {financialMetrics?.vendas.quantidade} vendas
                      </p>
                    </Card>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <Card className="p-6 hover-elevate transition-all duration-300 cursor-default" data-testid="card-lucro-liquido">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10 transition-colors">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Lucro Líquido</p>
                      </div>
                      <p className={`text-2xl font-bold transition-all ${(financialMetrics?.resultados.lucroLiquido ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        R$ {financialMetrics?.resultados.lucroLiquido.toLocaleString('pt-BR')}
                      </p>
                    </Card>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <Card className="p-6 hover-elevate transition-all duration-300 cursor-default" data-testid="card-margem-lucro">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-500/10 transition-colors">
                          <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Margem de Lucro</p>
                      </div>
                      <p className={`text-2xl font-bold transition-all ${(financialMetrics?.resultados.margemLucro ?? 0) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                        {financialMetrics?.resultados.margemLucro.toFixed(1)}%
                      </p>
                    </Card>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                  >
                    <CommissionDetailsButton financialMetrics={financialMetrics} />
                  </motion.div>
                </motion.div>
                
                {/* Resumo de Contas a Pagar/Receber */}
                {billsDashboard && (
                  <>
                    <div className="pt-4">
                      <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Contas a Pagar e Receber
                      </h3>
                      <div className="grid gap-4 md:grid-cols-4">
                        <Card className="p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            </div>
                            <p className="text-sm text-muted-foreground">A Pagar (Pendente)</p>
                          </div>
                          <p className="text-2xl font-bold text-red-600">R$ {parseFloat(billsDashboard.totalAPagar.valor).toLocaleString('pt-BR')}</p>
                          <p className="text-xs text-muted-foreground mt-1">{billsDashboard.totalAPagar.quantidade} contas</p>
                        </Card>
                        
                        <Card className="p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-sm text-muted-foreground">A Receber (Pendente)</p>
                          </div>
                          <p className="text-2xl font-bold text-green-600">R$ {parseFloat(billsDashboard.totalAReceber.valor).toLocaleString('pt-BR')}</p>
                          <p className="text-xs text-muted-foreground mt-1">{billsDashboard.totalAReceber.quantidade} contas</p>
                        </Card>
                        
                        <Card className="p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <DollarSign className="h-4 w-4 text-blue-600" />
                            </div>
                            <p className="text-sm text-muted-foreground">Saldo Previsto</p>
                          </div>
                          <p className={`text-2xl font-bold ${parseFloat(billsDashboard.saldoPrevisto) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {parseFloat(billsDashboard.saldoPrevisto).toLocaleString('pt-BR')}
                          </p>
                        </Card>
                        
                        <Card className="p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                            </div>
                            <p className="text-sm text-muted-foreground">Contas Vencidas</p>
                          </div>
                          <p className="text-2xl font-bold text-orange-600">{billsDashboard.vencidas.quantidade}</p>
                          <p className="text-xs text-muted-foreground mt-1">R$ {parseFloat(billsDashboard.vencidas.total).toLocaleString('pt-BR')}</p>
                        </Card>
                      </div>
                    </div>
                  </>
                )}
                
                <Card className="p-6">
                  <h3 className="mb-6 text-lg font-semibold">Receitas vs Despesas</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: 'Receita', valor: financialMetrics?.vendas.receita || 0 },
                      { name: 'Custos Veículos', valor: financialMetrics?.custos.veiculos || 0 },
                      { name: 'Despesas Operacionais', valor: financialMetrics?.custos.operacionais || 0 },
                      { name: 'Comissões', valor: financialMetrics?.custos.comissoes || 0 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`} />
                      <Bar dataKey="valor" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                
                <Card className="p-6">
                  <h3 className="mb-6 text-lg font-semibold">Ranking de Vendedores</h3>
                  {sellersRanking.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Vendedor</th>
                          <th className="text-right p-3">Vendas</th>
                          <th className="text-right p-3">Receita</th>
                          <th className="text-right p-3">Ticket Médio</th>
                          <th className="text-right p-3">Comissão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellersRanking.map((seller: any) => (
                          <tr key={seller.vendedorId} className="border-b hover:bg-muted/50">
                            <td className="p-3">{seller.vendedorNome}</td>
                            <td className="p-3 text-right">{seller.quantidadeVendas}</td>
                            <td className="p-3 text-right">R$ {parseFloat(seller.receitaTotal).toLocaleString('pt-BR')}</td>
                            <td className="p-3 text-right">R$ {parseFloat(seller.ticketMedio).toLocaleString('pt-BR')}</td>
                            <td className="p-3 text-right text-green-600">R$ {parseFloat(seller.comissaoTotal).toLocaleString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhuma venda no período</p>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="custos" className="mt-0">
            {isLoadingCosts ? (
              <div className="grid gap-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-96 w-full" />
              </div>
            ) : (
              <div className="space-y-6 overflow-y-auto pb-8">
                {/* Resumo de custos */}
                <motion.div 
                  className="grid gap-6 md:grid-cols-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                  >
                    <Card className="p-6 hover-elevate transition-all duration-300 cursor-default" data-testid="card-total-custos">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-500/10 transition-colors">
                          <Wallet className="h-5 w-5 text-red-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Total de Custos</p>
                      </div>
                      <p className="text-2xl font-bold text-red-600 transition-all">
                        R$ {filteredCosts.reduce((sum, c) => sum + Number(c.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {filteredCosts.length} custos registrados
                      </p>
                    </Card>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <Card className="p-6 hover-elevate transition-all duration-300 cursor-default" data-testid="card-veiculos-com-custos">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10 transition-colors">
                          <Car className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Veículos com Custos</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 transition-all">
                        {new Set(filteredCosts.map(c => c.vehicleId)).size}
                      </p>
                    </Card>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <Card className="p-6 hover-elevate transition-all duration-300 cursor-default" data-testid="card-custo-medio">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-500/10 transition-colors">
                          <DollarSign className="h-5 w-5 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Custo Médio</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-600 transition-all">
                        R$ {filteredCosts.length > 0 
                          ? (filteredCosts.reduce((sum, c) => sum + Number(c.value), 0) / filteredCosts.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                          : '0,00'
                        }
                      </p>
                    </Card>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                  >
                    <Card className="p-6 hover-elevate transition-all duration-300 cursor-default" data-testid="card-categorias">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-500/10 transition-colors">
                          <Package className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Categorias</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600 transition-all">
                        {new Set(filteredCosts.map(c => c.category)).size}
                      </p>
                    </Card>
                  </motion.div>
                </motion.div>
                
                {/* Gráfico de custos por categoria */}
                <Card className="p-6">
                  <h3 className="mb-6 text-lg font-semibold flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Custos por Categoria
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getCostsByCategoryData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`} />
                      <Bar dataKey="value" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                
                {/* Filtros e lista de custos */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Custos Recentes
                  </h3>
                  
                  {/* Filtros */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por descrição, veículo..."
                        value={costSearchTerm}
                        onChange={(e) => setCostSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-cost-search"
                      />
                    </div>
                    
                    <Select value={costCategoryFilter} onValueChange={setCostCategoryFilter}>
                      <SelectTrigger className="w-48" data-testid="select-cost-category">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas Categorias</SelectItem>
                        {Array.from(new Set(allCosts.map((c: any) => c.category))).map((cat: any) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={costPaymentMethodFilter} onValueChange={setCostPaymentMethodFilter}>
                      <SelectTrigger className="w-48" data-testid="select-cost-payment">
                        <SelectValue placeholder="Forma de Pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas Formas</SelectItem>
                        {Array.from(new Set(allCosts.map((c: any) => c.paymentMethod))).filter(Boolean).map((pm: any) => (
                          <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Tabela de custos */}
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-costs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Data</th>
                          <th className="text-left p-3">Veículo</th>
                          <th className="text-left p-3">Categoria</th>
                          <th className="text-left p-3">Descrição</th>
                          <th className="text-left p-3">Forma Pgto</th>
                          <th className="text-left p-3">Quem Pagou</th>
                          <th className="text-right p-3">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCosts
                          .filter((cost: any) => {
                            // Filtro de busca
                            if (costSearchTerm) {
                              const searchLower = costSearchTerm.toLowerCase();
                              const matchesDesc = cost.description?.toLowerCase().includes(searchLower);
                              const matchesVehicle = `${cost.vehicleBrand} ${cost.vehicleModel} ${cost.vehiclePlate}`.toLowerCase().includes(searchLower);
                              const matchesPaidBy = cost.paidBy?.toLowerCase().includes(searchLower);
                              if (!matchesDesc && !matchesVehicle && !matchesPaidBy) return false;
                            }
                            // Filtro de categoria
                            if (costCategoryFilter !== "all" && cost.category !== costCategoryFilter) return false;
                            // Filtro de forma de pagamento
                            if (costPaymentMethodFilter !== "all" && cost.paymentMethod !== costPaymentMethodFilter) return false;
                            return true;
                          })
                          .slice(0, 50) // Limitar a 50 itens
                          .map((cost: any) => (
                            <tr key={cost.id} className="border-b hover:bg-muted/50" data-testid={`row-cost-${cost.id}`}>
                              <td className="p-3 text-sm">
                                {format(new Date(cost.date), "dd/MM/yyyy", { locale: ptBR })}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Car className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium text-sm">{cost.vehicleBrand} {cost.vehicleModel}</p>
                                    <p className="text-xs text-muted-foreground">{cost.vehiclePlate}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="text-xs px-2 py-1 rounded bg-muted">{cost.category}</span>
                              </td>
                              <td className="p-3 text-sm max-w-[200px] truncate" title={cost.description}>
                                {cost.description}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs">{cost.paymentMethod || '-'}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                {cost.paidBy ? (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs">{cost.paidBy}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-medium text-red-600">
                                R$ {Number(cost.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold">
                          <td colSpan={6} className="p-3 text-right">Total Filtrado:</td>
                          <td className="p-3 text-right text-red-600">
                            R$ {filteredCosts
                              .filter((cost: any) => {
                                if (costSearchTerm) {
                                  const searchLower = costSearchTerm.toLowerCase();
                                  const matchesDesc = cost.description?.toLowerCase().includes(searchLower);
                                  const matchesVehicle = `${cost.vehicleBrand} ${cost.vehicleModel} ${cost.vehiclePlate}`.toLowerCase().includes(searchLower);
                                  const matchesPaidBy = cost.paidBy?.toLowerCase().includes(searchLower);
                                  if (!matchesDesc && !matchesVehicle && !matchesPaidBy) return false;
                                }
                                if (costCategoryFilter !== "all" && cost.category !== costCategoryFilter) return false;
                                if (costPaymentMethodFilter !== "all" && cost.paymentMethod !== costPaymentMethodFilter) return false;
                                return true;
                              })
                              .reduce((sum: number, c: any) => sum + Number(c.value), 0)
                              .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {filteredCosts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Nenhum custo registrado no período</p>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        inventoryContent
      )}
    </div>
  );
}
