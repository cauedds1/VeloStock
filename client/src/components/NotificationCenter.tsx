import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, AlertCircle, CheckCircle2, Package, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { checklistItems, getChecklistStats, normalizeChecklistData, hasChecklistStarted } from "@shared/checklistUtils";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: observations = [] } = useQuery<any[]>({
    queryKey: ["/api/store-observations"],
  });

  let checklistPending = 0;
  let vehiclesWithPendingChecklist: Array<{ name: string; pending: number }> = [];
  let vehiclesWithoutChecklist: Array<{ name: string; plate: string }> = [];

  vehicles.forEach((vehicle: any) => {
    // Verificar se o veículo tem checklist iniciado usando a nova lógica de presence
    if (!hasChecklistStarted(vehicle.checklist)) {
      vehiclesWithoutChecklist.push({
        name: `${vehicle.brand} ${vehicle.model}`,
        plate: vehicle.plate,
      });
    } else {
      // Se tem checklist iniciado, verificar itens pendentes
      const normalized = normalizeChecklistData(vehicle.checklist);
      const stats = getChecklistStats(normalized, vehicle.checklist);
      const pending = stats.totalItems - stats.checkedItems;

      if (pending > 0) {
        checklistPending += pending;
        vehiclesWithPendingChecklist.push({
          name: `${vehicle.brand} ${vehicle.model}`,
          pending,
        });
      }
    }
  });

  const pendingObservations = observations.filter((obs: any) => obs.status === "Pendente");
  
  // Contar total de veículos com problemas de checklist
  const totalVehiclesWithChecklistIssues = vehiclesWithoutChecklist.length + vehiclesWithPendingChecklist.length;
  
  // Badge mostra número total de alertas (veículos + observações)
  const totalNotifications = totalVehiclesWithChecklistIssues + pendingObservations.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 hover:bg-transparent"
        >
          <Bell className="h-5 w-5 text-white" />
          {totalNotifications > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px] font-bold"
            >
              {totalNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Centro de Notificações</h3>
          <p className="text-sm text-muted-foreground">
            {totalNotifications === 0 
              ? "Tudo em dia!" 
              : `${totalNotifications} ${totalNotifications === 1 ? 'categoria com pendências' : 'categorias com pendências'}`
            }
          </p>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {vehiclesWithoutChecklist.length > 0 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Checklist Faltando</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {vehiclesWithoutChecklist.length} {vehiclesWithoutChecklist.length === 1 ? 'veículo sem checklist' : 'veículos sem checklist'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      {vehiclesWithoutChecklist.length}
                    </Badge>
                  </div>
                  
                  <div className="pl-11 space-y-2">
                    {vehiclesWithoutChecklist.slice(0, 5).map((v, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        <span>• {v.name} ({v.plate})</span>
                      </div>
                    ))}
                    {vehiclesWithoutChecklist.length > 5 && (
                      <p className="text-xs text-muted-foreground italic">
                        + {vehiclesWithoutChecklist.length - 5} veículos...
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {checklistPending > 0 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10">
                      <ClipboardList className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Checklist Incompleto</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {checklistPending} {checklistPending === 1 ? 'item pendente' : 'itens pendentes'} em {vehiclesWithPendingChecklist.length} {vehiclesWithPendingChecklist.length === 1 ? 'veículo' : 'veículos'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      {checklistPending}
                    </Badge>
                  </div>
                  
                  <div className="pl-11 space-y-2">
                    {vehiclesWithPendingChecklist.slice(0, 5).map((v, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex justify-between items-center">
                        <span>• {v.name}</span>
                        <span className="font-medium">{v.pending} pendentes</span>
                      </div>
                    ))}
                    {vehiclesWithPendingChecklist.length > 5 && (
                      <p className="text-xs text-muted-foreground italic">
                        + {vehiclesWithPendingChecklist.length - 5} veículos...
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {vehiclesWithoutChecklist.length === 0 && checklistPending === 0 && (
              <>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Checklist de Veículos</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Todos os checklists estão completos
                    </p>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {pendingObservations.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Observações Gerais</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pendingObservations.length} {pendingObservations.length === 1 ? 'observação pendente' : 'observações pendentes'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    {pendingObservations.length}
                  </Badge>
                </div>
                
                <div className="pl-11 space-y-2">
                  {pendingObservations.slice(0, 3).map((obs: any) => (
                    <div key={obs.id} className="text-xs">
                      <p className="text-muted-foreground line-clamp-2">
                        • {obs.title}
                      </p>
                    </div>
                  ))}
                  {pendingObservations.length > 3 && (
                    <p className="text-xs text-muted-foreground italic">
                      + {pendingObservations.length - 3} observações...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">Observações Gerais</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Todas as observações foram resolvidas
                  </p>
                </div>
              </div>
            )}

            {totalNotifications === 0 && (
              <>
                <Separator />
                <div className="text-center py-8">
                  <div className="flex justify-center mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <h4 className="font-medium text-sm">Tudo em Dia!</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Não há tarefas pendentes no momento
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
