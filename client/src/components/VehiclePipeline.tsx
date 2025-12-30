import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UndoNotification } from "@/components/UndoNotification";
import { apiRequest } from "@/lib/queryClient";

const STATUSES = [
  "Entrada",
  "Em Reparos",
  "Em Higienização",
  "Pronto para Venda",
  "Vendido",
  "Arquivado",
];

const STATUS_COLORS: Record<string, string> = {
  "Entrada": "border-blue-500/50 bg-blue-500/5",
  "Em Reparos": "border-orange-500/50 bg-orange-500/5",
  "Em Higienização": "border-purple-500/50 bg-purple-500/5",
  "Pronto para Venda": "border-green-500/50 bg-green-500/5",
  "Vendido": "border-gray-500/50 bg-gray-500/5",
  "Arquivado": "border-red-500/50 bg-red-500/5",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  "Entrada": "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  "Em Reparos": "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  "Em Higienização": "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  "Pronto para Venda": "bg-green-500/20 text-green-700 dark:text-green-300",
  "Vendido": "bg-gray-500/20 text-gray-700 dark:text-gray-300",
  "Arquivado": "bg-red-500/20 text-red-700 dark:text-red-300",
};

interface UndoState {
  vehicleId: string;
  vehicleModel: string;
  fromStatus: string;
  toStatus: string;
}

export function VehiclePipeline({ searchTerm }: { searchTerm: string }) {
  const [draggedVehicle, setDraggedVehicle] = useState<any | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const queryClient = useQueryClient();
  const dragOverStatus = useRef<string | null>(null);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const response = await fetch("/api/vehicles");
      if (!response.ok) throw new Error("Erro ao carregar veículos");
      return response.json();
    },
  }) as any;

  const updateVehicleMutation = useMutation({
    mutationFn: async (data: { vehicleId: string; status: string }) => {
      return apiRequest({
        method: "PATCH",
        url: `/api/vehicles/${data.vehicleId}`,
        body: { status: data.status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (data: { vehicleId: string; fromStatus: string }) => {
      return apiRequest({
        method: "PATCH",
        url: `/api/vehicles/${data.vehicleId}`,
        body: { status: data.fromStatus },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setUndoState(null);
    },
  });

  const handleDragStart = (vehicle: any) => {
    setDraggedVehicle(vehicle);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedVehicle || draggedVehicle.status === targetStatus) {
      setDraggedVehicle(null);
      return;
    }

    const previousStatus = draggedVehicle.status;
    
    updateVehicleMutation.mutate(
      { vehicleId: draggedVehicle.id, status: targetStatus },
      {
        onSuccess: () => {
          setUndoState({
            vehicleId: draggedVehicle.id,
            vehicleModel: `${draggedVehicle.brand} ${draggedVehicle.model}`,
            fromStatus: previousStatus,
            toStatus: targetStatus,
          });
        },
      }
    );

    setDraggedVehicle(null);
  };

  const handleUndo = () => {
    if (!undoState) return;
    undoMutation.mutate({
      vehicleId: undoState.vehicleId,
      fromStatus: undoState.fromStatus,
    });
  };

  const filteredVehicles = vehicles.filter(
    (v: any) =>
      `${v.brand} ${v.model} ${v.plate}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="grid gap-4 auto-cols-max grid-flow-col overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const vehiclesInStatus = filteredVehicles.filter(
            (v: any) => v.status === status
          );

          return (
            <div
              key={status}
              className="flex-shrink-0 w-72 min-h-96"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(status, e)}
            >
              <Card className={`h-full border-2 ${STATUS_COLORS[status]}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{status}</span>
                    <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                      {vehiclesInStatus.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[calc(100%-80px)] overflow-y-auto">
                  {vehiclesInStatus.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Nenhum veículo
                    </p>
                  ) : (
                    vehiclesInStatus.map((vehicle: any) => (
                      <Link
                        key={vehicle.id}
                        href={`/veiculo/${vehicle.id}`}
                        onClick={(e) => e.preventDefault()}
                      >
                        <div
                          draggable
                          onDragStart={() => handleDragStart(vehicle)}
                          className="p-3 bg-card border border-border rounded-lg cursor-move hover:shadow-md transition-all hover:border-primary/50 active:opacity-50"
                          data-testid={`vehicle-card-${vehicle.id}`}
                        >
                          {vehicle.mainImageUrl && (
                            <img
                              src={vehicle.mainImageUrl}
                              alt={`${vehicle.brand} ${vehicle.model}`}
                              className="w-full h-24 object-cover rounded mb-2"
                            />
                          )}
                          <p className="font-semibold text-sm truncate">
                            {vehicle.brand} {vehicle.model}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {vehicle.plate}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {vehicle.year}
                          </p>
                          {vehicle.salePrice && (
                            <p className="text-xs font-semibold text-primary mt-1">
                              R${" "}
                              {Number(vehicle.salePrice).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {undoState && (
        <UndoNotification
          vehicleModel={undoState.vehicleModel}
          fromStatus={undoState.fromStatus}
          toStatus={undoState.toStatus}
          onUndo={handleUndo}
          onClose={() => setUndoState(null)}
        />
      )}
    </>
  );
}
