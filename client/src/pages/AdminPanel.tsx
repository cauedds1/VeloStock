import { useState, useEffect, useRef } from "react";
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
  Plus, Eye, Edit, Check, X, Calendar, Wallet, BarChart3, Settings, Clock, AlertTriangle, CheckCircle, Bug, Download, UserPlus, ArrowLeft, Paperclip, FileIcon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useI18n, Language } from "@/lib/i18n";
import { Globe } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

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
  const { t } = useI18n();
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
        setError(data.error || t("admin.invalidToken"));
        return;
      }

      onValidToken(token);
    } catch (err) {
      setError(t("admin.connectionError"));
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
          <CardTitle className="text-2xl">{t("admin.accessRestricted")}</CardTitle>
          <CardDescription>
            {t("admin.enterToken")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">{t("admin.accessToken")}</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="token"
                  type="password"
                  placeholder={t("admin.enterTokenPlaceholder")}
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

            <div className="text-center text-sm pt-2">
              <span className="text-muted-foreground">{t("admin.restrictedAccessDescription")} </span>
              <button
                type="button"
                className="font-semibold text-purple-600 hover:text-purple-700 underline"
                onClick={() => (window.location.href = "/signup")}
                data-testid="link-create-dealer-account"
              >
                {t("admin.createAccountLink")}
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={loading} data-testid="button-validate-token">
              {loading ? t("admin.validating") : t("admin.access")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminSetup({ accessToken, onSetupComplete }: { accessToken: string; onSetupComplete: () => void }) {
  const { t } = useI18n();
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
        setError(data.error || t("admin.errorCreatingAdmin"));
        return;
      }

      onSetupComplete();
    } catch (err) {
      setError(t("admin.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-green-500 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("admin.setupAdmin")}</CardTitle>
          <CardDescription>
            {t("admin.createAdminAccount")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">{t("admin.name")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome"
                  type="text"
                  placeholder={t("admin.yourName")}
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
              <Label htmlFor="password">{t("auth.password")}</Label>
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
              {loading ? t("admin.creating") : t("admin.createAdminBtn")}
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
  const { t } = useI18n();
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
        setError(data.error || t("admin.errorLogging"));
        return;
      }

      onLogin(data);
    } catch (err) {
      setError(t("admin.connectionError"));
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
          <CardTitle className="text-2xl">{t("admin.title")}</CardTitle>
          <CardDescription>
            {t("admin.panelAccess")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as "token" | "email")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="token" className="gap-2" data-testid="tab-login-token">
                <KeyRound className="h-4 w-4" />
                {t("admin.loginByToken")}
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2" data-testid="tab-login-email">
                <Mail className="h-4 w-4" />
                {t("admin.loginByEmail")}
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TabsContent value="token" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="token">{t("admin.accessToken")}</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="token"
                      type="password"
                      placeholder={t("admin.enterTokenPlaceholder")}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="pl-10"
                      required={loginMethod === "token"}
                      autoFocus={loginMethod === "token"}
                      data-testid="input-admin-token"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.useTokenProvided")}
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
                  <Label htmlFor="password">{t("auth.password")}</Label>
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

              <div className="text-center text-sm pt-2">
                <span className="text-muted-foreground">{t("admin.exclusiveAccessDescription")} </span>
                <button
                  type="button"
                  className="font-semibold text-purple-600 hover:text-purple-700 underline"
                  onClick={() => (window.location.href = "/signup")}
                  data-testid="link-create-dealer-account-2"
                >
                  {t("admin.createAccountLink2")}
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-admin-login">
                {loading ? t("admin.entering") : t("admin.login")}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function NovaEmpresaDialog({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useI18n();
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
        setError(data.error || t("admin.errorCreatingCompany"));
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
      setError(t("admin.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-nova-empresa">
          <Plus className="h-4 w-4" />
          {t("admin.newCompany")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.registerNewCompany")}</DialogTitle>
          <DialogDescription>
            {t("admin.addCompanyToSystem")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nomeFantasia">{t("admin.tradeName")} *</Label>
              <Input
                id="nomeFantasia"
                value={formData.nomeFantasia}
                onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                required
                data-testid="input-nome-fantasia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">{t("admin.corporateName")}</Label>
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
              <Label htmlFor="telefone">{t("admin.phone")}</Label>
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
              <Label htmlFor="senhaTemporaria">{t("admin.temporaryPassword")} *</Label>
              <Input
                id="senhaTemporaria"
                type="password"
                value={formData.senhaTemporaria}
                onChange={(e) => setFormData({ ...formData, senhaTemporaria: e.target.value })}
                placeholder={t("admin.minChars")}
                required
                minLength={6}
                data-testid="input-senha-temporaria"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plano">{t("admin.plan")}</Label>
              <Select value={formData.plano} onValueChange={(v) => setFormData({ ...formData, plano: v })}>
                <SelectTrigger data-testid="select-plano">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">{t("admin.planBasic")}</SelectItem>
                  <SelectItem value="profissional">{t("admin.planPro")}</SelectItem>
                  <SelectItem value="enterprise">{t("admin.planEnterprise")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diasTestGratis">{t("admin.trialDays")}</Label>
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
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading} data-testid="button-salvar-empresa">
              {loading ? t("admin.saving") : t("admin.registerCompany")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NovoPagamentoDialog({ clientes, onSuccess }: { clientes: Cliente[]; onSuccess: () => void }) {
  const { t } = useI18n();
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
        setError(data.error || t("admin.errorCreatingPayment"));
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
      setError(t("admin.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-novo-pagamento">
          <Plus className="h-4 w-4" />
          {t("admin.newCharge")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.createNewCharge")}</DialogTitle>
          <DialogDescription>
            {t("admin.generateChargeForCompany")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyId">{t("admin.company")} *</Label>
            <Select value={formData.companyId} onValueChange={(v) => setFormData({ ...formData, companyId: v })}>
              <SelectTrigger data-testid="select-empresa-pagamento">
                <SelectValue placeholder={t("admin.selectCompany")} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.empresaId} value={c.empresaId}>
                    {c.nomeFantasia || t("admin.noName")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">{t("admin.valueAmount")} *</Label>
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
              <Label htmlFor="dataVencimento">{t("admin.dueDate")} *</Label>
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
            <Label htmlFor="descricao">{t("common.description")}</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder={t("admin.monthlyExample")}
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
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading} data-testid="button-salvar-pagamento">
              {loading ? t("admin.saving") : t("admin.createCharge")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPanel() {
  const { t } = useI18n();
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
  const [selectedBugAttachments, setSelectedBugAttachments] = useState<{
    attachments: Array<{ fileName: string; fileData: string; mimeType: string }>;
    userName: string;
  } | null>(null);
  const [selectedCompanyUsers, setSelectedCompanyUsers] = useState<{
    companyId: string;
    companyName: string;
  } | null>(null);
  const [companyUsers, setCompanyUsers] = useState<Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
  }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUserEmail, setEditingUserEmail] = useState<{ userId: string; currentEmail: string } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const justLoggedInRef = useRef(false);

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

        const res = await fetch("/api/admin/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setAdmin(data);
        }
      } catch (err) {
        console.error("Erro ao verificar autenticação:", err);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (adminData: Admin) => {
    justLoggedInRef.current = true;
    setAdmin(adminData);
    setTimeout(() => {
      justLoggedInRef.current = false;
    }, 3000);
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setAdmin(null);
    setTokenValidated(false);
    queryClient.clear();
  };

  const handleSessionExpired = () => {
    if (justLoggedInRef.current) {
      return;
    }
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
        throw new Error(t("admin.sessionExpired"));
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
        throw new Error(t("admin.sessionExpired"));
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
        throw new Error(t("admin.sessionExpired"));
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
        throw new Error(t("admin.sessionExpired"));
      }
      return res.json();
    },
    enabled: !!admin,
    retry: false,
  });

  const { data: bugs = [], isLoading: bugsLoading } = useQuery<BugReport[]>({
    queryKey: ["/api/admin/bug-reports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/bug-reports", { credentials: "include" });
      if (res.status === 401) {
        handleSessionExpired();
        throw new Error(t("admin.sessionExpired"));
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
      ativo: { variant: "default", label: t("admin.statusActive") },
      teste_gratis: { variant: "outline", label: t("admin.statusTrial") },
      suspenso: { variant: "destructive", label: t("admin.statusSuspended") },
      cancelado: { variant: "secondary", label: t("admin.statusCanceled") },
    };
    const config = statusConfig[status] || statusConfig.ativo;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPagamentoStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "outline" | "destructive" | "secondary"; label: string; icon: any }> = {
      pago: { variant: "default", label: t("admin.statusPaid"), icon: CheckCircle },
      pendente: { variant: "outline", label: t("admin.statusPending"), icon: Clock },
      atrasado: { variant: "destructive", label: t("admin.statusOverdue"), icon: AlertTriangle },
      cancelado: { variant: "secondary", label: t("admin.statusCanceled"), icon: X },
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
      const res = await fetch(`/api/admin/bug-reports/${bugId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: novoStatus }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/bug-reports"] });
      }
    } catch (error) {
      console.error("Erro ao atualizar status do bug:", error);
    }
  };

  const handleOpenCompanyUsers = async (companyId: string, companyName: string) => {
    setSelectedCompanyUsers({ companyId, companyName });
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/clientes/${companyId}/usuarios`, {
        credentials: "include",
      });
      if (res.ok) {
        const users = await res.json();
        setCompanyUsers(users);
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!editingUserEmail || !newEmail) return;
    setSavingEmail(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${editingUserEmail.userId}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ novoEmail: newEmail }),
      });

      if (res.ok) {
        setCompanyUsers(prev => prev.map(u => 
          u.id === editingUserEmail.userId ? { ...u, email: newEmail } : u
        ));
        setEditingUserEmail(null);
        setNewEmail("");
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao alterar email");
      }
    } catch (error) {
      console.error("Erro ao alterar email:", error);
    } finally {
      setSavingEmail(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-green-500">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
          <p className="text-white font-medium">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  // If system needs setup, first validate token then create admin account
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
    return (
      <AdminSetup
        accessToken={accessToken}
        onSetupComplete={() => {
          // After setup, redirect to login
          setNeedsSetup(false);
          setTokenValidated(false);
        }}
      />
    );
  }

  if (!admin) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold">{t("admin.panelTitle")}</h1>
            <p className="text-muted-foreground text-sm hidden sm:block">
              {t("admin.hello")}, {admin.nome}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="gap-2"
              data-testid="button-admin-logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("auth.logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full lg:w-auto lg:inline-grid ${admin.isMaster ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
              <BarChart3 className="h-4 w-4 hidden sm:inline" />
              {t("admin.dashboard")}
            </TabsTrigger>
            <TabsTrigger value="empresas" className="gap-2" data-testid="tab-empresas">
              <Building2 className="h-4 w-4 hidden sm:inline" />
              {t("admin.companies")}
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-2" data-testid="tab-financeiro">
              <Wallet className="h-4 w-4 hidden sm:inline" />
              {t("admin.financial")}
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2" data-testid="tab-config">
              <Settings className="h-4 w-4 hidden sm:inline" />
              {t("admin.config")}
            </TabsTrigger>
            <TabsTrigger value="bugs" className="gap-2" data-testid="tab-bugs">
              <Bug className="h-4 w-4 hidden sm:inline" />
              {t("admin.bugReports")}
            </TabsTrigger>
            {admin.isMaster && (
              <TabsTrigger value="usuarios" className="gap-2" data-testid="tab-usuarios">
                <UserPlus className="h-4 w-4 hidden sm:inline" />
                {t("admin.users")}
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
                      <CardTitle className="text-xs sm:text-sm font-medium">{t("admin.totalClients")}</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">{stats?.totalClientes || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.clientesAtivos || 0} {t("admin.activeClients")}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                      <CardTitle className="text-xs sm:text-sm font-medium">{t("admin.freeTrial")}</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">{stats?.clientesTeste || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                      <CardTitle className="text-xs sm:text-sm font-medium">{t("admin.totalVehicles")}</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">{stats?.totalVeiculos || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                      <CardTitle className="text-xs sm:text-sm font-medium">{t("admin.pendingValue")}</CardTitle>
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
                      <CardTitle className="text-lg">{t("admin.latestCompanies")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientes.slice(0, 5).map((c) => (
                        <div key={c.empresaId} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{c.nomeFantasia || t("admin.noName")}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                          {getStatusBadge(c.subscriptionStatus)}
                        </div>
                      ))}
                      {clientes.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">{t("admin.noCompanyRegistered")}</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t("admin.latestPayments")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pagamentos.slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{p.nomeEmpresa || t("admin.company")}</p>
                            <p className="text-xs text-muted-foreground">
                              R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          {getPagamentoStatusBadge(p.status)}
                        </div>
                      ))}
                      {pagamentos.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">{t("admin.noPaymentRegistered")}</p>
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
                  <CardTitle>{t("admin.companies")}</CardTitle>
                  <CardDescription>{t("admin.manageCompaniesDesc")}</CardDescription>
                </div>
                <NovaEmpresaDialog onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/clientes"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
                }} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Input
                    placeholder={t("admin.searchByNameCnpjEmail")}
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
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="ativo">{t("admin.statusActive")}</SelectItem>
                      <SelectItem value="teste_gratis">{t("admin.freeTrial")}</SelectItem>
                      <SelectItem value="suspenso">{t("admin.statusSuspended")}</SelectItem>
                      <SelectItem value="cancelado">{t("admin.statusCanceled")}</SelectItem>
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
                            <th className="px-4 py-3 text-left font-medium">{t("admin.company")}</th>
                            <th className="px-4 py-3 text-left font-medium hidden md:table-cell">CNPJ</th>
                            <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Email</th>
                            <th className="px-4 py-3 text-left font-medium">{t("admin.plan")}</th>
                            <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                            <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">{t("admin.dueDate")}</th>
                            <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClientes.map((cliente) => (
                            <tr key={cliente.empresaId} className="border-b hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium" data-testid={`text-empresa-${cliente.empresaId}`}>
                                {cliente.nomeFantasia || t("admin.noName")}
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
                                <div className="flex items-center gap-2">
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
                                      <SelectItem value="ativo">{t("admin.activate")}</SelectItem>
                                      <SelectItem value="suspenso">{t("admin.suspend")}</SelectItem>
                                      <SelectItem value="cancelado">{t("admin.cancel")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => handleOpenCompanyUsers(cliente.empresaId, cliente.nomeFantasia || "Empresa")}
                                    title={t("admin.manageUsers")}
                                    data-testid={`button-users-${cliente.empresaId}`}
                                  >
                                    <Users className="h-4 w-4" />
                                  </Button>
                                </div>
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
                    {t("admin.noCompanyFound")}
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
                    <CardTitle className="text-xs sm:text-sm font-medium">{t("admin.totalReceived")}</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      R$ {(financeiroStats?.totalRecebido || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financeiroStats?.countPagos || 0} {t("admin.payments")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">{t("admin.statusPending")}</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                      R$ {(financeiroStats?.totalPendente || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financeiroStats?.countPendentes || 0} {t("admin.charges")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">{t("admin.statusOverdue")}</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-red-600">
                      R$ {(financeiroStats?.totalAtrasado || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financeiroStats?.countAtrasados || 0} {t("admin.charges")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">{t("admin.monthRevenue")}</CardTitle>
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
                  <CardTitle>{t("admin.charges")}</CardTitle>
                  <CardDescription>{t("admin.managePaymentsDesc")}</CardDescription>
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
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="pendente">{t("admin.statusPending")}</SelectItem>
                      <SelectItem value="pago">{t("admin.statusPaid")}</SelectItem>
                      <SelectItem value="atrasado">{t("admin.statusOverdue")}</SelectItem>
                      <SelectItem value="cancelado">{t("admin.statusCanceled")}</SelectItem>
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
                            <th className="px-4 py-3 text-left font-medium">{t("admin.company")}</th>
                            <th className="px-4 py-3 text-left font-medium">{t("common.value")}</th>
                            <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">{t("common.description")}</th>
                            <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{t("admin.dueDate")}</th>
                            <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                            <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagamentos.map((pag) => (
                            <tr key={pag.id} className="border-b hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium">
                                {pag.nomeEmpresa || t("admin.company")}
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
                                    <SelectItem value="pendente">{t("admin.statusPending")}</SelectItem>
                                    <SelectItem value="pago">{t("admin.markAsPaid")}</SelectItem>
                                    <SelectItem value="atrasado">{t("admin.statusOverdue")}</SelectItem>
                                    <SelectItem value="cancelado">{t("admin.cancel")}</SelectItem>
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
                    {t("admin.noPaymentFound")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <AdminConfigTab admin={admin} stats={stats ?? null} onAdminUpdate={(updatedAdmin) => setAdmin(updatedAdmin)} />
          </TabsContent>

          <TabsContent value="bugs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.bugReportsTitle")}</CardTitle>
                <CardDescription>
                  {t("admin.trackBugsReported")}
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
                    <p>{t("admin.noBugsReported")}</p>
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs gap-1"
                                  onClick={() => setSelectedBugAttachments({
                                    attachments: bug.attachments!,
                                    userName: bug.userName
                                  })}
                                  data-testid={`button-view-attachments-${bug.id}`}
                                >
                                  <Paperclip className="h-3 w-3" />
                                  {bug.attachments.length} {t("admin.attachments")}
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <Badge variant={bug.status === "novo" ? "destructive" : bug.status === "em_analise" ? "outline" : "default"}>
                              {bug.status === "novo" ? t("admin.bugNew") : bug.status === "em_analise" ? t("admin.bugInAnalysis") : t("admin.bugResolved")}
                            </Badge>
                            <Select value={bug.status} onValueChange={(value) => handleChangeBugStatus(bug.id, value)}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="novo">{t("admin.bugNew")}</SelectItem>
                                <SelectItem value="em_analise">{t("admin.bugInAnalysis")}</SelectItem>
                                <SelectItem value="resolvido">{t("admin.bugResolved")}</SelectItem>
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

            <Dialog open={!!selectedBugAttachments} onOpenChange={(open) => !open && setSelectedBugAttachments(null)}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    {t("admin.viewAttachments")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("admin.attachmentsFrom")} {selectedBugAttachments?.userName}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 mt-4">
                  {selectedBugAttachments?.attachments.map((attachment, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                        {attachment.fileName}
                      </div>
                      {attachment.mimeType.startsWith("image/") ? (
                        <div className="mt-2">
                          <img
                            src={`data:${attachment.mimeType};base64,${attachment.fileData}`}
                            alt={attachment.fileName}
                            className="max-w-full h-auto rounded-md border"
                            style={{ maxHeight: "300px", objectFit: "contain" }}
                          />
                        </div>
                      ) : (
                        <div className="mt-2 p-4 bg-muted rounded-md text-center text-sm text-muted-foreground">
                          <FileIcon className="h-8 w-8 mx-auto mb-2" />
                          <p>{t("admin.previewNotAvailable")}</p>
                          <a
                            href={`data:${attachment.mimeType};base64,${attachment.fileData}`}
                            download={attachment.fileName}
                            className="text-primary hover:underline mt-2 inline-block"
                          >
                            {t("admin.downloadFile")}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {admin.isMaster && (
            <TabsContent value="usuarios" className="space-y-6">
              <UsuariosAdminTab />
            </TabsContent>
          )}
        </Tabs>

        {/* Dialog para gerenciar usuários da empresa */}
        <Dialog open={!!selectedCompanyUsers} onOpenChange={(open) => {
          if (!open) {
            setSelectedCompanyUsers(null);
            setCompanyUsers([]);
            setEditingUserEmail(null);
            setNewEmail("");
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("admin.manageUsers")}
              </DialogTitle>
              <DialogDescription>
                {selectedCompanyUsers?.companyName}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {loadingUsers ? (
                <div className="animate-pulse space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded" />
                  ))}
                </div>
              ) : companyUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("admin.noUsers")}
                </div>
              ) : (
                <div className="space-y-3">
                  {companyUsers.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{user.firstName} {user.lastName}</span>
                            <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                              {user.role}
                            </Badge>
                          </div>
                          
                          {editingUserEmail?.userId === user.id ? (
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder={t("admin.newEmail")}
                                className="flex-1"
                                data-testid={`input-new-email-${user.id}`}
                              />
                              <Button
                                size="sm"
                                onClick={handleSaveEmail}
                                disabled={savingEmail || !newEmail}
                                data-testid={`button-save-email-${user.id}`}
                              >
                                {savingEmail ? "..." : <Check className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingUserEmail(null);
                                  setNewEmail("");
                                }}
                                data-testid={`button-cancel-email-${user.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2"
                                onClick={() => {
                                  setEditingUserEmail({ userId: user.id, currentEmail: user.email });
                                  setNewEmail(user.email);
                                }}
                                data-testid={`button-edit-email-${user.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function AdminConfigTab({ admin, stats, onAdminUpdate }: { 
  admin: Admin; 
  stats: DashboardStats | null;
  onAdminUpdate: (admin: Admin) => void;
}) {
  const { t } = useI18n();
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState(admin.email);
  const [newName, setNewName] = useState(admin.nome);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleEmailUpdate = async () => {
    if (!newEmail || newEmail === admin.email) {
      setEditingEmail(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/update-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("admin.errorUpdatingEmail"));
        return;
      }

      onAdminUpdate({ ...admin, email: newEmail });
      setSuccess(t("admin.emailUpdated"));
      setEditingEmail(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(t("admin.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!newName || newName === admin.nome) {
      setEditingName(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/update-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome: newName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("admin.errorUpdatingName"));
        return;
      }

      onAdminUpdate({ ...admin, nome: newName });
      setSuccess(t("admin.nameUpdated"));
      setEditingName(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(t("admin.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword) {
      setError(t("admin.fillAllFields"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("admin.passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("admin.passwordTooShort"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/update-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("admin.errorUpdatingPassword"));
        return;
      }

      setSuccess(t("admin.passwordUpdated"));
      setEditingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(t("admin.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.systemSettings")}</CardTitle>
        <CardDescription>{t("admin.manageSystemSettingsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("admin.adminInfo")}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">{t("admin.name")}:</span>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-8 w-48"
                      data-testid="input-new-admin-name"
                    />
                    <Button
                      size="sm"
                      onClick={handleNameUpdate}
                      disabled={loading}
                      data-testid="button-save-name"
                    >
                      {loading ? "..." : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingName(false);
                        setNewName(admin.nome);
                        setError("");
                      }}
                      data-testid="button-cancel-name"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{admin.nome}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingName(true)}
                      data-testid="button-edit-admin-name"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Email:</span>
                {editingEmail ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-8 w-48"
                      data-testid="input-new-admin-email-config"
                    />
                    <Button
                      size="sm"
                      onClick={handleEmailUpdate}
                      disabled={loading}
                      data-testid="button-save-email"
                    >
                      {loading ? "..." : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingEmail(false);
                        setNewEmail(admin.email);
                        setError("");
                      }}
                      data-testid="button-cancel-email"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{admin.email}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingEmail(true)}
                      data-testid="button-edit-admin-email"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t("admin.changePassword")}
            </h3>
            {editingPassword ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">{t("admin.currentPassword")}</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-8 mt-1"
                    data-testid="input-current-password"
                  />
                </div>
                <div>
                  <Label className="text-sm">{t("admin.newPassword")}</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-8 mt-1"
                    data-testid="input-new-password"
                  />
                </div>
                <div>
                  <Label className="text-sm">{t("admin.confirmPassword")}</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-8 mt-1"
                    data-testid="input-confirm-password"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handlePasswordUpdate}
                    disabled={loading}
                    data-testid="button-save-password"
                  >
                    {loading ? "..." : t("common.save")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingPassword(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setError("");
                    }}
                    data-testid="button-cancel-password"
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingPassword(true)}
                data-testid="button-change-password"
              >
                <Lock className="h-4 w-4 mr-2" />
                {t("admin.changePassword")}
              </Button>
            )}
          </div>

          {(error || success) && (
            <div className={`p-3 rounded-lg ${error ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
              {error || success}
            </div>
          )}

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">{t("admin.generalStats")}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><span className="text-muted-foreground">{t("admin.totalCompanies")}:</span> {stats?.totalClientes || 0}</p>
              <p><span className="text-muted-foreground">{t("admin.activeCompanies")}:</span> {stats?.clientesAtivos || 0}</p>
              <p><span className="text-muted-foreground">{t("admin.totalVehicles")}:</span> {stats?.totalVeiculos || 0}</p>
              <p><span className="text-muted-foreground">{t("admin.totalUsers")}:</span> {stats?.totalUsuarios || 0}</p>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">{t("admin.availablePlans")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("admin.planBasic")}</span>
                <span className="text-muted-foreground">{t("admin.essentialFeatures")}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("admin.planPro")}</span>
                <span className="text-muted-foreground">{t("admin.advancedFeaturesAI")}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("admin.planEnterprise")}</span>
                <span className="text-muted-foreground">{t("admin.allPlusPriority")}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UsuariosAdminTab() {
  const { t } = useI18n();
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
        setError(data.error || t("admin.errorCreatingUser"));
        return;
      }

      setShowCreateForm(false);
      setNewAdmin({ email: "", password: "", nome: "" });
      fetchAdmins();
    } catch (err) {
      setError(t("admin.connectionError"));
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
          <h2 className="text-xl font-semibold">{t("admin.adminUsers")}</h2>
          <p className="text-sm text-muted-foreground">{t("admin.manageAdminsDesc")}</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2" data-testid="button-criar-admin">
          <UserPlus className="h-4 w-4" />
          {t("admin.createUser")}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.createNewAdmin")}</CardTitle>
            <CardDescription>{t("admin.tokenGeneratedAuto")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-nome">{t("admin.name")}</Label>
                  <Input
                    id="new-nome"
                    value={newAdmin.nome}
                    onChange={(e) => setNewAdmin({ ...newAdmin, nome: e.target.value })}
                    placeholder={t("admin.adminNamePlaceholder")}
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
                  <Label htmlFor="new-password">{t("auth.password")}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    placeholder={t("admin.accessPassword")}
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
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createLoading} data-testid="button-submit-criar-admin">
                  {createLoading ? t("admin.creating") : t("admin.createAdmin")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.adminList")}</CardTitle>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("admin.noAdminRegistered")}</p>
          ) : (
            <div className="space-y-4">
              {admins.map((a) => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{a.nome}</p>
                      {a.isMaster && <Badge variant="default">Master</Badge>}
                      {!a.ativo && <Badge variant="destructive">{t("admin.deactivated")}</Badge>}
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
                        {t("admin.lastLogin")}: {new Date(a.ultimoLogin).toLocaleDateString("pt-BR", {
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
                          {t("admin.newToken")}
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
                              {t("admin.deactivate")}
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              {t("admin.activate")}
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
