import { useQuery } from "@tanstack/react-query";

export interface Alert {
  id: string;
  type: "error" | "warning" | "info";
  severity: "high" | "medium" | "low";
  title: string;
  message: string;
  vehicleId?: string;
  vehicleName?: string;
  actionUrl?: string;
  createdAt: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  totalAlerts: number;
  highSeverity: number;
  mediumSeverity: number;
}

export function useAlerts() {
  return useQuery<AlertsResponse>({
    queryKey: ["/api/alerts"],
    queryFn: async () => {
      const response = await fetch("/api/alerts");
      if (!response.ok) {
        throw new Error("Erro ao carregar alertas");
      }
      return response.json();
    },
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });
}
