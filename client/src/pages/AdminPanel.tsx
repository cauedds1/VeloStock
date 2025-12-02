import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, Building2, CreditCard, DollarSign, TrendingUp, LogOut, Lock, Mail, User, Shield, KeyRound,
  Plus, Eye, Edit, Check, X, Calendar, Wallet, BarChart3, Settings, Clock, AlertTriangle, CheckCircle, Bug, Download, UserPlus, ArrowLeft
} from "lucide-react";
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

interface FinanceiroStats {
  totalRecebido: number;
  totalPendente: number;
  totalAtrasado: number;
  receitaMesAtual: number;
  countPagos: number;
  countPendentes: number;
  countAtrasados: number;
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

interface Pagamento {
  id: string;
  companyId: string;
  nomeEmpresa: string;
  valor: string;
  status: string;
  dataVencimento: string;
  dataPagamento: string | null;
  metodo: string | null;
  descricao: string | null;
  createdAt: string;
}

interface Admin {
  id: string;
  email: string;
  nome: string;
  isMaster?: boolean;
  token?: string;
}

interface AdminUser {
  id: string;
  email: string;
  nome: string;
  token: string | null;
  isMaster: boolean;
  ativo: boolean;
  ultimoLogin: string | null;
  createdAt: string;
}

interface BugReport {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhotoUrl?: string;
  message: string;
  status: string;
  createdAt: string;
  attachments?: Array<{
    fileName: string;
    fileData: string;
    mimeType: string;
  }>;
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

function AdminLogin({ onLogin }: { 
  onLogin: (admin: Admin & { isMaster?: boolean }) => void; 
}) {
  const [loginMethod, setLoginMethod] = useState<"token" | "email">("token");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body = loginMethod === "token" 
        ? { token } 
        : { email, password };

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
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
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <CardTitle className="text-2xl">Painel Administrativo</CardTitle>
          <CardDescription>
            Acesse o painel de gestão VeloStock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as "token" | "email")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="token" className="gap-2" data-testid="tab-login-token">
                <KeyRound className="h-4 w-4" />
                Token
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2" data-testid="tab-login-email">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TabsContent value="token" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="token">Token de Acesso</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="token"
                      type="password"
                      placeholder="Digite seu token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="pl-10"
                      required={loginMethod === "token"}
                      autoFocus={loginMethod === "token"}
                      data-testid="input-admin-token"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use o token fornecido pelo administrador master
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-0">
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
                      required={loginMethod === "email"}
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
                      required={loginMethod === "email"}
                      data-testid="input-admin-password"
                    />
                  </div>
                </div>
              </TabsContent>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-admin-login">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function NovaEmpresaDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    nomeFantasia: "",
    razaoSocial: "",
    cnpj: "",
    email: "",
    telefone: "",
    senhaTemporaria: "",
    plano: "basico",
    diasTestGratis: "14",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/clientes/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          diasTestGratis: parseInt(formData.diasTestGratis),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar empresa");
        return;
      }

