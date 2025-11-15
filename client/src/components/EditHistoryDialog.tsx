import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Edit2 } from "lucide-react";

interface EditHistoryDialogProps {
  vehicleId: string;
  historyEntry: {
    id: string;
    toStatus: string;
    toPhysicalLocation?: string | null;
    toPhysicalLocationDetail?: string | null;
    notes?: string | null;
    movedAt: string;
  };
  trigger?: React.ReactNode;
}

export function EditHistoryDialog({ 
  vehicleId, 
  historyEntry,
  trigger 
}: EditHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    toStatus: historyEntry.toStatus,
    toPhysicalLocation: historyEntry.toPhysicalLocation || "__none__",
    toPhysicalLocationDetail: historyEntry.toPhysicalLocationDetail || "",
    notes: historyEntry.notes || "",
    movedAt: historyEntry.movedAt ? historyEntry.movedAt.split("T")[0] : new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (open) {
      const movedAtDate = historyEntry.movedAt ? historyEntry.movedAt.split("T")[0] : new Date().toISOString().split("T")[0];
      setFormData({
        toStatus: historyEntry.toStatus,
        toPhysicalLocation: historyEntry.toPhysicalLocation || "__none__",
        toPhysicalLocationDetail: historyEntry.toPhysicalLocationDetail || "",
        notes: historyEntry.notes || "",
        movedAt: movedAtDate,
      });
    }
  }, [open, historyEntry]);

  const statusOptions = [
    "Entrada",
    "Em Reparos",
    "Em Higienização",
    "Pronto para Venda",
    "Vendido",
    "Arquivado",
  ];

  const physicalLocationOptions = [
    { value: "__none__", label: "Não especificado" },
    { value: "Pátio da Loja", label: "Pátio da Loja" },
    { value: "Casa", label: "Casa" },
    { value: "Oficina", label: "Oficina" },
    { value: "Higienização", label: "Higienização" },
    { value: "Outra Loja", label: "Outra Loja" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dateObj = new Date(formData.movedAt + 'T12:00:00');
      
      const payload: any = {
        toStatus: formData.toStatus,
        notes: formData.notes.trim() || null,
        movedAt: dateObj.toISOString(),
      };

      if (formData.toPhysicalLocation && formData.toPhysicalLocation !== "__none__") {
        payload.toPhysicalLocation = formData.toPhysicalLocation;
        payload.toPhysicalLocationDetail = formData.toPhysicalLocationDetail.trim() || null;
      } else {
        payload.toPhysicalLocation = null;
        payload.toPhysicalLocationDetail = null;
      }

      console.log('Enviando atualização de histórico:', payload);

      const response = await fetch(`/api/vehicles/${vehicleId}/history/${historyEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log('Resposta recebida:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error('Erro na resposta:', errorData);
        throw new Error(errorData.error || "Erro ao atualizar histórico");
      }

      const result = await response.json();
      console.log('Histórico atualizado com sucesso:', result);

      toast({
        title: "Histórico atualizado!",
        description: "A entrada do histórico foi atualizada com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}/history`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });

      setOpen(false);
    } catch (error: any) {
      console.error("Erro ao atualizar histórico:", error);
      toast({
        title: "Erro ao atualizar histórico",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      <Edit2 className="h-3 w-3" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Histórico</DialogTitle>
          <DialogDescription>
            Corrija informações desta entrada do histórico
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="toStatus">Status Final</Label>
            <Select
              value={formData.toStatus}
              onValueChange={(value) => setFormData({ ...formData, toStatus: value })}
            >
              <SelectTrigger id="toStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="toPhysicalLocation">Localização Física Final</Label>
            <Select
              value={formData.toPhysicalLocation}
              onValueChange={(value) => setFormData({ ...formData, toPhysicalLocation: value, toPhysicalLocationDetail: "" })}
            >
              <SelectTrigger id="toPhysicalLocation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {physicalLocationOptions.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.toPhysicalLocation && formData.toPhysicalLocation !== "__none__" && (
            <div className="space-y-2">
              <Label htmlFor="toPhysicalLocationDetail">
                Detalhe da Localização
              </Label>
              <Input
                id="toPhysicalLocationDetail"
                placeholder={
                  formData.toPhysicalLocation === "Oficina" 
                    ? "Ex: Paulo, Pensin, Adailton..." 
                    : formData.toPhysicalLocation === "Higienização"
                    ? "Ex: Lavagem do João, Estética Car..."
                    : formData.toPhysicalLocation === "Outra Loja"
                    ? "Ex: Loja do João..."
                    : "Ex: Especifique o local..."
                }
                value={formData.toPhysicalLocationDetail}
                onChange={(e) => setFormData({ ...formData, toPhysicalLocationDetail: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="movedAt">Data da Movimentação</Label>
            <Input
              id="movedAt"
              type="date"
              value={formData.movedAt}
              onChange={(e) => setFormData({ ...formData, movedAt: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre esta movimentação"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
