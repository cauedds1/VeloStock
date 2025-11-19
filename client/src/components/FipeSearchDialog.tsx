import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Brand {
  codigo: string;
  nome: string;
}

interface Model {
  codigo: string;
  nome: string;
}

interface Year {
  codigo: string;
  nome: string;
}

interface FipeValue {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  SiglaCombustivel: string;
}

export function FipeSearchDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [vehicleType, setVehicleType] = useState("carros");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [fipeResult, setFipeResult] = useState<FipeValue | null>(null);

  // Query para buscar marcas
  const { data: brands = [], isLoading: loadingBrands } = useQuery<Brand[]>({
    queryKey: ["/api/fipe/brands", vehicleType],
    enabled: open,
  });

  // Query para buscar modelos
  const { data: modelsData, isLoading: loadingModels } = useQuery<{ modelos: Model[] }>({
    queryKey: ["/api/fipe/models", { type: vehicleType, brandCode: selectedBrand }],
    enabled: open && !!selectedBrand,
  });

  const models = modelsData?.modelos || [];

  // Query para buscar anos
  const { data: years = [], isLoading: loadingYears } = useQuery<Year[]>({
    queryKey: [
      "/api/fipe/years",
      { type: vehicleType, brandCode: selectedBrand, modelCode: selectedModel },
    ],
    enabled: open && !!selectedBrand && !!selectedModel,
  });

  // Query para buscar valor FIPE
  const {
    data: fipeValue,
    isFetching: loadingValue,
    refetch: fetchValue,
    isError,
  } = useQuery<FipeValue>({
    queryKey: [
      "/api/fipe/value",
      {
        type: vehicleType,
        brandCode: selectedBrand,
        modelCode: selectedModel,
        yearCode: selectedYear,
      },
    ],
    enabled: false, // Só busca quando clicar no botão
  });

  const handleSearch = async () => {
    if (selectedBrand && selectedModel && selectedYear) {
      try {
        const result = await fetchValue();
        if (result.data) {
          setFipeResult(result.data);
        } else if (result.isError) {
          toast({
            title: "Erro ao buscar FIPE",
            description: "Não foi possível obter o valor FIPE. Tente novamente mais tarde.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Erro ao buscar FIPE",
          description: "Não foi possível obter o valor FIPE. Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedYear("");
    setFipeResult(null);
  };

  const formatCurrency = (value: string) => {
    // Remove "R$ " e converte para número
    const numericValue = value.replace("R$ ", "").replace(".", "").replace(",", ".");
    return value;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        } else {
          setOpen(true);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" data-testid="button-search-fipe">
          <Search className="mr-2 h-5 w-5" />
          Buscar FIPE
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consultar Tabela FIPE</DialogTitle>
          <DialogDescription>
            Selecione a marca, modelo e ano para consultar o valor na tabela FIPE
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tipo de Veículo */}
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Tipo de Veículo</Label>
            <Select
              value={vehicleType}
              onValueChange={(value) => {
                setVehicleType(value);
                setSelectedBrand("");
                setSelectedModel("");
                setSelectedYear("");
              }}
            >
              <SelectTrigger data-testid="select-vehicle-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carros">Carros</SelectItem>
                <SelectItem value="motos">Motos</SelectItem>
                <SelectItem value="caminhoes">Caminhões</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Marca */}
          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            {loadingBrands ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedBrand}
                onValueChange={(value) => {
                  setSelectedBrand(value);
                  setSelectedModel("");
                  setSelectedYear("");
                  setFipeResult(null);
                }}
                disabled={brands.length === 0}
              >
                <SelectTrigger data-testid="select-brand">
                  <SelectValue placeholder="Selecione a marca" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.codigo} value={brand.codigo}>
                      {brand.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Modelo */}
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            {loadingModels ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedModel}
                onValueChange={(value) => {
                  setSelectedModel(value);
                  setSelectedYear("");
                  setFipeResult(null);
                }}
                disabled={!selectedBrand || models.length === 0}
              >
                <SelectTrigger data-testid="select-model">
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.codigo} value={String(model.codigo)}>
                      {model.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Ano */}
          <div className="space-y-2">
            <Label htmlFor="year">Ano</Label>
            {loadingYears ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedYear}
                onValueChange={(value) => {
                  setSelectedYear(value);
                  setFipeResult(null);
                }}
                disabled={!selectedModel || years.length === 0}
              >
                <SelectTrigger data-testid="select-year">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.codigo} value={year.codigo}>
                      {year.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Botão de Buscar */}
          <Button
            onClick={handleSearch}
            disabled={
              !selectedBrand || !selectedModel || !selectedYear || loadingValue
            }
            className="w-full"
            data-testid="button-search"
          >
            {loadingValue ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Buscar Valor FIPE
              </>
            )}
          </Button>

          {/* Resultado */}
          {fipeResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valor FIPE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Marca/Modelo
                    </p>
                    <p className="text-base font-semibold" data-testid="text-brand-model">
                      {fipeResult.Marca} {fipeResult.Modelo}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ano</p>
                    <p className="text-base" data-testid="text-year">
                      {fipeResult.AnoModelo}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Combustível
                    </p>
                    <p className="text-base" data-testid="text-fuel">
                      {fipeResult.Combustivel}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Código FIPE
                    </p>
                    <p className="text-base" data-testid="text-fipe-code">
                      {fipeResult.CodigoFipe}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-primary/10 p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Valor FIPE
                  </p>
                  <p
                    className="text-2xl font-bold text-primary"
                    data-testid="text-fipe-value"
                  >
                    {formatCurrency(fipeResult.Valor)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Referência: {fipeResult.MesReferencia}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
