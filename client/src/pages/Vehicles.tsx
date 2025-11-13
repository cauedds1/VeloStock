import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os Status" },
  { value: "Entrada", label: "Entrada" },
  { value: "Em Reparos", label: "Em Reparos" },
  { value: "Em Higienização", label: "Em Higienização" },
  { value: "Pronto para Venda", label: "Pronto para Venda" },
  { value: "Vendido", label: "Vendido" },
  { value: "Arquivado", label: "Arquivado" },
];

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: vehicles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  const filteredVehicles = vehicles.filter((vehicle: any) => {
    const matchesSearch = `${vehicle.brand} ${vehicle.model} ${vehicle.plate}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    // Oculta veículos arquivados por padrão, a menos que o filtro seja especificamente "Arquivado"
    const isArchived = vehicle.status === "Arquivado";
    if (statusFilter !== "Arquivado" && isArchived && statusFilter !== "all") {
      return false;
    }
    
    // Se o filtro for "all", exclui arquivados
    if (statusFilter === "all" && isArchived) {
      return false;
    }
    
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Veículos</h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie todos os veículos do estoque
          </p>
        </div>
        <AddVehicleDialog />
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar veículo por marca, modelo ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : filteredVehicles.length === 0 ? (
          <p className="text-muted-foreground">Nenhum veículo encontrado</p>
        ) : (
          filteredVehicles.map((vehicle: any) => (
            <Link key={vehicle.id} href={`/veiculo/${vehicle.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader className="p-0">
                  <div className="aspect-video relative overflow-hidden rounded-t-lg bg-muted">
                    <img
                      src={vehicle.image || "/car-placeholder.png"}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="mb-2 text-lg">
                    {vehicle.brand} {vehicle.model}
                  </CardTitle>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Ano: {vehicle.year}</p>
                    <p>Placa: {vehicle.plate}</p>
                    <p className="font-medium text-foreground">
                      {vehicle.status}
                    </p>
                    {vehicle.physicalLocation && (
                      <p className="flex items-center gap-1 text-xs">
                        <span>📍</span>
                        {vehicle.physicalLocation}
                        {vehicle.physicalLocationDetail && ` - ${vehicle.physicalLocationDetail}`}
                      </p>
                    )}
                    {vehicle.salePrice && (
                      <p className="text-base font-bold text-primary mt-2">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(vehicle.salePrice / 100)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
