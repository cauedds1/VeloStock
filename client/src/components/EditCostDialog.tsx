import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

interface Cost {
  id: string;
  category: string;
  description: string;
  value: number;
  date: string;
  paymentMethod?: string;
  paidBy?: string | null;
}

interface EditCostDialogProps {
  vehicleId: string;
  cost: Cost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCostDialog({ 
  vehicleId, 
  cost,
  open,
  onOpenChange
}: EditCostDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    category: "",
    customCategory: "",
    description: "",
    value: "",
    date: "",
    paymentMethod: "Cartão Loja",
    paidBy: "",
  });

  useEffect(() => {
    if (cost) {
      const isPredefinedCategory = [
        "Mecânica", "Estética", "Documentação", 
        "Abastecimento", "Lavagem", "Peças", 
        "Mão de Obra", "Acessórios"
      ].includes(cost.category);

      setFormData({
        category: isPredefinedCategory ? cost.category : "Outra",
        customCategory: isPredefinedCategory ? "" : cost.category,
        description: cost.description,
        value: (cost.value / 100).toFixed(2),
        date: cost.date,
        paymentMethod: cost.paymentMethod || "Cartão Loja",
        paidBy: cost.paidBy || "",
      });
    }
  }, [cost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cost) return;

    setIsSubmitting(true);

    try {
      const finalCategory = formData.category === "Outra" 
        ? formData.customCategory.trim() 
        : formData.category;

      if (!finalCategory || finalCategory.length === 0) {
        toast({
          title: "Categoria inválida",
          description: "Por favor, especifique a categoria quando selecionar 'Outra'.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (formData.paymentMethod === "Outra Pessoa" && !formData.paidBy.trim()) {
        toast({
          title: "Informação incompleta",
          description: "Por favor, especifique quem pagou.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const valueInCents = Math.round(parseFloat(formData.value) * 100);
      const dateObj = new Date(formData.date + 'T12:00:00');

      console.log('[EditCost] Valor original:', cost.value, 'centavos');
      console.log('[EditCost] Campo mostra:', formData.value);
      console.log('[EditCost] Enviando:', valueInCents, 'centavos');

      const response = await fetch(`/api/vehicles/${vehicleId}/costs/${cost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: finalCategory,
          description: formData.description,
          value: valueInCents,
          date: dateObj.toISOString(),
          paymentMethod: formData.paymentMethod,
          paidBy: formData.paymentMethod === "Outra Pessoa" ? formData.paidBy : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar custo");
      }

      toast({
        title: "Custo atualizado!",
        description: "O custo foi atualizado com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}/costs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar custo:", error);
      toast({
        title: "Erro ao atualizar custo",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cost) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Custo</DialogTitle>
          <DialogDescription>
            Atualize as informações deste custo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value, customCategory: "" })}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mecânica">Mecânica</SelectItem>
                <SelectItem value="Estética">Estética</SelectItem>
                <SelectItem value="Documentação">Documentação</SelectItem>
                <SelectItem value="Abastecimento">Abastecimento</SelectItem>
                <SelectItem value="Lavagem">Lavagem</SelectItem>
                <SelectItem value="Peças">Peças</SelectItem>
                <SelectItem value="Mão de Obra">Mão de Obra</SelectItem>
                <SelectItem value="Acessórios">Acessórios</SelectItem>
                <SelectItem value="Outra">Outra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.category === "Outra" && (
            <div className="space-y-2">
              <Label htmlFor="customCategory">Especifique a Categoria</Label>
              <Input
                id="customCategory"
                placeholder="Ex: Instalação de som"
                value={formData.customCategory}
                onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Ex: Troca de óleo e filtros"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Pago como</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value, paidBy: "" })}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cartão Loja">Cartão Loja</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Outra Pessoa">Outra Pessoa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.paymentMethod === "Outra Pessoa" && (
            <div className="space-y-2">
              <Label htmlFor="paidBy">Quem pagou?</Label>
              <Input
                id="paidBy"
                placeholder="Ex: João Silva"
                value={formData.paidBy}
                onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
