import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Cost {
  id: string;
  category: string;
  description: string;
  value: number;
  date: string;
  paymentMethod?: string;
  paidBy?: string | null;
}

interface VehicleCostsProps {
  costs: Cost[];
  addCostTrigger?: React.ReactNode;
  onEditCost?: (cost: Cost) => void;
}

export function VehicleCosts({ costs, addCostTrigger, onEditCost }: VehicleCostsProps) {
  const total = costs.reduce((sum, cost) => sum + cost.value, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const categoryColors: Record<string, string> = {
    "Mecânica": "text-amber-500",
    "Estética": "text-cyan-500",
    "Documentação": "text-purple-500",
    "Abastecimento": "text-green-500",
    "Lavagem": "text-blue-500",
    "Peças": "text-orange-500",
    "Mão de Obra": "text-red-500",
    "Acessórios": "text-pink-500",
  };

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground">Custos de Preparação</h3>
        {addCostTrigger}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              {onEditCost && <TableHead className="w-[80px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.map((cost) => (
              <TableRow key={cost.id}>
                <TableCell>
                  <span className={`font-medium ${categoryColors[cost.category] || ""}`}>
                    {cost.category}
                  </span>
                </TableCell>
                <TableCell>{cost.description}</TableCell>
                <TableCell className="text-muted-foreground">{cost.date}</TableCell>
                <TableCell className="text-muted-foreground">
                  {cost.paymentMethod === "Outra Pessoa" && cost.paidBy 
                    ? `${cost.paymentMethod} (${cost.paidBy})`
                    : cost.paymentMethod || "Cartão Loja"}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(cost.value)}
                </TableCell>
                {onEditCost && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditCost(cost)}
                      title="Editar custo"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 flex justify-end border-t border-border pt-4">
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">Custo Total de Preparação</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
            {formatCurrency(total)}
          </p>
        </div>
      </div>
    </Card>
  );
}
