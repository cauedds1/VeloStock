import { createContext, useContext, useEffect, ReactNode } from "react";
import { useCurrentCompany } from "../hooks/use-company";

interface CompanyThemeContextType {
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  logoUrl?: string | null;
}

const CompanyThemeContext = createContext<CompanyThemeContextType>({
  primaryColor: "#8B5CF6",
  secondaryColor: "#10B981",
  companyName: "VeloStock",
  logoUrl: null,
});

export function useCompanyTheme() {
  return useContext(CompanyThemeContext);
}

interface CompanyThemeProviderProps {
  children: ReactNode;
}

export function CompanyThemeProvider({ children }: CompanyThemeProviderProps) {
  const { company } = useCurrentCompany();

  const themeValue: CompanyThemeContextType = {
    primaryColor: company?.corPrimaria || "#8B5CF6",
    secondaryColor: company?.corSecundaria || "#10B981",
    companyName: company?.nomeFantasia || "VeloStock",
    logoUrl: company?.logoUrl,
  };

  useEffect(() => {
    if (company) {
      const primaryHSL = hexToHSL(company.corPrimaria);
      const secondaryHSL = hexToHSL(company.corSecundaria);
      
      if (primaryHSL) {
        document.documentElement.style.setProperty("--primary", primaryHSL);
        document.documentElement.style.setProperty("--sidebar-primary", primaryHSL);
        document.documentElement.style.setProperty("--ring", primaryHSL);
        document.documentElement.style.setProperty("--sidebar-ring", primaryHSL);
      }
      
      if (secondaryHSL) {
        document.documentElement.style.setProperty("--secondary", secondaryHSL);
      }
    } else {
      const defaultPrimaryHSL = hexToHSL("#8B5CF6");
      const defaultSecondaryHSL = hexToHSL("#10B981");
      
      if (defaultPrimaryHSL) {
        document.documentElement.style.setProperty("--primary", defaultPrimaryHSL);
        document.documentElement.style.setProperty("--sidebar-primary", defaultPrimaryHSL);
        document.documentElement.style.setProperty("--ring", defaultPrimaryHSL);
        document.documentElement.style.setProperty("--sidebar-ring", defaultPrimaryHSL);
      }
      
      if (defaultSecondaryHSL) {
        document.documentElement.style.setProperty("--secondary", defaultSecondaryHSL);
      }
    }
  }, [company]);

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