      setOpen(false);
      setFormData({
        nomeFantasia: "",
        razaoSocial: "",
        cnpj: "",
        email: "",
        telefone: "",
        senhaTemporaria: "",
        plano: "basico",
        diasTestGratis: "14",
      });
      onSuccess();
    } catch (err) {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-nova-empresa">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
          <DialogDescription>
            Adicione uma nova empresa ao sistema VeloStock
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nomeFantasia">Nome Fantasia *</Label>
              <Input
                id="nomeFantasia"
                value={formData.nomeFantasia}
                onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                required
                data-testid="input-nome-fantasia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão Social</Label>
              <Input
                id="razaoSocial"
                value={formData.razaoSocial}
                onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                data-testid="input-razao-social"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
                data-testid="input-cnpj"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                data-testid="input-telefone"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="input-email-empresa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senhaTemporaria">Senha Temporária *</Label>
              <Input
                id="senhaTemporaria"
                type="password"
                value={formData.senhaTemporaria}
                onChange={(e) => setFormData({ ...formData, senhaTemporaria: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                data-testid="input-senha-temporaria"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plano">Plano</Label>
              <Select value={formData.plano} onValueChange={(v) => setFormData({ ...formData, plano: v })}>
                <SelectTrigger data-testid="select-plano">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diasTestGratis">Dias de Teste</Label>
              <Input
                id="diasTestGratis"
                type="number"
                min="0"
                max="90"
                value={formData.diasTestGratis}
                onChange={(e) => setFormData({ ...formData, diasTestGratis: e.target.value })}
                data-testid="input-dias-teste"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} data-testid="button-salvar-empresa">
              {loading ? "Salvando..." : "Cadastrar Empresa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NovoPagamentoDialog({ clientes, onSuccess }: { clientes: Cliente[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    companyId: "",
    valor: "",
    dataVencimento: "",
    descricao: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/pagamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          valor: parseFloat(formData.valor),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar pagamento");
        return;
      }

      setOpen(false);
      setFormData({
        companyId: "",
        valor: "",
        dataVencimento: "",
        descricao: "",
      });
      onSuccess();
    } catch (err) {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-novo-pagamento">
          <Plus className="h-4 w-4" />
          Nova Cobrança
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Nova Cobrança</DialogTitle>
          <DialogDescription>
            Gere uma nova cobrança para uma empresa
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyId">Empresa *</Label>
            <Select value={formData.companyId} onValueChange={(v) => setFormData({ ...formData, companyId: v })}>
              <SelectTrigger data-testid="select-empresa-pagamento">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.empresaId} value={c.empresaId}>
                    {c.nomeFantasia || "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                required
                data-testid="input-valor-pagamento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataVencimento">Vencimento *</Label>
              <Input
                id="dataVencimento"
                type="date"
                value={formData.dataVencimento}
                onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                required
                data-testid="input-vencimento-pagamento"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Ex: Mensalidade Dezembro/2025"
              data-testid="input-descricao-pagamento"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} data-testid="button-salvar-pagamento">
              {loading ? "Salvando..." : "Criar Cobrança"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPanel() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagamentoFilter, setPagamentoFilter] = useState("all");
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

        // Verifica se há sessão ativa, mas NÃO valida token automaticamente
        // O token SEMPRE será solicitado ao acessar /admin
        const res = await fetch("/api/admin/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setAdmin(data);
          // NÃO setar tokenValidated aqui - sempre pedir token primeiro
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
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setAdmin(null);
    setTokenValidated(false);
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
      const res = await fetch("/api/admin/dashboard", { credentials: "include" });
      if (res.status === 401) {
        handleSessionExpired();
        throw new Error("Sessão expirada");
      }
      return res.json();
    },
    retry: false,
  });

  const { data: financeiroStats, isLoading: financeiroStatsLoading } = useQuery<FinanceiroStats>({
    queryKey: ["/api/admin/financeiro/stats"],
    enabled: !!admin,
    queryFn: async () => {
      const res = await fetch("/api/admin/financeiro/stats", { credentials: "include" });
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
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) {
        handleSessionExpired();
        throw new Error("Sessão expirada");
      }
      return res.json();
    },
    enabled: !!admin,
    retry: false,
  });

  const { data: pagamentos = [], isLoading: pagamentosLoading } = useQuery<Pagamento[]>({
    queryKey: ["/api/admin/pagamentos", pagamentoFilter],
    queryFn: async () => {
      const url = pagamentoFilter === "all"
        ? "/api/admin/pagamentos"
        : `/api/admin/pagamentos?status=${pagamentoFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) {
        handleSessionExpired();
        throw new Error("Sessão expirada");
      }
      return res.json();
    },
    enabled: !!admin,
    retry: false,
  });

  const { data: bugs = [], isLoading: bugsLoading } = useQuery<BugReport[]>({
    queryKey: ["/api/bug-reports"],
    queryFn: async () => {
      const res = await fetch("/api/bug-reports", { credentials: "include" });
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

  const getPagamentoStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "outline" | "destructive" | "secondary"; label: string; icon: any }> = {
      pago: { variant: "default", label: "Pago", icon: CheckCircle },
      pendente: { variant: "outline", label: "Pendente", icon: Clock },
      atrasado: { variant: "destructive", label: "Atrasado", icon: AlertTriangle },
      cancelado: { variant: "secondary", label: "Cancelado", icon: X },
    };
    const config = statusConfig[status] || statusConfig.pendente;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleChangeStatus = async (empresaId: string, novoStatus: string) => {
    try {
      const res = await fetch(`/api/admin/clientes/${empresaId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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

  const handleChangePagamentoStatus = async (paymentId: string, novoStatus: string) => {
    try {
      const updates: any = { status: novoStatus };
      if (novoStatus === "pago") {
        updates.dataPagamento = new Date().toISOString();
      }

      const res = await fetch(`/api/admin/pagamentos/${paymentId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/pagamentos"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/financeiro/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      }
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
    }
  };

  const handleChangeBugStatus = async (bugId: string, novoStatus: string) => {
    try {
      const res = await fetch(`/api/bug-reports/${bugId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: novoStatus }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/bug-reports"] });
      }
    } catch (error) {
      console.error("Erro ao atualizar status do bug:", error);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-green-500">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
          <p className="text-white font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <AdminLogin onLogin={setAdmin} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold">Painel Administrativo VeloStock</h1>
            <p className="text-muted-foreground text-sm hidden sm:block">
              Olá, {admin.nome}
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-admin-logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full lg:w-auto lg:inline-grid ${admin.isMaster ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
              <BarChart3 className="h-4 w-4 hidden sm:inline" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="empresas" className="gap-2" data-testid="tab-empresas">
              <Building2 className="h-4 w-4 hidden sm:inline" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-2" data-testid="tab-financeiro">
              <Wallet className="h-4 w-4 hidden sm:inline" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2" data-testid="tab-config">
              <Settings className="h-4 w-4 hidden sm:inline" />
              Config
            </TabsTrigger>
            <TabsTrigger value="bugs" className="gap-2" data-testid="tab-bugs">
              <Bug className="h-4 w-4 hidden sm:inline" />
              Bugs
            </TabsTrigger>
            {admin.isMaster && (
              <TabsTrigger value="usuarios" className="gap-2" data-testid="tab-usuarios">
                <UserPlus className="h-4 w-4 hidden sm:inline" />
                Usuários
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {statsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-muted rounded-lg" />
              </div>
            ) : (
              <>
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
                      <CardTitle className="text-xs sm:text-sm font-medium">Total Veículos</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">{stats?.totalVeiculos || 0}</div>
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

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Últimas Empresas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientes.slice(0, 5).map((c) => (
                        <div key={c.empresaId} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{c.nomeFantasia || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                          {getStatusBadge(c.subscriptionStatus)}
                        </div>
                      ))}
                      {clientes.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">Nenhuma empresa cadastrada</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Últimos Pagamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pagamentos.slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{p.nomeEmpresa || "Empresa"}</p>
                            <p className="text-xs text-muted-foreground">
                              R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          {getPagamentoStatusBadge(p.status)}
                        </div>
                      ))}
                      {pagamentos.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">Nenhum pagamento registrado</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="empresas" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Empresas</CardTitle>
                  <CardDescription>Gerenciar todas as empresas e suas assinaturas</CardDescription>
                </div>
                <NovaEmpresaDialog onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/clientes"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
                }} />
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
                    Nenhuma empresa encontrada
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-6">
            {financeiroStatsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-muted rounded-lg" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Total Recebido</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      R$ {(financeiroStats?.totalRecebido || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financeiroStats?.countPagos || 0} pagamentos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Pendente</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                      R$ {(financeiroStats?.totalPendente || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financeiroStats?.countPendentes || 0} cobranças
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Atrasado</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-red-600">
                      R$ {(financeiroStats?.totalAtrasado || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financeiroStats?.countAtrasados || 0} cobranças
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Receita do Mês</CardTitle>
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">
                      R$ {(financeiroStats?.receitaMesAtual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Cobranças</CardTitle>
                  <CardDescription>Gerenciar pagamentos e faturas</CardDescription>
                </div>
                <NovoPagamentoDialog
                  clientes={clientes}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/pagamentos"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/financeiro/stats"] });
                  }}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Select value={pagamentoFilter} onValueChange={setPagamentoFilter}>
                    <SelectTrigger className="w-48" data-testid="select-pagamento-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendente">Pendentes</SelectItem>
                      <SelectItem value="pago">Pagos</SelectItem>
                      <SelectItem value="atrasado">Atrasados</SelectItem>
                      <SelectItem value="cancelado">Cancelados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pagamentosLoading ? (
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
                            <th className="px-4 py-3 text-left font-medium">Valor</th>
                            <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Descrição</th>
                            <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Vencimento</th>
                            <th className="px-4 py-3 text-left font-medium">Status</th>
                            <th className="px-4 py-3 text-left font-medium">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagamentos.map((pag) => (
                            <tr key={pag.id} className="border-b hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium">
                                {pag.nomeEmpresa || "Empresa"}
                              </td>
                              <td className="px-4 py-3">
                                R$ {Number(pag.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">{pag.descricao || "-"}</td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                {pag.dataVencimento
                                  ? new Date(pag.dataVencimento).toLocaleDateString("pt-BR")
                                  : "-"}
                              </td>
                              <td className="px-4 py-3">{getPagamentoStatusBadge(pag.status)}</td>
                              <td className="px-4 py-3">
                                <Select
                                  defaultValue={pag.status}
                                  onValueChange={(novoStatus) =>
                                    handleChangePagamentoStatus(pag.id, novoStatus)
                                  }
                                >
                                  <SelectTrigger className="w-32" data-testid={`select-pagamento-${pag.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="pago">Marcar Pago</SelectItem>
                                    <SelectItem value="atrasado">Atrasado</SelectItem>
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

                {pagamentos.length === 0 && !pagamentosLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento encontrado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>Gerencie as configurações gerais do VeloStock</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Informações do Admin</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Nome:</span> {admin.nome}</p>
                      <p><span className="text-muted-foreground">Email:</span> {admin.email}</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Estatísticas Gerais</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <p><span className="text-muted-foreground">Total de Empresas:</span> {stats?.totalClientes || 0}</p>
                      <p><span className="text-muted-foreground">Empresas Ativas:</span> {stats?.clientesAtivos || 0}</p>
                      <p><span className="text-muted-foreground">Total de Veículos:</span> {stats?.totalVeiculos || 0}</p>
                      <p><span className="text-muted-foreground">Total de Usuários:</span> {stats?.totalUsuarios || 0}</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Planos Disponíveis</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Básico</span>
                        <span className="text-muted-foreground">Funcionalidades essenciais</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Profissional</span>
                        <span className="text-muted-foreground">Recursos avançados + IA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Enterprise</span>
                        <span className="text-muted-foreground">Tudo + suporte prioritário</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bugs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios de Bugs</CardTitle>
                <CardDescription>
                  Acompanhe os bugs reportados pelos usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bugsLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : bugs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bug className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum bug reportado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bugs.map((bug) => (
                      <Card key={bug.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                  {bug.userName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{bug.userName}</p>
                                  <p className="text-xs text-muted-foreground">{bug.userEmail}</p>
                                </div>
                              </div>
                              <p className="text-sm mt-2 leading-relaxed">{bug.message}</p>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <div className="text-xs text-muted-foreground">
                                {new Date(bug.createdAt).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>
                              {bug.attachments && bug.attachments.length > 0 && (
                                <div className="text-xs bg-muted px-2 py-1 rounded">
                                  {bug.attachments.length} anexo(s)
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <Badge variant={bug.status === "novo" ? "destructive" : bug.status === "em_analise" ? "outline" : "default"}>
                              {bug.status === "novo" ? "Novo" : bug.status === "em_analise" ? "Em Análise" : "Resolvido"}
                            </Badge>
                            <Select value={bug.status} onValueChange={(value) => handleChangeBugStatus(bug.id, value)}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="novo">Novo</SelectItem>
                                <SelectItem value="em_analise">Em Análise</SelectItem>
                                <SelectItem value="resolvido">Resolvido</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {admin.isMaster && (
            <TabsContent value="usuarios" className="space-y-6">
              <UsuariosAdminTab />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function UsuariosAdminTab() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: "", password: "", nome: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/usuarios", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch (err) {
      console.error("Erro ao carregar admins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newAdmin),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar usuário");
        return;
      }

      setShowCreateForm(false);
      setNewAdmin({ email: "", password: "", nome: "" });
      fetchAdmins();
    } catch (err) {
      setError("Erro de conexão");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (adminId: string, ativo: boolean) => {
    try {
      const res = await fetch(`/api/admin/usuarios/${adminId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ativo: !ativo }),
      });

      if (res.ok) {
        fetchAdmins();
      }
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    }
  };

  const handleRegenerateToken = async (adminId: string) => {
    try {
      const res = await fetch(`/api/admin/usuarios/${adminId}/regenerar-token`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        fetchAdmins();
      }
    } catch (err) {
      console.error("Erro ao regenerar token:", err);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Usuários Administradores</h2>
          <p className="text-sm text-muted-foreground">Gerencie os administradores do sistema</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2" data-testid="button-criar-admin">
          <UserPlus className="h-4 w-4" />
          Criar Usuário
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Administrador</CardTitle>
            <CardDescription>O token será gerado automaticamente</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-nome">Nome</Label>
                  <Input
                    id="new-nome"
                    value={newAdmin.nome}
                    onChange={(e) => setNewAdmin({ ...newAdmin, nome: e.target.value })}
                    placeholder="Nome do administrador"
                    required
                    data-testid="input-new-admin-nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    required
                    data-testid="input-new-admin-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    placeholder="Senha de acesso"
                    required
                    minLength={6}
                    data-testid="input-new-admin-password"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createLoading} data-testid="button-submit-criar-admin">
                  {createLoading ? "Criando..." : "Criar Administrador"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Administradores</CardTitle>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum administrador cadastrado</p>
          ) : (
            <div className="space-y-4">
              {admins.map((a) => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{a.nome}</p>
                      {a.isMaster && <Badge variant="default">Master</Badge>}
                      {!a.ativo && <Badge variant="destructive">Desativado</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.email}</p>
                    {a.token && (
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {a.token.substring(0, 20)}...
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToken(a.token!)}
                          data-testid={`button-copy-token-${a.id}`}
                        >
                          {copiedToken === a.token ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    )}
                    {a.ultimoLogin && (
                      <p className="text-xs text-muted-foreground">
                        Último login: {new Date(a.ultimoLogin).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!a.isMaster && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRegenerateToken(a.id)}
                          data-testid={`button-regenerate-token-${a.id}`}
                        >
                          <KeyRound className="h-4 w-4 mr-1" />
                          Novo Token
                        </Button>
                        <Button
                          size="sm"
                          variant={a.ativo ? "destructive" : "default"}
                          onClick={() => handleToggleStatus(a.id, a.ativo)}
                          data-testid={`button-toggle-status-${a.id}`}
                        >
                          {a.ativo ? (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Ativar
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
