import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Check, Loader2, Instagram, Facebook, MessageSquare, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

interface AdGeneratorMultiProps {
  vehicleId: string;
  vehicleData: {
    brand: string;
    model: string;
    year: number;
    color: string;
    features?: string[];
  };
}

interface GeneratedAds {
  instagram_story: string;
  instagram_feed: string;
  facebook: string;
  olx_title: string;
  whatsapp: string;
  seo_title: string;
}

type Platform = keyof GeneratedAds;

const platformConfig: Record<Platform, { label: string; icon: any; maxChars: number; description: string }> = {
  instagram_story: { label: "Story", icon: Instagram, maxChars: 50, description: "Texto curto e impactante" },
  instagram_feed: { label: "Feed", icon: Instagram, maxChars: 150, description: "Post engajador" },
  facebook: { label: "Facebook", icon: Facebook, maxChars: 200, description: "Post completo" },
  olx_title: { label: "OLX", icon: Search, maxChars: 60, description: "Título SEO" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, maxChars: 100, description: "Mensagem conversacional" },
  seo_title: { label: "SEO", icon: Search, maxChars: 60, description: "Título para buscadores" },
};

export function AdGeneratorMulti({ vehicleId, vehicleData }: AdGeneratorMultiProps) {
  const [generatedAds, setGeneratedAds] = useState<GeneratedAds | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<Platform | null>(null);
  const { toast } = useToast();
  const { t, language } = useI18n();

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/generate-ad-multi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao gerar anúncios");
      }

      const data = await response.json();
      setGeneratedAds(data);

      toast({
        title: t("adGenerator.adsGenerated"),
        description: t("adGenerator.adsGeneratedDesc"),
      });
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: t("adGenerator.errorGenerating"),
        description: error instanceof Error ? error.message : t("common.error"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (platform: Platform) => {
    if (!generatedAds) return;
    
    await navigator.clipboard.writeText(generatedAds[platform]);
    setCopiedPlatform(platform);
    toast({
      title: t("adGenerator.copied"),
      description: t("adGenerator.copiedDesc", { platform: platformConfig[platform].label }),
    });
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">{t("adGenerator.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("adGenerator.description")}
        </p>
      </div>

      <div className="space-y-4">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
          size="lg"
          data-testid="button-generate-ads-multi"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t("adGenerator.generating")}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              {t("adGenerator.generateButton")}
            </>
          )}
        </Button>

        {generatedAds && (
          <Tabs defaultValue="instagram_feed" className="w-full">
            <TabsList className="w-full flex-wrap h-auto gap-1">
              {(Object.keys(platformConfig) as Platform[]).map((platform) => {
                const config = platformConfig[platform];
                const Icon = config.icon;
                return (
                  <TabsTrigger
                    key={platform}
                    value={platform}
                    className="flex items-center gap-1 text-xs"
                    data-testid={`tab-${platform}`}
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {(Object.keys(platformConfig) as Platform[]).map((platform) => {
              const config = platformConfig[platform];
              const text = generatedAds[platform];
              const charCount = text?.length || 0;
              const isOverLimit = charCount > config.maxChars;

              return (
                <TabsContent key={platform} value={platform} className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{config.description}</span>
                      <Badge variant={isOverLimit ? "destructive" : "secondary"} className="text-xs">
                        {charCount}/{config.maxChars} caracteres
                      </Badge>
                    </div>
                    <Textarea
                      value={text || ""}
                      readOnly
                      className="min-h-[100px]"
                      data-testid={`textarea-${platform}`}
                    />
                    <Button
                      onClick={() => handleCopy(platform)}
                      variant="outline"
                      className="w-full"
                      data-testid={`button-copy-${platform}`}
                    >
                      {copiedPlatform === platform ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          {t("adGenerator.copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          {t("adGenerator.copy")} {config.label}
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </Card>
  );
}
