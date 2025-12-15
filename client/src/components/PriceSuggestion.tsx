import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFipeVehicleVersions, useFipePriceByVersion } from "@/hooks/use-fipe";
import type { FipeYear } from "@/hooks/use-fipe";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  
  const versionsMutation = useFipeVehicleVersions(
    vehicleData.brand,
    vehicleData.model,
    vehicleData.year
  );
  
  const priceMutation = useFipePriceByVersion?.();

  const handleSuggestPrice = async () => {
    setIsLoading(true);
    
    try {
      let fipeValue = "";
      
      // Se já temos FIPE cadastrada, usar direto e gerar sugestão imediatamente
      if (fipeReferencePrice) {
        fipeValue = fipeReferencePrice.replace("R$", "").trim();
        setFipePrice(fipeValue);
      } else {
        // Tentar buscar FIPE em background (com timeout)
        // Não bloqueia a sugestão de preço, apenas tenta adicionar referência
        const fipePromise = (async () => {
          try {
            const versionsData = await Promise.race([
              versionsMutation.mutateAsync(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)) // Timeout de 3s
            ]);
            
            const firstVersion = versionsData.versions[0];
            const fipeData = await priceMutation.mutateAsync?.({
              brandId: versionsData.brandId,
              modelId: versionsData.modelId,
              versionCode: firstVersion.codigo
            });
            
            fipeValue = fipeData.Valor.replace("R$", "").trim();
            setFipePrice(fipeValue);
          } catch (e) {
            // Falha silenciosa - continua sem FIPE
          }
        })();
        
        // Não aguarda a FIPE - segue direto com a sugestão
      }

      // Chamar IA para sugerir preço IMEDIATAMENTE (não aguarda FIPE)
      toast({
        title: t("priceSuggestion.generatingTitle"),
        description: t("priceSuggestion.generatingDesc"),
      });

      const response = await fetch(`/api/vehicles/${vehicleId}/suggest-price-dynamic`, {
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
          throw new Error(t("priceSuggestion.apiKeyError"));
        } else if (response.status === 429) {
          throw new Error(t("priceSuggestion.rateLimitError"));
        } else {
          throw new Error(errorData.error || t("priceSuggestion.genericError"));
        }
      }

      const data = await response.json();
      const priceValue = typeof data.suggestedPrice === 'number' 
        ? data.suggestedPrice 
        : parseFloat(data.suggestedPrice?.toString() || "0");
      
      setSuggestedPrice(priceValue.toString());
      setReasoning(data.reasoning || "");
      
      toast({
        title: t("priceSuggestion.generatedTitle"),
        description: t("priceSuggestion.generatedDesc", { price: priceValue.toFixed(2) }),
      });
    } catch (error) {
      console.error("Erro ao sugerir preço:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : t("priceSuggestion.genericError");
      
      toast({
        title: t("priceSuggestion.errorTitle"),
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
          {t("priceSuggestion.title")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("priceSuggestion.description")}
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
          <Label htmlFor="targetMargin">{t("priceSuggestion.targetMargin")}</Label>
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
            {t("priceSuggestion.marginDefault")}
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
              {versionsMutation.isPending || priceMutation.isPending ? t("priceSuggestion.consultingFipe") : t("priceSuggestion.generatingSuggestion")}
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-5 w-5" />
              {t("priceSuggestion.suggestPrice")}
            </>
          )}
        </Button>

        {fipePrice && (
          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm font-medium text-muted-foreground">
              {t("priceSuggestion.fipeReferencePrice")}
            </p>
            <p className="text-2xl font-bold text-foreground">{fipePrice}</p>
          </div>
        )}

        {suggestedPrice && (
          <div className="space-y-3">
            <div className="p-4 bg-primary/10 rounded-md border border-primary/20">
              <p className="text-sm font-medium text-muted-foreground">
                {t("priceSuggestion.aiSuggestedPrice")}
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
                  {t("priceSuggestion.reasoning")}
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
