import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Star, TrendingUp } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
import { usePermissions } from "@/hooks/use-permissions";
import { useFipeVehicleVersions, useFipePriceByVersion } from "@/hooks/use-fipe";
import type { FipeVersion } from "@/hooks/use-fipe";

const vehicleFormSchema = z.object({
  brand: z.string().min(1, "Marca é obrigatória"),
  model: z.string().min(1, "Modelo é obrigatório"),
  year: z.coerce.number().min(1900),
  version: z.string().optional(),
  color: z.string().min(1, "Cor é obrigatória"),
  plate: z.string().min(7, "Placa inválida"),
  vehicleType: z.enum(["Carro", "Moto"]),
  location: z.string().min(1, "Localização é obrigatória"),
  purchasePrice: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().nullable().optional()),
  kmOdometer: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().nullable()),
  fuelType: z.string().nullable(),
  fipeReferencePrice: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

interface EditVehicleDialogProps {
  vehicleId: string;
  vehicle: {
    brand: string;
    model: string;
    year: number;
    version?: string | null;
    color: string;
    plate: string;
    vehicleType?: "Carro" | "Moto";
    location: string;
    purchasePrice?: number | null;
    kmOdometer?: number | null;
    fuelType?: string | null;
    fipeReferencePrice?: string | null;
    images?: Array<{ id: string; imageUrl: string; order: number }>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditVehicleDialog({ vehicleId, vehicle, open, onOpenChange }: EditVehicleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { settings } = useSettings();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState("info");
  const [newImages, setNewImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ id: string; imageUrl: string; order: number }>>(vehicle.images || []);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [fipeVersions, setFipeVersions] = useState<FipeVersion[]>([]);
  const [fipeMetadata, setFipeMetadata] = useState<{brandId: string} | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      version: vehicle.version || "",
      color: vehicle.color,
      plate: vehicle.plate,
      vehicleType: vehicle.vehicleType || "Carro",
      location: vehicle.location,
      purchasePrice: vehicle.purchasePrice || null,
      kmOdometer: vehicle.kmOdometer || null,
      fuelType: vehicle.fuelType || null,
      fipeReferencePrice: vehicle.fipeReferencePrice || "",
    },
  });

  const versionsMutation = useFipeVehicleVersions(
    form.watch("brand"),
    form.watch("model"),
    form.watch("year")
  );
  
  const priceMutation = useFipePriceByVersion();

  // Watch para detectar mudanças
  const watchedBrand = form.watch("brand");
  const watchedModel = form.watch("model");
  const watchedYear = form.watch("year");

  // Quando o veículo muda, resetar tudo
  useEffect(() => {
    form.reset({
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      version: vehicle.version || "",
      color: vehicle.color,
      plate: vehicle.plate,
      vehicleType: vehicle.vehicleType || "Carro",
      location: vehicle.location,
      purchasePrice: vehicle.purchasePrice || null,
      kmOdometer: vehicle.kmOdometer || null,
      fuelType: vehicle.fuelType || null,
      fipeReferencePrice: vehicle.fipeReferencePrice || "",
    });
    setExistingImages(vehicle.images || []);
    setNewImages([]);
    setFipeVersions([]);
    setFipeMetadata(null);
  }, [vehicle, form]);

  // SIMPLE useEffect: Carrega versões quando marca/modelo/ano mudam
  useEffect(() => {
    // Pega valores diretos do form (getValues é mais confiável que watch)
    const brand = form.getValues("brand")?.trim();
    const model = form.getValues("model")?.trim();
    const year = form.getValues("year");

    // Validação simples: se algum campo essencial está vazio, limpa versões
    if (!brand || !model || !year) {
      setFipeVersions([]);
      setFipeMetadata(null);
      form.setValue("version", "");
      return;
    }

    // Converter year para número de forma segura
    const yearNum = parseInt(String(year), 10);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setFipeVersions([]);
      setFipeMetadata(null);
      form.setValue("version", "");
      return;
    }

    // Carregar versões em background
    const loadVersions = async () => {
      try {
        const result = await versionsMutation.mutateAsync({ 
          brand, 
          model, 
          year: yearNum
        });
        setFipeVersions(result.versions);
        setFipeMetadata({ brandId: result.brandId });
      } catch (error: any) {
        // Falha silenciosa
      }
    };

    loadVersions();
  }, [watchedBrand, watchedModel, watchedYear]);

  const removeExistingImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/images/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao remover imagem");

      toast({
        title: "Imagem removida!",
        description: "A imagem foi removida com sucesso.",
      });

      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      await queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
    } catch (error) {
      toast({
        title: "Erro ao remover imagem",
        description: "Não foi possível remover a imagem.",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newImages = [...existingImages];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    setExistingImages(newImages);
    setDraggedIndex(null);

    // Salvar nova ordem no backend
    try {
      const imageOrder = newImages.map((img, idx) => ({
        imageId: img.id,
        order: idx,
      }));

      const response = await fetch(`/api/vehicles/${vehicleId}/images/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageOrder }),
      });

      if (!response.ok) throw new Error("Erro ao salvar ordem");

      toast({
        title: "Ordem atualizada!",
        description: "A sequência das fotos foi alterada com sucesso.",
      });

      await queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
    } catch (error) {
      toast({
        title: "Erro ao salvar ordem",
        description: "Não foi possível salvar a nova sequência.",
        variant: "destructive",
      });
      // Reverter ao estado anterior em caso de erro
      setExistingImages(vehicle.images || []);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao excluir veículo");

      toast({
        title: "Veículo excluído!",
        description: "O veículo foi removido com sucesso.",
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      onOpenChange(false);
      setLocation("/veiculos");
    } catch (error) {
      toast({
        title: "Erro ao excluir veículo",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // CARREGAMENTO AUTOMÁTICO EM BACKGROUND: Buscar versões assim que marca/modelo/ano forem preenchidos
  useEffect(() => {
    const brand = form.getValues("brand");
    const model = form.getValues("model");
    const year = form.getValues("year");

    // Só carrega se tiver todos os dados e ainda não carregou
    if (!brand || !model || !year || fipeVersions.length > 0) {
      return;
    }

    // Carregar versões em background (sem aguardar)
    const loadVersions = async () => {
      try {
        const result = await versionsMutation.mutateAsync();
        setFipeVersions(result.versions);
        setFipeMetadata({ brandId: result.brandId });
      } catch (error: any) {
        // Falha silenciosa - usuário verá mensagem de erro se tentar usar
      }
    };

    loadVersions();
  }, [watchedBrand, watchedModel, watchedYear, fipeVersions.length]);

  const handleVersionChange = async (versionJson: string) => {
    if (!fipeMetadata) return;

    try {
      // Parse da versão selecionada
      const version: FipeVersion = JSON.parse(versionJson);
      // Salvar JSON completo no form (será parseado no submit)
      form.setValue("version", versionJson);

      // Buscar preço com brandId + modelId + yearCode específicos
      const result = await priceMutation.mutateAsync({ 
        brandId: fipeMetadata.brandId, 
        modelId: String(version.modelId), 
        versionCode: version.yearCode 
      });
      
      const priceValue = result.Valor.replace("R$", "").trim();
      form.setValue("fipeReferencePrice", priceValue);
      
      toast({
        title: "Preço FIPE atualizado!",
        description: `${result.Marca} ${result.Modelo}: ${result.Valor}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao consultar preço",
        description: error.message || "Não foi possível consultar o preço FIPE.",
        variant: "destructive",
      });
    }
  };

  const uploadNewImages = async () => {
    if (newImages.length === 0) return;

    try {
      const formData = new FormData();
      newImages.forEach(image => formData.append("images", image));

      const response = await fetch(`/api/vehicles/${vehicleId}/images`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Erro ao enviar imagens");

      toast({
        title: "Imagens adicionadas!",
        description: `${newImages.length} nova(s) imagem(ns) adicionada(s).`,
      });

      setNewImages([]);
      await queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
    } catch (error) {
      toast({
        title: "Erro ao adicionar imagens",
        description: "Não foi possível adicionar as imagens.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: VehicleFormData) => {
    try {
      await uploadNewImages();
      
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar veículo");
      }

      toast({
        title: "Veículo atualizado!",
        description: "As informações foram atualizadas com sucesso.",
      });

      await queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicleId}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar veículo:", error);
      toast({
        title: "Erro ao atualizar veículo",
        description: "Ocorreu um erro ao atualizar as informações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Editar Veículo</DialogTitle>
          <DialogDescription>
            Atualize as informações e fotos do veículo
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="images">Fotos ({existingImages.length + newImages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Corolla" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 2020"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Versão</FormLabel>
                    <Select 
                      onValueChange={handleVersionChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={versionsMutation.isPending ? "Carregando versões..." : "Selecione a versão"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fipeVersions.length > 0 ? (
                          fipeVersions.map((version, index) => (
                            <SelectItem key={`${version.modelId}-${version.yearCode}-${index}`} value={JSON.stringify(version)}>
                              {version.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled>
                            {versionsMutation.isPending ? "Carregando..." : "Preencha marca, modelo e ano"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Preencha marca, modelo e ano para carregar as versões disponíveis
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Prata" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Carro">🚗 Carro</SelectItem>
                        <SelectItem value="Moto">🏍️ Moto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a localização" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Entrada">Entrada</SelectItem>
                        <SelectItem value="Higienização/Funilaria">Higienização/Funilaria</SelectItem>
                        <SelectItem value="Mecânica">Mecânica</SelectItem>
                        <SelectItem value="Documentação">Documentação</SelectItem>
                        <SelectItem value="Pronto para Venda">Pronto para Venda</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {can.viewCosts && (
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de Aquisição (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Quanto a loja pagou"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Valor que a loja pagou pelo veículo
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="kmOdometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quilometragem</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 45000"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Combustível</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Gasolina">Gasolina</SelectItem>
                        <SelectItem value="Etanol">Etanol</SelectItem>
                        <SelectItem value="Flex">Flex</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Elétrico">Elétrico</SelectItem>
                        <SelectItem value="Híbrido">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </div>

                <div className="flex justify-between gap-3 pt-4 border-t mt-6">
                  <div>
                    {can.deleteVehicles && (
                      settings.deleteConfirmation ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir Veículo
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este veículo permanentemente? 
                                Todos os dados relacionados (fotos, histórico, custos) serão removidos e não poderão ser recuperados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Confirmar Exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={handleDelete}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir Veículo
                        </Button>
                      )
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Fotos Atuais</h4>
              <p className="text-xs text-muted-foreground mb-3">Arraste as fotos para reordenar • A primeira será a capa</p>
              {existingImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {existingImages.map((img, idx) => (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(idx)}
                      className={`relative group cursor-move transition-all ${
                        draggedIndex === idx ? "opacity-50" : ""
                      }`}
                    >
                      <img
                        src={img.imageUrl}
                        alt={`Foto ${idx + 1}`}
                        className={`w-full h-32 object-cover rounded border-2 ${
                          idx === 0
                            ? "border-yellow-500 shadow-lg"
                            : "border-gray-200 dark:border-gray-700 hover:border-blue-400"
                        }`}
                      />
                      {idx === 0 && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                          <Star className="h-3 w-3 fill-current" />
                          Capa
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeExistingImage(img.id)}
                        data-testid={`button-delete-image-${img.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma foto atual</p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Adicionar Novas Fotos</h4>
              <ImageUpload
                onImagesChange={setNewImages}
                maxImages={8}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={async () => { 
                  await uploadNewImages(); 
                  onOpenChange(false); 
                }}
                disabled={newImages.length === 0 && existingImages.length === vehicle.images?.length}
              >
                Salvar Fotos
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
