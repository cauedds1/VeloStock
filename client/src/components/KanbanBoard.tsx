import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { VehicleCard, VehicleCardProps } from "./VehicleCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function KanbanBoard({ vehicles }: KanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);
  
  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);
  
  const prevVehiclesLength = useRef(vehicles.length);
  useEffect(() => {
    if (vehicles.length !== prevVehiclesLength.current) {
      setDisplayLimit(INITIAL_LIMIT);
      prevVehiclesLength.current = vehicles.length;
    }
  }, [vehicles.length]);

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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar veículo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-vehicle"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-64" data-testid="select-status-filter">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {STATUS_COLUMNS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filteredVehicles.length > 0 && (
          <span className="text-sm text-muted-foreground whitespace-nowrap" data-testid="text-vehicle-count">
            {limitedVehicles.length} de {filteredVehicles.length} veículos
          </span>
        )}
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full gap-4 pb-4">
          {STATUS_COLUMNS.map((status) => {
            const vehiclesInStatus = vehiclesByStatus[status] || [];
            const totalInStatus = totalCountByStatus[status] || 0;
            return (
              <KanbanColumn
                key={status}
                title={status}
                count={totalInStatus}
              >
                <div className="space-y-3">
                  {vehiclesInStatus.map((vehicle) => (
                    <VehicleCard key={vehicle.id} {...vehicle} />
                  ))}
                </div>
                {vehiclesInStatus.length < totalInStatus && (
                  <div className="text-center text-xs text-muted-foreground py-2">
                    +{totalInStatus - vehiclesInStatus.length} mais
                  </div>
                )}
              </KanbanColumn>
            );
          })}
        </div>
      </div>

      {hasMoreVehicles && (
        <div className="flex justify-center py-4 border-t border-border">
          <Button 
            variant="outline" 
            onClick={handleLoadMore}
            data-testid="button-load-more"
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Carregar mais ({remainingCount} restantes)
          </Button>
        </div>
      )}
    </div>
  );
}
