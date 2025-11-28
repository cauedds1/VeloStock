import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ImageUpload } from "./ImageUpload";
import { Plus, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useFipeVehicleVersions, useFipePriceByVersion } from "@/hooks/use-fipe";
import type { FipeVersion } from "@/hooks/use-fipe";

const vehicleFormSchema = z.object({
  brand: z.string().min(1, "Marca é obrigatória"),
  model: z.string().min(1, "Modelo é obrigatório"),
  year: z.coerce.number().min(1900, "Ano inválido"),
  version: z.string().optional(), // Versão FIPE selecionada
  color: z.string().min(1, "Cor é obrigatória"),
  plate: z.string().min(7, "Placa inválida"),
  vehicleType: z.enum(["Carro", "Moto"]),
  status: z.string().min(1, "Status é obrigatório"),
  purchasePrice: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().nullable().optional()),
  salePrice: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().nullable().optional()),
  kmOdometer: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().nullable().optional()),
  fuelType: z.string().nullable().optional(),
  fipeReferencePrice: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

interface AddVehicleDialogProps {
  onAdd?: (data: VehicleFormData & { images: File[] }) => void;
}

export function AddVehicleDialog({ onAdd }: AddVehicleDialogProps) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [fipeVersions, setFipeVersions] = useState<FipeVersion[]>([]);
  const [fipeMetadata, setFipeMetadata] = useState<{brandId: string} | null>(null);
  const { toast } = useToast();
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      version: "",
      color: "",
      plate: "",
      vehicleType: "Carro",
      status: "Entrada",
      purchasePrice: null,
      salePrice: null,
      kmOdometer: null,
      fuelType: null,
      fipeReferencePrice: "",
    },
  });

  const vehicleType = form.watch("vehicleType");
  const vehicleTypeMap: Record<string, string> = {
    "Carro": "carros",
    "Moto": "motos"
  };
  
  const versionsMutation = useFipeVehicleVersions();
  
  const priceMutation = useFipePriceByVersion();

  // Watch para detectar mudanças
  const watchedBrand = form.watch("brand");
  const watchedModel = form.watch("model");
  const watchedYear = form.watch("year");

  // SINGLE useEffect: Carrega versões quando marca/modelo/ano mudam, sem conflito
  useEffect(() => {
    const brand = watchedBrand;
    const model = watchedModel;
    const year = watchedYear;
    const currentVehicleType = form.getValues("vehicleType");

    // Se qualquer campo está vazio, limpa versões
    if (!brand || !model || !year) {
      setFipeVersions([]);
      setFipeMetadata(null);
      form.setValue("version", "");
      return;
    }

    // Carregar versões em background
    const loadVersions = async () => {
      try {
        const fipeVehicleType = vehicleTypeMap[currentVehicleType] || "carros";
        const result = await versionsMutation.mutateAsync({ 
          brand, 
          model, 
          year,
          vehicleType: fipeVehicleType
        });
        setFipeVersions(result.versions);
        setFipeMetadata({ brandId: result.brandId });
      } catch (error: any) {
        // Falha silenciosa - usuário verá mensagem de erro se tentar usar
      }
    };

    loadVersions();
  }, [watchedBrand, watchedModel, watchedYear, vehicleType]);

  // Quando usuário seleciona uma versão, buscar preço FIPE automaticamente
  const handleVersionChange = async (versionJson: string) => {
    if (!fipeMetadata) return;

    try {
      // Parse da versão selecionada
      const version: FipeVersion = JSON.parse(versionJson);
      // Salvar JSON completo no form (será parseado no submit)
      form.setValue("version", versionJson);

      // Mapear tipo de veículo para FIPE
      const vehicleTypeMap: Record<string, string> = {
        "Carro": "carros",
        "Moto": "motos"
      };
      const fipeVehicleType = vehicleTypeMap[vehicleType] || "carros";

      // Buscar preço com brandId + modelId + yearCode específicos
      const result = await priceMutation.mutateAsync({ 
        brandId: fipeMetadata.brandId, 
        modelId: String(version.modelId), 
        versionCode: version.yearCode,
        vehicleType: fipeVehicleType
      });
      
      // Extrair valor de forma defensiva - FIPE pode retornar "Valor" ou "valor"
      const resultAny = result as any;
      const valorField = result.Valor || resultAny.valor || '';
      const priceValue = (valorField || '').toString().replace("R$", "").replace("R$ ", "").trim();
      
      if (!priceValue) {
        throw new Error("Não foi possível extrair o valor FIPE da resposta");
      }
      
      form.setValue("fipeReferencePrice", priceValue);
      
      // Usar Marca/marca, Modelo/modelo com fallback
      const marca = result.Marca || resultAny.marca || 'Veículo';
      const modelo = result.Modelo || resultAny.modelo || '';
      const valor = result.Valor || resultAny.valor || valorField;
      
      toast({
        title: "Preço FIPE atualizado!",
        description: `${marca} ${modelo}: ${valor}`,
      });
    } catch (error: any) {
      console.error("Erro ao buscar preço FIPE:", error);
      toast({
        title: "Erro ao consultar preço",
        description: error.message || "Não foi possível consultar o preço FIPE.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: VehicleFormData) => {
    try {
      const formData = new FormData();
      formData.append("brand", data.brand);
      formData.append("model", data.model);
      formData.append("year", String(data.year));
      formData.append("color", data.color);
      formData.append("plate", data.plate.toUpperCase());
      formData.append("vehicleType", data.vehicleType);
      formData.append("status", data.status);
      
      if (data.purchasePrice != null) {
        formData.append("purchasePrice", String(data.purchasePrice));
      }
      if (data.salePrice != null) {
        formData.append("salePrice", String(data.salePrice));
      }
      if (data.kmOdometer != null) {
        formData.append("kmOdometer", String(data.kmOdometer));
      }
      if (data.fuelType) formData.append("fuelType", data.fuelType);
      if (data.fipeReferencePrice) formData.append("fipeReferencePrice", data.fipeReferencePrice);

      images.forEach((image) => {
        formData.append("images", image);
      });

      const response = await fetch("/api/vehicles", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao cadastrar veículo");
      }

      toast({
        title: "Veículo adicionado!",
        description: "O veículo foi cadastrado com sucesso.",
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      
      onAdd?.({ ...data, images });
      form.reset();
      setImages([]);
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar veículo",
        description: error.message || "Ocorreu um erro ao cadastrar o veículo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" data-testid="button-add-vehicle">
          <Plus className="mr-2 h-5 w-5" />
          Adicionar Veículo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Veículo</DialogTitle>
          <DialogDescription>
            Preencha os dados do veículo e adicione fotos
          </DialogDescription>
        </DialogHeader>

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
                      <Input
                        placeholder="Ex: Toyota"
                        {...field}
                        data-testid="input-brand"
                      />
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
                      <Input
                        placeholder="Ex: Corolla"
                        {...field}
                        data-testid="input-model"
                      />
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
                        placeholder="Ex: 2020"
                        {...field}
                        data-testid="input-year"
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
                        <SelectTrigger data-testid="select-version">
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
                      <Input
                        placeholder="Ex: Prata"
                        {...field}
                        data-testid="input-color"
                      />
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
                      <Input
                        placeholder="ABC-1234"
                        {...field}
                        data-testid="input-plate"
                      />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-vehicle-type">
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Inicial</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Entrada">Entrada</SelectItem>
                        <SelectItem value="Em Reparos">Em Reparos</SelectItem>
                        <SelectItem value="Em Higienização">Em Higienização</SelectItem>
                        <SelectItem value="Pronto para Venda">Pronto para Venda</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fuel">
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

              <FormField
                control={form.control}
                name="kmOdometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quilometragem</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 45000"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        data-testid="input-km"
                      />
                    </FormControl>
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
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-purchase-price"
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

              {can.viewCosts && (
                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de Venda (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Preço de venda desejado"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-sale-price"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Valor de venda que deseja anunciar
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="border-t border-border pt-4">
              <FormField
                control={form.control}
                name="fipeReferencePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Preço de Referência FIPE
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Será preenchido ao selecionar a versão"
                        {...field}
                        readOnly
                        className="bg-muted"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Selecione a versão acima para preencher automaticamente o preço FIPE
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t border-border pt-6">
              <ImageUpload onImagesChange={setImages} maxImages={8} />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button type="submit" data-testid="button-submit-vehicle">
                Cadastrar Veículo
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
