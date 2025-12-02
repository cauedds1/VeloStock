import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2, CreditCard, DollarSign, TrendingUp, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import AdminLogin from "./AdminLogin";

interface Stats {
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
  dataProximoPagamento: string;
}

export default function AdminPanel() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/admin/me").then(r => setIsAuth(r.ok)).catch(() => setIsAuth(false));
  }, []);

  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/admin/dashboard"], enabled: isAuth === true });
  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ["/api/admin/clientes", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/admin/clientes" : `/api/admin/clientes?status=${statusFilter}`;
      return fetch(url).then(r => r.json());
    },
    enabled: isAuth === true,
  });

  if (isAuth === null) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (!isAuth) return <AdminLogin />;

  const filteredClientes = clientes.filter(c =>
    c.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) || c.cnpj?.includes(searchTerm) || c.email?.includes(searchTerm)
  );

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setLocation("/");
  };

  const handleStatusChange = async (empresaId: string, novoStatus: string) => {
    await fetch(`/api/admin/clientes/${empresaId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/clientes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
  };

  const getStatusBadge = (status: string) => {
    const config: any = { ativo: { variant: "default", label: "Ativo" }, teste_gratis: { variant: "outline", label: "Teste" }, suspenso: { variant: "destructive", label: "Suspenso" }, cancelado: { variant: "secondary", label: "Cancelado" } };
    const cfg = config[status] || config.ativo;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gestão de clientes e pagamentos</p>
          </div>
          <Button onClick={handleLogout} variant="destructive" size="sm" className="gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalClientes || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.clientesAtivos || 0} ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teste</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.clientesTeste || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagtos Pendentes</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pagamentosPendentes || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Aberto</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {(Number(stats?.valorPendente) / 100).toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="teste_gratis">Teste</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? <div className="animate-pulse h-32 bg-muted rounded" /> : (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">Empresa</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClientes.map((c) => (
                      <tr key={c.empresaId} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">{c.nomeFantasia}</td>
                        <td className="px-4 py-3">{c.email}</td>
                        <td className="px-4 py-3">{getStatusBadge(c.subscriptionStatus)}</td>
                        <td className="px-4 py-3">
                          <Select defaultValue={c.subscriptionStatus} onValueChange={(s) => handleStatusChange(c.empresaId, s)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ativo">Ativar</SelectItem>
                              <SelectItem value="suspenso">Suspender</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
