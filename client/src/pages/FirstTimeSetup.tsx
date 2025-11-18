import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useCurrentCompany } from "../hooks/use-company";
import { CompanySetupDialog } from "../components/CompanySetupDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { CheckCircle } from "lucide-react";

export default function FirstTimeSetup() {
  const [, setLocation] = useLocation();
  const { hasCompany, isLoading } = useCurrentCompany();
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (hasCompany) {
        setLocation("/");
      } else {
        setShowSetup(true);
      }
    }
  }, [hasCompany, isLoading, setLocation]);

  const handleSuccess = () => {
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img 
              src="/velostock-logo.png" 
              alt="VeloStock" 
              className="h-28 w-auto mx-auto"
            />
          </div>
          <CardTitle className="text-3xl">Bem-vindo ao VeloStock</CardTitle>
          <CardDescription className="text-base mt-2">
            Sistema inteligente de gestão de estoque e operações para concessionárias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Gestão Completa da Loja</h4>
                <p className="text-sm text-muted-foreground">
                  Controle veículos, estoque de suprimentos, custos e documentos
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Pipeline Visual de Preparação</h4>
                <p className="text-sm text-muted-foreground">
                  Kanban para acompanhar cada veículo da entrada até a venda
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Inteligência Artificial Integrada</h4>
                <p className="text-sm text-muted-foreground">
                  Sugestão de preços e gerador de anúncios profissionais
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Alertas Inteligentes</h4>
                <p className="text-sm text-muted-foreground">
                  Notificações automáticas para veículos parados, sem fotos ou sem preço
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Personalização Total</h4>
                <p className="text-sm text-muted-foreground">
                  Cores, logo e configurações adaptadas à sua empresa
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-center">
            <button
              onClick={() => setShowSetup(true)}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
            >
              Começar Configuração
            </button>
          </div>
        </CardContent>
      </Card>

      <CompanySetupDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
