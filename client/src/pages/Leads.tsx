import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Phone, Mail, User, TrendingUp, Calendar, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  status: string;
  origem: string | null;
  observacoes: string | null;
  valorProposta: string | null;
  createdAt: string;
  vendedorNome?: string;
};

type LeadStats = {
  total: number;
  convertidos: number;
  taxaConversao: number;
  porStatus: Array<{ status: string; count: number }>;
};

export default function Leads() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    status: "Novo",
    origem: "",
    observacoes: "",
    valorProposta: "",
  });

  // Buscar leads (backend já filtra por vendedor)
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Estatísticas
  const { data: stats } = useQuery<LeadStats>({
    queryKey: ["/api/leads/stats/me"],
  });

  // Buscar origens de leads das configurações avançadas
  const { data: advancedSettings } = useQuery({
    queryKey: ["/api/settings/advanced"],
    queryFn: async () => {
      const response = await fetch("/api/settings/advanced");
      if (!response.ok) {
        throw new Error("Erro ao buscar configurações");
      }
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats/me"] });
      toast({ title: "Lead criado com sucesso!" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao criar lead", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats/me"] });
      toast({ title: "Lead atualizado!" });
      setEditingLead(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead excluído!" });
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      telefone: "",
      email: "",
      status: "Novo",
      origem: "",
      observacoes: "",
      valorProposta: "",
    });
  };

  const handleSubmit = () => {
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Novo": "bg-blue-500",
      "Contatado": "bg-purple-500",
      "Visitou Loja": "bg-indigo-500",
      "Proposta Enviada": "bg-yellow-500",
      "Negociando": "bg-orange-500",
      "Convertido": "bg-green-500",
      "Perdido": "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  if (isLoading) {
    return <div className="p-6">Carregando leads...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leads & CRM</h1>
          <p className="text-muted-foreground">Gerencie seus potenciais clientes</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="João Silva"
                  />
                </div>
                <div>
                  <Label>Telefone *</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Novo">Novo</SelectItem>
                      <SelectItem value="Contatado">Contatado</SelectItem>
                      <SelectItem value="Visitou Loja">Visitou Loja</SelectItem>
                      <SelectItem value="Proposta Enviada">Proposta Enviada</SelectItem>
                      <SelectItem value="Negociando">Negociando</SelectItem>
                      <SelectItem value="Convertido">Convertido</SelectItem>
                      <SelectItem value="Perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Origem</Label>
                  <Select value={formData.origem || ""} onValueChange={(v) => setFormData({ ...formData, origem: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(advancedSettings?.origensLeads || ["WhatsApp", "Telefone", "Presencial", "Site", "Indicação"]).map((origem: string) => (
                        <SelectItem key={origem} value={origem}>
                          {origem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Valor da Proposta (R$)</Label>
                <Input
                  type="number"
                  value={formData.valorProposta}
                  onChange={(e) => setFormData({ ...formData, valorProposta: e.target.value })}
                  placeholder="50000"
                />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Anotações sobre o lead..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingLead(null);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.nome || !formData.telefone}>
                  {editingLead ? "Salvar" : "Criar Lead"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total de Leads</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Convertidos</div>
            <div className="text-2xl font-bold text-green-600">{stats.convertidos}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Taxa de Conversão</div>
            <div className="text-2xl font-bold">{stats.taxaConversao}%</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Em Negociação</div>
            <div className="text-2xl font-bold">
              {stats.porStatus?.find((s: any) => s.status === "Negociando")?.count || 0}
            </div>
          </Card>
        </div>
      )}

      {/* Lista de Leads */}
      <div className="grid gap-4">
        {leads.length === 0 ? (
          <Card className="p-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum lead cadastrado ainda</p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Lead
            </Button>
          </Card>
        ) : (
          leads.map((lead: any) => (
            <Card key={lead.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{lead.nome}</h3>
                    <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                    {lead.origem && (
                      <Badge variant="outline">{lead.origem}</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {lead.telefone}
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {lead.email}
                      </div>
                    )}
                    {lead.valorProposta && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        R$ {parseFloat(lead.valorProposta).toLocaleString("pt-BR")}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(lead.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>

                  {lead.observacoes && (
                    <p className="mt-2 text-sm text-muted-foreground">{lead.observacoes}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingLead(lead);
                      setFormData({
                        nome: lead.nome,
                        telefone: lead.telefone,
                        email: lead.email || "",
                        status: lead.status,
                        origem: lead.origem || "",
                        observacoes: lead.observacoes || "",
                        valorProposta: lead.valorProposta || "",
                      });
                      setIsCreateOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Deseja excluir este lead?")) {
                        deleteMutation.mutate(lead.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
