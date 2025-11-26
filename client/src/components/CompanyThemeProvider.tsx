import { createContext, useContext, useEffect, ReactNode } from "react";
import { useCurrentCompany } from "../hooks/use-company";

interface CompanyThemeContextType {
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  logoUrl?: string | null;
  isCustomTheme: boolean;
}

// Cores padrão do VeloStock (violeta e verde)
const DEFAULT_PRIMARY = "#8B5CF6";
const DEFAULT_SECONDARY = "#10B981";

const CompanyThemeContext = createContext<CompanyThemeContextType>({
  primaryColor: DEFAULT_PRIMARY,
  secondaryColor: DEFAULT_SECONDARY,
  companyName: "VeloStock",
  logoUrl: null,
  isCustomTheme: false,
});

export function useCompanyTheme() {
  return useContext(CompanyThemeContext);
}

interface CompanyThemeProviderProps {
  children: ReactNode;
}

export function CompanyThemeProvider({ children }: CompanyThemeProviderProps) {
  const { company } = useCurrentCompany();

  // Verificar se tem cores personalizadas
  const primaryColor = company?.corPrimaria || DEFAULT_PRIMARY;
  const secondaryColor = company?.corSecundaria || DEFAULT_SECONDARY;
  const isCustomTheme = 
    (company?.corPrimaria && company.corPrimaria !== DEFAULT_PRIMARY) ||
    (company?.corSecundaria && company.corSecundaria !== DEFAULT_SECONDARY) || false;

  const themeValue: CompanyThemeContextType = {
    primaryColor,
    secondaryColor,
    companyName: company?.nomeFantasia || "VeloStock",
    logoUrl: company?.logoUrl,
    isCustomTheme,
  };

  useEffect(() => {
    const applyTheme = (primary: string, secondary: string) => {
      const primaryHSL = hexToHSL(primary);
      const secondaryHSL = hexToHSL(secondary);
      
      // Cores derivadas da primária
      if (primaryHSL) {
        const { h, s, l } = parseHSL(primaryHSL);
        
        // Cor primária principal
        document.documentElement.style.setProperty("--primary", primaryHSL);
        document.documentElement.style.setProperty("--primary-foreground", "0 0% 98%");
        document.documentElement.style.setProperty("--sidebar-primary", primaryHSL);
        document.documentElement.style.setProperty("--sidebar-primary-foreground", "0 0% 98%");
        document.documentElement.style.setProperty("--ring", primaryHSL);
        document.documentElement.style.setProperty("--sidebar-ring", primaryHSL);
        
        // Accent baseado na primária
        document.documentElement.style.setProperty("--accent", primaryHSL);
        document.documentElement.style.setProperty("--accent-foreground", "0 0% 98%");
        
        // Destructive usa a mesma matiz da primária mas mantém vermelho-ish
        document.documentElement.style.setProperty("--destructive", `${h} ${Math.min(s + 10, 100)}% ${Math.max(l - 5, 35)}%`);
        document.documentElement.style.setProperty("--destructive-foreground", "0 0% 98%");
        
        // Chart colors - paleta derivada da primária
        document.documentElement.style.setProperty("--chart-1", `${h} ${s}% ${l}%`);
        document.documentElement.style.setProperty("--chart-2", `${(h + 40) % 360} ${Math.max(s - 10, 40)}% ${l}%`);
        document.documentElement.style.setProperty("--chart-3", `${(h + 80) % 360} ${Math.max(s - 15, 35)}% ${l}%`);
        document.documentElement.style.setProperty("--chart-4", `${(h + 120) % 360} ${Math.max(s - 20, 30)}% ${l}%`);
        document.documentElement.style.setProperty("--chart-5", `${(h + 160) % 360} ${Math.max(s - 25, 25)}% ${l}%`);
        
        // Colors para badges e tags
        document.documentElement.style.setProperty("--badge-color-1", `${h} ${s}% ${l}%`);
        document.documentElement.style.setProperty("--badge-color-2", `${(h + 30) % 360} ${Math.max(s - 5, 50)}% ${l}%`);
        document.documentElement.style.setProperty("--badge-color-3", `${(h + 60) % 360} ${Math.max(s - 10, 45)}% ${l}%`);
        document.documentElement.style.setProperty("--badge-color-4", `${(h + 90) % 360} ${Math.max(s - 15, 40)}% ${l}%`);
        document.documentElement.style.setProperty("--badge-color-5", `${(h + 120) % 360} ${Math.max(s - 20, 35)}% ${l}%`);
        document.documentElement.style.setProperty("--badge-color-6", `${(h + 150) % 360} ${Math.max(s - 25, 30)}% ${l}%`);
        
        // Status colors
        document.documentElement.style.setProperty("--status-success", `${(h + 120) % 360} ${Math.max(s - 10, 50)}% ${l}%`);
        document.documentElement.style.setProperty("--status-warning", `${(h + 45) % 360} ${Math.max(s - 5, 55)}% ${l + 5}%`);
        document.documentElement.style.setProperty("--status-error", `${h} ${s}% ${l}%`);
        document.documentElement.style.setProperty("--status-info", `${(h + 200) % 360} ${Math.max(s - 15, 40)}% ${l}%`);
      }
      
      // Cores secundárias para destaque
      if (secondaryHSL) {
        document.documentElement.style.setProperty("--secondary", secondaryHSL);
        document.documentElement.style.setProperty("--secondary-foreground", "0 0% 98%");
      }
    };

    applyTheme(primaryColor, secondaryColor);
  }, [company, primaryColor, secondaryColor]);

  return <CompanyThemeContext.Provider value={themeValue}>{children}</CompanyThemeContext.Provider>;
}

function hexToHSL(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

function parseHSL(hslString: string): { h: number; s: number; l: number } {
  const parts = hslString.split(' ');
  return {
    h: parseInt(parts[0]) || 0,
    s: parseInt(parts[1]) || 0,
    l: parseInt(parts[2]) || 50,
  };
}

// Exportar cores padrão para uso em outros componentes
export const DEFAULT_THEME_COLORS = {
  primary: DEFAULT_PRIMARY,
  secondary: DEFAULT_SECONDARY,
};
