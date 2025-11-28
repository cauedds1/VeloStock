import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFipeVehicleVersions, useFipePriceByVersion } from "@/hooks/use-fipe";
import type { FipeYear } from "@/hooks/use-fipe";

interface PriceSuggestionProps {
  vehicleId: string;
  vehicleData: {
    brand: string;
    model: string;
    year: number;
  };
  fipeReferencePrice?: string;
}

export function PriceSuggestion({ vehicleId, vehicleData, fipeReferencePrice }: PriceSuggestionProps) {
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [fipePrice, setFipePrice] = useState("");
  const [targetMargin, setTargetMargin] = useState("20");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const versionsMutation = useFipeVehicleVersions(
    vehicleData.brand,
    vehicleData.model,
    vehicleData.year
  );
  
  const priceMutation = useFipePriceByVersion();

  const handleSuggestPrice = async () => {
    setIsLoading(true);
    
    try {
      // Passo 1: Buscar preço FIPE automaticamente
      toast({
        title: "Consultando FIPE...",
        description: "Buscando preço de referência para o veículo.",
      });

      let fipeValue = "";
      try {
        // Buscar versões disponíveis
        const versionsData = await versionsMutation.mutateAsync();
        
        if (versionsData.versions.length > 1) {
          toast({
            title: "Múltiplas versões encontradas",
            description: `Usando a primeira versão encontrada (${versionsData.versions[0].nome}). Para escolher uma versão específica, consulte FIPE no cadastro do veículo.`,
            variant: "default",
          });
        }
        
        // Usar primeira versão disponível
        const firstVersion = versionsData.versions[0];
        const fipeData = await priceMutation.mutateAsync({
          brandId: versionsData.brandId,
          modelId: versionsData.modelId,
          versionCode: firstVersion.codigo
        });
        
        fipeValue = fipeData.Valor.replace("R$", "").trim();
        setFipePrice(fipeValue);
        
        toast({
          title: "Preço FIPE encontrado!",
          description: `${fipeData.Marca} ${fipeData.Modelo}: ${fipeData.Valor}`,
        });
      } catch (fipeError: any) {
        console.warn("Erro ao buscar FIPE:", fipeError);
        toast({
          title: "FIPE não encontrado",
          description: "Continuando sugestão sem referência FIPE...",
          variant: "default",
        });
      }

      // Passo 2: Chamar IA para sugerir preço
      toast({
        title: "Gerando sugestão...",
        description: "A IA está analisando custos e margem desejada.",
      });

      const response = await fetch(`/api/vehicles/${vehicleId}/suggest-price`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fipePrice: fipeValue || undefined,
          targetMarginPercent: parseInt(targetMargin) || 20,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 400 && errorData.error?.includes("API key")) {
          throw new Error("A chave da API da OpenAI não está configurada.");
        } else if (response.status === 429) {
          throw new Error("Limite de uso da API excedido. Tente mais tarde.");
        } else {
          throw new Error(errorData.error || "Erro ao gerar sugestão");
        }
      }

      const data = await response.json();
      const priceValue = typeof data.suggestedPrice === 'number' 
        ? data.suggestedPrice 
        : parseFloat(data.suggestedPrice?.toString() || "0");
      
      setSuggestedPrice(priceValue.toString());
      setReasoning(data.reasoning || "");
      
      toast({
        title: "Sugestão gerada!",
        description: `Preço sugerido: R$ ${priceValue.toFixed(2)}`,
      });
    } catch (error) {
      console.error("Erro ao sugerir preço:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Não foi possível gerar a sugestão. Tente novamente.";
      
      toast({
        title: "Erro ao sugerir preço",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Sugestão de Preço com IA
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Análise inteligente baseada em custos, margem desejada e preço FIPE de referência
        </p>
      </div>

      {fipeReferencePrice && (
        <div className="mb-6 p-3 bg-muted rounded-md border border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                FIPE
              </p>
              <p className="text-lg font-semibold text-foreground">
                {fipeReferencePrice}
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="targetMargin">Margem de Lucro Desejada (%)</Label>
          <Input
            id="targetMargin"
            type="number"
            value={targetMargin}
            onChange={(e) => setTargetMargin(e.target.value)}
            placeholder="20"
            min="0"
            max="100"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Padrão: 20% de margem sobre o custo total
          </p>
        </div>

        <Button
          onClick={handleSuggestPrice}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {versionsMutation.isPending || priceMutation.isPending ? "Consultando FIPE..." : "Gerando sugestão..."}
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-5 w-5" />
              Sugerir Preço de Venda
            </>
          )}
        </Button>

        {fipePrice && (
          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm font-medium text-muted-foreground">
              Preço de Referência FIPE
            </p>
            <p className="text-2xl font-bold text-foreground">{fipePrice}</p>
          </div>
        )}

        {suggestedPrice && (
          <div className="space-y-3">
            <div className="p-4 bg-primary/10 rounded-md border border-primary/20">
              <p className="text-sm font-medium text-muted-foreground">
                Preço Sugerido pela IA
              </p>
              <p className="text-3xl font-bold text-primary">
                R$ {parseFloat(suggestedPrice).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {reasoning && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Justificativa
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {reasoning}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
