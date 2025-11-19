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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useCurrentCompany } from "@/hooks/use-company";
import { MapPin, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SaleDialog, SaleData } from "@/components/SaleDialog";

interface ChangeLocationDialogProps {
  vehicleId: string;
  currentStatus: string;
  currentPhysicalLocation?: string | null;
  currentPhysicalLocationDetail?: string | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChangeLocationDialog({ 
  vehicleId, 
  currentStatus,
  currentPhysicalLocation,
  currentPhysicalLocationDetail,
  trigger,
  open: controlledOpen,
  onOpenChange 
}: ChangeLocationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [vehicleName, setVehicleName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    status: currentStatus,
    physicalLocation: currentPhysicalLocation || "__none__",
    physicalLocationDetail: currentPhysicalLocationDetail || "",
    customLocation: "",
    notes: "",
    date: new Date(),
  });

  useEffect(() => {
    if (open) {
      // Verificar se a localização atual é uma das opções pré-definidas
      const predefinedOptions = ["Casa", "Loja", "Pátio da Loja", "Oficina", "Higienização", "Outra Loja"];
      const isCustomLocation = currentPhysicalLocation && !predefinedOptions.includes(currentPhysicalLocation);
      
      setFormData({
        status: currentStatus,
        physicalLocation: isCustomLocation ? "__custom__" : (currentPhysicalLocation || "__none__"),
        physicalLocationDetail: currentPhysicalLocationDetail || "",
        customLocation: isCustomLocation ? currentPhysicalLocation : "",
        notes: "",
        date: new Date(),
      });
    }
  }, [open, currentStatus, currentPhysicalLocation, currentPhysicalLocationDetail]);

  const { company } = useCurrentCompany();
  
  const statusOptions = [
    "Entrada",
    "Em Reparos",
    "Em Higienização",
    "Pronto para Venda",
    "Vendido",
    "Arquivado",
  ];

  // Opções fixas de localização (inspirado no usuário)
  const physicalLocationOptions = [
    { value: "__none__", label: "Não especificado" },
    { value: "Casa", label: "Casa" },
    { value: "Loja", label: "Loja" },
    { value: "Pátio da Loja", label: "Pátio da Loja" },
    { value: "Oficina", label: "Oficina" },
    { value: "Higienização", label: "Higienização" },
    { value: "Outra Loja", label: "Outra Loja" },
    { value: "__custom__", label: "Outro (especificar)" },
  ];
  
  const isLocationRequired = formData.status !== "Vendido" && formData.status !== "Arquivado";

