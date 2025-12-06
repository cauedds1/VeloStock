import { useI18n, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const languages: { code: Language; name: string; flag: string }[] = [
  { code: "pt-BR", name: "Português", flag: "🇧🇷" },
  { code: "en-US", name: "English", flag: "🇺🇸" },
];

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  const currentLanguage = languages.find((l) => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-language-selector">
          <span className="text-lg">{currentLanguage?.flag || "🌐"}</span>
          <span className="sr-only">{t("settings.selectLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-2 cursor-pointer ${
              language === lang.code ? "bg-accent" : ""
            }`}
            data-testid={`button-language-${lang.code}`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSelectorInline() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{t("settings.language")}:</span>
      <div className="flex gap-1">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={language === lang.code ? "default" : "ghost"}
            size="sm"
            onClick={() => setLanguage(lang.code)}
            className="flex items-center gap-1 px-2"
            data-testid={`button-language-inline-${lang.code}`}
          >
            <span className="text-base">{lang.flag}</span>
            <span className="hidden sm:inline text-xs">{lang.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
