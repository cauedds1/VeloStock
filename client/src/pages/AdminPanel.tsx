import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2, CreditCard, DollarSign, TrendingUp, LogOut, Lock, Mail, User, Shield, KeyRound } from "lucide-react";
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

interface Admin {
  id: string;
  email: string;
  nome: string;
}

function TokenGate({ onValidToken }: { onValidToken: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Token inválido");
        return;
      }

      onValidToken(token);
    } catch (err) {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-green-500 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
          <CardDescription>
            Digite o token de acesso para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token de Acesso</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="token"
                  type="password"
                  placeholder="Digite seu token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="pl-10"
                  required
                  autoFocus
                  data-testid="input-admin-access-token"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading} data-testid="button-validate-token">
              {loading ? "Validando..." : "Acessar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminSetup({ accessToken, onSetupComplete }: { accessToken: string; onSetupComplete: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-setup-token": accessToken
        },
        body: JSON.stringify({ email, password, nome, setupToken: accessToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar admin");
        return;
      }

      onSetupComplete();
    } catch (err) {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-green-500 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Configurar Admin</CardTitle>
          <CardDescription>
            Crie sua conta de administrador do VeloStock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome"
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-admin-nome"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@velostock.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-admin-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-admin-password"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading} data-testid="button-admin-setup">
              {loading ? "Criando..." : "Criar Conta Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminLogin({ onLogin }: { onLogin: (admin: Admin) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao fazer login");
        return;
      }

      onLogin(data);
    } catch (err) {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-green-500 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Painel Administrativo</CardTitle>
          <CardDescription>
            Acesse o painel de gestão de clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@velostock.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-admin-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-admin-password"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading} data-testid="button-admin-login">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPanel() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const setupRes = await fetch("/api/admin/needs-setup");
        const setupData = await setupRes.json();
        
        if (setupData.needsSetup) {
          setNeedsSetup(true);
          setAuthChecked(true);
          return;
        }

        const res = await fetch("/api/admin/me");
        if (res.ok) {
          const data = await res.json();
          setAdmin(data);
          setTokenValidated(true);
        }
      } catch (err) {
        console.error("Erro ao verificar autenticação:", err);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdmin(null);
    queryClient.clear();
  };

  const handleSessionExpired = () => {
    setAdmin(null);
    queryClient.clear();
  };

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
    enabled: !!admin,
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        handleSessionExpired();
        throw new Error("Sessão expirada");
      }
      return res.json();
    },
    retry: false,
  });

  const { data: clientes = [], isLoading: clientesLoading } = useQuery<Cliente[]>({
    queryKey: ["/api/admin/clientes", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all"
        ? "/api/admin/clientes"
        : `/api/admin/clientes?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.status === 401) {
        handleSessionExpired();
        throw new Error("Sessão expirada");
      }
      return res.json();
    },
    enabled: !!admin,
    retry: false,
  });

  const filteredClientes = clientes.filter(c =>
    c.nomeFantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm) ||
    c.email?.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "outline" | "destructive" | "secondary"; label: string }> = {
      ativo: { variant: "default", label: "Ativo" },
      teste_gratis: { variant: "outline", label: "Teste Gratuito" },
      suspenso: { variant: "destructive", label: "Suspenso" },
      cancelado: { variant: "secondary", label: "Cancelado" },
    };
    const config = statusConfig[status] || statusConfig.ativo;
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

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Precisa de setup - primeiro mostra tela de token
  if (needsSetup) {
    if (!tokenValidated) {
      return (
        <TokenGate
          onValidToken={(token) => {
            setAccessToken(token);
            setTokenValidated(true);
          }}
        />
      );
    }
    // Token validado, mostra tela de setup
    return (
      <AdminSetup
        accessToken={accessToken}
        onSetupComplete={() => {
          setNeedsSetup(false);
          setTokenValidated(false);
          setAccessToken("");
        }}
      />
    );
  }

  // Já tem admin configurado, mostra login
  if (!admin) {
    return <AdminLogin onLogin={setAdmin} />;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-4xl font-bold">Painel Administrativo VeloStock</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Olá, {admin.nome}
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="gap-2 self-start sm:self-auto"
            data-testid="button-admin-logout"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>

        {statsLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total de Clientes</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats?.totalClientes || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.clientesAtivos || 0} ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Teste Gratuito</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats?.clientesTeste || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Pag. Pendentes</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats?.pagamentosPendentes || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Valor Pendente</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  R$ {(Number(stats?.valorPendente) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Gerenciar todas as empresas e suas assinaturas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Input
                placeholder="Buscar por nome, CNPJ ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
                data-testid="input-search-clientes"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
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
                        <th className="px-4 py-3 text-left font-medium hidden md:table-cell">CNPJ</th>
                        <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Email</th>
                        <th className="px-4 py-3 text-left font-medium">Plano</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Vencimento</th>
                        <th className="px-4 py-3 text-left font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClientes.map((cliente) => (
                        <tr key={cliente.empresaId} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 font-medium" data-testid={`text-empresa-${cliente.empresaId}`}>
                            {cliente.nomeFantasia || "Sem nome"}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">{cliente.cnpj || "-"}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">{cliente.email || "-"}</td>
                          <td className="px-4 py-3 capitalize">{cliente.plano || "basico"}</td>
                          <td className="px-4 py-3">{getStatusBadge(cliente.subscriptionStatus)}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {cliente.dataProximoPagamento
                              ? new Date(cliente.dataProximoPagamento).toLocaleDateString("pt-BR")
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              defaultValue={cliente.subscriptionStatus || "ativo"}
                              onValueChange={(novoStatus) =>
                                handleChangeStatus(cliente.empresaId, novoStatus)
                              }
                            >
                              <SelectTrigger className="w-28 sm:w-32" data-testid={`select-status-${cliente.empresaId}`}>
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
