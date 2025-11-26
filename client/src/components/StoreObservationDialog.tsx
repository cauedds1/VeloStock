import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, User } from "lucide-react";
import type { StoreObservation } from "@shared/schema";

type UserType = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

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
  
  // Estados para controle de gastos
  const [registerExpense, setRegisterExpense] = useState(false);
  const [expenseValue, setExpenseValue] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState("Cartão Loja");
  const [expensePaymentMethodCustom, setExpensePaymentMethodCustom] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState("");
  const [expensePaidByCustom, setExpensePaidByCustom] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Buscar lista de usuários da empresa para o campo "Quem Pagou"
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: open && registerExpense,
  });

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
      
      // Se houver expenseCost, significa que um gasto foi registrado
      if (observation.expenseCost) {
        setRegisterExpense(true);
        setExpenseValue(parseFloat(observation.expenseCost as any).toString());
      } else {
        setRegisterExpense(false);
        setExpenseValue("");
      }
    } else {
      setDescription("");
      setCategory(undefined);
      setCustomCategory("");
      setStatus("Pendente");
      setRegisterExpense(false);
      setExpenseValue("");
    }
    
    // Resetar outros campos de gasto
    setExpenseDescription("");
    setExpensePaymentMethod("Cartão Loja");
    setExpensePaymentMethodCustom("");
    setExpensePaidBy("");
    setExpensePaidByCustom("");
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

  const [isSubmitting, setIsSubmitting] = useState(false);

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
  });

  // Função para processar a submissão completa (observação + gasto)
  const processUpdate = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      // Atualizar a observação (os dados de gasto são salvos diretamente na observação)
      await updateMutation.mutateAsync(data);
      
      if (data.expense) {
        toast({
          title: "Observação resolvida com gasto registrado",
          description: `Despesa de R$ ${data.expense.value.toFixed(2)} registrada com sucesso.`,
        });
      } else {
        toast({
          title: "Observação atualizada",
          description: "A observação foi atualizada com sucesso.",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/store-observations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/costs/all"] });
      onOpenChange(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a observação.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

    // Validar campos de gasto se habilitado
    if (status === "Resolvido" && registerExpense) {
      const expenseVal = parseFloat(expenseValue);
      if (isNaN(expenseVal) || expenseVal <= 0) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Informe um valor válido para o gasto.",
        });
        return;
      }
      
      if (!expenseDescription.trim()) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Informe a descrição do gasto.",
        });
        return;
      }
      
      if (expensePaidBy === "other" && !expensePaidByCustom.trim()) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, especifique quem pagou.",
        });
        return;
      }
    }

    const finalCategory = category === "Outro" ? customCategory.trim() : category;

    // Determinar quem pagou
    let finalPaidBy = null;
    if (status === "Resolvido" && registerExpense && expensePaidBy && expensePaidBy !== "none") {
      if (expensePaidBy === "other") {
        finalPaidBy = expensePaidByCustom.trim();
      } else {
        const selectedUser = users.find(u => u.id === expensePaidBy);
        if (selectedUser) {
          finalPaidBy = `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || selectedUser.email;
        }
      }
    }

    const data: any = {
      description: description.trim(),
      category: finalCategory || null,
      status,
    };

    // Adicionar dados de gasto se habilitado
    if (status === "Resolvido" && registerExpense) {
      const expenseValueNum = parseFloat(expenseValue);
      let finalPaymentMethod = expensePaymentMethod;
      if (expensePaymentMethod === "Outro" && expensePaymentMethodCustom.trim()) {
        finalPaymentMethod = expensePaymentMethodCustom.trim();
      }
      // Salvar campos de gasto diretamente na observação
      data.expenseCost = expenseValueNum;
      data.expenseDescription = expenseDescription.trim();
      data.expensePaymentMethod = finalPaymentMethod;
      data.expensePaidBy = finalPaidBy;
      // Manter objeto expense para criar despesa operacional
      data.expense = {
        value: expenseValueNum,
        description: expenseDescription.trim(),
        paymentMethod: finalPaymentMethod,
        paidBy: finalPaidBy,
      };
    }

    if (observation) {
      processUpdate(data);
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

          {/* Seção de registro de gasto - aparece quando status é Resolvido */}
          {status === "Resolvido" && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="registerExpense"
                  checked={registerExpense}
                  onCheckedChange={(checked) => setRegisterExpense(checked === true)}
                  data-testid="checkbox-register-expense"
                />
                <Label htmlFor="registerExpense" className="flex items-center gap-2 cursor-pointer">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Registrar gasto para resolver esta observação
                </Label>
              </div>

              {registerExpense && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expenseValue">Valor (R$) *</Label>
                      <Input
                        id="expenseValue"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={expenseValue}
                        onChange={(e) => setExpenseValue(e.target.value)}
                        data-testid="input-expense-value"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expensePaymentMethod">Forma de Pagamento</Label>
                      <Select
                        value={expensePaymentMethod}
                        onValueChange={(value) => {
                          setExpensePaymentMethod(value);
                          if (value !== "Outro") setExpensePaymentMethodCustom("");
                        }}
                      >
                        <SelectTrigger id="expensePaymentMethod" data-testid="select-expense-payment">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cartão Loja">Cartão Loja</SelectItem>
                          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                          <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                          <SelectItem value="Outro">Outro...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {expensePaymentMethod === "Outro" && (
                      <div className="space-y-2">
                        <Label htmlFor="expensePaymentMethodCustom">Especifique a forma de pagamento</Label>
                        <Input
                          id="expensePaymentMethodCustom"
                          placeholder="Ex: Transferência Bancária, Cheque, etc..."
                          value={expensePaymentMethodCustom}
                          onChange={(e) => setExpensePaymentMethodCustom(e.target.value)}
                          data-testid="input-expense-payment-custom"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expenseDescription">Descrição do Gasto *</Label>
                    <Input
                      id="expenseDescription"
                      placeholder="Ex: Compra de material de limpeza"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      data-testid="input-expense-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expensePaidBy">Quem Pagou (opcional)</Label>
                    <Select
                      value={expensePaidBy}
                      onValueChange={(value) => {
                        setExpensePaidBy(value);
                        if (value !== "other") setExpensePaidByCustom("");
                      }}
                    >
                      <SelectTrigger id="expensePaidBy" data-testid="select-expense-paid-by">
                        <SelectValue placeholder="Selecione quem pagou..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não informar</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="other">Outra pessoa...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {expensePaidBy === "other" && (
                    <div className="space-y-2">
                      <Label htmlFor="expensePaidByCustom">Nome de quem pagou</Label>
                      <Input
                        id="expensePaidByCustom"
                        placeholder="Ex: João Silva (fornecedor)"
                        value={expensePaidByCustom}
                        onChange={(e) => setExpensePaidByCustom(e.target.value)}
                        data-testid="input-expense-paid-by-custom"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createMutation.isPending || isSubmitting}
          >
            {createMutation.isPending || isSubmitting
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
