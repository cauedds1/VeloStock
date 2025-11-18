import { createContext, useContext, useEffect, ReactNode } from "react";
import { useCurrentCompany } from "../hooks/use-company";

interface ThemeContextType {
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  logoUrl?: string | null;
}

const ThemeContext = createContext<ThemeContextType>({
  primaryColor: "#8B5CF6",
  secondaryColor: "#10B981",
  companyName: "VeloStock",
  logoUrl: null,
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { company } = useCurrentCompany();

  const themeValue: ThemeContextType = {
    primaryColor: company?.corPrimaria || "#8B5CF6",
    secondaryColor: company?.corSecundaria || "#10B981",
    companyName: company?.nomeFantasia || "VeloStock",
    logoUrl: company?.logoUrl,
  };

  useEffect(() => {
    if (company) {
      document.documentElement.style.setProperty("--primary", company.corPrimaria);
      document.documentElement.style.setProperty("--secondary", company.corSecundaria);
      
      const primaryRGB = hexToRGB(company.corPrimaria);
      if (primaryRGB) {
        document.documentElement.style.setProperty("--primary-rgb", primaryRGB);
      }
    }
  }, [company]);

  return <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>;
}

function hexToRGB(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : null;
}
