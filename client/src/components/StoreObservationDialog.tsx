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
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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
        title: t("observations.createdSuccess"),
        description: t("observations.createdSuccessDesc"),
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("observations.error"),
        description: t("observations.errorCreate"),
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
          title: t("observations.resolvedSuccess"),
          description: t("observations.resolvedSuccessDesc", { value: data.expense.value.toFixed(2) }),
        });
      } else {
        toast({
          title: t("observations.updatedSuccess"),
          description: t("observations.updatedSuccessDesc"),
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/store-observations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/costs/all"] });
      onOpenChange(false);
    } catch {
      toast({
        variant: "destructive",
        title: t("observations.error"),
        description: t("observations.errorUpdate"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      toast({
        variant: "destructive",
        title: t("observations.error"),
        description: t("observations.errorDescription"),
      });
      return;
    }

    if (category === "Outro" && !customCategory.trim()) {
      toast({
        variant: "destructive",
        title: t("observations.error"),
        description: t("observations.errorCategory"),
      });
      return;
    }

    // Validar campos de gasto se habilitado
    if (status === "Resolvido" && registerExpense) {
      const expenseVal = parseFloat(expenseValue);
      if (isNaN(expenseVal) || expenseVal <= 0) {
        toast({
          variant: "destructive",
          title: t("observations.error"),
          description: t("observations.errorExpenseValue"),
        });
        return;
      }
      
      if (!expenseDescription.trim()) {
        toast({
          variant: "destructive",
          title: t("observations.error"),
          description: t("observations.errorExpenseDescription"),
        });
        return;
      }
      
      if (expensePaidBy === "other" && !expensePaidByCustom.trim()) {
        toast({
          variant: "destructive",
          title: t("observations.error"),
          description: t("observations.errorPaidBy"),
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
            {observation ? t("observations.edit") : t("observations.new")}
          </DialogTitle>
          <DialogDescription>
            {t("observations.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">{t("observations.label")}</Label>
            <Textarea
              id="description"
              placeholder={t("observations.placeholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t("observations.category")}</Label>
            <Select value={category} onValueChange={(value) => {
              setCategory(value);
              if (value !== "Outro") {
                setCustomCategory("");
              }
            }}>
              <SelectTrigger id="category">
                <SelectValue placeholder={t("observations.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Estoque">{t("observations.categoryStock")}</SelectItem>
                <SelectItem value="Manutenção">{t("observations.categoryMaintenance")}</SelectItem>
                <SelectItem value="Outro">{t("observations.categoryOther")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {category === "Outro" && (
            <div className="space-y-2">
              <Label htmlFor="customCategory">{t("observations.specifyCategory")}</Label>
              <Input
                id="customCategory"
                placeholder={t("observations.specifyCategoryPlaceholder")}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="status">{t("observations.status")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("observations.statusDescription")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("observations.pending")}</span>
              <Switch
                id="status"
                checked={status === "Resolvido"}
                onCheckedChange={(checked) => setStatus(checked ? "Resolvido" : "Pendente")}
              />
              <span className="text-sm text-muted-foreground">{t("observations.resolved")}</span>
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
                  {t("observations.registerExpense")}
                </Label>
              </div>

              {registerExpense && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expenseValue">{t("observations.expenseValue")}</Label>
                      <Input
                        id="expenseValue"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={t("observations.expenseValuePlaceholder")}
                        value={expenseValue}
                        onChange={(e) => setExpenseValue(e.target.value)}
                        data-testid="input-expense-value"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expensePaymentMethod">{t("observations.paymentMethod")}</Label>
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
                          <SelectItem value="Cartão Loja">{t("observations.paymentMethodStoreCard")}</SelectItem>
                          <SelectItem value="Dinheiro">{t("observations.paymentMethodCash")}</SelectItem>
                          <SelectItem value="PIX">{t("observations.paymentMethodPix")}</SelectItem>
                          <SelectItem value="Cartão Crédito">{t("observations.paymentMethodCredit")}</SelectItem>
                          <SelectItem value="Cartão Débito">{t("observations.paymentMethodDebit")}</SelectItem>
                          <SelectItem value="Outro">{t("observations.paymentMethodOther")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {expensePaymentMethod === "Outro" && (
                      <div className="space-y-2">
                        <Label htmlFor="expensePaymentMethodCustom">{t("observations.specifyPayment")}</Label>
                        <Input
                          id="expensePaymentMethodCustom"
                          placeholder={t("observations.specifyPaymentPlaceholder")}
                          value={expensePaymentMethodCustom}
                          onChange={(e) => setExpensePaymentMethodCustom(e.target.value)}
                          data-testid="input-expense-payment-custom"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expenseDescription">{t("observations.expenseDescription")}</Label>
                    <Input
                      id="expenseDescription"
                      placeholder={t("observations.expenseDescriptionPlaceholder")}
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      data-testid="input-expense-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expensePaidBy">{t("observations.paidBy")}</Label>
                    <Select
                      value={expensePaidBy}
                      onValueChange={(value) => {
                        setExpensePaidBy(value);
                        if (value !== "other") setExpensePaidByCustom("");
                      }}
                    >
                      <SelectTrigger id="expensePaidBy" data-testid="select-expense-paid-by">
                        <SelectValue placeholder={t("observations.paidByPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("observations.paidByNone")}</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="other">{t("observations.paidByOther")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {expensePaidBy === "other" && (
                    <div className="space-y-2">
                      <Label htmlFor="expensePaidByCustom">{t("observations.paidByName")}</Label>
                      <Input
                        id="expensePaidByCustom"
                        placeholder={t("observations.paidByNamePlaceholder")}
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
            {t("common.cancel")}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createMutation.isPending || isSubmitting}
          >
            {createMutation.isPending || isSubmitting
              ? t("observations.saving")
              : observation
              ? t("observations.update")
              : t("observations.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
