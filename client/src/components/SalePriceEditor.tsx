import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Check, X } from "lucide-react";

interface SalePriceEditorProps {
  vehicleId: string;
  currentPrice: number | null;
}

export function SalePriceEditor({ vehicleId, currentPrice }: SalePriceEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [price, setPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (currentPrice !== null && currentPrice !== undefined) {
      setPrice(Number(currentPrice).toFixed(2));
    } else {
      setPrice("");
    }
  }, [currentPrice]);

  const handleSave = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast({
        title: "Preço inválido",
        description: "Por favor, insira um preço válido.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const priceValue = parseFloat(price).toFixed(2);
      
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salePrice: priceValue }),
      });

      if (!response.ok) throw new Error("Erro ao salvar preço");

      toast({
        title: "Preço atualizado!",
        description: "O preço de venda foi atualizado com sucesso.",
      });

      await queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar preço:", error);
      toast({
        title: "Erro ao salvar preço",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentPrice !== null && currentPrice !== undefined) {
      setPrice(Number(currentPrice).toFixed(2));
    } else {
      setPrice("");
    }
    setIsEditing(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (!isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Preço Definido</span>
          {currentPrice !== null && currentPrice !== undefined && currentPrice > 0 ? (
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(Number(currentPrice))}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground italic">Não definido</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="w-full"
        >
          <DollarSign className="mr-2 h-4 w-4" />
          {currentPrice ? "Atualizar Preço" : "Definir Preço"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Preço de Venda (R$)</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={isSaving}
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1"
        >
          <Check className="mr-2 h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isSaving}
          className="flex-1"
        >
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
