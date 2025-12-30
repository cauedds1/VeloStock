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
import { useCompanyTheme } from "@/components/CompanyThemeProvider";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const { changeIconColors } = useCompanyTheme();
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
      toast({ title: t("bills.billCreated") });
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
      toast({ title: t("bills.billUpdated") });
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
      toast({ title: t("bills.billPaid") });
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
      toast({ title: t("bills.billDeleted") });
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
      pendente: "hsl(var(--badge-color-3))", // Yellow/Orange
      pago: "hsl(var(--badge-color-1))",     // Green
      vencido: "hsl(var(--destructive))",    // Red
      parcial: "hsl(var(--badge-color-5))",  // Blue/Purple
    };
    return colors[status] || "hsl(var(--muted))";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: t("bills.pending"),
      pago: t("bills.paid"),
      vencido: t("bills.overdue"),
      parcial: t("bills.partial"),
    };
    return labels[status] || status;
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
          <h1 className="text-3xl font-bold">{t("bills.title")}</h1>
          <p className="text-muted-foreground">{t("bills.subtitle")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              {t("bills.newBill")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBill ? t("bills.editBill") : t("bills.newBill")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("common.type")} *</Label>
                  <Select value={formData.tipo} onValueChange={(v: any) => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_pagar">{t("bills.toPay")}</SelectItem>
                      <SelectItem value="a_receber">{t("bills.toReceive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("common.category")} *</Label>
                  <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.tipo === "a_pagar" ? (
                        <>
                          <SelectItem value="Aluguel">{t("bills.categoryRent")}</SelectItem>
                          <SelectItem value="Salário">{t("bills.categorySalary")}</SelectItem>
                          <SelectItem value="Fornecedor">{t("bills.categorySupplier")}</SelectItem>
                          <SelectItem value="Luz/Água">{t("bills.categoryUtilities")}</SelectItem>
                          <SelectItem value="Impostos">{t("bills.categoryTaxes")}</SelectItem>
                          <SelectItem value="Outros">{t("bills.categoryOther")}</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Venda">{t("bills.categorySale")}</SelectItem>
                          <SelectItem value="Parcelamento">{t("bills.categoryInstallment")}</SelectItem>
                          <SelectItem value="Outros">{t("bills.categoryOther")}</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{t("common.description")} *</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder={t("bills.descriptionPlaceholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("common.value")} (R$) *</Label>
                  <Input
                    type="number"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>{t("bills.dueDate")} *</Label>
                  <Input
                    type="date"
                    value={formData.dataVencimento}
                    onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>{t("common.observations")}</Label>
                <Textarea
                  value={formData.observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); setEditingBill(null); resetForm(); }}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.descricao || !formData.categoria || !formData.valor || !formData.dataVencimento}>
                  {editingBill ? t("common.save") : t("bills.createBill")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--destructive) / 0.1)" }}>
                <TrendingDown className="h-6 w-6" style={{ color: "hsl(var(--destructive))" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("bills.totalToPay")}</p>
                <p className="text-2xl font-bold text-destructive">R$ {parseFloat(dashboard.totalAPagar.valor).toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">{dashboard.totalAPagar.quantidade} {t("bills.bills")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--badge-color-1) / 0.1)" }}>
                <TrendingUp className="h-6 w-6" style={{ color: "hsl(var(--badge-color-1))" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("bills.totalToReceive")}</p>
                <p className="text-2xl font-bold text-green-500">R$ {parseFloat(dashboard.totalAReceber.valor).toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">{dashboard.totalAReceber.quantidade} {t("bills.bills")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--badge-color-2) / 0.1)" }}>
                <DollarSign className="h-6 w-6" style={{ color: changeIconColors ? "hsl(var(--badge-color-2))" : "currentColor" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("bills.expectedBalance")}</p>
                <p className="text-2xl font-bold" style={{ color: parseFloat(dashboard.saldoPrevisto) >= 0 ? "hsl(var(--badge-color-1))" : "hsl(var(--destructive))" }}>
                  R$ {parseFloat(dashboard.saldoPrevisto).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-destructive/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("bills.overdueBills")}</p>
                <p className="text-2xl font-bold text-destructive">{dashboard.vencidas.quantidade}</p>
                <p className="text-xs text-muted-foreground text-destructive">R$ {parseFloat(dashboard.vencidas.total).toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--badge-color-4) / 0.1)" }}>
                <Calendar className="h-6 w-6" style={{ color: "hsl(var(--badge-color-4))" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("bills.next7Days")}</p>
                <p className="text-2xl font-bold" style={{ color: "hsl(var(--badge-color-4))" }}>{dashboard.proximosVencimentos.quantidade}</p>
                <p className="text-xs text-muted-foreground">R$ {parseFloat(dashboard.proximosVencimentos.total).toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-green-500/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("bills.paidThisMonth")}</p>
                <p className="text-xl font-bold text-destructive">- R$ {parseFloat(dashboard.pagosMes.totalPago).toLocaleString("pt-BR")}</p>
                <p className="text-xl font-bold text-green-500">+ R$ {parseFloat(dashboard.pagosMes.totalRecebido).toLocaleString("pt-BR")}</p>
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
            <SelectItem value="todos">{t("common.allTypes")}</SelectItem>
            <SelectItem value="a_pagar">{t("bills.toPay")}</SelectItem>
            <SelectItem value="a_receber">{t("bills.toReceive")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">{t("common.allStatus")}</SelectItem>
            <SelectItem value="pendente">{t("bills.pending")}</SelectItem>
            <SelectItem value="pago">{t("bills.paid")}</SelectItem>
            <SelectItem value="vencido">{t("bills.overdue")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div>{t("common.loading")}</div>
      ) : filteredBills.length === 0 ? (
        <Card className="p-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">{t("bills.noBillsRegistered")}</p>
          <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("bills.createFirstBill")}
          </Button>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">{t("common.type")}</th>
                  <th className="text-left p-3">{t("common.description")}</th>
                  <th className="text-left p-3">{t("common.category")}</th>
                  <th className="text-right p-3">{t("common.value")}</th>
                  <th className="text-left p-3">{t("bills.dueDate")}</th>
                  <th className="text-left p-3">{t("common.status")}</th>
                  <th className="text-right p-3">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <Badge variant={bill.tipo === "a_pagar" ? "destructive" : "default"}>
                        {bill.tipo === "a_pagar" ? t("bills.toPay") : t("bills.toReceive")}
                      </Badge>
                    </td>
                    <td className="p-3">{bill.descricao}</td>
                    <td className="p-3">{bill.categoria}</td>
                    <td className="p-3 text-right font-medium">R$ {parseFloat(bill.valor).toLocaleString("pt-BR")}</td>
                    <td className="p-3">{format(new Date(bill.dataVencimento), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td className="p-3">
                      <Badge style={{ backgroundColor: getStatusColor(bill.status), color: "white" }}>
                        {getStatusLabel(bill.status)}
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
                            if (confirm(t("bills.confirmDelete"))) {
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
