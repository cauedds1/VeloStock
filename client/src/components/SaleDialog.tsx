import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

type SaleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: SaleData) => void;
  vehicleName: string;
};

export type SaleData = {
  vendedorId: string;
  vendedorNome: string;
  repassadoPara: string | null;
  dataVenda: string;
  valorVenda: string;
  formaPagamento: string;
  observacoesVenda: string;
};

export function SaleDialog({ open, onOpenChange, onSave, vehicleName }: SaleDialogProps) {
  const [vendedorId, setVendedorId] = useState("");
  const [isRepassado, setIsRepassado] = useState(false);
  const [repassadoPara, setRepassadoPara] = useState("");
  const [dataVenda, setDataVenda] = useState(format(new Date(), "yyyy-MM-dd"));
  const [valorVenda, setValorVenda] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("a_vista");
  const [observacoes, setObservacoes] = useState("");

  const { data: users = [] } = useQuery<Array<{ id: string; firstName: string; lastName: string }>>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setVendedorId("");
      setIsRepassado(false);
      setRepassadoPara("");
      setDataVenda(format(new Date(), "yyyy-MM-dd"));
      setValorVenda("");
      setFormaPagamento("a_vista");
      setObservacoes("");
    }
  }, [open]);

  const handleSave = () => {
    if (!vendedorId) {
      alert("Por favor, selecione um vendedor");
      return;
    }

    if (isRepassado && !repassadoPara.trim()) {
      alert("Por favor, informe para quem o veículo foi repassado");
      return;
    }

    const selectedUser = users.find(u => u.id === vendedorId);
    if (!selectedUser) {
      alert("Vendedor não encontrado");
      return;
    }

    const saleData: SaleData = {
      vendedorId,
      vendedorNome: `${selectedUser.firstName} ${selectedUser.lastName}`,
      repassadoPara: isRepassado ? repassadoPara.trim() : null,
      dataVenda,
      valorVenda,
      formaPagamento,
      observacoesVenda: observacoes,
    };

    onSave(saleData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Venda: {vehicleName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-base font-semibold">Vendedor *</Label>
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
            <Checkbox
              id="repassado"
              checked={isRepassado}
              onCheckedChange={(checked) => setIsRepassado(checked as boolean)}
            />
            <label
              htmlFor="repassado"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Este veículo foi repassado (não foi venda final para cliente)
            </label>
          </div>

          {isRepassado && (
            <div>
              <Label>Repassado Para *</Label>
              <Input
                value={repassadoPara}
                onChange={(e) => setRepassadoPara(e.target.value)}
                placeholder="Nome da pessoa/empresa que recebeu o veículo"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data da Venda</Label>
              <Input
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
              />
            </div>

            <div>
              <Label>Valor da Venda (R$)</Label>
              <Input
                type="number"
                value={valorVenda}
                onChange={(e) => setValorVenda(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a_vista">À Vista</SelectItem>
                <SelectItem value="financiado">Financiado</SelectItem>
                <SelectItem value="parcelado">Parcelado</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais sobre a venda..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!vendedorId || (isRepassado && !repassadoPara.trim())}>
            Registrar Venda
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
