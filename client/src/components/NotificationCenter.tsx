import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, AlertCircle, CheckCircle2, Package, ClipboardList, Clock, MessageSquare, Car } from "lucide-react";
import { useAlerts } from "@/hooks/use-alerts";
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
import { useSettings } from "@/hooks/use-settings";
import { Link } from "wouter";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();
  const { data: alertsData } = useAlerts();

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: observations = [] } = useQuery<any[]>({
    queryKey: ["/api/store-observations"],
  });

  // Helper para calcular dias desde última atualização
  const getDaysSince = (dateStr: string): number => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper para contar observações no checklist
  const countChecklistObservations = (checklist: any): number => {
    if (!checklist) return 0;
    let count = 0;
    Object.values(checklist).forEach((category: any) => {
      if (Array.isArray(category)) {
        category.forEach((item: any) => {
          if (typeof item === 'object' && item.observation && item.observation.trim() !== '') {
            count++;
          }
        });
      }
    });
    return count;
  };

  let checklistPending = 0;
  let vehiclesWithPendingChecklist: Array<{ 
    id: number; 
    name: string; 
    pending: number; 
    daysPending: number;
    isUrgent: boolean;
  }> = [];
  let vehiclesWithoutChecklist: Array<{ 
    id: number; 
    name: string; 
    plate: string;
    daysSince: number;
    isUrgent: boolean;
  }> = [];
  let vehiclesWithChecklistObservations: Array<{
    id: number;
    name: string;
    observations: number;
    daysSince: number;
    isUrgent: boolean;
  }> = [];

  vehicles.forEach((vehicle: any) => {
    // Só notificar checklist para veículos "Pronto para Venda"
    if (vehicle.status !== "Pronto para Venda") {
      return;
    }

    // Calcular dias desde que ficou "Pronto para Venda" usando a data do histórico
    const daysSince = vehicle.readyForSaleAt ? getDaysSince(vehicle.readyForSaleAt) : 0;

    // Verificar se o veículo tem checklist iniciado usando a nova lógica de presence
    if (!hasChecklistStarted(vehicle.checklist, vehicle.vehicleType || "Carro")) {
      vehiclesWithoutChecklist.push({
        id: vehicle.id,
        name: `${vehicle.brand} ${vehicle.model}`,
        plate: vehicle.plate,
        daysSince,
        isUrgent: daysSince > 7, // Urgente se faz mais de 7 dias
      });
    } else {
      // Se tem checklist iniciado, verificar itens pendentes
      const normalized = normalizeChecklistData(vehicle.checklist, vehicle.vehicleType || "Carro");
      const stats = getChecklistStats(normalized, vehicle.checklist, vehicle.vehicleType || "Carro");
      const pending = stats.totalItems - stats.checkedItems;

      if (pending > 0) {
        checklistPending += pending;
        vehiclesWithPendingChecklist.push({
          id: vehicle.id,
          name: `${vehicle.brand} ${vehicle.model}`,
          pending,
          daysPending: daysSince,
          isUrgent: daysSince > 7, // Urgente se pendente há mais de 7 dias
        });
      }
      
      // Verificar se tem observações no checklist (problemas reportados)
      const observationsCount = countChecklistObservations(vehicle.checklist);
      if (observationsCount > 0) {
        vehiclesWithChecklistObservations.push({
          id: vehicle.id,
          name: `${vehicle.brand} ${vehicle.model}`,
          observations: observationsCount,
          daysSince,
          isUrgent: daysSince > 7,
        });
      }
    }
  });

  // Processar observações com dias pendentes
  const pendingObservationsWithDays = observations
    .filter((obs: any) => obs.status === "Pendente")
    .map((obs: any) => {
      const daysPending = obs.createdAt ? getDaysSince(obs.createdAt) : 0;
      return {
        ...obs,
        daysPending,
        isUrgent: daysPending > 7,
      };
    });
  
  const pendingObservations = pendingObservationsWithDays;
  
  // Aplicar filtros baseado nas configurações
  const showChecklistAlerts = settings.readyForSaleAlerts;
  const showTaskAlerts = settings.taskAlerts;
  
  // Total de problemas reais (independente de estarem habilitados)
  const actualChecklistIssues = vehiclesWithoutChecklist.length + vehiclesWithPendingChecklist.length;
  const actualChecklistObservations = vehiclesWithChecklistObservations.length;
  const actualObservationIssues = pendingObservations.length;
  
  // Problemas exibidos (filtrados pelas configurações)
  const totalVehiclesWithChecklistIssues = showChecklistAlerts ? actualChecklistIssues : 0;
  const totalChecklistObservations = showChecklistAlerts ? actualChecklistObservations : 0;
  const displayedObservations = showTaskAlerts ? actualObservationIssues : 0;
  
  // Adicionar alertas inteligentes
  const intelligentAlerts = alertsData?.alerts || [];
  const totalIntelligentAlerts = intelligentAlerts.length;
  
  const totalNotifications = totalVehiclesWithChecklistIssues + totalChecklistObservations + displayedObservations + totalIntelligentAlerts;

  // Contar tarefas urgentes (>7 dias)
  const urgentCount = 
    vehiclesWithoutChecklist.filter(v => v.isUrgent).length +
    vehiclesWithPendingChecklist.filter(v => v.isUrgent).length +
    vehiclesWithChecklistObservations.filter(v => v.isUrgent).length +
    pendingObservations.filter(obs => obs.isUrgent).length +
    (alertsData?.highSeverity || 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 hover:bg-transparent"
        >
          <Bell className={`h-5 w-5 text-white ${urgentCount > 0 ? 'animate-shake-bell' : ''}`} />
          {totalNotifications > 0 && (
            <Badge 
              variant="destructive" 
              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold ${urgentCount > 0 ? 'animate-pulse-urgent' : ''}`}
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
              ? (actualChecklistIssues > 0 || actualObservationIssues > 0 
                  ? "Alertas desabilitados nas configurações" 
                  : "Tudo em dia!"
                )
              : `${totalNotifications} ${totalNotifications === 1 ? 'categoria com pendências' : 'categorias com pendências'}`
            }
          </p>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {/* NOVOS ALERTAS INTELIGENTES */}
            {intelligentAlerts.length > 0 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                      <Car className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Alertas do Sistema</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {intelligentAlerts.length} {intelligentAlerts.length === 1 ? 'alerta' : 'alertas'} detectados
                      </p>
                    </div>
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      {intelligentAlerts.length}
                    </Badge>
                  </div>
                  
                  <div className="pl-11 space-y-2">
                    {intelligentAlerts.slice(0, 5).map((alert) => (
                      <Link 
                        key={alert.id} 
                        href={alert.actionUrl || "#"}
                        onClick={() => setOpen(false)}
                        className={`flex items-start gap-2 text-xs hover:text-foreground transition-colors p-2 -ml-1.5 rounded hover:bg-accent group ${
                          alert.severity === "high" 
                            ? 'bg-pulse-urgent border-l-2 border-red-600 text-red-700 font-medium' 
                            : alert.severity === "medium"
                            ? 'border-l-2 border-orange-500'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {alert.severity === "high" && <AlertCircle className="h-3.5 w-3.5 text-red-600 animate-pulse-urgent flex-shrink-0" />}
                            <span className="font-medium">{alert.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                        </div>
                        {alert.severity === "high" && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse-urgent">
                            URGENTE
                          </Badge>
                        )}
                      </Link>
                    ))}
                    {intelligentAlerts.length > 5 && (
                      <p className="text-xs text-muted-foreground italic">
                        + {intelligentAlerts.length - 5} alertas...
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {showChecklistAlerts && vehiclesWithoutChecklist.length > 0 && (
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
                      <Link 
                        key={idx} 
                        href={`/veiculo/${v.id}?tab=checklist`}
                        onClick={() => setOpen(false)}
                        className={`flex items-center justify-between gap-2 text-xs hover:text-foreground transition-colors p-2 -ml-1.5 rounded hover:bg-accent group ${v.isUrgent ? 'bg-pulse-urgent border-l-2 border-red-600 text-red-700 font-medium' : 'text-muted-foreground'}`}
                      >
                        <span className="flex items-center gap-2">
                          {v.isUrgent && <AlertCircle className="h-3.5 w-3.5 text-red-600 animate-pulse-urgent flex-shrink-0" />}
                          <span>•</span>
                          <span>{v.name} ({v.plate})</span>
                        </span>
                        {v.isUrgent && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse-urgent">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            {v.daysSince}d
                          </Badge>
                        )}
                        {!v.isUrgent && v.daysSince > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-600">
                            {v.daysSince}d
                          </Badge>
                        )}
                      </Link>
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

            {showChecklistAlerts && checklistPending > 0 && (
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
                      <Link 
                        key={idx}
                        href={`/veiculo/${v.id}?tab=checklist`}
                        onClick={() => setOpen(false)}
                        className={`flex justify-between items-center gap-2 text-xs hover:text-foreground transition-colors p-2 -ml-1.5 rounded hover:bg-accent group ${v.isUrgent ? 'bg-pulse-urgent border-l-2 border-red-600 text-red-700 font-medium' : 'text-muted-foreground'}`}
                      >
                        <span className="flex items-center gap-2">
                          {v.isUrgent && <AlertCircle className="h-3.5 w-3.5 text-red-600 animate-pulse-urgent flex-shrink-0" />}
                          <span>•</span>
                          <span>{v.name}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{v.pending} pendentes</span>
                          {v.isUrgent && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse-urgent">
                              <Clock className="h-2.5 w-2.5 mr-1" />
                              {v.daysPending}d
                            </Badge>
                          )}
                          {!v.isUrgent && v.daysPending > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-600">
                              {v.daysPending}d
                            </Badge>
                          )}
                        </div>
                      </Link>
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

            {showChecklistAlerts && vehiclesWithChecklistObservations.length > 0 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                      <MessageSquare className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Problemas Reportados</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {vehiclesWithChecklistObservations.reduce((acc, v) => acc + v.observations, 0)} observações em {vehiclesWithChecklistObservations.length} {vehiclesWithChecklistObservations.length === 1 ? 'veículo' : 'veículos'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      {vehiclesWithChecklistObservations.reduce((acc, v) => acc + v.observations, 0)}
                    </Badge>
                  </div>
                  
                  <div className="pl-11 space-y-2">
                    {vehiclesWithChecklistObservations.slice(0, 5).map((v, idx) => (
                      <Link 
                        key={idx}
                        href={`/veiculo/${v.id}?tab=checklist`}
                        onClick={() => setOpen(false)}
                        className={`flex justify-between items-center gap-2 text-xs hover:text-foreground transition-colors p-2 -ml-1.5 rounded hover:bg-accent group ${v.isUrgent ? 'bg-pulse-urgent border-l-2 border-red-600 text-red-700 font-medium' : 'text-muted-foreground'}`}
                      >
                        <span className="flex items-center gap-2">
                          {v.isUrgent && <AlertCircle className="h-3.5 w-3.5 text-red-600 animate-pulse-urgent flex-shrink-0" />}
                          <span>•</span>
                          <span>{v.name}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{v.observations} {v.observations === 1 ? 'problema' : 'problemas'}</span>
                          {v.isUrgent && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse-urgent">
                              <Clock className="h-2.5 w-2.5 mr-1" />
                              {v.daysSince}d
                            </Badge>
                          )}
                          {!v.isUrgent && v.daysSince > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-600">
                              {v.daysSince}d
                            </Badge>
                          )}
                        </div>
                      </Link>
                    ))}
                    {vehiclesWithChecklistObservations.length > 5 && (
                      <p className="text-xs text-muted-foreground italic">
                        + {vehiclesWithChecklistObservations.length - 5} veículos...
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {showChecklistAlerts && vehiclesWithoutChecklist.length === 0 && checklistPending === 0 && vehiclesWithChecklistObservations.length === 0 && (
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

            {showTaskAlerts && pendingObservations.length > 0 && (
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
                    <Link
                      key={obs.id}
                      href="/anotacoes"
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between gap-2 text-xs hover:text-foreground transition-colors p-2 -ml-1.5 rounded hover:bg-accent group ${obs.isUrgent ? 'bg-pulse-urgent border-l-2 border-red-600 text-red-700 font-medium' : 'text-muted-foreground'}`}
                    >
                      <span className="flex items-center gap-2 flex-1 min-w-0">
                        {obs.isUrgent && <AlertCircle className="h-3.5 w-3.5 text-red-600 animate-pulse-urgent flex-shrink-0" />}
                        <span>•</span>
                        <span className="line-clamp-2 flex-1">{obs.description}</span>
                      </span>
                      {obs.isUrgent && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex-shrink-0 animate-pulse-urgent">
                          <Clock className="h-2.5 w-2.5 mr-1" />
                          {obs.daysPending}d
                        </Badge>
                      )}
                      {!obs.isUrgent && obs.daysPending > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-600 flex-shrink-0">
                          {obs.daysPending}d
                        </Badge>
                      )}
                    </Link>
                  ))}
                  {pendingObservations.length > 3 && (
                    <p className="text-xs text-muted-foreground italic">
                      + {pendingObservations.length - 3} observações...
                    </p>
                  )}
                </div>
              </div>
            )}

            {showTaskAlerts && pendingObservations.length === 0 && (
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

            {totalNotifications === 0 && actualChecklistIssues === 0 && actualObservationIssues === 0 && (
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
