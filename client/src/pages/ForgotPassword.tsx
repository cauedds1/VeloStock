import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setCodeSent(true);
        toast({
          title: "Código enviado!",
          description: "Verifique seu email para recuperar a senha",
        });
        setTimeout(() => {
          setLocation(`/reset-password?email=${encodeURIComponent(email)}`);
        }, 1500);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Não foi possível enviar o código",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-green-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <Car className="w-7 h-7 text-purple-600" />
          </div>
          <span className="text-3xl font-bold text-white">VeloStock</span>
        </div>

        {/* Card de Recuperação */}
        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
            <CardDescription>
              Digite seu email para receber um código de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={isLoading}
              >
                {isLoading ? "Enviando..." : "Enviar Código"}
              </Button>
            </form>

            <div className="text-center text-sm pt-4 space-y-3">
              <div>
                <button
                  className="text-purple-600 hover:text-purple-700 font-semibold underline"
                  onClick={() => setLocation("/login")}
                >
                  ← Voltar para Login
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
