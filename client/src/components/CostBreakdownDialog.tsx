import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CostBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CostBreakdownDialog({ open, onOpenChange }: CostBreakdownDialogProps) {
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { data: allVehicles = [], isLoading: isLoadingVehicles } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
    enabled: open,
  });

  const { data: allCosts = [], isLoading: isLoadingCosts } = useQuery<any[]>({
    queryKey: ["/api/costs/all"],
    enabled: open,
  });

  const getFilteredCosts = () => {
    if (dateFilter === "all") return allCosts;

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
      default:
        return allCosts;
    }

    return allCosts.filter((cost) => {
      const costDate = new Date(cost.date);
      return costDate >= startDate;
    });
  };

  const filteredCosts = getFilteredCosts();

  const getCostsByCategory = () => {
    const categoryMap = new Map<string, number>();
    filteredCosts.forEach((cost) => {
      const current = categoryMap.get(cost.category) || 0;
      categoryMap.set(cost.category, current + Number(cost.value));
    });
    return Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  };

  const getCostsByVehicle = () => {
    const vehicleMap = new Map<string, { brand: string; model: string; total: number }>();
    
    filteredCosts.forEach((cost) => {
      const vehicle = allVehicles.find((v) => v.id === cost.vehicleId);
      if (vehicle) {
        const key = cost.vehicleId;
        const current = vehicleMap.get(key);
        if (current) {
          vehicleMap.set(key, { ...current, total: current.total + Number(cost.value) });
        } else {
          vehicleMap.set(key, {
            brand: vehicle.brand,
            model: vehicle.model,
            total: Number(cost.value),
          });
        }
      }
    });

    return Array.from(vehicleMap.values()).sort((a, b) => b.total - a.total);
  };

  const getTopExpenses = () => {
    return filteredCosts
      .slice()
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, 10)
      .map((cost) => {
        const vehicle = allVehicles.find((v) => v.id === cost.vehicleId);
        return {
          ...cost,
          vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : "Veículo não encontrado",
        };
      });
  };

  const totalCosts = filteredCosts.reduce((sum, cost) => sum + Number(cost.value), 0);
  const costsByCategory = getCostsByCategory();
  const costsByVehicle = getCostsByVehicle();
  const topExpenses = getTopExpenses();

  const isLoading = isLoadingVehicles || isLoadingCosts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Análise Detalhada de Custos
          </DialogTitle>
          <DialogDescription>
            Breakdown completo dos custos por categoria, veículo e período
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Custos</p>
              <p className="text-3xl font-bold text-primary">
                R$ {Number(totalCosts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48">
                <Calendar className="h-4 w-4 mr-2" />
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
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Custos por Categoria
                </h3>
                <div className="space-y-3">
                  {costsByCategory.length > 0 ? (
                    costsByCategory.map(({ category, total }) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{category}</span>
                            <span className="text-sm font-bold">
                              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${(total / totalCosts) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum custo registrado</p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Custos por Veículo</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {costsByVehicle.length > 0 ? (
                    costsByVehicle.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded">
                        <span className="text-sm font-medium">
                          {item.brand} {item.model}
                        </span>
                        <span className="text-sm font-bold text-primary">
                          R$ {Number(item.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum custo registrado</p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Top 10 Maiores Despesas</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {topExpenses.length > 0 ? (
                    topExpenses.map((expense) => (
                      <div key={expense.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{expense.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {expense.vehicleName} • {expense.category}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(expense.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-destructive">
                            R$ {Number(expense.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma despesa registrada</p>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
