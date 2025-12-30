import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { VehicleCard, VehicleCardProps } from "./VehicleCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, LayoutGrid, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const STATUS_COLUMNS = [
  "Entrada",
  "Em Reparos",
  "Em Higienização",
  "Pronto para Venda",
];

const INITIAL_LIMIT = 50;
const LOAD_MORE_INCREMENT = 25;
const DEBOUNCE_DELAY = 300;

interface KanbanBoardProps {
  vehicles: VehicleCardProps[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface UndoState {
  vehicleId: string;
  vehicleModel: string;
  fromStatus: string;
  toStatus: string;
  timeLeft: number;
}

export function KanbanBoard({ vehicles }: KanbanBoardProps) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);
  const [draggedVehicle, setDraggedVehicle] = useState<any | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  
  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);

  const updateVehicleMutation = useMutation({
    mutationFn: async (data: { vehicleId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/vehicles/${data.vehicleId}`, { status: data.status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (data: { vehicleId: string; fromStatus: string }) => {
      const res = await apiRequest("PATCH", `/api/vehicles/${data.vehicleId}`, { status: data.fromStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setUndoState(null);
    },
  });
  
  const prevVehiclesLength = useRef(vehicles.length);
  useEffect(() => {
    if (vehicles.length !== prevVehiclesLength.current) {
      setDisplayLimit(INITIAL_LIMIT);
      prevVehiclesLength.current = vehicles.length;
    }
  }, [vehicles.length]);

  const getStatusTranslation = useCallback((status: string) => {
    const statusMap: Record<string, string> = {
      "Entrada": t("vehicles.status.intake"),
      "Em Reparos": t("vehicles.status.repair"),
      "Em Higienização": t("vehicles.status.cleaning"),
      "Pronto para Venda": t("vehicles.status.ready"),
    };
    return statusMap[status] || status;
  }, [t]);

  const filteredVehicles = useMemo(() => {
    const searchLower = debouncedSearchTerm.toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !searchLower ||
        vehicle.brand.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        vehicle.plate?.toLowerCase().includes(searchLower);
      
      const vehicleStatus = (vehicle as any).status;
      const matchesStatus =
        statusFilter === "all" || vehicleStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, debouncedSearchTerm, statusFilter]);

  const limitedVehicles = useMemo(() => {
    return filteredVehicles.slice(0, displayLimit);
  }, [filteredVehicles, displayLimit]);

  const hasMoreVehicles = useMemo(() => {
    return filteredVehicles.length > displayLimit;
  }, [filteredVehicles.length, displayLimit]);

  const remainingCount = useMemo(() => {
    return filteredVehicles.length - displayLimit;
  }, [filteredVehicles.length, displayLimit]);

  const handleLoadMore = useCallback(() => {
    setDisplayLimit(prev => prev + LOAD_MORE_INCREMENT);
  }, []);

  const handleDragStart = (vehicle: any, e: React.DragEvent) => {
    setDraggedVehicle(vehicle);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnStatus = (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedVehicle || draggedVehicle.status === targetStatus) {
      setDraggedVehicle(null);
      return;
    }

    const previousStatus = draggedVehicle.status;
    const vehicleToMove = draggedVehicle;

    updateVehicleMutation.mutate({ vehicleId: vehicleToMove.id, status: targetStatus });
    
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current);
    }

    setUndoState({
      vehicleId: vehicleToMove.id,
      vehicleModel: `${vehicleToMove.brand} ${vehicleToMove.model}`,
      fromStatus: previousStatus,
      toStatus: targetStatus,
      timeLeft: 8,
    });

    undoTimerRef.current = setInterval(() => {
      setUndoState((prev) => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          if (undoTimerRef.current) {
            clearInterval(undoTimerRef.current);
          }
          return null;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    setDraggedVehicle(null);
  };

  const handleDragEnd = () => {
    setDraggedVehicle(null);
  };

  const handleUndo = () => {
    if (!undoState) return;
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current);
    }
    undoMutation.mutate({
      vehicleId: undoState.vehicleId,
      fromStatus: undoState.fromStatus,
    });
  };

  const handleCloseUndo = () => {
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current);
    }
    setUndoState(null);
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearInterval(undoTimerRef.current);
      }
    };
  }, []);

  const vehiclesByStatus = useMemo(() => {
    const result: Record<string, VehicleCardProps[]> = {};
    STATUS_COLUMNS.forEach(status => {
      result[status] = limitedVehicles.filter((v) => (v as any).status === status);
    });
    return result;
  }, [limitedVehicles]);

  const totalCountByStatus = useMemo(() => {
    const result: Record<string, number> = {};
    STATUS_COLUMNS.forEach(status => {
      result[status] = filteredVehicles.filter((v) => (v as any).status === status).length;
    });
    return result;
  }, [filteredVehicles]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center bg-card/50 dark:bg-card/30 p-3 rounded-xl border border-border/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("dashboard.searchByBrandModelPlate")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background border-border/60"
            data-testid="input-search-vehicle"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-background border-border/60" data-testid="select-status-filter">
              <SelectValue placeholder={t("dashboard.filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("vehicles.status.all")}</SelectItem>
              {STATUS_COLUMNS.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusTranslation(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filteredVehicles.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
              <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap" data-testid="text-vehicle-count">
                {limitedVehicles.length}/{filteredVehicles.length}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex h-full gap-3 pb-4 min-w-[900px] sm:min-w-0">
          {STATUS_COLUMNS.map((status) => {
            const vehiclesInStatus = vehiclesByStatus[status] || [];
            const totalInStatus = totalCountByStatus[status] || 0;
            return (
              <KanbanColumn
                key={status}
                title={getStatusTranslation(status)}
                count={totalInStatus}
                statusKey={status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnStatus(status, e)}
              >
                {vehiclesInStatus.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    draggable
                    onDragStart={(e) => handleDragStart(vehicle, e)}
                    onDragEnd={handleDragEnd}
                    className={`cursor-grab active:cursor-grabbing transition-all duration-200 ${
                      draggedVehicle?.id === vehicle.id 
                        ? 'opacity-50 scale-95' 
                        : ''
                    }`}
                    data-testid={`vehicle-drag-item-${vehicle.id}`}
                  >
                    <VehicleCard {...vehicle} />
                  </div>
                ))}
                {vehiclesInStatus.length < totalInStatus && (
                  <div className="text-center text-xs text-muted-foreground py-2 bg-muted/30 rounded-lg">
                    +{totalInStatus - vehiclesInStatus.length} {t("dashboard.moreVehicles")}
                  </div>
                )}
                {vehiclesInStatus.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                      <LayoutGrid className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <span className="text-xs text-muted-foreground">{t("dashboard.noVehicle")}</span>
                  </div>
                )}
              </KanbanColumn>
            );
          })}
        </div>
      </div>

      {hasMoreVehicles && (
        <div className="flex justify-center py-4 mt-2">
          <Button 
            variant="outline" 
            onClick={handleLoadMore}
            className="bg-card hover:bg-muted"
            data-testid="button-load-more"
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            {t("dashboard.loadMore", { count: remainingCount.toString() })}
          </Button>
        </div>
      )}

      {undoState && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card border border-border rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {undoState.vehicleModel}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Alterada: <span className="font-medium">{undoState.fromStatus}</span> → <span className="font-medium">{undoState.toStatus}</span>
                </p>
                <div className="mt-2 w-full bg-muted rounded-full h-1 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(undoState.timeLeft / 8) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUndo}
                  className="text-xs"
                  data-testid="button-undo-vehicle"
                >
                  Desfazer
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCloseUndo}
                  className="h-8 w-8"
                  data-testid="button-close-undo-vehicle"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
