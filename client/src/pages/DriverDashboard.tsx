import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, Car, Clock, DollarSign, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export default function DriverDashboard() {
  const { t } = useI18n();
  const { data: vehicles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  const vehiclesInPreparation = vehicles.filter(
    v => v.status === "Em Reparos" || v.status === "Em Higienização" || v.status === "Entrada"
  );

  const vehiclesReadyForSale = vehicles.filter(v => v.status === "Pronto para Venda");

  const totalInPreparation = vehiclesInPreparation.length;

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-background to-muted/20">
      <div className="border-b bg-gradient-to-r from-primary/5 to-secondary/5 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t("driverDashboard.title")}
            </h1>
            <p className="mt-2 text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {t("driverDashboard.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="space-y-8 max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("driverDashboard.inPreparation")}</CardTitle>
                <div className="h-9 w-9 rounded-md bg-orange-500/10 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInPreparation}</div>
                <p className="text-xs text-muted-foreground">
                  {t("driverDashboard.vehiclesBeingPrepared")}
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("driverDashboard.readyForSale")}</CardTitle>
                <div className="h-9 w-9 rounded-md bg-green-500/10 flex items-center justify-center">
                  <Car className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vehiclesReadyForSale.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t("driverDashboard.preparationComplete")}
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("driverDashboard.totalInStock")}</CardTitle>
                <div className="h-9 w-9 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vehicles.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t("driverDashboard.allVehicles")}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
              <h2 className="text-2xl font-bold">{t("driverDashboard.vehiclesInPreparation")}</h2>
              <div className="h-1 flex-1 bg-gradient-to-r from-secondary/20 to-transparent rounded-full"></div>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : vehiclesInPreparation.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {t("driverDashboard.noVehiclesInPreparation")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehiclesInPreparation.map((vehicle) => (
                  <Card 
                    key={vehicle.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => window.location.href = `/veiculo/${vehicle.id}`}
                    data-testid={`card-vehicle-${vehicle.id}`}
                  >
                    <CardHeader className="space-y-0 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{vehicle.brand} {vehicle.model}</CardTitle>
                          <CardDescription className="mt-1">
                            {vehicle.year} • {vehicle.plate}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={
                            vehicle.status === "Em Reparos" ? "destructive" :
                            vehicle.status === "Em Higienização" ? "default" :
                            "secondary"
                          }
                          className="shrink-0"
                        >
                          {t(`status.${vehicle.status}`)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Car className="h-4 w-4" />
                        <span>{vehicle.color} • {vehicle.vehicleType}</span>
                      </div>
                      {vehicle.physicalLocation && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{t("driverDashboard.location")}: {vehicle.physicalLocation}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
              <h2 className="text-2xl font-bold">{t("driverDashboard.quickAccess")}</h2>
              <div className="h-1 flex-1 bg-gradient-to-r from-secondary/20 to-transparent rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="hover-elevate cursor-pointer" onClick={() => window.location.href = "/veiculos"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    {t("driverDashboard.manageVehicles")}
                  </CardTitle>
                  <CardDescription>
                    {t("driverDashboard.manageVehiclesDesc")}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate cursor-pointer" onClick={() => window.location.href = "/checklists"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    {t("driverDashboard.checklists")}
                  </CardTitle>
                  <CardDescription>
                    {t("driverDashboard.checklistsDesc")}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate cursor-pointer" onClick={() => window.location.href = "/anotacoes"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    {t("driverDashboard.generalNotes")}
                  </CardTitle>
                  <CardDescription>
                    {t("driverDashboard.generalNotesDesc")}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {t("driverDashboard.addCosts")}
                  </CardTitle>
                  <CardDescription>
                    {t("driverDashboard.addCostsDesc")}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
