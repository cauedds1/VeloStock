import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface DashboardStats {
  totalClientes: number;
  clientesAtivos: number;
  clientesTeste: number;
  totalVeiculos: number;
  totalUsuarios: number;
  pagamentosPendentes: number;
  valorPendente: number;
}

interface Cliente {
  empresaId: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  subscriptionStatus: string;
  plano: string;
  dataInicio: string;
  dataProximoPagamento: string;
  valorMensal: string;
}

export default function AdminPanel() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null);

  // Buscar dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
  });

  // Buscar clientes
  const { data: clientes = [], isLoading: clientesLoading } = useQuery<Cliente[]>({
    queryKey: ["/api/admin/clientes", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? "/api/admin/clientes"
        : `/api/admin/clientes?status=${statusFilter}`;
      const res = await fetch(url);
      return res.json();
    },
  });

  const filteredClientes = clientes.filter(c =>
    c.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm) ||
    c.email?.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ativo: { variant: "default" as const, label: "Ativo" },
      teste_gratis: { variant: "outline" as const, label: "Teste Gratuito" },
      suspenso: { variant: "destructive" as const, label: "Suspenso" },
      cancelado: { variant: "secondary" as const, label: "Cancelado" },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleChangeStatus = async (empresaId: string, novoStatus: string) => {
    try {
      const res = await fetch(`/api/admin/clientes/${empresaId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/clientes"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Painel Administrativo VeloStock</h1>
          <p className="text-muted-foreground">Gestão completa de clientes, pagamentos e assinaturas</p>
        </div>

        {/* Stats Grid */}
        {statsLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalClientes || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.clientesAtivos || 0} ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Teste Gratuito</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.clientesTeste || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pagamentosPendentes || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor em Aberto</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {(Number(stats?.valorPendente) / 100).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Clientes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Gerenciar todas as empresas e suas assinaturas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-4">
              <Input
                placeholder="Buscar por nome, CNPJ ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-clientes"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="teste_gratis">Teste Gratuito</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            {clientesLoading ? (
              <div className="animate-pulse space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Empresa</th>
                        <th className="px-4 py-3 text-left font-medium">CNPJ</th>
                        <th className="px-4 py-3 text-left font-medium">Email</th>
                        <th className="px-4 py-3 text-left font-medium">Plano</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Próx. Vencimento</th>
                        <th className="px-4 py-3 text-left font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClientes.map((cliente) => (
                        <tr key={cliente.empresaId} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 font-medium" data-testid={`text-empresa-${cliente.empresaId}`}>
                            {cliente.nomeFantasia}
                          </td>
                          <td className="px-4 py-3">{cliente.cnpj || "-"}</td>
                          <td className="px-4 py-3">{cliente.email || "-"}</td>
                          <td className="px-4 py-3 capitalize">{cliente.plano}</td>
                          <td className="px-4 py-3">{getStatusBadge(cliente.subscriptionStatus)}</td>
                          <td className="px-4 py-3">
                            {cliente.dataProximoPagamento
                              ? new Date(cliente.dataProximoPagamento).toLocaleDateString("pt-BR")
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              defaultValue={cliente.subscriptionStatus}
                              onValueChange={(novoStatus) =>
                                handleChangeStatus(cliente.empresaId, novoStatus)
                              }
                            >
                              <SelectTrigger className="w-32" data-testid={`select-status-${cliente.empresaId}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ativo">Ativar</SelectItem>
                                <SelectItem value="suspenso">Suspender</SelectItem>
                                <SelectItem value="cancelado">Cancelar</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filteredClientes.length === 0 && !clientesLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
