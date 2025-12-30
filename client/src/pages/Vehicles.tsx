import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, ArrowLeft } from "lucide-react";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { FipeSearchDialog } from "@/components/FipeSearchDialog";
import { ImportVehiclesDialog } from "@/components/ImportVehiclesDialog";
import { Link } from "wouter";
import { usePermissions } from "@/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_ORDER = {
  "Pronto para Venda": 1,
  "Em Higienização": 2,
  "Em Reparos": 3,
  "Entrada": 4,
  "Vendido": 5,
  "Arquivado": 6,
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

export default function Vehicles() {
  const { t } = useI18n();
  const { isMotorista } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem("vehicles-sort-by") || "status";
  });
  
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
        throw new Error(t("vehicles.errorLoading"));
      }
      return response.json();
    },
  });

  const SORT_OPTIONS = useMemo(() => [
    { value: "location", label: t("vehicles.sortByLocation") },
    { value: "status", label: t("vehicles.sortByStatus") },
    { value: "brand", label: t("vehicles.sortByBrand") },
    { value: "year", label: t("vehicles.sortByYearNew") },
    { value: "year-old", label: t("vehicles.sortByYearOld") },
  ], [t]);

  const ALL_STATUS = useMemo(() => [
    t("vehicles.status.all"),
    t("vehicles.status.ready"),
    t("vehicles.status.cleaning"),
    t("vehicles.status.repair"),
    t("vehicles.status.intake"),
    t("vehicles.status.sold"),
    t("vehicles.status.archived"),
  ], [t]);

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

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    vehicles.forEach((v: any) => {
      if (v.physicalLocation) {
        locations.add(v.physicalLocation);
      }
    });
    return Array.from(locations).sort();
  }, [vehicles]);

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
      const matchesSearch = `${vehicle.brand} ${vehicle.model} ${vehicle.plate}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const isArchived = vehicle.status === "Arquivado";
      if (isArchived && sortBy === "status" && selectedStatus !== "Arquivado" && selectedStatus !== t("vehicles.status.archived")) {
        return false;
      }
      if (isArchived && sortBy !== "status") {
        return false;
      }

      if (sortBy === "location" && selectedLocation !== "all") {
        if (selectedLocation === "Outros" || selectedLocation === t("vehicles.others")) {
          const isKnownLocation = uniqueLocations.includes(vehicle.physicalLocation || "");
          if (isKnownLocation) return false;
        } else {
          if (vehicle.physicalLocation !== selectedLocation) return false;
        }
      }

      if (sortBy === "status" && selectedStatus !== t("vehicles.status.all") && selectedStatus !== "Todos os Status") {
        if (vehicle.status !== selectedStatus) return false;
      }

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
    <div className="flex h-full flex-col p-4 sm:p-8">
      <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("vehicles.title")}</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            {t("vehicles.manageVehicles")}
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <ImportVehiclesDialog />
          <FipeSearchDialog />
          <AddVehicleDialog />
        </div>
      </div>

      <div className="mb-4 sm:mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("vehicles.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 sm:gap-3 flex-wrap items-center">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-60">
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
          
          {sortBy === "location" && (
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder={t("vehicles.allLocations")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("vehicles.allLocations")}</SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
                <SelectItem value="Outros">{t("vehicles.others")}</SelectItem>
              </SelectContent>
            </Select>
          )}

          {sortBy === "status" && (
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={t("vehicles.status.all")}>{t("vehicles.status.all")}</SelectItem>
                <SelectItem value="Pronto para Venda">{t("vehicles.status.ready")}</SelectItem>
                <SelectItem value="Em Higienização">{t("vehicles.status.cleaning")}</SelectItem>
                <SelectItem value="Em Reparos">{t("vehicles.status.repair")}</SelectItem>
                <SelectItem value="Entrada">{t("vehicles.status.intake")}</SelectItem>
                <SelectItem value="Vendido">{t("vehicles.status.sold")}</SelectItem>
                <SelectItem value="Arquivado">{t("vehicles.status.archived")}</SelectItem>
              </SelectContent>
            </Select>
          )}

          {sortBy === "brand" && (
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder={t("vehicles.allBrands")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("vehicles.allBrands")}</SelectItem>
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

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : filteredVehicles.length === 0 ? (
          <p className="text-muted-foreground">{t("vehicles.noVehicles")}</p>
        ) : (
          filteredVehicles.map((vehicle: any) => (
            <Link key={vehicle.id} href={`/veiculo/${vehicle.id}`}>
              <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-muted/40">
                <CardHeader className="p-0">
                  <div className="aspect-video relative overflow-hidden rounded-t-lg bg-gradient-to-br from-muted/50 to-muted">
                    <img
                      src={vehicle.image || "/car-placeholder.png"}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <CardTitle className="text-lg font-bold transition-colors duration-300 group-hover:text-primary">
                    {vehicle.brand} {vehicle.model}
                  </CardTitle>
                  <div className="space-y-1.5 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-medium">{t("vehicles.year")}:</span> {vehicle.year}
                    </p>
                    <p className="text-muted-foreground font-mono">
                      <span className="font-medium font-sans">{t("vehicles.plate")}:</span> {vehicle.plate}
                    </p>
                    <div className="pt-1">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        {vehicle.status}
                      </span>
                    </div>
                    {vehicle.physicalLocation && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                        <span className="text-base">📍</span>
                        <span className="font-medium">
                          {vehicle.physicalLocation}
                          {vehicle.physicalLocationDetail && ` - ${vehicle.physicalLocationDetail}`}
                        </span>
                      </p>
                    )}
                    {vehicle.salePrice && (
                      <div className="pt-2 mt-2 border-t border-border/40">
                        <p className="text-lg font-bold text-primary">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(Number(vehicle.salePrice))}
                        </p>
                      </div>
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
