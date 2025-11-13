import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Clock, DollarSign, Package } from "lucide-react";
import { subMonths, startOfMonth } from "date-fns";
import { checklistItems, getChecklistStats, normalizeChecklistData } from "@shared/checklistUtils";

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [dateFilter, setDateFilter] = useState<string>("last-3-months");

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
      const locationChangedAt = new Date(v.locationChangedAt);
      const now = new Date();
      const daysInStatus = Math.floor((now.getTime() - locationChangedAt.getTime()) / (1000 * 60 * 60 * 24));

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
        const locationChangedAt = new Date(v.locationChangedAt);
        const now = new Date();
        const daysInStatus = Math.floor((now.getTime() - locationChangedAt.getTime()) / (1000 * 60 * 60 * 24));
        
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
                  let totalItemsAcrossVehicles = 0;
                  let completedItemsAcrossVehicles = 0;
                  
                  filteredVehicles.forEach((v) => {
                    const normalized = normalizeChecklistData(v.checklist || {});
                    const stats = getChecklistStats(normalized, v.checklist);
                    
                    totalItemsAcrossVehicles += stats.totalItems;
                    completedItemsAcrossVehicles += stats.checkedItems;
                  });

                  const completionRate = totalItemsAcrossVehicles > 0 
                    ? Math.round((completedItemsAcrossVehicles / totalItemsAcrossVehicles) * 100) 
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
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total de Itens</p>
                          <p className="text-xl font-semibold">{totalItemsAcrossVehicles}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Concluídos</p>
                          <p className="text-xl font-semibold text-green-600">{completedItemsAcrossVehicles}</p>
                        </div>
                      </div>
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
                {observations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nenhuma observação registrada</p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const pendingObs = observations.filter((o: any) => o.status === "Pendente").length;
                      const resolvedObs = observations.filter((o: any) => o.status === "Resolvido").length;
                      const totalObs = observations.length;

                      return (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                              <p className="text-2xl font-bold text-yellow-600">{pendingObs}</p>
                              <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
                            </div>
                            <div className="text-center p-4 bg-green-500/10 rounded-lg">
                              <p className="text-2xl font-bold text-green-600">{resolvedObs}</p>
                              <p className="text-xs text-muted-foreground mt-1">Resolvidas</p>
                            </div>
                          </div>
                          <div className="pt-4">
                            <p className="text-sm text-muted-foreground">Total de Observações</p>
                            <p className="text-3xl font-bold">{totalObs}</p>
                          </div>
                          {pendingObs > 0 && (
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                              <p className="text-sm font-medium text-yellow-700">
                                ⚠️ Há {pendingObs} {pendingObs === 1 ? 'observação pendente' : 'observações pendentes'} que {pendingObs === 1 ? 'precisa' : 'precisam'} de atenção
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
