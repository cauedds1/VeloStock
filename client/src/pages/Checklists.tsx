import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ChecklistItemStatus } from "@/components/ChecklistItemStatus";
import { 
  checklistItems,
  checklistCategories,
  getChecklistStats,
  getChecklistItemStatus,
  normalizeChecklistData
} from "@shared/checklistUtils";

export default function Checklists() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");

  const { data: vehicles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  const activeVehicles = vehicles.filter(
    v => v.status !== "Vendido" && v.status !== "Arquivado"
  );

  const filteredVehicles =
    selectedVehicle === "all"
      ? activeVehicles
      : activeVehicles.filter(v => v.id === selectedVehicle);

  const getVehicleChecklistStats = (vehicle: any) => {
    const normalizedChecklist = normalizeChecklistData(vehicle.checklist);
    return getChecklistStats(normalizedChecklist, vehicle.checklist);
  };

  const getCategoryStatus = (vehicle: any, category: keyof typeof checklistItems) => {
    const normalizedChecklist = normalizeChecklistData(vehicle.checklist);
    const categoryItems = checklistItems[category];
    const completed = (normalizedChecklist[category] || []).length;
    return {
      completed,
      total: categoryItems.length,
      percentage: Math.round((completed / categoryItems.length) * 100)
    };
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col p-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Checklists</h1>
          <p className="mt-2 text-muted-foreground">
            Acompanhe o progresso dos checklists de todos os veículos
          </p>
        </div>
        <div className="w-64">
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por veículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Veículos</SelectItem>
              {activeVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand} {vehicle.model} - {vehicle.plate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhum veículo encontrado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Link href={`/veiculo/${vehicle.id}`}>
                      <CardTitle className="hover:text-primary cursor-pointer">
                        {vehicle.brand} {vehicle.model} - {vehicle.year}
                      </CardTitle>
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      {vehicle.plate} • {vehicle.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {getVehicleChecklistStats(vehicle).completionPercentage}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Completo
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {(Object.keys(checklistItems) as Array<keyof typeof checklistItems>).map((category) => {
                    const status = getCategoryStatus(vehicle, category);
                    const items = checklistItems[category];

                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-primary" />
                            {checklistCategories[category]}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {status.completed}/{status.total}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {items.map((itemName, idx) => {
                            const normalizedChecklist = normalizeChecklistData(vehicle.checklist);
                            const itemStatus = getChecklistItemStatus(category, itemName, normalizedChecklist);
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-2 text-xs p-1.5 rounded ${
                                  itemStatus !== "pending"
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <ChecklistItemStatus status={itemStatus} size={14} className="flex-shrink-0" />
                                <span className="truncate">{itemName}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${status.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
