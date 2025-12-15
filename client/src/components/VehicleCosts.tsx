import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";

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
  onDeleteCost?: (costId: string) => void;
}

export function VehicleCosts({ costs, addCostTrigger, onEditCost, onDeleteCost }: VehicleCostsProps) {
  const { t } = useI18n();
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
        <h3 className="text-lg font-semibold text-card-foreground">{t("vehicleCosts.preparationCosts")}</h3>
        {addCostTrigger}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.category")}</TableHead>
              <TableHead>{t("common.description")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead>{t("vehicleCosts.payment")}</TableHead>
              <TableHead className="text-right">{t("common.value")}</TableHead>
              {(onEditCost || onDeleteCost) && <TableHead className="w-[120px]">{t("common.actions")}</TableHead>}
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
                    ? `${t("vehicleCosts.otherPerson")} (${cost.paidBy})`
                    : cost.paymentMethod || t("vehicleCosts.storeCard")}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(cost.value)}
                </TableCell>
                {(onEditCost || onDeleteCost) && (
                  <TableCell>
                    <div className="flex gap-1">
                      {onEditCost && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditCost(cost)}
                          title={t("vehicleCosts.editCost")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {onDeleteCost && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteCost(cost.id)}
                          title={t("vehicleCosts.deleteCost")}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 flex justify-end border-t border-border pt-4">
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">{t("vehicleCosts.totalPreparationCost")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
            {formatCurrency(total)}
          </p>
        </div>
      </div>
    </Card>
  );
}
