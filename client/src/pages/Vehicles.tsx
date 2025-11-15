import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown } from "lucide-react";
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

const STATUS_ORDER = {
  "Pronto para Venda": 1,
  "Em Higienização": 2,
  "Em Documentação": 3,
  "Aguardando Peças": 4,
  "Em Reparos": 5,
  "Entrada": 6,
  "Vendido": 7,
  "Arquivado": 8,
};

const LOCATION_PRIORITY = {
  "Pronto para venda": 1,
  "Loja": 2,
  "Na Casa": 2,
  "Loja Principal": 2,
  "Outra Loja": 3,
  "Filial": 3,
  "Oficina": 4,
  "Oficina Mecânica": 4,
  "Funilaria": 5,
  "Outros": 6,
  "": 999,
};

const SORT_OPTIONS = [
  { value: "location", label: "Ordenar por Localização" },
  { value: "status", label: "Ordenar por Status" },
  { value: "brand", label: "Ordenar por Marca" },
  { value: "year", label: "Ordenar por Ano (Mais Novo)" },
  { value: "year-old", label: "Ordenar por Ano (Mais Antigo)" },
];

const PRIORITY_STATUS_OPTIONS = [
  { value: "Pronto para Venda", label: "Pronto para Venda" },
  { value: "Em Higienização", label: "Em Higienização" },
  { value: "Em Documentação", label: "Em Documentação" },
  { value: "Aguardando Peças", label: "Aguardando Peças" },
  { value: "Em Reparos", label: "Em Reparos" },
  { value: "Entrada", label: "Entrada" },
  { value: "Vendido", label: "Vendido" },
  { value: "Arquivado", label: "Arquivado" },
];

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem("vehicles-sort-by") || "location";
  });
  const [priorityStatus, setPriorityStatus] = useState(() => {
    return localStorage.getItem("vehicles-priority-status") || "Pronto para Venda";
  });

  const { data: vehicles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const response = await fetch("/api/vehicles");
      if (!response.ok) {
        throw new Error("Erro ao carregar veículos");
      }
      return response.json();
    },
  });

  // Salvar preferências de ordenação no localStorage
  useEffect(() => {
    localStorage.setItem("vehicles-sort-by", sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem("vehicles-priority-status", priorityStatus);
  }, [priorityStatus]);

  const filteredVehicles = vehicles
    .filter((vehicle: any) => {
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
    })
    .sort((a: any, b: any) => {
      if (sortBy === "location") {
        const locationA = a.physicalLocation || "";
        const locationB = b.physicalLocation || "";
        
        const priorityA = LOCATION_PRIORITY[locationA as keyof typeof LOCATION_PRIORITY] ?? 999;
        const priorityB = LOCATION_PRIORITY[locationB as keyof typeof LOCATION_PRIORITY] ?? 999;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        const statusOrderA = STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] || 999;
        const statusOrderB = STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] || 999;
        return statusOrderA - statusOrderB;
      } else if (sortBy === "status") {
        // Se é o status prioritário, vai primeiro
        const aIsPriority = a.status === priorityStatus;
        const bIsPriority = b.status === priorityStatus;
        
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        
        // Se ambos são ou não são o status prioritário, usa ordem padrão
        const statusOrderA = STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] || 999;
        const statusOrderB = STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] || 999;
        return statusOrderA - statusOrderB;
      } else if (sortBy === "brand") {
        return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
      } else if (sortBy === "year") {
        return (b.year || 0) - (a.year || 0);
      } else if (sortBy === "year-old") {
        return (a.year || 0) - (b.year || 0);
      }
      return 0;
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

      <div className="mb-6 flex gap-4 flex-wrap">
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
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[240px]">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sortBy === "status" && (
          <Select value={priorityStatus} onValueChange={setPriorityStatus}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Status prioritário" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
