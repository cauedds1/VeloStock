import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleDetailsHeader } from "@/components/VehicleDetailsHeader";
import { VehicleTimeline } from "@/components/VehicleTimeline";
import { VehicleCosts } from "@/components/VehicleCosts";
import { AdGenerator } from "@/components/AdGenerator";
import { EditVehicleDialog } from "@/components/EditVehicleDialog";
import { AddCostDialog } from "@/components/AddCostDialog";
import { EditCostDialog } from "@/components/EditCostDialog";
import { ChangeLocationDialog } from "@/components/ChangeLocationDialog";
import { SalePriceEditor } from "@/components/SalePriceEditor";
import { ChecklistObservationDialog } from "@/components/ChecklistObservationDialog";
import { ChecklistItemStatus } from "@/components/ChecklistItemStatus";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, Trash2, FileText, CheckSquare, MessageSquare, CheckCheck } from "lucide-react";
import { type ChecklistData, type ChecklistItem, getChecklistItemStatus, getChecklistCategories, getChecklistItems, type VehicleType } from "@shared/checklistUtils";

export default function VehicleDetails() {
  const params = useParams();
  const vehicleId = params.id || "";
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isChangeLocationOpen, setIsChangeLocationOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState<any>(null);
  const [isEditCostOpen, setIsEditCostOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistData>({
    pneus: [],
    interior: [],
    somEletrica: [],
    lataria: [],
    documentacao: []
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

  const saveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) throw new Error("Erro ao salvar observações");

      toast({
        title: "Observações salvas!",
        description: "As observações foram atualizadas com sucesso.",
      });

      await queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
      await queryClient.refetchQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
      const refreshedVehicle = queryClient.getQueryData<any>([`/api/vehicles/${vehicleId}`]);
      if (refreshedVehicle) {
        setNotes(refreshedVehicle.notes || "");
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar anotações",
        description: "Ocorreu um erro. Tente novamente.",
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
    
    // Atualização otimista do cache
    queryClient.setQueryData([`/api/vehicles/${vehicleId}`], (old: any) => {
      if (!old) return old;
      return { ...old, checklist: newChecklist };
    });

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: newChecklist }),
      });

      if (!response.ok) throw new Error("Erro ao salvar checklist");

      // Invalidar apenas a lista (não o detalhe)
      await queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    } catch (error) {
      // Reverter em caso de erro
      setChecklist(previousChecklist);
      lastServerChecklistRef.current = JSON.stringify(previousChecklist);
      queryClient.setQueryData([`/api/vehicles/${vehicleId}`], (old: any) => {
        if (!old) return old;
        return { ...old, checklist: previousChecklist };
      });
      toast({
        title: "Erro ao atualizar checklist",
        description: "Ocorreu um erro. Tente novamente.",
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
        title: "Categoria completa",
        description: "Todos os itens já estão marcados!",
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
    
    // Atualização otimista do cache
    queryClient.setQueryData([`/api/vehicles/${vehicleId}`], (old: any) => {
      if (!old) return old;
      return { ...old, checklist: newChecklist };
    });

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: newChecklist }),
      });

      if (!response.ok) throw new Error("Erro ao salvar checklist");

      toast({
        title: "Categoria marcada!",
        description: "Todos os itens foram marcados com sucesso.",
      });

      // Invalidar apenas a lista
      await queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    } catch (error) {
      // Reverter em caso de erro
      setChecklist(previousChecklist);
      lastServerChecklistRef.current = JSON.stringify(previousChecklist);
      queryClient.setQueryData([`/api/vehicles/${vehicleId}`], (old: any) => {
        if (!old) return old;
        return { ...old, checklist: previousChecklist };
      });
      toast({
        title: "Erro ao marcar itens",
        description: "Ocorreu um erro. Tente novamente.",
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

      if (!response.ok) throw new Error("Erro ao salvar observação");

      await queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });

      toast({
        title: "Observação salva!",
        description: "A observação foi atualizada com sucesso.",
      });
    } catch (error) {
      setChecklist(previousChecklist);
      toast({
        title: "Erro ao salvar observação",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEditCost = (cost: any) => {
    setSelectedCost(cost);
    setIsEditCostOpen(true);
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
          <h2 className="text-2xl font-bold text-foreground">Veículo não encontrado</h2>
          <p className="mt-2 text-muted-foreground">O veículo que você procura não existe.</p>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex h-full flex-col">
      <VehicleDetailsHeader
        image={vehicle.images?.[0]?.imageUrl || "/api/placeholder/400/300"}
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
          <TabsList className="mb-6" data-testid="tabs-vehicle-details">
            <TabsTrigger value="visao-geral" data-testid="tab-visao-geral">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="historico" data-testid="tab-historico">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="custos" data-testid="tab-custos">
              Custos
            </TabsTrigger>
            <TabsTrigger value="anotacoes" data-testid="tab-anotacoes">
              Observações Gerais
            </TabsTrigger>
            <TabsTrigger value="anuncio" data-testid="tab-anuncio">
              Anúncio
            </TabsTrigger>
            <TabsTrigger value="midia" data-testid="tab-midia">
              Mídia
            </TabsTrigger>
            <TabsTrigger value="documentos" data-testid="tab-documentos">
              Documentos
            </TabsTrigger>
            <TabsTrigger value="checklist" data-testid="tab-checklist">
              Checklist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                  Resumo de Custos
                </h3>
                {costs.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Total Investido</span>
                      <span className="text-lg font-bold text-card-foreground">
                        R$ {(costs.reduce((sum: number, c: any) => sum + c.value, 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      {costs.slice(0, 3).map((cost: any) => (
                        <div key={cost.id} className="flex justify-between py-1">
                          <span className="text-sm text-muted-foreground">{cost.description}</span>
                          <span className="text-sm font-medium text-card-foreground">
                            R$ {(cost.value / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {costs.length > 3 && (
                      <button
                        onClick={() => setActiveTab("custos")}
                        className="text-sm text-primary hover:underline"
                      >
                        Ver todos os {costs.length} custos
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum custo registrado ainda</p>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                  Preço de Venda
                </h3>
                <SalePriceEditor vehicleId={vehicleId} currentPrice={vehicle.salePrice || null} />
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                  Galeria de Fotos
                </h3>
                {vehicle.images && vehicle.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {vehicle.images.slice(0, 6).map((img: any, idx: number) => (
                      <div key={idx} className="relative aspect-square overflow-hidden rounded border">
                        <img
                          src={img.imageUrl}
                          alt={`Foto ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma foto adicionada ainda</p>
                )}
                {vehicle.images && vehicle.images.length > 6 && (
                  <button
                    onClick={() => setActiveTab("midia")}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Ver todas as {vehicle.images.length} fotos
                  </button>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                  Últimas Movimentações
                </h3>
                {(() => {
                  const allActivities = [
                    ...history.map((h: any) => ({
                      id: `history-${h.id}`,
                      type: 'location',
                      date: new Date(h.createdAt),
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
                        
                        return desc || 'Movimentação registrada';
                      })()
                    })),
                    ...costs.map((c: any) => ({
                      id: `cost-${c.id}`,
                      type: 'cost',
                      date: new Date(c.date),
                      description: `💰 Custo adicionado: ${new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(c.value / 100)} - ${c.category}`
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
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      ))}
                      {(history.length + costs.length) > 5 && (
                        <button
                          onClick={() => setActiveTab("historico")}
                          className="text-sm text-primary hover:underline"
                        >
                          Ver tudo ({history.length + costs.length} atividades)
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
                  );
                })()}
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                  Notas Rápidas
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {vehicle.notes || "Nenhuma anotação registrada"}
                </p>
                <button
                  onClick={() => setActiveTab("anotacoes")}
                  className="text-sm text-primary hover:underline"
                >
                  Editar anotações
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
                  date: new Date(h.createdAt).toLocaleString('pt-BR'),
                  user: h.userId,
                  notes: h.notes,
                  toStatus: h.toStatus,
                  toPhysicalLocation: h.toPhysicalLocation,
                  toPhysicalLocationDetail: h.toPhysicalLocationDetail
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
                value: c.value / 100,
                date: new Date(c.date).toLocaleDateString('pt-BR')
              }))}
              addCostTrigger={<AddCostDialog vehicleId={vehicleId} />}
              onEditCost={(cost) => {
                const rawCost = costs.find((c: any) => c.id === cost.id);
                if (rawCost) {
                  handleEditCost({
                    id: rawCost.id,
                    category: rawCost.category,
                    description: rawCost.description,
                    value: rawCost.value / 100,
                    date: new Date(rawCost.date).toISOString().split('T')[0]
                  });
                }
              }}
            />
          </TabsContent>

          <TabsContent value="anotacoes">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                Observações Gerais
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Registre lembretes sobre a loja (estoque de materiais: papel higiênico, pretinho, detergente, esponja, etc.) 
                e manutenção da propriedade (ex: "portão pesado precisa reparo")
              </p>
              <Textarea
                placeholder="Ex: Comprar pretinho e papel higiênico. Portão pesado, precisa lubrificar dobradiças..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[200px] mb-4"
              />
              <Button onClick={saveNotes} disabled={isSavingNotes}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingNotes ? "Salvando..." : "Salvar Observações"}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="anuncio">
            <AdGenerator
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-card-foreground">
                    Galeria de Fotos
                  </h3>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Gerenciar Fotos
                  </Button>
                </div>
                {vehicle.images && vehicle.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {vehicle.images.map((img: any, idx: number) => (
                      <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border group">
                        <img
                          src={img.imageUrl}
                          alt={`Foto ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {idx === 0 && (
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                            Capa
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">Nenhuma foto adicionada ainda</p>
                    <Button onClick={() => setIsEditDialogOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Adicionar Fotos
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documentos">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-primary mr-2" />
                  <h3 className="text-lg font-semibold text-card-foreground">
                    Documentos do Veículo
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded hover:bg-accent">
                    <div>
                      <p className="font-medium">CRLV</p>
                      <p className="text-sm text-muted-foreground">Certificado de Registro</p>
                    </div>
                    <Checkbox />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded hover:bg-accent">
                    <div>
                      <p className="font-medium">Nota Fiscal</p>
                      <p className="text-sm text-muted-foreground">Compra do veículo</p>
                    </div>
                    <Checkbox />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded hover:bg-accent">
                    <div>
                      <p className="font-medium">Laudo Cautelar</p>
                      <p className="text-sm text-muted-foreground">Vistoria técnica</p>
                    </div>
                    <Checkbox />
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-primary mr-2" />
                  <h3 className="text-lg font-semibold text-card-foreground">
                    Contratos
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded hover:bg-accent">
                    <div>
                      <p className="font-medium">Contrato de Compra</p>
                      <p className="text-sm text-muted-foreground">Aquisição do veículo</p>
                    </div>
                    <Checkbox />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded hover:bg-accent">
                    <div>
                      <p className="font-medium">Transferência</p>
                      <p className="text-sm text-muted-foreground">Documentação de transferência</p>
                    </div>
                    <Checkbox />
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="checklist">
            <div className="grid gap-6 md:grid-cols-2">
              {(() => {
                const vehicleType = (vehicle?.vehicleType || "Carro") as VehicleType;
                const categories = getChecklistCategories(vehicleType);
                const items = getChecklistItems(vehicleType);
                
                return (Object.keys(categories) as Array<keyof typeof categories>).map((category) => (
                  <Card key={category} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <CheckSquare className="h-5 w-5 text-primary mr-2" />
                        <h3 className="text-lg font-semibold text-card-foreground">
                          {categories[category]}
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAllInCategory(category)}
                        className="h-8 text-xs"
                      >
                        <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                        Marcar Todas
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
                              <span className="text-sm flex-1">{itemName}</span>
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => openObservationDialog(category, itemName)}
                              title="Adicionar observação"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ));
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
    </div>
  );
}
