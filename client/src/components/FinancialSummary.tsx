import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export function FinancialSummary() {
  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  const readyForSale = vehicles.filter(v => v.status === "Pronto para Venda");

  // Calcular valor total do estoque (apenas veículos com preço definido e prontos para venda)
  const inventoryValue = readyForSale.reduce((sum, v) => {
    return sum + Number(v.salePrice || 0);
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Valor do Estoque
          </CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(inventoryValue)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {readyForSale.length} {readyForSale.length === 1 ? 'veículo pronto' : 'veículos prontos'}
        </p>
      </CardContent>
    </Card>
  );
}
