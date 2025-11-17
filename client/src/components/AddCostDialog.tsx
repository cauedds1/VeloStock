import { useState } from "react";
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
import { Plus } from "lucide-react";

interface AddCostDialogProps {
  vehicleId: string;
  trigger?: React.ReactNode;
}

export function AddCostDialog({ vehicleId, trigger }: AddCostDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    category: "Mecânica",
    customCategory: "",
    description: "",
    value: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "Cartão Loja",
    paidBy: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const valueInReais = parseFloat(formData.value);
      const dateObj = new Date(formData.date + 'T12:00:00');
      
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

      const response = await fetch(`/api/vehicles/${vehicleId}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: finalCategory,
          description: formData.description,
          value: valueInReais,
          date: dateObj.toISOString(),
          paymentMethod: formData.paymentMethod,
          paidBy: formData.paymentMethod === "Outra Pessoa" ? formData.paidBy : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao adicionar custo");
      }

      toast({
        title: "Custo adicionado!",
        description: "O custo foi registrado com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}/costs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });

      setFormData({
        category: "Mecânica",
        customCategory: "",
        description: "",
        value: "",
        date: new Date().toISOString().split("T")[0],
        paymentMethod: "Cartão Loja",
        paidBy: "",
      });

      setOpen(false);
    } catch (error) {
      console.error("Erro ao adicionar custo:", error);
      toast({
        title: "Erro ao adicionar custo",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button size="sm" data-testid="button-add-cost">
      <Plus className="mr-2 h-4 w-4" />
      Adicionar Custo
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Custo</DialogTitle>
          <DialogDescription>
            Registre um novo custo de preparação para este veículo
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
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Adicionar Custo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
