import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown } from "lucide-react";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { FipeSearchDialog } from "@/components/FipeSearchDialog";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_STATUS = [
  "Pronto para Venda",
  "Em Higienização",
  "Em Documentação",
  "Aguardando Peças",
  "Em Reparos",
  "Entrada",
  "Vendido",
  "Arquivado",
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

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem("vehicles-sort-by") || "location";
  });
  
  // Filtros específicos para cada tipo de ordenação
  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    return localStorage.getItem("vehicles-selected-location") || "all";
  });
  const [selectedStatus, setSelectedStatus] = useState<string>(() => {
    return localStorage.getItem("vehicles-selected-status") || "Pronto para Venda";
  });
  const [selectedBrand, setSelectedBrand] = useState<string>(() => {
    return localStorage.getItem("vehicles-selected-brand") || "all";
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

  // Salvar preferências no localStorage
  useEffect(() => {
    localStorage.setItem("vehicles-sort-by", sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem("vehicles-selected-location", selectedLocation);
  }, [selectedLocation]);

  useEffect(() => {
    localStorage.setItem("vehicles-selected-status", selectedStatus);
  }, [selectedStatus]);

  useEffect(() => {
    localStorage.setItem("vehicles-selected-brand", selectedBrand);
  }, [selectedBrand]);

  // Extrair localizações únicas dos veículos
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    vehicles.forEach((v: any) => {
      if (v.physicalLocation) {
        locations.add(v.physicalLocation);
      }
    });
    return Array.from(locations).sort();
  }, [vehicles]);

  // Extrair marcas únicas dos veículos
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    vehicles.forEach((v: any) => {
      if (v.brand) {
        brands.add(v.brand);
      }
    });
    return Array.from(brands).sort();
  }, [vehicles]);

  const filteredVehicles = vehicles
    .filter((vehicle: any) => {
      // Busca por texto
      const matchesSearch = `${vehicle.brand} ${vehicle.model} ${vehicle.plate}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      // Sempre oculta arquivados, exceto se selecionado explicitamente
      const isArchived = vehicle.status === "Arquivado";
      if (isArchived && sortBy === "status" && selectedStatus !== "Arquivado") {
        return false;
      }
      if (isArchived && sortBy !== "status") {
        return false;
      }

      // Filtrar por localização
      if (sortBy === "location" && selectedLocation !== "all") {
        if (selectedLocation === "Outros") {
          // Mostrar veículos sem localização ou com localização não padrão
          const isKnownLocation = uniqueLocations.includes(vehicle.physicalLocation || "");
          if (isKnownLocation) return false;
        } else {
          if (vehicle.physicalLocation !== selectedLocation) return false;
        }
      }

      // Filtrar por status
      if (sortBy === "status") {
        if (vehicle.status !== selectedStatus) return false;
      }

      // Filtrar por marca
      if (sortBy === "brand" && selectedBrand !== "all") {
        if (vehicle.brand !== selectedBrand) return false;
      }
      
      return matchesSearch;
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
      <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Veículos</h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie todos os veículos do estoque
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <FipeSearchDialog />
          <AddVehicleDialog />
        </div>
      </div>

      {/* Filtros reorganizados */}
      <div className="mb-6 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar veículo por marca, modelo ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Linha de filtros */}
        <div className="flex gap-3 flex-wrap items-center">
          {/* Select principal de ordenação */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-60">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Dropdown de Localizações */}
          {sortBy === "location" && (
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todas as Localizações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Localizações</SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Dropdown de Status */}
          {sortBy === "status" && (
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Dropdown de Marcas */}
          {sortBy === "brand" && (
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todas as Marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Marcas</SelectItem>
                {uniqueBrands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
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
                        }).format(Number(vehicle.salePrice))}
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
