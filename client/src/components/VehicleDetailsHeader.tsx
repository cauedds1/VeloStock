import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface VehicleDetailsHeaderProps {
  image: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  location?: string; // deprecated - for fallback only
  status?: string;
  physicalLocation?: string | null;
  physicalLocationDetail?: string | null;
  onBack?: () => void;
  onEdit?: () => void;
  onChangeLocation?: () => void;
}

export function VehicleDetailsHeader({
  image,
  brand,
  model,
  year,
  plate,
  color,
  location,
  status,
  physicalLocation,
  physicalLocationDetail,
  onBack,
  onEdit,
  onChangeLocation,
}: VehicleDetailsHeaderProps) {
  const { t } = useI18n();
  const statusColors: Record<string, string> = {
    "Entrada": "bg-blue-600",
    "Em Preparação": "bg-yellow-600",
    "Em Reparos": "bg-amber-600",
    "Em Higienização": "bg-cyan-600",
    "Pronto para Venda": "bg-green-600",
    "Vendido": "bg-gray-600",
    "Arquivado": "bg-slate-600",
  };

  // Use status if available, fallback to location
  const displayStatus = status || location || "Entrada";
  const statusColor = statusColors[displayStatus] || "bg-gray-600";

  return (
    <div className="border-b border-border bg-card">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>
          <div className="flex gap-2">
            {onChangeLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={onChangeLocation}
                data-testid="button-change-location"
              >
                <MapPin className="mr-2 h-4 w-4" />
                {t("vehicleHeader.changeLocation")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              data-testid="button-edit"
            >
              <Edit className="mr-2 h-4 w-4" />
              {t("common.edit")}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-32 h-24 overflow-hidden rounded-lg flex-shrink-0">
            <img
              src={image}
              alt={`${brand} ${model}`}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-card-foreground">
                {brand} {model}
              </h1>
              <Badge className={`${statusColor} text-white border-0`}>
                {statusColors[displayStatus] ? t(`status.${displayStatus}`) : displayStatus}
              </Badge>
            </div>
            
            <div className="flex items-center gap-6 text-sm mb-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("vehicles.year")}:</span>
                <span className="font-semibold text-card-foreground">{year}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("vehicles.plate")}:</span>
                <span className="font-semibold text-card-foreground">{plate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("vehicles.color")}:</span>
                <span className="font-semibold text-card-foreground">{color}</span>
              </div>
            </div>

            {physicalLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {physicalLocationDetail 
                    ? `${physicalLocation} - ${physicalLocationDetail}`
                    : physicalLocation
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
