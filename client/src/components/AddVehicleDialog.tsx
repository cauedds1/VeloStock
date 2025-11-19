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
import { useFipeVehicleVersions, useFipePriceByVersion } from "@/hooks/use-fipe";
import type { FipeYear } from "@/hooks/use-fipe";

const vehicleFormSchema = z.object({
  brand: z.string().min(1, "Marca é obrigatória"),
  model: z.string().min(1, "Modelo é obrigatório"),
  year: z.coerce.number().min(1900, "Ano inválido"),
  version: z.string().optional(), // Versão FIPE selecionada
  color: z.string().min(1, "Cor é obrigatória"),
  plate: z.string().min(7, "Placa inválida"),
  vehicleType: z.enum(["Carro", "Moto"]),
  status: z.string().min(1, "Status é obrigatório"),
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
  const [fipeVersions, setFipeVersions] = useState<FipeYear[]>([]);
  const [fipeMetadata, setFipeMetadata] = useState<{brandId: string, modelId: string} | null>(null);
  const { toast } = useToast();
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
      kmOdometer: null,
      fuelType: null,
      fipeReferencePrice: "",
    },
  });

  const versionsMutation = useFipeVehicleVersions(
    form.watch("brand"),
    form.watch("model"),
    form.watch("year")
  );
  
  const priceMutation = useFipePriceByVersion();

  // Limpar cache de versões quando marca, modelo ou ano mudam
  useEffect(() => {
    setFipeVersions([]);
    setFipeMetadata(null);
    form.setValue("version", "");
  }, [form.watch("brand"), form.watch("model"), form.watch("year")]);

  // Carregar versões automaticamente quando usuário abre o dropdown "Versão"
  const handleLoadVersions = async () => {
    const brand = form.getValues("brand");
    const model = form.getValues("model");
    const year = form.getValues("year");

    if (!brand || !model || !year) {
      toast({
        title: "Campos incompletos",
        description: "Preencha marca, modelo e ano primeiro.",
        variant: "destructive",
      });
      return;
    }

    // Se já carregou versões, não carregar novamente
    if (fipeVersions.length > 0) {
      return;
    }

    try {
      const result = await versionsMutation.mutateAsync();
      setFipeVersions(result.versions);
      setFipeMetadata({ brandId: result.brandId, modelId: result.modelId });
      
      if (result.versions.length === 0) {
        toast({
          title: "Nenhuma versão encontrada",
          description: "Não foram encontradas versões FIPE para este veículo.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao buscar versões",
        description: error.message || "Não foi possível encontrar o veículo. Verifique os dados.",
        variant: "destructive",
      });
    }
  };

  // Quando usuário seleciona uma versão, buscar preço FIPE automaticamente
  const handleVersionChange = async (versionCode: string) => {
    form.setValue("version", versionCode);
    
    if (!fipeMetadata) return;

    try {
      const result = await priceMutation.mutateAsync({ 
        brandId: fipeMetadata.brandId, 
        modelId: fipeMetadata.modelId, 
        versionCode 
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
        throw new Error("Erro ao cadastrar veículo");
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
    } catch (error) {
      toast({
        title: "Erro ao adicionar veículo",
        description: "Ocorreu um erro ao cadastrar o veículo. Tente novamente.",
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
                      onOpenChange={(open) => {
                        if (open) handleLoadVersions();
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-version">
                          <SelectValue placeholder={versionsMutation.isPending ? "Carregando versões..." : "Selecione a versão"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fipeVersions.length > 0 ? (
                          fipeVersions.map((version) => (
                            <SelectItem key={version.codigo} value={version.codigo}>
                              {version.nome}
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
