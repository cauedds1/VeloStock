import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Target } from "lucide-react";

interface SetSalesTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedorId?: string;
}

export function SetSalesTargetDialog({ open, onOpenChange, vendedorId }: SetSalesTargetDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [metaQuantidade, setMetaQuantidade] = useState("");
  const [metaValor, setMetaValor] = useState("");

  const saveMeta = useMutation({
    mutationFn: async (data: { metaQuantidade: number | null; metaValor: number | null }) => {
      const response = await fetch("/api/sales-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar meta");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/seller-dashboard"] });
      toast({
        title: "Meta salva!",
        description: "Sua meta de vendas foi atualizada com sucesso.",
      });
      setMetaQuantidade("");
      setMetaValor("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar meta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMeta.mutate({
      metaQuantidade: metaQuantidade ? parseInt(metaQuantidade) : null,
      metaValor: metaValor ? parseFloat(metaValor) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Definir Meta de Vendas
          </DialogTitle>
          <DialogDescription>
            Estabeleça suas metas de quantidade de veículos e faturamento para este mês.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="metaQuantidade">Meta de Quantidade (Veículos)</Label>
            <Input
              id="metaQuantidade"
              type="number"
              placeholder="Ex: 5"
              value={metaQuantidade}
              onChange={(e) => setMetaQuantidade(e.target.value)}
              data-testid="input-meta-quantidade"
            />
          </div>

          <div>
            <Label htmlFor="metaValor">Meta de Faturamento (R$)</Label>
            <Input
              id="metaValor"
              type="number"
              placeholder="Ex: 50000"
              value={metaValor}
              onChange={(e) => setMetaValor(e.target.value)}
              data-testid="input-meta-valor"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saveMeta.isPending} data-testid="button-save-meta">
            {saveMeta.isPending ? "Salvando..." : "Definir Meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
