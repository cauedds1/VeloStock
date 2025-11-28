import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Copy, Check, MessageSquare, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeadAssistantProps {
  leadId: string;
  leadName: string;
  veiculoNome?: string;
  veiculoData?: {
    brand: string;
    model: string;
    year: number;
    color: string;
  };
}

export function LeadAssistant({ leadId, leadName, veiculoNome, veiculoData }: LeadAssistantProps) {
  const [suggestedResponse, setSuggestedResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSuggestResponse = async () => {
    setIsLoading(true);
    setSuggestedResponse("");

    try {
      const response = await fetch(`/api/leads/${leadId}/suggest-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          veiculoData: veiculoData ? {
            nome: veiculoNome,
            brand: veiculoData.brand,
            model: veiculoData.model,
            year: veiculoData.year,
            color: veiculoData.color,
          } : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao gerar sugestão");
      }

      const data = await response.json();
      setSuggestedResponse(data.suggestedResponse);

      toast({
        title: "Sugestão gerada",
        description: "A IA criou uma resposta personalizada para este lead.",
      });
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao gerar sugestão",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(suggestedResponse);
    setCopied(true);
    toast({
      title: "Copiado",
      description: "Texto copiado para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const encodedMessage = encodeURIComponent(suggestedResponse);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-lead-assistant-${leadId}`}>
          <Sparkles className="h-4 w-4 mr-2" />
          Sugerir Resposta IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Assistente de Leads - {leadName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            onClick={handleSuggestResponse}
            disabled={isLoading}
            className="w-full"
            data-testid="button-generate-lead-response"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando sugestão...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Resposta com IA
              </>
            )}
          </Button>

          {suggestedResponse && (
            <Card className="p-4">
              <Textarea
                value={suggestedResponse}
                readOnly
                className="min-h-[150px] mb-3"
                data-testid="textarea-suggested-response"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  data-testid="button-copy-response"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSendWhatsApp}
                  variant="default"
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="button-send-whatsapp"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
