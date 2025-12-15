import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, Palette, MapPin, Phone, Mail, Settings as SettingsIcon, Plus, X, DollarSign, Clock, Bell, Database, Lock, AlertCircle, Edit2, Check, Download, Trash2, Key, Monitor, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentCompany, useUpdateCompany } from "@/hooks/use-company";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";

const companySchema = z.object({
  nomeFantasia: z.string().min(1, "Nome fantasia é obrigatório"),
  razaoSocial: z.string().optional(),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  telefone2: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  whatsappNumero: z.string().optional(),
  corPrimaria: z.string(),
  corSecundaria: z.string(),
  alertaDiasParado: z.number(),
  locaisComuns: z.string().optional(),
  comissaoFixaGlobal: z.string().optional().refine((val) => {
    if (!val || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, { message: "Comissão deve ser um número válido maior ou igual a zero" }),
  changeIconColors: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function Settings() {
  const { t } = useI18n();
  const { company, isLoading } = useCurrentCompany();
  const updateCompany = useUpdateCompany(company?.id || "");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: advancedSettings, refetch: refetchAdvanced } = useQuery({
    queryKey: ["/api/settings/advanced"],
  });

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customOrigins, setCustomOrigins] = useState<string[]>([]);
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newLocation, setNewLocation] = useState("");
  
  // Prazos editáveis
  const [prazoPreparacao, setPrazoPreparacao] = useState(7);
  const [prazoOrcamento, setPrazoOrcamento] = useState(30);
  const [prazoAlerta, setPrazoAlerta] = useState(7);
  const [editingPrazo, setEditingPrazo] = useState<string | null>(null);
  const [tempPrazoValue, setTempPrazoValue] = useState("");
  
  // Configurações de notificações
  const [notifVeiculosParados, setNotifVeiculosParados] = useState(true);
  const [notifPrazos, setNotifPrazos] = useState(true);
  const [avisosCustosAltos, setAvisosCustosAltos] = useState(true);
  
  // Dialogs
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [cleanDataOpen, setCleanDataOpen] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  
  // Password change form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (advancedSettings) {
      const settings = advancedSettings as any;
      setCustomCategories(settings.categoriasCustos || []);
      setCustomOrigins(settings.origensLeads || []);
      setCustomLocations(settings.localizacoes || ["Matriz", "Filial", "Pátio Externo", "Oficina"]);
      setPrazoPreparacao(settings.prazoPreparacaoVeiculo || 7);
      setPrazoOrcamento(settings.prazoValidadeOrcamento || 30);
      setPrazoAlerta(settings.prazoAlertaVeiculoParado || 7);
      setNotifVeiculosParados(settings.notificacoesVeiculosParados === 1);
      setNotifPrazos(settings.notificacoesPrazos === 1);
      setAvisosCustosAltos(settings.avisosCustosAltos === 1);
    }
  }, [advancedSettings]);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    values: company ? {
      nomeFantasia: company.nomeFantasia,
      razaoSocial: company.razaoSocial || "",
      cnpj: company.cnpj || "",
      endereco: company.endereco || "",
      telefone: company.telefone || "",
      telefone2: company.telefone2 || "",
      email: company.email || "",
      whatsappNumero: company.whatsappNumero || "",
      corPrimaria: company.corPrimaria,
      corSecundaria: company.corSecundaria,
      alertaDiasParado: company.alertaDiasParado,
      locaisComuns: company.locaisComuns.join(", "),
      comissaoFixaGlobal: (company as any).comissaoFixaGlobal || "",
      changeIconColors: (company as any).changeIconColors || "true",
    } : {
      nomeFantasia: "",
      corPrimaria: "#8B5CF6",
      corSecundaria: "#10B981",
      alertaDiasParado: 7,
      comissaoFixaGlobal: "",
      changeIconColors: "true",
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    try {
      const locaisArray = data.locaisComuns
        ? data.locaisComuns.split(",").map((l) => l.trim()).filter(Boolean)
        : ["Matriz", "Filial", "Pátio Externo", "Oficina"];

      // Preparar dados com conversões de tipo apropriadas
      const updateData: any = {
        ...data,
        locaisComuns: locaisArray,
        alertaDiasParado: Number(data.alertaDiasParado),
      };
      
      // Converter comissão fixa global para número ou null
      if (data.comissaoFixaGlobal && data.comissaoFixaGlobal !== "") {
        updateData.comissaoFixaGlobal = parseFloat(data.comissaoFixaGlobal);
      } else {
        updateData.comissaoFixaGlobal = null;
      }

      await updateCompany.mutateAsync(updateData);
      
      // Toast já é exibido pelo hook useUpdateCompany
      // Forçar reload da página para aplicar cores imediatamente
      window.location.reload();
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      toast({
        title: t("settings.saveError"),
        description: t("common.error"),
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t("settings.noCompanyRegistered")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("settings.manageSettings")}
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company">{t("settings.tabs.company")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("settings.tabs.appearance")}</TabsTrigger>
          <TabsTrigger value="system">{t("settings.tabs.system")}</TabsTrigger>
          <TabsTrigger value="advanced">{t("settings.tabs.advanced")}</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Seção 1: Informações Básicas */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>{t("settings.companyInfo")}</CardTitle>
                    <CardDescription>{t("settings.companyInfoDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeFantasia">{t("settings.companyName")} *</Label>
                    <Input
                      id="nomeFantasia"
                      {...form.register("nomeFantasia")}
                      placeholder={t("settings.companyNamePlaceholder")}
                    />
                    {form.formState.errors.nomeFantasia && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.nomeFantasia.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="razaoSocial">{t("settings.tradeName")}</Label>
                    <Input
                      id="razaoSocial"
                      {...form.register("razaoSocial")}
                      placeholder={t("settings.tradeName")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">{t("settings.cnpj")}</Label>
                    <Input
                      id="cnpj"
                      {...form.register("cnpj")}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endereco">{t("settings.address")}</Label>
                    <Input
                      id="endereco"
                      {...form.register("endereco")}
                      placeholder={t("settings.addressPlaceholder")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção 2: Contato */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle>{t("settings.contactInfo")}</CardTitle>
                    <CardDescription>{t("settings.contactInfoDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">{t("settings.mainPhone")}</Label>
                    <Input
                      id="telefone"
                      {...form.register("telefone")}
                      placeholder="(00) 0000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumero">{t("settings.whatsapp")}</Label>
                    <Input
                      id="whatsappNumero"
                      {...form.register("whatsappNumero")}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone2">{t("settings.secondaryPhone")}</Label>
                    <Input
                      id="telefone2"
                      {...form.register("telefone2")}
                      placeholder="(00) 0000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("settings.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="contato@empresa.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção 3: Locais Físicos */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <CardTitle>{t("settings.systemSettings")}</CardTitle>
                    <CardDescription>{t("settings.systemSettingsDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="locaisComuns">{t("settings.physicalLocations")}</Label>
                  <Input
                    id="locaisComuns"
                    {...form.register("locaisComuns")}
                    placeholder={t("settings.physicalLocationsPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("settings.physicalLocationsDesc")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alertaDiasParado">{t("settings.stoppedVehicleAlert")}</Label>
                  <Input
                    id="alertaDiasParado"
                    type="number"
                    {...form.register("alertaDiasParado", { valueAsNumber: true })}
                    placeholder="7"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("settings.stoppedVehicleAlertDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-8 bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
              >
                {isSubmitting ? t("settings.saving") : t("settings.saveChanges")}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>{t("settings.colorCustomization")}</CardTitle>
                    <CardDescription>
                      {t("settings.colorCustomizationDesc")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="corPrimaria">{t("settings.primaryColor")}</Label>
                    <div className="flex gap-3">
                      <Input
                        id="corPrimaria"
                        type="color"
                        value={form.watch("corPrimaria")}
                        onChange={(e) => form.setValue("corPrimaria", e.target.value)}
                        className="h-14 w-24 cursor-pointer"
                      />
                      <Input
                        value={form.watch("corPrimaria")}
                        onChange={(e) => form.setValue("corPrimaria", e.target.value)}
                        placeholder="#8B5CF6"
                        className="h-14 flex-1 font-mono text-lg uppercase"
                        maxLength={7}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.primaryColorDesc")}
                    </p>
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("settings.preview")}</p>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          size="sm" 
                          style={{ backgroundColor: form.watch("corPrimaria") }}
                          className="text-white"
                        >
                          {t("settings.primaryButton")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="corSecundaria">{t("settings.secondaryColor")}</Label>
                    <div className="flex gap-3">
                      <Input
                        id="corSecundaria"
                        type="color"
                        value={form.watch("corSecundaria")}
                        onChange={(e) => form.setValue("corSecundaria", e.target.value)}
                        className="h-14 w-24 cursor-pointer"
                      />
                      <Input
                        value={form.watch("corSecundaria")}
                        onChange={(e) => form.setValue("corSecundaria", e.target.value)}
                        placeholder="#10B981"
                        className="h-14 flex-1 font-mono text-lg uppercase"
                        maxLength={7}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.secondaryColorDesc")}
                    </p>
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("settings.preview")}</p>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline"
                          style={{ borderColor: form.watch("corSecundaria"), color: form.watch("corSecundaria") }}
                        >
                          {t("settings.secondaryButton")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{t("settings.changeIconColors")}</h4>
                        <p className="text-sm text-muted-foreground">
                          {t("settings.changeIconColorsDesc")}
                        </p>
                      </div>
                      <Switch
                        checked={form.watch("changeIconColors") === "true"}
                        onCheckedChange={(checked) => form.setValue("changeIconColors", checked ? "true" : "false")}
                        data-testid="toggle-icon-colors"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 bg-muted/50">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      {t("settings.defaultColors")}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("settings.defaultColorsDesc")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.setValue("corPrimaria", "#8B5CF6");
                        form.setValue("corSecundaria", "#10B981");
                      }}
                      data-testid="button-reset-colors"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {t("settings.resetToDefault")}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    {t("settings.colorsAppliedNote")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-8 bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
              >
                {isSubmitting ? t("settings.saving") : t("settings.saveColors")}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.systemInfo")}</CardTitle>
              <CardDescription>{t("settings.systemInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.version")}</p>
                  <p className="text-sm text-muted-foreground">{t("settings.versionNumber")}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.openaiApi")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.openaiApiDesc")}
                  </p>
                </div>
                <div className="flex h-3 w-3 rounded-full bg-green-500" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.fipeIntegration")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.fipeIntegrationDesc")}
                  </p>
                </div>
                <div className="flex h-3 w-3 rounded-full bg-green-500" />
              </div>
            </CardContent>
          </Card>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle>{t("settings.globalCommission")}</CardTitle>
                    <CardDescription>{t("settings.globalCommissionDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comissao-global">{t("settings.globalCommissionLabel")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="comissao-global"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-10"
                      {...form.register("comissaoFixaGlobal")}
                      data-testid="input-comissao-global"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.globalCommissionHelp")}
                  </p>
                </div>
                
                <div className="rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t("settings.howItWorks")}
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    <li>{t("settings.commissionRule1")}</li>
                    <li>{t("settings.commissionRule2")}</li>
                    <li>{t("settings.commissionRule3")}</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
                  >
                    {isSubmitting ? t("settings.saving") : t("settings.saveCommission")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.aboutVeloStock")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">VeloStock</strong> {t("settings.aboutDesc1")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("settings.aboutDesc2")}
              </p>
              <Separator />
              <p className="text-xs text-muted-foreground">
                {t("settings.aboutDesc3")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          {/* Linha 1: Categorias e Origens lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Categorias de Custos */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <SettingsIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("settings.costCategories")}</CardTitle>
                    <CardDescription className="text-xs">{t("settings.customized")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder={t("settings.newCategoryPlaceholder")}
                    className="text-sm"
                    data-testid="input-new-category"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newCategory.trim() && !customCategories.includes(newCategory.trim())) {
                          setCustomCategories([...customCategories, newCategory.trim()]);
                          setNewCategory("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    data-testid="button-add-category"
                    onClick={() => {
                      if (newCategory.trim() && !customCategories.includes(newCategory.trim())) {
                        setCustomCategories([...customCategories, newCategory.trim()]);
                        setNewCategory("");
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {customCategories.map((cat) => (
                    <div key={cat} className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 rounded text-xs border border-blue-200 dark:border-blue-800">
                      <span>{cat}</span>
                      <button
                        type="button"
                        data-testid={`button-remove-category-${cat}`}
                        onClick={() => setCustomCategories(customCategories.filter((c) => c !== cat))}
                        className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {customCategories.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("settings.noneAdded")}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Origens de Leads */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <SettingsIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("settings.leadSources")}</CardTitle>
                    <CardDescription className="text-xs">{t("settings.customized")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    placeholder={t("settings.newSourcePlaceholder")}
                    className="text-sm"
                    data-testid="input-new-origin"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newOrigin.trim() && !customOrigins.includes(newOrigin.trim())) {
                          setCustomOrigins([...customOrigins, newOrigin.trim()]);
                          setNewOrigin("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    data-testid="button-add-origin"
                    onClick={() => {
                      if (newOrigin.trim() && !customOrigins.includes(newOrigin.trim())) {
                        setCustomOrigins([...customOrigins, newOrigin.trim()]);
                        setNewOrigin("");
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {customOrigins.map((origin) => (
                    <div key={origin} className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-950/30 rounded text-xs border border-green-200 dark:border-green-800">
                      <span>{origin}</span>
                      <button
                        type="button"
                        data-testid={`button-remove-origin-${origin}`}
                        onClick={() => setCustomOrigins(customOrigins.filter((o) => o !== origin))}
                        className="ml-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {customOrigins.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("settings.noneAdded")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Linha 2: Localizações */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("settings.locations")}</CardTitle>
                  <CardDescription className="text-xs">{t("settings.locationsDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder={t("settings.newLocationPlaceholder")}
                  className="text-sm"
                  data-testid="input-new-location"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newLocation.trim() && !customLocations.includes(newLocation.trim())) {
                        setCustomLocations([...customLocations, newLocation.trim()]);
                        setNewLocation("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  data-testid="button-add-location"
                  onClick={() => {
                    if (newLocation.trim() && !customLocations.includes(newLocation.trim())) {
                      setCustomLocations([...customLocations, newLocation.trim()]);
                      setNewLocation("");
                    }
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {customLocations.map((loc) => (
                  <div key={loc} className="flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-950/30 rounded text-xs border border-orange-200 dark:border-orange-800">
                    <span>{loc}</span>
                    <button
                      type="button"
                      data-testid={`button-remove-location-${loc}`}
                      onClick={() => setCustomLocations(customLocations.filter((l) => l !== loc))}
                      className="ml-1 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {customLocations.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("settings.noneAdded")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Linha 3: Configurações de Notificações e Prazos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("settings.notifications")}</CardTitle>
                    <CardDescription className="text-xs">{t("settings.notificationsDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-4 p-2 rounded bg-muted/50">
                    <span>{t("settings.stoppedVehicleAlerts")}</span>
                    <Switch
                      checked={notifVeiculosParados}
                      onCheckedChange={setNotifVeiculosParados}
                      data-testid="switch-notif-veiculos-parados"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 p-2 rounded bg-muted/50">
                    <span>{t("settings.deadlineNotifications")}</span>
                    <Switch
                      checked={notifPrazos}
                      onCheckedChange={setNotifPrazos}
                      data-testid="switch-notif-prazos"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 p-2 rounded bg-muted/50">
                    <span>{t("settings.highCostWarnings")}</span>
                    <Switch
                      checked={avisosCustosAltos}
                      onCheckedChange={setAvisosCustosAltos}
                      data-testid="switch-avisos-custos"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("settings.defaultDeadlines")}</CardTitle>
                    <CardDescription className="text-xs">{t("settings.clickToEdit")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-4 p-2 rounded bg-muted/50">
                    <span>{t("settings.vehiclePreparation")}</span>
                    {editingPrazo === "preparacao" ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={tempPrazoValue}
                          onChange={(e) => setTempPrazoValue(e.target.value)}
                          className="w-16 h-7 text-xs"
                          data-testid="input-prazo-preparacao"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseInt(tempPrazoValue);
                              if (val > 0) {
                                setPrazoPreparacao(val);
                              }
                              setEditingPrazo(null);
                            } else if (e.key === "Escape") {
                              setEditingPrazo(null);
                            }
                          }}
                        />
                        <span className="text-xs">{t("settings.days")}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          data-testid="button-save-prazo-preparacao"
                          onClick={() => {
                            const val = parseInt(tempPrazoValue);
                            if (val > 0) {
                              setPrazoPreparacao(val);
                            }
                            setEditingPrazo(null);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400"
                        data-testid="button-edit-prazo-preparacao"
                        onClick={() => {
                          setEditingPrazo("preparacao");
                          setTempPrazoValue(prazoPreparacao.toString());
                        }}
                      >
                        {prazoPreparacao} {t("settings.days")}
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 p-2 rounded bg-muted/50">
                    <span>{t("settings.quotationValidity")}</span>
                    {editingPrazo === "orcamento" ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={tempPrazoValue}
                          onChange={(e) => setTempPrazoValue(e.target.value)}
                          className="w-16 h-7 text-xs"
                          data-testid="input-prazo-orcamento"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseInt(tempPrazoValue);
                              if (val > 0) {
                                setPrazoOrcamento(val);
                              }
                              setEditingPrazo(null);
                            } else if (e.key === "Escape") {
                              setEditingPrazo(null);
                            }
                          }}
                        />
                        <span className="text-xs">{t("settings.days")}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          data-testid="button-save-prazo-orcamento"
                          onClick={() => {
                            const val = parseInt(tempPrazoValue);
                            if (val > 0) {
                              setPrazoOrcamento(val);
                            }
                            setEditingPrazo(null);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400"
                        data-testid="button-edit-prazo-orcamento"
                        onClick={() => {
                          setEditingPrazo("orcamento");
                          setTempPrazoValue(prazoOrcamento.toString());
                        }}
                      >
                        {prazoOrcamento} {t("settings.days")}
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 p-2 rounded bg-muted/50">
                    <span>{t("settings.stoppedVehicleAlertDeadline")}</span>
                    {editingPrazo === "alerta" ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={tempPrazoValue}
                          onChange={(e) => setTempPrazoValue(e.target.value)}
                          className="w-16 h-7 text-xs"
                          data-testid="input-prazo-alerta"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseInt(tempPrazoValue);
                              if (val > 0) {
                                setPrazoAlerta(val);
                              }
                              setEditingPrazo(null);
                            } else if (e.key === "Escape") {
                              setEditingPrazo(null);
                            }
                          }}
                        />
                        <span className="text-xs">{t("settings.days")}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          data-testid="button-save-prazo-alerta"
                          onClick={() => {
                            const val = parseInt(tempPrazoValue);
                            if (val > 0) {
                              setPrazoAlerta(val);
                            }
                            setEditingPrazo(null);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400"
                        data-testid="button-edit-prazo-alerta"
                        onClick={() => {
                          setEditingPrazo("alerta");
                          setTempPrazoValue(prazoAlerta.toString());
                        }}
                      >
                        {prazoAlerta} {t("settings.days")}
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Linha 4: Dados e Segurança */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                    <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("settings.dataManagement")}</CardTitle>
                    <CardDescription className="text-xs">{t("settings.backupAndClean")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs justify-start"
                    data-testid="button-backup"
                    disabled={backupInProgress}
                    onClick={async () => {
                      setBackupInProgress(true);
                      try {
                        const res = await fetch("/api/settings/backup", {
                          method: "POST",
                          credentials: "include",
                        });
                        if (res.ok) {
                          const now = new Date();
                          setLastBackupDate(now.toLocaleString("pt-BR", { 
                            day: "2-digit", 
                            month: "short", 
                            hour: "2-digit", 
                            minute: "2-digit" 
                          }));
                          toast({ title: t("settings.backupSuccess") });
                        } else {
                          toast({ title: t("settings.backupError"), variant: "destructive" });
                        }
                      } catch {
                        toast({ title: t("settings.backupError"), variant: "destructive" });
                      } finally {
                        setBackupInProgress(false);
                      }
                    }}
                  >
                    <Download className="w-3 h-3 mr-2" />
                    {backupInProgress ? t("settings.backingUp") : t("settings.backupData")}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs justify-start text-amber-600 dark:text-amber-400"
                    data-testid="button-clean-data"
                    onClick={() => setCleanDataOpen(true)}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    {t("settings.cleanOldData")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {lastBackupDate ? t("settings.lastBackup", { date: lastBackupDate }) : t("settings.noRecentBackup")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("settings.security")}</CardTitle>
                    <CardDescription className="text-xs">{t("settings.privacyProtection")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs justify-start"
                    data-testid="button-change-password"
                    onClick={() => setChangePasswordOpen(true)}
                  >
                    <Key className="w-3 h-3 mr-2" />
                    {t("settings.changePassword")}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs justify-start"
                    data-testid="button-sessions"
                    onClick={() => setSessionsOpen(true)}
                  >
                    <Monitor className="w-3 h-3 mr-2" />
                    {t("settings.activeSessions")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("settings.sessionsCount")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Botão de Salvar */}
          <div className="flex justify-end pt-4">
            <Button
              data-testid="button-save-advanced"
              onClick={async () => {
                try {
                  const res = await fetch("/api/settings/advanced", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      categoriasCustos: customCategories,
                      origensLeads: customOrigins,
                      localizacoes: customLocations,
                      prazoPreparacaoVeiculo: prazoPreparacao,
                      prazoValidadeOrcamento: prazoOrcamento,
                      prazoAlertaVeiculoParado: prazoAlerta,
                      notificacoesVeiculosParados: notifVeiculosParados ? 1 : 0,
                      notificacoesPrazos: notifPrazos ? 1 : 0,
                      avisosCustosAltos: avisosCustosAltos ? 1 : 0,
                    }),
                  });
                  if (!res.ok) throw new Error();
                  await refetchAdvanced();
                  toast({ title: t("settings.advancedSettingsUpdated") });
                } catch {
                  toast({ title: t("settings.saveError"), variant: "destructive" });
                }
              }}
              className="bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
            >
              {t("settings.saveAdvancedSettings")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Alterar Senha */}
      <Dialog open={changePasswordOpen} onOpenChange={(open) => {
        setChangePasswordOpen(open);
        if (!open) {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-500" />
              {t("settings.changePasswordTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("settings.changePasswordDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">{t("settings.currentPassword")}</Label>
              <Input
                id="current-password"
                type="password"
                placeholder={t("settings.currentPasswordPlaceholder")}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                placeholder={t("settings.newPasswordPlaceholder")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
              <div className="space-y-1 mt-2">
                <p className="text-xs text-muted-foreground font-medium">{t("settings.passwordRequirements")}</p>
                <ul className="text-xs space-y-0.5">
                  <li className={`flex items-center gap-1 ${newPassword.length >= 8 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {newPassword.length >= 8 ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {t("settings.minCharacters")}
                  </li>
                  <li className={`flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {/[A-Z]/.test(newPassword) ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {t("settings.oneUppercase")}
                  </li>
                  <li className={`flex items-center gap-1 ${/[a-z]/.test(newPassword) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {/[a-z]/.test(newPassword) ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {t("settings.oneLowercase")}
                  </li>
                  <li className={`flex items-center gap-1 ${/[0-9]/.test(newPassword) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {/[0-9]/.test(newPassword) ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {t("settings.oneNumber")}
                  </li>
                </ul>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("settings.confirmNewPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder={t("settings.confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t("settings.passwordsDontMatch")}
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword.length > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {t("settings.passwordsMatch")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              data-testid="button-save-password"
              disabled={
                !currentPassword ||
                newPassword.length < 8 ||
                !/[A-Z]/.test(newPassword) ||
                !/[a-z]/.test(newPassword) ||
                !/[0-9]/.test(newPassword) ||
                newPassword !== confirmPassword
              }
              onClick={async () => {
                if (newPassword !== confirmPassword) {
                  toast({ title: t("settings.passwordsDontMatch"), variant: "destructive" });
                  return;
                }
                try {
                  const res = await fetch("/api/auth/change-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ currentPassword, newPassword }),
                  });
                  if (res.ok) {
                    toast({ title: t("settings.passwordChanged"), description: t("settings.passwordChangedDesc") });
                    setChangePasswordOpen(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  } else {
                    const data = await res.json();
                    toast({ title: data.error || t("settings.passwordChangeError"), variant: "destructive" });
                  }
                } catch {
                  toast({ title: t("settings.passwordChangeError"), variant: "destructive" });
                }
              }}
              className="bg-gradient-to-r from-purple-600 to-green-600"
            >
              {t("settings.changePassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Sessões Ativas */}
      <Dialog open={sessionsOpen} onOpenChange={setSessionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.activeSessionsTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.activeSessionsDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">{t("settings.currentSession")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.thisDevice")}</p>
                  </div>
                </div>
                <div className="flex h-2 w-2 rounded-full bg-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {t("settings.noOtherSessions")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionsOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Limpar Dados Antigos */}
      <AlertDialog open={cleanDataOpen} onOpenChange={setCleanDataOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.cleanOldDataTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.cleanOldDataDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-clean-data"
              onClick={async () => {
                try {
                  const res = await fetch("/api/settings/clean-old-data", {
                    method: "POST",
                    credentials: "include",
                  });
                  if (res.ok) {
                    const data = await res.json();
                    toast({ 
                      title: t("settings.oldDataCleaned"), 
                      description: data.message 
                    });
                  } else {
                    toast({ title: t("settings.cleanDataError"), variant: "destructive" });
                  }
                } catch {
                  toast({ title: t("settings.cleanDataError"), variant: "destructive" });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("settings.cleanData")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