  useEffect(() => {
    const fetchVehicleData = async () => {
      try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        if (response.ok) {
          const vehicle = await response.json();
          setVehicleName(`${vehicle.brand} ${vehicle.model} ${vehicle.year}`);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do veículo:", error);
      }
    };
    if (open) {
      fetchVehicleData();
    }
  }, [open, vehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocationRequired && (!formData.physicalLocation || formData.physicalLocation === "__none__")) {
      toast({
        title: "Localização obrigatória",
        description: `Para o status "${formData.status}", é obrigatório informar a localização física do veículo.`,
        variant: "destructive",
      });
      return;
    }

    if (formData.physicalLocation === "__custom__" && !formData.customLocation.trim()) {
      toast({
        title: "Localização obrigatória",
        description: "Por favor, especifique a localização customizada.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.status === "Vendido") {
      setIsSaleDialogOpen(true);
      return;
    }

    await submitStatusChange();
  };

  const submitStatusChange = async (saleData?: SaleData) => {
    setIsSubmitting(true);

    try {
      const payload: any = {
        status: formData.status,
        moveNotes: formData.notes || null,
        moveDate: formData.date.toISOString(),
      };

      if (formData.physicalLocation && formData.physicalLocation !== "__none__") {
        if (formData.physicalLocation === "__custom__") {
          payload.physicalLocation = formData.customLocation.trim();
          payload.physicalLocationDetail = formData.physicalLocationDetail.trim() || null;
        } else {
          payload.physicalLocation = formData.physicalLocation;
          payload.physicalLocationDetail = formData.physicalLocationDetail.trim() || null;
        }
      } else {
        payload.physicalLocation = null;
        payload.physicalLocationDetail = null;
      }

      if (saleData) {
        payload.vendedorId = saleData.vendedorId;
        payload.vendedorNome = saleData.vendedorNome;
        payload.repassadoPara = saleData.repassadoPara;
        payload.dataVenda = saleData.dataVenda;
        payload.valorVenda = saleData.valorVenda;
        payload.formaPagamento = saleData.formaPagamento;
        payload.observacoesVenda = saleData.observacoesVenda;
      }

      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar veículo");
      }

      let description = `Status: ${formData.status}`;
      if (formData.physicalLocation && formData.physicalLocation !== "__none__") {
        const locationName = formData.physicalLocation === "__custom__" ? formData.customLocation : formData.physicalLocation;
        description += formData.physicalLocationDetail
          ? ` | Local: ${locationName} - ${formData.physicalLocationDetail}`
          : ` | Local: ${locationName}`;
      }

      toast({
        title: "Veículo atualizado!",
        description,
      });

      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}/history`] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });

      setOpen(false);
      setIsSaleDialogOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar veículo:", error);
      toast({
        title: "Erro ao atualizar veículo",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaleDataSave = (saleData: SaleData) => {
    submitStatusChange(saleData);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <MapPin className="mr-2 h-4 w-4" />
      Mudar Localização
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Atualizar Status e Localização</DialogTitle>
          <DialogDescription>
            Altere o status do veículo no pipeline e sua localização física
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status do Veículo</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger id="status">
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
            <Label htmlFor="physicalLocation" className="flex items-center gap-2">
              Localização Física
              {isLocationRequired && <span className="text-destructive text-sm">*</span>}
            </Label>
            <Select
              value={formData.physicalLocation}
              onValueChange={(value) => setFormData({ ...formData, physicalLocation: value, physicalLocationDetail: "", customLocation: "" })}
            >
              <SelectTrigger id="physicalLocation" className={isLocationRequired && formData.physicalLocation === "__none__" ? "border-destructive" : ""}>
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
            {isLocationRequired && (
              <p className="text-xs text-muted-foreground">
                * Obrigatório para este status
              </p>
            )}
          </div>

          {formData.physicalLocation === "__custom__" && (
            <div className="space-y-2">
              <Label htmlFor="customLocation" className="flex items-center gap-2">
                Especifique a Localização
                <span className="text-destructive text-sm">*</span>
              </Label>
              <Input
                id="customLocation"
                placeholder="Ex: Estacionamento Externo, Garagem..."
                value={formData.customLocation}
                onChange={(e) => setFormData({ ...formData, customLocation: e.target.value })}
                required
              />
            </div>
          )}

          {formData.physicalLocation && formData.physicalLocation !== "__none__" && formData.physicalLocation !== "__custom__" && (
            <div className="space-y-2">
              <Label htmlFor="physicalLocationDetail">
                Detalhe da Localização (opcional)
              </Label>
              <Input
                id="physicalLocationDetail"
                placeholder={
                  formData.physicalLocation === "Oficina" 
                    ? "Ex: Paulo, Pensin, Adailton..." 
                    : formData.physicalLocation === "Higienização"
                    ? "Ex: Lavagem do João, Estética Car..."
                    : formData.physicalLocation === "Outra Loja"
                    ? "Ex: Loja do João..."
                    : "Ex: Especifique o local..."
                }
                value={formData.physicalLocationDetail}
                onChange={(e) => setFormData({ ...formData, physicalLocationDetail: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Data da Movimentação</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData({ ...formData, date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Veículo enviado para conserto do motor"
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
      <SaleDialog
        open={isSaleDialogOpen}
        onOpenChange={setIsSaleDialogOpen}
        onSave={handleSaleDataSave}
        vehicleName={vehicleName}
      />
    </Dialog>
  );
}
