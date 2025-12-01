import { useState, useMemo } from "react";
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
import { Search, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [selectedBrandName, setSelectedBrandName] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedModelName, setSelectedModelName] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedYearName, setSelectedYearName] = useState<string>("");
  const [fipeResult, setFipeResult] = useState<FipeValue | null>(null);
  
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [yearSearch, setYearSearch] = useState("");

  const { data: brands = [], isLoading: loadingBrands } = useQuery<Brand[]>({
    queryKey: ["/api/fipe/brands", vehicleType],
    queryFn: async () => {
      const response = await fetch(`/api/fipe/brands?type=${encodeURIComponent(vehicleType)}`);
      if (!response.ok) throw new Error("Erro ao buscar marcas");
      return response.json();
    },
    enabled: open,
  });

  const { data: modelsData, isLoading: loadingModels } = useQuery<{ modelos: Model[] }>({
    queryKey: ["/api/fipe/models", vehicleType, selectedBrand],
    queryFn: async () => {
      const response = await fetch(`/api/fipe/brands/${selectedBrand}/models?type=${encodeURIComponent(vehicleType)}`);
      if (!response.ok) throw new Error("Erro ao buscar modelos");
      return response.json();
    },
    enabled: open && !!selectedBrand,
  });

  const models = modelsData?.modelos || [];

  const { data: years = [], isLoading: loadingYears } = useQuery<Year[]>({
    queryKey: ["/api/fipe/years", vehicleType, selectedBrand, selectedModel],
    queryFn: async () => {
      const response = await fetch(`/api/fipe/brands/${selectedBrand}/models/${selectedModel}/years?type=${encodeURIComponent(vehicleType)}`);
      if (!response.ok) throw new Error("Erro ao buscar anos");
      return response.json();
    },
    enabled: open && !!selectedBrand && !!selectedModel,
  });

  const {
    data: fipeValue,
    isFetching: loadingValue,
    refetch: fetchValue,
    isError,
  } = useQuery<FipeValue>({
    queryKey: ["/api/fipe/value", vehicleType, selectedBrand, selectedModel, selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/fipe/brands/${selectedBrand}/models/${selectedModel}/years/${selectedYear}/price?type=${encodeURIComponent(vehicleType)}`);
      if (!response.ok) throw new Error("Erro ao buscar valor FIPE");
      return response.json();
    },
    enabled: false,
  });

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return brands;
    const search = brandSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return brands.filter(brand => 
      brand.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(search)
    );
  }, [brands, brandSearch]);

  const filteredModels = useMemo(() => {
    if (!modelSearch) return models;
    const search = modelSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return models.filter(model => 
      model.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(search)
    );
  }, [models, modelSearch]);

  const filteredYears = useMemo(() => {
    if (!yearSearch) return years;
    const search = yearSearch.toLowerCase();
    return years.filter(year => 
      year.nome.toLowerCase().includes(search)
    );
  }, [years, yearSearch]);

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
    setSelectedBrandName("");
    setSelectedModel("");
    setSelectedModelName("");
    setSelectedYear("");
    setSelectedYearName("");
    setFipeResult(null);
    setBrandSearch("");
    setModelSearch("");
    setYearSearch("");
  };

  const formatCurrency = (value: string) => {
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
        <Button variant="outline" size="default" className="gap-2" data-testid="button-search-fipe">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Buscar FIPE</span>
          <span className="sm:hidden">FIPE</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Consultar Tabela FIPE</DialogTitle>
          <DialogDescription>
            Selecione a marca, modelo e ano para consultar o valor na tabela FIPE
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Tipo de Veiculo</Label>
            <Select
              value={vehicleType}
              onValueChange={(value) => {
                setVehicleType(value);
                setSelectedBrand("");
                setSelectedBrandName("");
                setSelectedModel("");
                setSelectedModelName("");
                setSelectedYear("");
                setSelectedYearName("");
                setFipeResult(null);
              }}
            >
              <SelectTrigger data-testid="select-vehicle-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carros">Carros</SelectItem>
                <SelectItem value="motos">Motos</SelectItem>
                <SelectItem value="caminhoes">Caminhoes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            {loadingBrands ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={brandOpen}
                    className="w-full justify-between font-normal"
                    data-testid="select-brand"
                  >
                    {selectedBrandName || "Digite para buscar a marca..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full min-w-[300px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Digite o nome da marca..." 
                      value={brandSearch}
                      onValueChange={setBrandSearch}
                      data-testid="input-brand-search"
                    />
                    <CommandList>
                      <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                      <CommandGroup>
                        {filteredBrands.slice(0, 50).map((brand) => (
                          <CommandItem
                            key={brand.codigo}
                            value={brand.codigo}
                            onSelect={() => {
                              setSelectedBrand(brand.codigo);
                              setSelectedBrandName(brand.nome);
                              setSelectedModel("");
                              setSelectedModelName("");
                              setSelectedYear("");
                              setSelectedYearName("");
                              setFipeResult(null);
                              setBrandOpen(false);
                              setBrandSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedBrand === brand.codigo ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {brand.nome}
                          </CommandItem>
                        ))}
                        {filteredBrands.length > 50 && (
                          <div className="py-2 px-2 text-xs text-muted-foreground text-center">
                            Mostrando 50 de {filteredBrands.length} resultados. Digite mais para filtrar.
                          </div>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            {loadingModels && selectedBrand ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Popover open={modelOpen} onOpenChange={setModelOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={modelOpen}
                    className="w-full justify-between font-normal"
                    disabled={!selectedBrand}
                    data-testid="select-model"
                  >
                    {selectedModelName || "Digite para buscar o modelo..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full min-w-[300px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Digite o nome do modelo..." 
                      value={modelSearch}
                      onValueChange={setModelSearch}
                      data-testid="input-model-search"
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {filteredModels.slice(0, 50).map((model) => (
                          <CommandItem
                            key={model.codigo}
                            value={String(model.codigo)}
                            onSelect={() => {
                              setSelectedModel(String(model.codigo));
                              setSelectedModelName(model.nome);
                              setSelectedYear("");
                              setSelectedYearName("");
                              setFipeResult(null);
                              setModelOpen(false);
                              setModelSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedModel === String(model.codigo) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {model.nome}
                          </CommandItem>
                        ))}
                        {filteredModels.length > 50 && (
                          <div className="py-2 px-2 text-xs text-muted-foreground text-center">
                            Mostrando 50 de {filteredModels.length} resultados. Digite mais para filtrar.
                          </div>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Ano</Label>
            {loadingYears && selectedModel ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Popover open={yearOpen} onOpenChange={setYearOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={yearOpen}
                    className="w-full justify-between font-normal"
                    disabled={!selectedModel}
                    data-testid="select-year"
                  >
                    {selectedYearName || "Digite para buscar o ano..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full min-w-[300px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Digite o ano..." 
                      value={yearSearch}
                      onValueChange={setYearSearch}
                      data-testid="input-year-search"
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum ano encontrado.</CommandEmpty>
                      <CommandGroup>
                        {filteredYears.map((year) => (
                          <CommandItem
                            key={year.codigo}
                            value={year.codigo}
                            onSelect={() => {
                              setSelectedYear(year.codigo);
                              setSelectedYearName(year.nome);
                              setFipeResult(null);
                              setYearOpen(false);
                              setYearSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedYear === year.codigo ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {year.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

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
                      Combustivel
                    </p>
                    <p className="text-base" data-testid="text-fuel">
                      {fipeResult.Combustivel}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Codigo FIPE
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
                    Referencia: {fipeResult.MesReferencia}
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
