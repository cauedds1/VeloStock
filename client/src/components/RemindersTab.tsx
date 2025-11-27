import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, Plus, Trash2, Check, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Reminder {
  id: string;
  titulo: string;
  descricao?: string;
  dataLimite: string;
  status: "Pendente" | "Concluído" | "Cancelado";
  alertType: "Nenhum" | "1_dia_antes" | "no_dia" | "passou";
}

export function RemindersTab({ vehicleId = "" }: { vehicleId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({ titulo: "", descricao: "", dataLimite: "" });

  // Se tem vehicleId, usa rota de veículo. Senão, usa rota global
  const endpoint = vehicleId ? `/api/vehicles/${vehicleId}/reminders` : `/api/reminders`;

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: [endpoint],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const url = vehicleId ? `/api/vehicles/${vehicleId}/reminders` : `/api/reminders`;
      return await apiRequest("POST", url, {
        titulo: newReminder.titulo,
        descricao: newReminder.descricao,
        dataLimite: new Date(newReminder.dataLimite),
        status: "Pendente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setNewReminder({ titulo: "", descricao: "", dataLimite: "" });
      setIsDialogOpen(false);
      toast({ title: "Lembrete criado com sucesso!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; status: string }) => {
      const url = vehicleId ? `/api/vehicles/${vehicleId}/reminders/${data.id}` : `/api/reminders/${data.id}`;
      return await apiRequest("PATCH", url, {
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const url = vehicleId ? `/api/vehicles/${vehicleId}/reminders/${reminderId}` : `/api/reminders/${reminderId}`;
      return await apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: "Lembrete deletado!" });
    },
  });

  const getAlertStatus = (dataLimite: string, status: string) => {
    if (status === "Concluído" || status === "Cancelado") return { type: "neutral", text: status };

    const date = new Date(dataLimite);
    const daysUntil = differenceInDays(date, new Date());

    if (daysUntil < 0) {
      return { type: "passed", text: `${Math.abs(daysUntil)} dias vencido` };
    } else if (daysUntil === 0) {
      return { type: "today", text: "Vence hoje" };
    } else if (daysUntil === 1) {
      return { type: "tomorrow", text: "Vence amanhã" };
    }
    return { type: "pending", text: `${daysUntil} dias restantes` };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground">Lembretes</h3>
        <Button
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          data-testid="button-add-reminder"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Lembrete
        </Button>
      </div>

      {reminders.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Nenhum lembrete definido. Crie um novo!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => {
            const alert = getAlertStatus(reminder.dataLimite, reminder.status);
            const alertColors: Record<string, { bg: string; text: string; icon: JSX.Element }> = {
              passed: { bg: "bg-destructive/10", text: "text-destructive", icon: <AlertCircle className="h-4 w-4" /> },
              today: { bg: "bg-yellow-500/10", text: "text-yellow-600", icon: <AlertCircle className="h-4 w-4" /> },
              tomorrow: { bg: "bg-blue-500/10", text: "text-blue-600", icon: <Clock className="h-4 w-4" /> },
              pending: { bg: "bg-muted", text: "text-muted-foreground", icon: <Clock className="h-4 w-4" /> },
              neutral: { bg: "bg-muted", text: "text-muted-foreground", icon: <Check className="h-4 w-4" /> },
            };

            const color = alertColors[alert.type] || alertColors.neutral;

            return (
              <Card key={reminder.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-card-foreground">{reminder.titulo}</h4>
                    {reminder.descricao && (
                      <p className="mt-1 text-sm text-muted-foreground">{reminder.descricao}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(reminder.dataLimite), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      <Badge variant="outline" className={`${color.bg} ${color.text} border-0`}>
                        {color.icon}
                        <span className="ml-1">{alert.text}</span>
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {reminder.status === "Pendente" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateMutation.mutate({
                            id: reminder.id,
                            status: "Concluído",
                          })
                        }
                        data-testid={`button-complete-reminder-${reminder.id}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(reminder.id)}
                      data-testid={`button-delete-reminder-${reminder.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Lembrete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-card-foreground">Título</label>
              <Input
                placeholder="Ex: Revisar mecânica..."
                value={newReminder.titulo}
                onChange={(e) => setNewReminder({ ...newReminder, titulo: e.target.value })}
                data-testid="input-reminder-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground">Descrição</label>
              <Textarea
                placeholder="Ex: Verificar se os freios..."
                value={newReminder.descricao}
                onChange={(e) => setNewReminder({ ...newReminder, descricao: e.target.value })}
                data-testid="input-reminder-description"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground">Alertar Prazo</label>
              <Input
                type="date"
                value={newReminder.dataLimite}
                onChange={(e) => setNewReminder({ ...newReminder, dataLimite: e.target.value })}
                data-testid="input-reminder-deadline"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newReminder.titulo || !newReminder.dataLimite || createMutation.isPending}
              data-testid="button-save-reminder"
            >
              {createMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
