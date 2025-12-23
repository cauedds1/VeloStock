import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleDetailsHeader } from "@/components/VehicleDetailsHeader";
import { VehicleTimeline } from "@/components/VehicleTimeline";
import { VehicleCosts } from "@/components/VehicleCosts";
import { VehicleDocuments } from "@/components/VehicleDocuments";
import { AdGeneratorMulti } from "@/components/AdGeneratorMulti";
import { PriceSuggestion } from "@/components/PriceSuggestion";
import { EditVehicleDialog } from "@/components/EditVehicleDialog";
import { AddCostDialog } from "@/components/AddCostDialog";
import { EditCostDialog } from "@/components/EditCostDialog";
import { ChangeLocationDialog } from "@/components/ChangeLocationDialog";
import { SalePriceEditor } from "@/components/SalePriceEditor";
import { ChecklistObservationDialog } from "@/components/ChecklistObservationDialog";
import { ChecklistItemStatus } from "@/components/ChecklistItemStatus";
import { PhotoViewer } from "@/components/PhotoViewer";
import { downloadChecklistPDF, type PDFTranslations } from "@/components/ChecklistPDF";
import { AddChecklistItemDialog } from "@/components/AddChecklistItemDialog";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { Save, Upload, Trash2, FileText, CheckSquare, MessageSquare, CheckCheck } from "lucide-react";
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
import { type ChecklistData, type ChecklistItem, getChecklistItemStatus, getChecklistCategories, getChecklistItems, type VehicleType } from "@shared/checklistUtils";

const categoryTranslationKeys: Record<string, Record<string, string>> = {
  Carro: {
    pneus: "checklist.categories.pneus",
    interior: "checklist.categories.interior",
    somEletrica: "checklist.categories.somEletrica",
    lataria: "checklist.categories.lataria",
    documentacao: "checklist.categories.documentacao",
    equipamentos: "checklist.categories.equipamentos",
  },
  Moto: {
    pneus: "checklist.categories.pneus",
    interior: "checklist.categories.interiorMoto",
    somEletrica: "checklist.categories.somEletricaMoto",
    lataria: "checklist.categories.latariaMoto",
    documentacao: "checklist.categories.documentacao",
    equipamentos: "checklist.categories.equipamentos",
  },
};

const itemTranslationKeys: Record<string, string> = {
  "Pneus Dianteiros": "checklist.items.pneusDianteiros",
  "Pneus Traseiros": "checklist.items.pneusTraseiros",
  "Pneu Dianteiro": "checklist.items.pneuDianteiro",
  "Pneu Traseiro": "checklist.items.pneuTraseiro",
  "Calibragem": "checklist.items.calibragem",
  "Limpeza": "checklist.items.limpeza",
  "Estado dos bancos": "checklist.items.estadoBancos",
  "Estado do banco": "checklist.items.estadoBanco",
  "Tapetes": "checklist.items.tapetes",
  "Porta-objetos": "checklist.items.portaObjetos",
  "Acabamentos": "checklist.items.acabamentos",
  "Volante": "checklist.items.volante",
  "Apoio para passageiro": "checklist.items.apoioPassageiro",
  "Funcionamento do som": "checklist.items.funcionamentoSom",
  "Vidros elétricos": "checklist.items.vidrosEletricos",
  "Ar-condicionado": "checklist.items.arCondicionado",
  "Travas elétricas": "checklist.items.travasEletricas",
  "Faróis": "checklist.items.farois",
  "Lanterna": "checklist.items.lanterna",
  "Setas": "checklist.items.setas",
  "Bateria": "checklist.items.bateria",
  "Painel": "checklist.items.painel",
  "Arranhões": "checklist.items.arranhoes",
  "Amassados": "checklist.items.amassados",
  "Pintura desbotada": "checklist.items.pinturaDesbotada",
  "Faróis/Lanternas": "checklist.items.faroisLanternas",
  "Carenagens": "checklist.items.carenagens",
  "Tanque": "checklist.items.tanque",
  "Pintura": "checklist.items.pintura",
  "Documento do veículo": "checklist.items.documentoVeiculo",
  "IPVA": "checklist.items.ipva",
  "Licenciamento": "checklist.items.licenciamento",
  "Macaco": "checklist.items.macaco",
  "Chave de Roda": "checklist.items.chaveRoda",
  "Triângulo": "checklist.items.triangulo",
  "Estepe": "checklist.items.estepe",
};

