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
import { useI18n } from "@/lib/i18n";
import { 
  getChecklistStats,
  getChecklistItemStatus,
  normalizeChecklistData,
  getChecklistCategories,
  getChecklistItems,
  type VehicleType
} from "@shared/checklistUtils";

const categoryTranslationKeys: Record<string, Record<string, string>> = {
  Carro: {
    pneus: "checklist.categories.pneus",
    interior: "checklist.categories.interior",
    somEletrica: "checklist.categories.somEletrica",
    lataria: "checklist.categories.lataria",
    documentacao: "checklist.categories.documentacao",
    equipamentos: "checklist.categories.equipamentos",
  },
  Moto: {
    pneus: "checklist.categories.pneus",
    interior: "checklist.categories.interiorMoto",
    somEletrica: "checklist.categories.somEletricaMoto",
    lataria: "checklist.categories.latariaMoto",
    documentacao: "checklist.categories.documentacao",
    equipamentos: "checklist.categories.equipamentos",
  },
};

const itemTranslationKeys: Record<string, string> = {
  "Pneus Dianteiros": "checklist.items.pneusDianteiros",
  "Pneus Traseiros": "checklist.items.pneusTraseiros",
  "Pneu Dianteiro": "checklist.items.pneuDianteiro",
  "Pneu Traseiro": "checklist.items.pneuTraseiro",
  "Calibragem": "checklist.items.calibragem",
  "Limpeza": "checklist.items.limpeza",
  "Estado dos bancos": "checklist.items.estadoBancos",
  "Estado do banco": "checklist.items.estadoBanco",
  "Tapetes": "checklist.items.tapetes",
  "Porta-objetos": "checklist.items.portaObjetos",
  "Acabamentos": "checklist.items.acabamentos",
  "Volante": "checklist.items.volante",
  "Apoio para passageiro": "checklist.items.apoioPassageiro",
  "Funcionamento do som": "checklist.items.funcionamentoSom",
  "Vidros elétricos": "checklist.items.vidrosEletricos",
  "Ar-condicionado": "checklist.items.arCondicionado",
  "Travas elétricas": "checklist.items.travasEletricas",
  "Faróis": "checklist.items.farois",
  "Lanterna": "checklist.items.lanterna",
  "Setas": "checklist.items.setas",
  "Bateria": "checklist.items.bateria",
  "Painel": "checklist.items.painel",
  "Arranhões": "checklist.items.arranhoes",
  "Amassados": "checklist.items.amassados",
  "Pintura desbotada": "checklist.items.pinturaDesbotada",
  "Faróis/Lanternas": "checklist.items.faroisLanternas",
  "Carenagens": "checklist.items.carenagens",
  "Tanque": "checklist.items.tanque",
  "Pintura": "checklist.items.pintura",
  "Documento do veículo": "checklist.items.documentoVeiculo",
  "IPVA": "checklist.items.ipva",
  "Licenciamento": "checklist.items.licenciamento",
  "Macaco": "checklist.items.macaco",
  "Chave de Roda": "checklist.items.chaveRoda",
  "Triângulo": "checklist.items.triangulo",
  "Estepe": "checklist.items.estepe",
};

export default function Checklists() {
  const { t } = useI18n();
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
    const vehicleType = (vehicle.vehicleType || "Carro") as VehicleType;
    const normalizedChecklist = normalizeChecklistData(vehicle.checklist, vehicleType);
    return getChecklistStats(normalizedChecklist, vehicle.checklist, vehicleType);
  };

  const getCategoryStatus = (vehicle: any, category: string) => {
    const vehicleType = (vehicle.vehicleType || "Carro") as VehicleType;
    const normalizedChecklist = normalizeChecklistData(vehicle.checklist, vehicleType);
    const items = getChecklistItems(vehicleType);
    const categoryItems = items[category as keyof typeof items];
    const completed = (normalizedChecklist[category as keyof typeof normalizedChecklist] || []).length;
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
          <h1 className="text-3xl font-bold text-foreground">{t("checklists.title")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("checklists.subtitle")}
          </p>
        </div>
        <div className="w-64">
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger>
              <SelectValue placeholder={t("checklists.filterByVehicle")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("checklists.allVehicles")}</SelectItem>
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
              {t("checklists.noVehiclesFound")}
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
                      {t("checklists.complete")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {(() => {
                    const vehicleType = (vehicle.vehicleType || "Carro") as VehicleType;
                    const categories = getChecklistCategories(vehicleType);
                    const items = getChecklistItems(vehicleType);
                    
                    return (Object.keys(categories) as Array<keyof typeof categories>).map((category) => {
                      const status = getCategoryStatus(vehicle, category);
                      const categoryItems = items[category];

                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                              <CheckSquare className="h-4 w-4 text-primary" />
                              {t(categoryTranslationKeys[vehicleType]?.[category] || `checklist.categories.${category}`)}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {status.completed}/{status.total}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {categoryItems.map((itemName: string, idx: number) => {
                              const normalizedChecklist = normalizeChecklistData(vehicle.checklist, vehicleType);
                              const itemStatus = getChecklistItemStatus(category as keyof typeof normalizedChecklist, itemName, normalizedChecklist);
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
                                  <span className="truncate">{t(itemTranslationKeys[itemName] || itemName)}</span>
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
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
