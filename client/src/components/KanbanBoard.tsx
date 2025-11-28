import { useState, useMemo, useCallback, memo } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { VehicleCard, VehicleCardProps } from "./VehicleCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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

interface KanbanBoardProps {
  vehicles: VehicleCardProps[];
}

function KanbanBoardComponent({ vehicles }: KanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.plate?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const vehicleStatus = (vehicle as any).status;
      const matchesStatus =
        statusFilter === "all" || vehicleStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, statusFilter]);

  const getVehiclesByStatus = useCallback((status: string) => {
    return filteredVehicles.filter((v) => (v as any).status === status);
  }, [filteredVehicles]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
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
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full gap-4 pb-4">
          {STATUS_COLUMNS.map((status) => {
            const vehiclesInStatus = getVehiclesByStatus(status);
            return (
              <KanbanColumn
                key={status}
                title={status}
                count={vehiclesInStatus.length}
              >
                {vehiclesInStatus.map((vehicle) => (
                  <VehicleCard key={vehicle.id} {...vehicle} />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const KanbanBoard = memo(KanbanBoardComponent);
