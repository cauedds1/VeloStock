import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Clock, DollarSign, Package, CheckCircle2, AlertCircle } from "lucide-react";
import { subMonths, startOfMonth } from "date-fns";
import { checklistItems, getChecklistStats, normalizeChecklistData, hasChecklistStarted } from "@shared/checklistUtils";

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [dateFilter, setDateFilter] = useState<string>("last-3-months");
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistDialogType, setChecklistDialogType] = useState<"completed" | "missing">("missing");
  const [observationsDialogOpen, setObservationsDialogOpen] = useState(false);
  const [observationsDialogType, setObservationsDialogType] = useState<"pending" | "resolved">("pending");

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: allCosts = [], isLoading: isLoadingCosts } = useQuery<any[]>({
    queryKey: ["/api/costs/all"],
  });

  const { data: observations = [] } = useQuery<any[]>({
    queryKey: ["/api/store-observations"],
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
      categoryMap.set(cost.category, current + cost.value);
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value: value / 100 }))
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
  const totalCosts = filteredCosts.reduce((sum, c) => sum + c.value, 0) / 100;

  const isLoading = isLoadingVehicles || isLoadingCosts;

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

      {isLoading ? (
        <div className="grid gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="space-y-6 overflow-y-auto pb-8">
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Veículos</p>
                  <p className="text-2xl font-bold">{filteredVehicles.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prontos p/ Venda</p>
                  <p className="text-2xl font-bold">
                    {filteredVehicles.filter(v => v.status === "Pronto para Venda").length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custos Totais</p>
                  <p className="text-2xl font-bold">R$ {totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média de Dias</p>
                  <p className="text-2xl font-bold">
                    {avgTimePerStage.length > 0
                      ? Math.round(avgTimePerStage.reduce((sum, s) => sum + s.dias, 0) / avgTimePerStage.length)
                      : 0}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-6 text-lg font-semibold flex items-center gap-2">
              <BarChart className="h-5 w-5" />
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
            <Card className="p-6">
              <h3 className="mb-6 text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
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

            <Card className="p-6">
              <h3 className="mb-6 text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Análise de Custos por Categoria
              </h3>
              {costsByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costsByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: R$ ${entry.value.toFixed(0)}`}
                      outerRadius={80}
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
              ) : (
                <p className="text-center text-sm text-muted-foreground py-12">
                  Nenhum custo registrado
                </p>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-6 text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
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
                      <tr key={vehicle.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm">{vehicle.name}</td>
                        <td className="p-3 text-sm font-mono">{vehicle.plate}</td>
                        <td className="p-3 text-sm">{vehicle.status}</td>
                        <td className="p-3 text-sm text-right font-bold">
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
            <Card className="p-6">
              <h3 className="mb-6 text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
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
    </div>
  );
}
