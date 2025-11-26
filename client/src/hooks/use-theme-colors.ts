import { useCompanyTheme } from "@/components/CompanyThemeProvider";

export function useThemeColors() {
  const { primaryColor } = useCompanyTheme();
  
  // Mapeia cores tailwind para cores customizadas baseadas na primária
  const colorMap = {
    // Cores de sucesso (verde)
    green: {
      50: "hsl(120 70% 95%)",
      100: "hsl(120 70% 90%)",
      500: "hsl(120 70% 45%)",
      600: "hsl(120 70% 38%)",
      900: "hsl(120 70% 20%)",
    },
    // Cores de aviso (laranja/amarelo)
    orange: {
      50: "hsl(45 85% 95%)",
      100: "hsl(45 85% 85%)",
      500: "hsl(45 85% 50%)",
      600: "hsl(45 85% 42%)",
      900: "hsl(45 85% 25%)",
    },
    // Cores de erro (usa primária com ajuste)
    red: {
      50: "hsl(0 84% 95%)",
      100: "hsl(0 84% 90%)",
      500: `hsl(${extractHue(primaryColor)} 84% 50%)`,
      600: `hsl(${extractHue(primaryColor)} 84% 42%)`,
      900: `hsl(${extractHue(primaryColor)} 84% 25%)`,
    },
    // Cores de info (azul)
    blue: {
      50: "hsl(200 80% 95%)",
      100: "hsl(200 80% 90%)",
      500: "hsl(200 80% 50%)",
      600: "hsl(200 80% 42%)",
      900: "hsl(200 80% 25%)",
    },
    // Cores de primária
    purple: {
      50: `hsl(${extractHue(primaryColor)} ${extractSat(primaryColor)}% 95%)`,
      100: `hsl(${extractHue(primaryColor)} ${extractSat(primaryColor)}% 85%)`,
      500: primaryColor,
      600: `hsl(${extractHue(primaryColor)} ${extractSat(primaryColor)}% ${Math.max(extractLight(primaryColor) - 8, 30)}%)`,
      900: `hsl(${extractHue(primaryColor)} ${extractSat(primaryColor)}% ${Math.max(extractLight(primaryColor) - 25, 15)}%)`,
    },
    // Cores de status
    yellow: {
      50: "hsl(45 85% 95%)",
      100: "hsl(45 85% 85%)",
      500: "hsl(45 85% 50%)",
      600: "hsl(45 85% 42%)",
      900: "hsl(45 85% 25%)",
    },
    cyan: {
      50: "hsl(180 70% 95%)",
      100: "hsl(180 70% 85%)",
      500: "hsl(180 70% 50%)",
      600: "hsl(180 70% 42%)",
      900: "hsl(180 70% 25%)",
    },
  };

  return colorMap;
}

// Helpers para extrair valores HSL
function extractHue(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;

  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return Math.round(h * 360);
}

function extractSat(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  }

  return Math.round(s * 100);
}

function extractLight(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 50;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  return Math.round(l * 100);
}
