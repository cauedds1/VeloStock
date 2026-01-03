import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Signup() {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Check if it's the first user to show/hide invite code
  useState(() => {
    fetch("/api/users/count")
      .then(res => res.json())
      .then(data => setIsFirstUser(data.count === 0))
      .catch(() => setIsFirstUser(false));
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: t("common.error"),
        description: t("auth.passwordsDontMatch"),
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t("common.error"),
        description: t("auth.passwordMinLength"),
        variant: "destructive",
      });
      return;
    }

    if (!isFirstUser && !inviteCode) {
      toast({
        title: t("common.error"),
        description: t("auth.inviteRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Validar código de convite antes de prosseguir
      if (!isFirstUser) {
        const inviteRes = await fetch(`/api/invites/validate/${inviteCode}`);
        const inviteData = await inviteRes.json();
        if (!inviteData.valid) {
          toast({
            title: t("common.error"),
            description: t("auth.invalidInviteCode"),
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch("/api/auth/signup-step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, inviteCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: t("common.success"),
          description: t("auth.accountCreatedRedirecting"),
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        toast({
          title: t("auth.errorCreatingAccount"),
          description: data.message || t("auth.tryAgain"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro no signup:", error);
      toast({
        title: t("auth.connectionError"),
        description: t("auth.connectionErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-green-600 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <Car className="w-7 h-7 text-purple-600" />
          </div>
          <span className="text-3xl font-bold text-white">VeloStock</span>
        </div>

        <Card className="border-0 shadow-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">{t("auth.createAccountTitle")}</CardTitle>
              <CardDescription>
                {t("auth.fillDataToStart")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("users.firstName")}</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="João"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("users.lastName")}</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Silva"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
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

                {!isFirstUser && isFirstUser !== null && (
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">{t("auth.inviteCode")}</Label>
                    <Input
                      id="inviteCode"
                      type="password"
                      placeholder={t("auth.inviteCodePlaceholder")}
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}

                {isFirstUser && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md border border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-300">
                    {t("auth.firstAdminNote")}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? t("auth.creatingAccount") : t("auth.createAccountTitle")}
                </Button>
              </form>

              <div className="text-center text-sm pt-4 space-y-2">
                <div>
                  <span className="text-muted-foreground">{t("auth.alreadyHaveAccount")} </span>
                  <button
                    className="p-0 h-auto font-semibold text-purple-600 hover:text-purple-700 underline"
                    onClick={() => (window.location.href = "/login")}
                  >
                    {t("auth.login")}
                  </button>
                </div>
                <div>
                  <button
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => (window.location.href = "/")}
                  >
                    ← {t("auth.backToHome")}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
