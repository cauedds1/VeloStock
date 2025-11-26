import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingDown, TrendingUp, AlertCircle, Calendar, CheckCircle, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Bill = {
  id: string;
  tipo: "a_pagar" | "a_receber";
  descricao: string;
  categoria: string;
  valor: string;
  dataVencimento: string;
  dataPagamento: string | null;
  status: "pendente" | "pago" | "vencido" | "parcial";
  observacoes: string | null;
  createdAt: string;
};

type DashboardData = {
  totalAPagar: { valor: string; quantidade: number };
  totalAReceber: { valor: string; quantidade: number };
  vencidas: { quantidade: number; total: string };
  proximosVencimentos: { quantidade: number; total: string };
  pagosMes: { totalPago: string; totalRecebido: string };
  saldoPrevisto: string;
};

export default function Bills() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [formData, setFormData] = useState({
    tipo: "a_pagar" as "a_pagar" | "a_receber",
    descricao: "",
    categoria: "",
    valor: "",
    dataVencimento: "",
    observacoes: "",
  });

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["/api/bills/dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/bills/dashboard");
      if (!response.ok) throw new Error("Erro ao buscar dashboard");
      return response.json();
    },
  });

  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills", tipoFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tipoFilter !== "todos") params.append("tipo", tipoFilter);
      if (statusFilter !== "todos") params.append("status", statusFilter);
      
      const url = params.toString() ? `/api/bills?${params.toString()}` : "/api/bills";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao buscar contas");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/dashboard"] });
      toast({ title: "Conta criada com sucesso!" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await fetch(`/api/bills/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/dashboard"] });
      toast({ title: "Conta atualizada!" });
      setIsDialogOpen(false);
      setEditingBill(null);
      resetForm();
    },
  });

  const payMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bills/${id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dataPagamento: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/dashboard"] });
      toast({ title: "Conta marcada como paga!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bills/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/dashboard"] });
      toast({ title: "Conta excluída!" });
    },
  });

  const resetForm = () => {
    setFormData({
      tipo: "a_pagar",
      descricao: "",
      categoria: "",
      valor: "",
      dataVencimento: "",
      observacoes: "",
    });
  };

  const handleSubmit = () => {
    if (editingBill) {
      updateMutation.mutate({ id: editingBill.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendente: "hsl(var(--badge-color-3))",
      pago: "hsl(var(--badge-color-1))",
      vencido: "hsl(var(--destructive))",
      parcial: "hsl(var(--badge-color-5))",
    };
    return colors[status] || "hsl(var(--muted))";
  };

  const filteredBills = bills.filter(bill => {
    if (tipoFilter !== "todos" && bill.tipo !== tipoFilter) return false;
    if (statusFilter !== "todos" && bill.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contas a Pagar e Receber</h1>
          <p className="text-muted-foreground">Controle financeiro completo</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBill ? "Editar Conta" : "Nova Conta"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(v: any) => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_pagar">A Pagar</SelectItem>
                      <SelectItem value="a_receber">A Receber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.tipo === "a_pagar" ? (
                        <>
                          <SelectItem value="Aluguel">Aluguel</SelectItem>
                          <SelectItem value="Salário">Salário</SelectItem>
                          <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                          <SelectItem value="Luz/Água">Luz/Água</SelectItem>
                          <SelectItem value="Impostos">Impostos</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Venda">Venda</SelectItem>
                          <SelectItem value="Parcelamento">Parcelamento</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descrição *</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Aluguel da loja - Janeiro/2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Data de Vencimento *</Label>
                  <Input
                    type="date"
                    value={formData.dataVencimento}
                    onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); setEditingBill(null); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.descricao || !formData.categoria || !formData.valor || !formData.dataVencimento}>
                  {editingBill ? "Salvar" : "Criar Conta"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {dashboard && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--destructive) / 0.1)" }}>
                <TrendingDown className="h-6 w-6" style={{ color: "hsl(var(--destructive))" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-2xl font-bold">R$ {parseFloat(dashboard.totalAPagar.valor).toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">{dashboard.totalAPagar.quantidade} contas</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--badge-color-1) / 0.1)" }}>
                <TrendingUp className="h-6 w-6" style={{ color: "hsl(var(--badge-color-1))" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total a Receber</p>
                <p className="text-2xl font-bold">R$ {parseFloat(dashboard.totalAReceber.valor).toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">{dashboard.totalAReceber.quantidade} contas</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--badge-color-2) / 0.1)" }}>
                <DollarSign className="h-6 w-6" style={{ color: "hsl(var(--badge-color-2))" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Previsto</p>
                <p className="text-2xl font-bold" style={{ color: parseFloat(dashboard.saldoPrevisto) >= 0 ? "hsl(var(--badge-color-1))" : "hsl(var(--destructive))" }}>
                  R$ {parseFloat(dashboard.saldoPrevisto).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--badge-color-5) / 0.1)" }}>
                <AlertCircle className="h-6 w-6" style={{ color: "hsl(var(--badge-color-5))" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contas Vencidas</p>
                <p className="text-2xl font-bold" style={{ color: "hsl(var(--badge-color-5))" }}>{dashboard.vencidas.quantidade}</p>
                <p className="text-xs text-muted-foreground">R$ {parseFloat(dashboard.vencidas.total).toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--badge-color-4) / 0.1)" }}>
                <Calendar className="h-6 w-6" style={{ color: "hsl(var(--badge-color-4))" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próximos 7 Dias</p>
                <p className="text-2xl font-bold" style={{ color: "hsl(var(--badge-color-4))" }}>{dashboard.proximosVencimentos.quantidade}</p>
                <p className="text-xs text-muted-foreground">R$ {parseFloat(dashboard.proximosVencimentos.total).toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--badge-color-1) / 0.1)" }}>
                <CheckCircle className="h-6 w-6" style={{ color: "hsl(var(--badge-color-1))" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pago este Mês</p>
                <p className="text-xl font-bold" style={{ color: "hsl(var(--destructive))" }}>- R$ {parseFloat(dashboard.pagosMes.totalPago).toLocaleString("pt-BR")}</p>
                <p className="text-xl font-bold" style={{ color: "hsl(var(--badge-color-1))" }}>+ R$ {parseFloat(dashboard.pagosMes.totalRecebido).toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="flex gap-4">
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            <SelectItem value="a_pagar">A Pagar</SelectItem>
            <SelectItem value="a_receber">A Receber</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div>Carregando...</div>
      ) : filteredBills.length === 0 ? (
        <Card className="p-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma conta cadastrada</p>
          <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeira Conta
          </Button>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Descrição</th>
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="text-left p-3">Vencimento</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <Badge variant={bill.tipo === "a_pagar" ? "destructive" : "default"}>
                        {bill.tipo === "a_pagar" ? "A Pagar" : "A Receber"}
                      </Badge>
                    </td>
                    <td className="p-3">{bill.descricao}</td>
                    <td className="p-3">{bill.categoria}</td>
                    <td className="p-3 text-right font-medium">R$ {parseFloat(bill.valor).toLocaleString("pt-BR")}</td>
                    <td className="p-3">{format(new Date(bill.dataVencimento), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td className="p-3">
                      <Badge style={{ backgroundColor: getStatusColor(bill.status), color: "white" }}>
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        {bill.status !== "pago" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => payMutation.mutate(bill.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingBill(bill);
                            setFormData({
                              tipo: bill.tipo,
                              descricao: bill.descricao,
                              categoria: bill.categoria,
                              valor: bill.valor,
                              dataVencimento: bill.dataVencimento.split("T")[0],
                              observacoes: bill.observacoes || "",
                            });
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm("Deseja excluir esta conta?")) {
                              deleteMutation.mutate(bill.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
