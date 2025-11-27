import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function ResetPassword() {
  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Obter email da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, []);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (response.ok) {
        setStep("reset");
        toast({
          title: "Código verificado!",
          description: "Agora você pode definir uma nova senha",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Código inválido ou expirado",
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Sua senha foi redefinida. Redirecionando para login...",
        });
        setTimeout(() => {
          setLocation("/login");
        }, 1500);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Erro ao redefinir senha",
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

        {/* Card */}
        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">
              {step === "verify" ? "Verificar Código" : "Nova Senha"}
            </CardTitle>
            <CardDescription>
              {step === "verify"
                ? "Digite o código recebido por email"
                : "Defina uma nova senha para sua conta"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "verify" ? (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código (6 dígitos)</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    maxLength={6}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? "Verificando..." : "Verificar Código"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Redefinindo..." : "Redefinir Senha"}
                </Button>
              </form>
            )}

            <div className="text-center text-sm pt-4">
              <button
                className="text-purple-600 hover:text-purple-700 font-semibold underline"
                onClick={() => setLocation("/login")}
              >
                ← Voltar para Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
