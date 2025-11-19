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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FipeData {
  veiculo: {
    uf: string;
    ano: string;
    cor: string;
    placa: string;
    chassi: string;
    municipio: string;
    combustivel: string;
    marca_modelo: string;
  };
  fipes: Array<{
    valor: number;
    codigo: string;
  }>;
}

export function FipeSearchDialog() {
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [fipeData, setFipeData] = useState<FipeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatPlate = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
    }
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlate(e.target.value);
    setPlate(formatted);
  };

  const handleSearch = async () => {
    if (!plate || plate.length < 7) {
      setError("Por favor, insira uma placa válida");
      return;
    }

    setLoading(true);
    setError(null);
    setFipeData(null);

    try {
      const response = await fetch("/api/fipe/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plate: plate.replace("-", "") }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao buscar dados da FIPE");
      }

      const data = await response.json();
      setFipeData(data);
    } catch (err: any) {
      setError(err.message || "Erro ao buscar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleClose = () => {
    setOpen(false);
    setPlate("");
    setFipeData(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      } else {
        setOpen(true);
      }
    }}>
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
            Digite a placa do veículo para consultar o valor na tabela FIPE
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="plate">Placa do Veículo</Label>
            <div className="flex gap-2">
              <Input
                id="plate"
                placeholder="ABC-1234"
                value={plate}
                onChange={handlePlateChange}
                maxLength={8}
                className="uppercase"
                data-testid="input-plate"
              />
              <Button
                onClick={handleSearch}
                disabled={loading || !plate}
                data-testid="button-search"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {fipeData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Dados do Veículo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Marca/Modelo</p>
                    <p className="text-base font-semibold" data-testid="text-brand-model">
                      {fipeData.veiculo.marca_modelo}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Placa</p>
                    <p className="text-base font-semibold" data-testid="text-plate">
                      {fipeData.veiculo.placa}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ano</p>
                    <p className="text-base" data-testid="text-year">{fipeData.veiculo.ano}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cor</p>
                    <p className="text-base" data-testid="text-color">{fipeData.veiculo.cor}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Combustível</p>
                    <p className="text-base" data-testid="text-fuel">{fipeData.veiculo.combustivel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Município</p>
                    <p className="text-base" data-testid="text-city">
                      {fipeData.veiculo.municipio} - {fipeData.veiculo.uf}
                    </p>
                  </div>
                </div>

                {fipeData.fipes && fipeData.fipes.length > 0 && (
                  <div className="mt-6 rounded-lg bg-primary/10 p-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Valor FIPE
                    </p>
                    {fipeData.fipes.map((fipe, index) => (
                      <div key={index} className="space-y-1">
                        <p className="text-2xl font-bold text-primary" data-testid={`text-fipe-value-${index}`}>
                          {formatCurrency(fipe.valor)}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-fipe-code-${index}`}>
                          Código FIPE: {fipe.codigo}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
