import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { StoreObservation } from "@shared/schema";

interface StoreObservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  observation?: StoreObservation;
}

export function StoreObservationDialog({
  open,
  onOpenChange,
  observation,
}: StoreObservationDialogProps) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [customCategory, setCustomCategory] = useState("");
  const [status, setStatus] = useState<"Pendente" | "Resolvido">("Pendente");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (observation) {
      setDescription(observation.description);
      const isStandardCategory = ["Estoque", "Manutenção"].includes(observation.category || "");
      if (isStandardCategory) {
        setCategory(observation.category || undefined);
        setCustomCategory("");
      } else if (observation.category) {
        setCategory("Outro");
        setCustomCategory(observation.category);
      } else {
        setCategory(undefined);
        setCustomCategory("");
      }
      setStatus(observation.status);
    } else {
      setDescription("");
      setCategory(undefined);
      setCustomCategory("");
      setStatus("Pendente");
    }
  }, [observation, open]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/store-observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar observação");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-observations"] });
      toast({
        title: "Observação criada",
        description: "A observação foi criada com sucesso.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar a observação.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/store-observations/${observation!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar observação");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-observations"] });
      toast({
        title: "Observação atualizada",
        description: "A observação foi atualizada com sucesso.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a observação.",
      });
    },
  });

  const handleSubmit = () => {
    if (!description.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A descrição é obrigatória.",
      });
      return;
    }

    if (category === "Outro" && !customCategory.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, especifique a categoria.",
      });
      return;
    }

    const finalCategory = category === "Outro" ? customCategory.trim() : category;

    const data = {
      description: description.trim(),
      category: finalCategory || null,
      status,
    };

    if (observation) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {observation ? "Editar Observação" : "Nova Observação"}
          </DialogTitle>
          <DialogDescription>
            Registre lembretes sobre estoque da loja ou manutenção da propriedade
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Ex: Comprar papel higiênico, café e copos descartáveis. Portão pesado precisa lubrificar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={(value) => {
              setCategory(value);
              if (value !== "Outro") {
                setCustomCategory("");
              }
            }}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione uma categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Estoque">Estoque</SelectItem>
                <SelectItem value="Manutenção">Manutenção</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {category === "Outro" && (
            <div className="space-y-2">
              <Label htmlFor="customCategory">Especifique a Categoria *</Label>
              <Input
                id="customCategory"
                placeholder="Ex: Limpeza, Segurança, Administrativo..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="status">Status</Label>
              <p className="text-sm text-muted-foreground">
                Marque como resolvido quando concluído
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Pendente</span>
              <Switch
                id="status"
                checked={status === "Resolvido"}
                onCheckedChange={(checked) => setStatus(checked ? "Resolvido" : "Pendente")}
              />
              <span className="text-sm text-muted-foreground">Resolvido</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Salvando..."
              : observation
              ? "Atualizar"
              : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