export default function VehicleDetails() {
  const params = useParams();
  const vehicleId = params.id || "";
  const [, setLocation] = useLocation();
  const { can } = usePermissions();
  const { t } = useI18n();
  
  // Ler parâmetro ?tab= da URL para abrir aba específica
  const getInitialTab = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    const validTabs = ['visao-geral', 'historico', 'custos', 'anotacoes', 'preco', 'anuncio', 'midia', 'documentos', 'checklist'];
    return validTabs.includes(tabParam || '') ? (tabParam || "visao-geral") : "visao-geral";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isChangeLocationOpen, setIsChangeLocationOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState<any>(null);
  const [isEditCostOpen, setIsEditCostOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistData>({
    pneus: [],
    interior: [],
    somEletrica: [],
    lataria: [],
    documentacao: [],
    equipamentos: []
  });
  const [observationDialog, setObservationDialog] = useState<{
    open: boolean;
    category: keyof ChecklistData | null;
    itemName: string;
    currentObservation: string;
  }>({
    open: false,
    category: null,
    itemName: "",
    currentObservation: ""
  });
  const { toast} = useToast();
  const queryClient = useQueryClient();
  
  // Ref para rastrear o último checklist do servidor e evitar sobrescrever mudanças otimistas
  const lastServerChecklistRef = useRef<string | null>(null);
  
  // Ref para scroll automático das tabs no mobile
  const tabsListRef = useRef<HTMLDivElement>(null);

  const { data: vehicle, isLoading } = useQuery<any>({
    queryKey: [`/api/vehicles/${vehicleId}`],
    enabled: !!vehicleId,
  });

  const { data: history = [] } = useQuery<any[]>({
    queryKey: [`/api/vehicles/${vehicleId}/history`],
    enabled: !!vehicleId,
  });

  const { data: costs = [] } = useQuery<any[]>({
    queryKey: [`/api/vehicles/${vehicleId}/costs`],
    enabled: !!vehicleId,
  });

  const { data: customChecklistItems = [] } = useQuery<any[]>({
    queryKey: ["/api/checklist-items"],
  });

  const { data: customChecklistCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/checklist-categories"],
  });

  useEffect(() => {
    if (vehicle?.notes !== undefined) {
      setNotes(vehicle.notes || "");
    }
    if (vehicle?.checklist) {
      // Só atualizar o estado local se o checklist do servidor mudou desde a última vez
      // Isso preserva atualizações otimistas e evita sobrescrever com dados desatualizados
      const currentServerChecklist = JSON.stringify(vehicle.checklist);
      if (lastServerChecklistRef.current !== currentServerChecklist) {
        lastServerChecklistRef.current = currentServerChecklist;
        setChecklist(vehicle.checklist);
      }
    }
  }, [vehicle?.notes, vehicle?.checklist]);

  // Scroll automático para tab ativa no mobile
  useEffect(() => {
    if (!tabsListRef.current) return;
    
    // Verificar se é mobile (< 768px)
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    // Encontrar a tab ativa
    const activeTabElement = tabsListRef.current.querySelector('[data-state="active"]');
    if (!activeTabElement) return;

    // Rolar para centralizar a tab ativa
    activeTabElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }, [activeTab]);

  const saveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) throw new Error("Failed to save notes");

      toast({
        title: t("vehicleDetails.notesSaved"),
        description: t("vehicleDetails.notesSavedDesc"),
      });

      await queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
      await queryClient.refetchQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
      const refreshedVehicle = queryClient.getQueryData<any>([`/api/vehicles/${vehicleId}`]);
      if (refreshedVehicle) {
        setNotes(refreshedVehicle.notes || "");
      }
    } catch (error) {
      toast({
        title: t("vehicleDetails.errorSavingNotes"),
        description: t("vehicleDetails.errorOccurred"),
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const toggleChecklistItem = async (category: keyof ChecklistData, itemName: string) => {
    const previousChecklist = { ...checklist };
    const categoryItems = checklist[category] || [];
    const existingItem = categoryItems.find(ci => ci.item === itemName);

    let newCategoryItems: ChecklistItem[];
    if (existingItem) {
      newCategoryItems = categoryItems.filter(ci => ci.item !== itemName);
    } else {
      newCategoryItems = [...categoryItems, { item: itemName }];
    }

    const newChecklist = { ...checklist, [category]: newCategoryItems };
    
    // Atualizar estado local e ref imediatamente
    setChecklist(newChecklist);
    lastServerChecklistRef.current = JSON.stringify(newChecklist);

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: newChecklist }),
      });

      if (!response.ok) throw new Error("Failed to save checklist");
      
      // Invalidar queries para atualizar notificações
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    } catch (error) {
      // Reverter em caso de erro
      setChecklist(previousChecklist);
      lastServerChecklistRef.current = JSON.stringify(previousChecklist);
      toast({
        title: t("vehicleDetails.errorUpdatingChecklist"),
        description: t("vehicleDetails.errorOccurred"),
        variant: "destructive",
      });
    }
  };

  const markAllInCategory = async (category: keyof ChecklistData) => {
    const previousChecklist = { ...checklist };
    const vehicleType = (vehicle?.vehicleType || "Carro") as VehicleType;
    const items = getChecklistItems(vehicleType);
    const categoryItemNames = items[category] || [];
    const currentCategoryItems = checklist[category] || [];
    
    // Verificar se todos já estão marcados
    const allMarked = categoryItemNames.every(itemName => 
      currentCategoryItems.some(ci => ci.item === itemName)
    );
    
    // Se todos já estão marcados, não fazer nada
    if (allMarked) {
      toast({
        title: t("vehicleDetails.categoryComplete"),
        description: t("vehicleDetails.allItemsMarked"),
      });
      return;
    }
    
    // Marcar apenas os itens que faltam, preservando os já marcados
    const newCategoryItems: ChecklistItem[] = categoryItemNames.map(itemName => {
      const existingItem = currentCategoryItems.find(ci => ci.item === itemName);
      if (existingItem) {
        return existingItem; // Manter item existente com observação
      }
      return { item: itemName }; // Adicionar novo item
    });

    const newChecklist = { ...checklist, [category]: newCategoryItems };
    
    // Atualizar estado local e ref imediatamente
    setChecklist(newChecklist);
    lastServerChecklistRef.current = JSON.stringify(newChecklist);

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: newChecklist }),
      });

      if (!response.ok) throw new Error("Failed to save checklist");
      
      // Invalidar queries para atualizar notificações
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });

      toast({
        title: t("vehicleDetails.categoryMarked"),
        description: t("vehicleDetails.allItemsMarkedSuccess"),
      });
    } catch (error) {
      // Reverter em caso de erro
      setChecklist(previousChecklist);
      lastServerChecklistRef.current = JSON.stringify(previousChecklist);
      toast({
        title: t("vehicleDetails.errorMarkingItems"),
        description: t("vehicleDetails.errorOccurred"),
        variant: "destructive",
      });
    }
  };

  const openObservationDialog = (category: keyof ChecklistData, itemName: string) => {
    const categoryItems = checklist[category] || [];
    const existingItem = categoryItems.find(ci => ci.item === itemName);
    
    setObservationDialog({
      open: true,
      category,
      itemName,
      currentObservation: existingItem?.observation || ""
    });
  };

  const saveObservation = async (observation: string) => {
    if (!observationDialog.category) return;

    const previousChecklist = { ...checklist };
    const category = observationDialog.category;
    const itemName = observationDialog.itemName;
    const categoryItems = checklist[category] || [];
    
    const existingItemIndex = categoryItems.findIndex(ci => ci.item === itemName);
    let newCategoryItems: ChecklistItem[];

    if (existingItemIndex >= 0) {
      newCategoryItems = [...categoryItems];
      if (observation.trim()) {
        newCategoryItems[existingItemIndex] = { 
          ...newCategoryItems[existingItemIndex], 
          observation: observation.trim() 
        };
      } else {
        delete newCategoryItems[existingItemIndex].observation;
      }
    } else {
      newCategoryItems = [...categoryItems, { item: itemName, observation: observation.trim() || undefined }];
    }

    const newChecklist = { ...checklist, [category]: newCategoryItems };
    setChecklist(newChecklist);

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: newChecklist }),
      });

      if (!response.ok) throw new Error("Failed to save observation");

      await queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });

      toast({
        title: t("vehicleDetails.observationSaved"),
        description: t("vehicleDetails.observationSavedDesc"),
      });
    } catch (error) {
      setChecklist(previousChecklist);
      toast({
        title: t("vehicleDetails.errorSavingObservation"),
        description: t("vehicleDetails.errorOccurred"),
        variant: "destructive",
      });
    }
  };

  const handleEditCost = (cost: any) => {
    setSelectedCost(cost);
    setIsEditCostOpen(true);
  };

  const handleDeleteCost = async () => {
    if (!costToDelete) return;
    
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/costs/${costToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete cost");

      toast({
        title: t("vehicleDetails.costDeleted"),
        description: t("vehicleDetails.costDeletedDesc"),
      });

      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}/costs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
      
      setCostToDelete(null);
    } catch (error) {
      toast({
        title: t("vehicleDetails.errorDeletingCost"),
        description: t("vehicleDetails.errorOccurred"),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col p-8">
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground">{t("vehicleDetails.notFound")}</h2>
          <p className="mt-2 text-muted-foreground">{t("vehicleDetails.notFoundDesc")}</p>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex h-full flex-col">
      <VehicleDetailsHeader
        image={vehicle.images?.[0]?.imageUrl || "/car-placeholder.png"}
        brand={vehicle.brand}
        model={vehicle.model}
        year={vehicle.year}
        plate={vehicle.plate}
        color={vehicle.color}
        location={vehicle.location}
        status={vehicle.status}
        physicalLocation={vehicle.physicalLocation}
        physicalLocationDetail={vehicle.physicalLocationDetail}
        onBack={() => window.history.back()}
        onEdit={() => setIsEditDialogOpen(true)}
        onChangeLocation={() => setIsChangeLocationOpen(true)}
      />

      <EditVehicleDialog
        vehicleId={vehicleId}
        vehicle={vehicle}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      <EditCostDialog
        vehicleId={vehicleId}
        cost={selectedCost}
        open={isEditCostOpen}
        onOpenChange={setIsEditCostOpen}
      />

      <ChangeLocationDialog
        vehicleId={vehicleId}
        currentStatus={vehicle?.status || vehicle?.location || "Entrada"}
        currentPhysicalLocation={vehicle?.physicalLocation}
        currentPhysicalLocationDetail={vehicle?.physicalLocationDetail}
        open={isChangeLocationOpen}
        onOpenChange={setIsChangeLocationOpen}
      />

      <div className="flex-1 overflow-y-auto p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList ref={tabsListRef} className="mb-6" data-testid="tabs-vehicle-details">
            {can.viewOverviewTab && (
              <TabsTrigger value="visao-geral" data-testid="tab-visao-geral">
                {t("vehicleDetails.tabs.overview")}
              </TabsTrigger>
            )}
            {can.viewHistoryTab && (
              <TabsTrigger value="historico" data-testid="tab-historico">
                {t("vehicleDetails.tabs.history")}
              </TabsTrigger>
            )}
            {can.viewCostsTab && (
              <TabsTrigger value="custos" data-testid="tab-custos">
                {t("vehicleDetails.tabs.costs")}
              </TabsTrigger>
            )}
            {can.viewNotesTab && (
              <TabsTrigger value="anotacoes" data-testid="tab-anotacoes">
                {t("vehicleDetails.tabs.notes")}
              </TabsTrigger>
            )}
            {can.viewPriceTab && (
              <TabsTrigger value="preco" data-testid="tab-preco">
                {t("vehicleDetails.tabs.priceSuggestion")}
              </TabsTrigger>
            )}
            {can.viewAdTab && (
              <TabsTrigger value="anuncio" data-testid="tab-anuncio">
                {t("vehicleDetails.tabs.ad")}
              </TabsTrigger>
            )}
            {can.viewMediaTab && (
              <TabsTrigger value="midia" data-testid="tab-midia">
                {t("vehicleDetails.tabs.media")}
              </TabsTrigger>
            )}
            {can.viewDocumentsTab && (
              <TabsTrigger value="documentos" data-testid="tab-documentos">
                {t("vehicleDetails.tabs.documents")}
              </TabsTrigger>
            )}
            {can.viewChecklistTab && (
              <TabsTrigger value="checklist" data-testid="tab-checklist">
                {t("vehicleDetails.tabs.checklist")}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="visao-geral">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                  {t("vehicleDetails.costSummary")}
                </h3>
                {costs.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{t("vehicleDetails.totalInvested")}</span>
                      <span className="text-lg font-bold text-card-foreground">
                        R$ {costs.reduce((sum: number, c: any) => sum + Number(c.value), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      {costs.slice(0, 3).map((cost: any) => (
                        <div key={cost.id} className="flex justify-between py-1">
                          <span className="text-sm text-muted-foreground">{cost.description}</span>
                          <span className="text-sm font-medium text-card-foreground">
                            R$ {Number(cost.value).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {costs.length > 3 && (
                      <button
                        onClick={() => setActiveTab("custos")}
                        className="text-sm text-primary hover:underline"
                      >
                        {t("vehicleDetails.viewAllCosts", { count: costs.length })}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("vehicleDetails.noCostsYet")}</p>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                  {t("vehicleDetails.salePrice")}
                </h3>
                <SalePriceEditor vehicleId={vehicleId} currentPrice={vehicle.salePrice || null} />
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                  {t("vehicleDetails.photoGallery")}
                </h3>
                {vehicle.images && vehicle.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {vehicle.images.slice(0, 6).map((img: any, idx: number) => (
                      <button
                        key={img.id || idx}
                        onClick={() => {
                          setSelectedPhotoIndex(idx);
                          setPhotoViewerOpen(true);
                        }}
                        className="relative aspect-[4/3] overflow-hidden rounded border cursor-pointer hover-elevate focus:outline-none focus:ring-2 focus:ring-primary group"
                        data-testid={`button-overview-photo-${idx}`}
                      >
                        <img
                          src={img.imageUrl}
                          alt={`Foto ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("vehicleDetails.noPhotosYet")}</p>
                )}
                {vehicle.images && vehicle.images.length > 6 && (
                  <button
                    onClick={() => setActiveTab("midia")}
                    className="mt-3 text-sm text-primary hover:underline"
                    data-testid="button-view-all-photos"
                  >
                    {t("vehicleDetails.viewAllPhotos", { count: vehicle.images.length })}
                  </button>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                  {t("vehicleDetails.recentMovements")}
                </h3>
                {(() => {
                  const allActivities = [
                    ...history.map((h: any) => ({
                      id: `history-${h.id}`,
                      type: 'location',
                      date: new Date(h.movedAt),
                      description: (() => {
                        let desc = '';
                        if (h.fromStatus && h.toStatus && h.fromStatus !== h.toStatus) {
                          desc = `Status: ${h.fromStatus} → ${h.toStatus}`;
                        } else if (h.toStatus) {
                          desc = `Status: ${h.toStatus}`;
                        }
                        
                        if (h.toPhysicalLocation && h.toPhysicalLocation !== '__none__') {
                          const locDetail = h.toPhysicalLocationDetail 
                            ? ` - ${h.toPhysicalLocationDetail}` 
                            : '';
                          const locText = `📍 ${h.toPhysicalLocation}${locDetail}`;
                          desc = desc ? `${desc} | ${locText}` : locText;
                        }
                        
                        return desc || t("vehicleDetails.movementRegistered");
                      })()
                    })),
                    ...costs.map((c: any) => ({
                      id: `cost-${c.id}`,
                      type: 'cost',
                      date: new Date(c.date),
                      description: `💰 Custo adicionado: ${new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(Number(c.value))} - ${c.category}`
                    }))
                  ]
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .slice(0, 5);

                  return allActivities.length > 0 ? (
                    <div className="space-y-2">
                      {allActivities.map((activity) => (
                        <div key={activity.id} className="border-l-2 border-primary pl-3 py-1">
                          <p className="text-sm font-medium text-card-foreground">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.date.toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      ))}
                      {(history.length + costs.length) > 5 && (
                        <button
                          onClick={() => setActiveTab("historico")}
                          className="text-sm text-primary hover:underline"
                        >
                          {t("vehicleDetails.viewAllActivities", { count: history.length + costs.length })}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("vehicleDetails.noMovementsYet")}</p>
                  );
                })()}
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                  {t("vehicleDetails.quickNotes")}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {vehicle.notes || t("vehicleDetails.noNotesYet")}
                </p>
                <button
                  onClick={() => setActiveTab("anotacoes")}
                  className="text-sm text-primary hover:underline"
                >
                  {t("vehicleDetails.editNotes")}
                </button>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <VehicleTimeline 
              vehicleId={vehicleId}
              events={history.map((h: any) => {
                let statusText = h.toStatus || h.toLocation || "Status atualizado";
                
                if (h.fromStatus && h.toStatus) {
                  statusText = `${h.fromStatus} → ${h.toStatus}`;
                }
                
                if (h.toPhysicalLocation && h.toPhysicalLocation !== "__none__") {
                  if (h.toPhysicalLocationDetail) {
                    statusText += ` (📍 ${h.toPhysicalLocation} - ${h.toPhysicalLocationDetail})`;
                  } else {
                    statusText += ` (📍 ${h.toPhysicalLocation})`;
                  }
                }
                
                return {
                  id: h.id,
                  status: statusText,
                  date: new Date(h.movedAt).toLocaleDateString('pt-BR'),
                  user: h.userId,
                  notes: h.notes,
                  toStatus: h.toStatus,
                  toPhysicalLocation: h.toPhysicalLocation,
                  toPhysicalLocationDetail: h.toPhysicalLocationDetail,
                  movedAt: h.movedAt
                };
              })} 
            />
          </TabsContent>

          <TabsContent value="custos">
            <VehicleCosts
              costs={costs.map((c: any) => ({
                id: c.id,
                category: c.category,
                description: c.description,
                value: Number(c.value),
                date: new Date(c.date).toLocaleDateString('pt-BR'),
                paymentMethod: c.paymentMethod,
                paidBy: c.paidBy
              }))}
              addCostTrigger={<AddCostDialog vehicleId={vehicleId} />}
              onEditCost={(cost) => {
                const rawCost = costs.find((c: any) => c.id === cost.id);
                if (rawCost) {
                  handleEditCost({
                    id: rawCost.id,
                    category: rawCost.category,
                    description: rawCost.description,
                    value: Number(rawCost.value),
                    date: new Date(rawCost.date).toISOString().split('T')[0],
                    paymentMethod: rawCost.paymentMethod,
                    paidBy: rawCost.paidBy
                  });
                }
              }}
              onDeleteCost={(costId) => setCostToDelete(costId)}
            />
          </TabsContent>

          <TabsContent value="anotacoes">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                {t("vehicleDetails.generalNotes")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("vehicleDetails.notesDescription")}
              </p>
              <Textarea
                placeholder={t("vehicleDetails.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[200px] mb-4"
              />
              <Button onClick={saveNotes} disabled={isSavingNotes}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingNotes ? t("vehicleDetails.saving") : t("vehicleDetails.saveNotes")}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="preco">
            {vehicle ? (
              <PriceSuggestion
                vehicleId={vehicleId}
                vehicleData={{
                  brand: vehicle.brand,
                  model: vehicle.model,
                  year: vehicle.year,
                }}
                fipeReferencePrice={vehicle.fipeReferencePrice}
              />
            ) : (
              <Skeleton className="h-96 w-full" />
            )}
          </TabsContent>

          <TabsContent value="anuncio">
            <AdGeneratorMulti
              vehicleId={vehicleId}
              vehicleData={{
                brand: vehicle.brand,
                model: vehicle.model,
                year: vehicle.year,
                color: vehicle.color,
                features: vehicle.features || [],
              }}
            />
          </TabsContent>

          <TabsContent value="midia">
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {t("vehicleDetails.photoGallery")}
                    </h3>
                    {vehicle.images && vehicle.images.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("vehicleDetails.photoCount", { count: vehicle.images.length })}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("vehicleDetails.managePhotos")}
                  </Button>
                </div>
                {vehicle.images && vehicle.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {vehicle.images.map((img: any, idx: number) => (
                      <button
                        key={img.id || idx}
                        onClick={() => {
                          setSelectedPhotoIndex(idx);
                          setPhotoViewerOpen(true);
                        }}
                        className="relative aspect-[4/3] overflow-hidden rounded-lg border group cursor-pointer hover-elevate focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        data-testid={`button-view-photo-${idx}`}
                      >
                        <img
                          src={img.imageUrl}
                          alt={`Foto ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        {idx === 0 && (
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded font-medium">
                            {t("vehicleDetails.cover")}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">{t("vehicleDetails.noPhotosYet")}</p>
                    <Button onClick={() => setIsEditDialogOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      {t("vehicleDetails.addPhotos")}
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            <PhotoViewer
              images={vehicle.images || []}
              initialIndex={selectedPhotoIndex}
              open={photoViewerOpen}
              onOpenChange={setPhotoViewerOpen}
            />
          </TabsContent>

          <TabsContent value="documentos">
            <VehicleDocuments vehicleId={vehicleId} />
          </TabsContent>

          <TabsContent value="checklist">
            <div className="space-y-4">
              <Card className="p-6 border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {t("vehicleDetails.inspectionChecklist")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("vehicleDetails.checklistDescription")}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <AddChecklistItemDialog 
                      vehicleType={(vehicle?.vehicleType || "Carro") as VehicleType}
                    />
                    <Button 
                      onClick={() => {
                        const vehicleType = (vehicle?.vehicleType || "Carro") as VehicleType;
                        const pdfTranslations: PDFTranslations = {
                          title: t("checklist.pdf.title"),
                          vehicleInfo: t("checklist.pdf.vehicleInfo"),
                          brand: t("checklist.pdf.brand"),
                          model: t("checklist.pdf.model"),
                          year: t("checklist.pdf.year"),
                          plate: t("checklist.pdf.plate"),
                          color: t("checklist.pdf.color"),
                          km: t("checklist.pdf.km"),
                          inspectionChecklist: t("checklist.pdf.inspectionChecklist"),
                          serviceHistory: t("checklist.pdf.serviceHistory"),
                          serviceType: t("checklist.pdf.serviceType"),
                          date: t("checklist.pdf.date"),
                          location: t("checklist.pdf.location"),
                          observations: t("checklist.pdf.observations"),
                          generalObservations: t("checklist.pdf.generalObservations"),
                          inspector: t("checklist.pdf.inspector"),
                          print: t("checklist.pdf.print"),
                          download: t("checklist.pdf.download"),
                          generating: t("checklist.pdf.generating"),
                          customCategory: t("checklist.pdf.customCategory"),
                          categories: {
                            pneus: t(categoryTranslationKeys[vehicleType]?.pneus || "checklist.categories.pneus"),
                            interior: t(categoryTranslationKeys[vehicleType]?.interior || "checklist.categories.interior"),
                            somEletrica: t(categoryTranslationKeys[vehicleType]?.somEletrica || "checklist.categories.somEletrica"),
                            lataria: t(categoryTranslationKeys[vehicleType]?.lataria || "checklist.categories.lataria"),
                            documentacao: t(categoryTranslationKeys[vehicleType]?.documentacao || "checklist.categories.documentacao"),
                            equipamentos: t(categoryTranslationKeys[vehicleType]?.equipamentos || "checklist.categories.equipamentos"),
                          },
                          items: Object.fromEntries(
                            Object.entries(itemTranslationKeys).map(([key, value]) => [key, t(value)])
                          ),
                        };
                        downloadChecklistPDF(
                          vehicle, 
                          checklist, 
                          customChecklistItems,
                          customChecklistCategories,
                          pdfTranslations
                        );
                      }}
                      className="gap-2"
                      data-testid="button-download-checklist"
                    >
                      <FileText className="h-4 w-4" />
                      {t("vehicleDetails.downloadPDF")}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {(() => {
                const vehicleType = (vehicle?.vehicleType || "Carro") as VehicleType;
                const categories = getChecklistCategories(vehicleType);
                const items = getChecklistItems(vehicleType);
                
                const defaultCategoryCards = (Object.keys(categories) as Array<keyof typeof categories>).map((category) => (
                  <Card key={category} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <CheckSquare className="h-5 w-5 text-primary mr-2" />
                        <h3 className="text-lg font-semibold text-card-foreground">
                          {t(categoryTranslationKeys[vehicleType]?.[category] || `checklist.categories.${category}`)}
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAllInCategory(category)}
                        className="h-8 text-xs"
                      >
                        <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                        {t("vehicleDetails.markAll")}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {items[category].map((itemName) => {
                        const status = getChecklistItemStatus(category, itemName, checklist);
                        const categoryItems = checklist[category] || [];
                        const existingItem = categoryItems.find(ci => ci.item === itemName);
                        const isChecked = !!existingItem;

                        return (
                          <div key={itemName} className="flex items-center gap-2 p-2 hover:bg-accent rounded group">
                            <ChecklistItemStatus status={status} size={16} />
                            <label className="flex items-center space-x-3 flex-1 cursor-pointer">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleChecklistItem(category, itemName)}
                              />
                              <span className="text-sm flex-1">{t(itemTranslationKeys[itemName] || itemName)}</span>
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => openObservationDialog(category, itemName)}
                              title={t("vehicleDetails.addObservation")}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ));

                const filteredCustomCategories = (customChecklistCategories || []).filter(
                  cat => cat.isActive && (cat.vehicleType === vehicleType || cat.vehicleType === "Todos")
                );

                const customCategoryCards = filteredCustomCategories.map((customCat) => {
                  const categoryItems = (customChecklistItems || []).filter(
                    item => item.categoryId === customCat.id && item.isActive
                  );
                  const categoryName = customCat.name as keyof ChecklistData;

                  return (
                    <Card key={`custom-${customCat.id}`} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <CheckSquare className="h-5 w-5 text-primary mr-2" />
                          <h3 className="text-lg font-semibold text-card-foreground">
                            {customCat.name}
                          </h3>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAllInCategory(customCat.name)}
                          className="h-8 text-xs"
                        >
                          <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                          {t("vehicleDetails.markAll")}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {categoryItems.map((item) => {
                          const status = getChecklistItemStatus(categoryName, item.name, checklist);
                          const catItems = (checklist as Record<string, ChecklistItem[]>)[customCat.name] || [];
                          const existingItem = catItems.find((ci: ChecklistItem) => ci.item === item.name);
                          const isChecked = !!existingItem;

                          return (
                            <div key={item.id} className="flex items-center gap-2 p-2 hover:bg-accent rounded group">
                              <ChecklistItemStatus status={status} size={16} />
                              <label className="flex items-center space-x-3 flex-1 cursor-pointer">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleChecklistItem(customCat.name, item.name)}
                                />
                                <span className="text-sm flex-1">{item.name}</span>
                              </label>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => openObservationDialog(customCat.name, item.name)}
                                title={t("vehicleDetails.addObservation")}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                        {categoryItems.length === 0 && (
                          <p className="text-sm text-muted-foreground italic py-2">
                            {t("vehicleDetails.noCustomItems")}
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                });

                return [...defaultCategoryCards, ...customCategoryCards];
              })()}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ChecklistObservationDialog
        open={observationDialog.open}
        onOpenChange={(open) => setObservationDialog(prev => ({ ...prev, open }))}
        itemName={observationDialog.itemName}
        currentObservation={observationDialog.currentObservation}
        onSave={saveObservation}
      />

      <AlertDialog open={!!costToDelete} onOpenChange={(open) => !open && setCostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("vehicleDetails.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("vehicleDetails.deleteCostConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCost} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
