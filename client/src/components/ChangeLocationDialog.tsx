import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
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
import { usePermissions } from "@/hooks/use-permissions";
import { MapPin, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const { toast } = useToast();
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    status: currentStatus,
    physicalLocation: currentPhysicalLocation || "__none__",
    physicalLocationDetail: currentPhysicalLocationDetail || "",
    customLocation: "",
    notes: "",
    date: new Date(),
    // Campos de venda
    vendedorId: "",
    isRepassado: false,
    repassadoPara: "",
    salePrice: "",
  });

  const { data: users = [] } = useQuery<Array<{ id: string; firstName: string; lastName: string }>>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Erro ao buscar usuários");
      }
      return response.json();
    },
    enabled: open && formData.status === "Vendido",
  });

  // Buscar localizações das configurações avançadas
  const { data: advancedSettings } = useQuery({
    queryKey: ["/api/settings/advanced"],
    queryFn: async () => {
      const response = await fetch("/api/settings/advanced");
      if (!response.ok) {
        throw new Error("Erro ao buscar configurações");
      }
      return response.json();
    },
    enabled: open,
  });

  // Buscar dados do veículo para pre-popular campos de venda
  const { data: vehicleData } = useQuery({
    queryKey: [`/api/vehicles/${vehicleId}`],
    queryFn: async () => {
      const response = await fetch(`/api/vehicles/${vehicleId}`);
      if (!response.ok) {
        throw new Error("Erro ao buscar dados do veículo");
      }
      return response.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (open && vehicleData) {
      // Usar localizações das configurações avançadas, com fallback
      const configLocations = advancedSettings?.localizacoes || ["Matriz", "Filial", "Pátio Externo", "Oficina"];
      const isCustomLocation = currentPhysicalLocation && !configLocations.includes(currentPhysicalLocation);
      
      setFormData({
        status: currentStatus,
        physicalLocation: isCustomLocation ? "__custom__" : (currentPhysicalLocation || "__none__"),
        physicalLocationDetail: currentPhysicalLocationDetail || "",
        customLocation: isCustomLocation ? currentPhysicalLocation : "",
        notes: "",
        date: new Date(),
        // Pre-popular campos de venda se veículo já está vendido
        vendedorId: vehicleData.vendedorId || "",
        isRepassado: !!vehicleData.repassadoPara,
        repassadoPara: vehicleData.repassadoPara || "",
        salePrice: vehicleData.salePrice ? String(vehicleData.salePrice) : "",
      });
    }
  }, [open, currentStatus, currentPhysicalLocation, currentPhysicalLocationDetail, vehicleData, advancedSettings]);

  // Status disponíveis - motorista não pode marcar como "Vendido"
  const allStatusOptions = [
    "Entrada",
    "Em Reparos",
    "Em Higienização",
    "Pronto para Venda",
    "Vendido",
    "Arquivado",
  ];
  
  const statusOptions = can.markAsSold 
    ? allStatusOptions 
    : allStatusOptions.filter(status => status !== "Vendido");

  // Construir opções de localização dinamicamente a partir das configurações
  const physicalLocationOptions = [
    { value: "__none__", label: "Não especificado" },
    ...(advancedSettings?.localizacoes || ["Matriz", "Filial", "Pátio Externo", "Oficina"]).map((loc: string) => ({
      value: loc,
      label: loc,
    })),
    { value: "__custom__", label: "Outro (especificar)" },
  ];
  
  const isLocationRequired = formData.status !== "Vendido" && formData.status !== "Arquivado";
  const isVendido = formData.status === "Vendido";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação para veículo vendido
    if (isVendido) {
      // Vendedor só é obrigatório se NÃO for repassado
      if (!formData.isRepassado && !formData.vendedorId) {
        toast({
          title: "Vendedor obrigatório",
          description: "Por favor, selecione o vendedor responsável pela venda.",
          variant: "destructive",
        });
        return;
      }

      if (formData.isRepassado && !formData.repassadoPara.trim()) {
        toast({
          title: "Campo obrigatório",
          description: "Por favor, informe para quem o veículo foi repassado.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validação de localização para outros status
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

    setIsSubmitting(true);

    try {
      const payload: any = {
        status: formData.status,
        moveNotes: formData.notes || null,
        moveDate: formData.date.toISOString(),
      };

      // Campos de localização (não aplicável para Vendido/Arquivado)
      if (!isVendido && formData.status !== "Arquivado") {
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
      }

      // Campos de venda
      if (isVendido) {
        const selectedUser = users.find(u => u.id === formData.vendedorId);
        const precoVenda = formData.salePrice ? parseFloat(formData.salePrice) : null;
        payload.vendedorId = formData.vendedorId || null;
        payload.vendedorNome = selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : null;
        payload.repassadoPara = formData.isRepassado ? formData.repassadoPara.trim() : null;
        payload.salePrice = precoVenda;
        payload.valorVenda = precoVenda; // Valor real da venda usado nas métricas financeiras
        // dataVenda será gerada automaticamente pelo servidor
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
      if (!isVendido && formData.physicalLocation && formData.physicalLocation !== "__none__") {
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
      
      // Invalidar dados financeiros quando status muda para "Vendido"
      if (isVendido) {
        queryClient.invalidateQueries({ queryKey: ["/api/financial/metrics"] });
        queryClient.invalidateQueries({ queryKey: ["/api/financial/sellers/ranking"] });
        queryClient.invalidateQueries({ queryKey: ["/api/costs/all"] });
        queryClient.invalidateQueries({ queryKey: ["/api/commissions/payments"] });
      }

      setOpen(false);
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

            {/* Campos específicos para status "Vendido" */}
            {isVendido ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Switch
                    id="repassado"
                    checked={formData.isRepassado}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      isRepassado: checked,
                      // Limpar vendedor quando ativar repassado
                      vendedorId: checked ? "" : formData.vendedorId
                    })}
                  />
                  <Label htmlFor="repassado" className="cursor-pointer font-medium">
                    Repassado
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendedor" className="flex items-center gap-2">
                    Vendedor
                    {!formData.isRepassado && <span className="text-destructive text-sm">*</span>}
                  </Label>
                  <Select
                    value={formData.vendedorId}
                    onValueChange={(value) => setFormData({ ...formData, vendedorId: value })}
                    disabled={formData.isRepassado}
                  >
                    <SelectTrigger id="vendedor" disabled={formData.isRepassado}>
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.isRepassado && (
                    <p className="text-xs text-muted-foreground">
                      Vendedor não é necessário para veículos repassados
                    </p>
                  )}
                </div>

                {formData.isRepassado && (
                  <div className="space-y-2">
                    <Label htmlFor="repassadoPara" className="flex items-center gap-2">
                      Repassado Para
                      <span className="text-destructive text-sm">*</span>
                    </Label>
                    <Input
                      id="repassadoPara"
                      placeholder="Nome da pessoa/empresa que recebeu o veículo"
                      value={formData.repassadoPara}
                      onChange={(e) => setFormData({ ...formData, repassadoPara: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="salePrice">Preço de Venda (R$)</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Campos de localização física (para outros status) */}
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
              </>
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
      </Dialog>
  );
}
