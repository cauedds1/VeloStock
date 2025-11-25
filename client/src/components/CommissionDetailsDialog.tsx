import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, User, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CommissionPayment {
  id: string;
  vendedorId: string;
  veiculoId: string;
  valorComissao: number;
  valorBase: number;
  percentualAplicado: number;
  status: string;
  createdAt: string;
  vendedor?: {
    firstName: string;
    lastName: string;
  };
  veiculo?: {
    brand: string;
    model: string;
    year: number;
  };
}

interface CommissionDetailsDialogProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export function CommissionDetailsDialog({ open, setOpen }: CommissionDetailsDialogProps) {
  const [selectedVendedor, setSelectedVendedor] = useState<string>("all");

  const { data: commissions = [], isLoading, refetch } = useQuery<CommissionPayment[]>({
    queryKey: ["/api/commissions/payments"],
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });

  // Refetch quando o diálogo abre
  useEffect(() => {
    if (open && refetch) {
      refetch();
    }
  }, [open, refetch]);

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  // Filtrar apenas vendedores
  const vendedores = users.filter(u => u.role === "vendedor");

  // Filtrar comissões baseado no vendedor selecionado
  const filteredCommissions = selectedVendedor === "all" 
    ? commissions 
    : commissions.filter(c => c.vendedorId === selectedVendedor);

  // Agrupar por vendedor e calcular totais
  const commissionsByVendedor = filteredCommissions.reduce((acc, comm) => {
    const vendedorId = comm.vendedorId;
    if (!acc[vendedorId]) {
      acc[vendedorId] = {
        vendedorId,
        vendedorName: comm.vendedor 
          ? `${comm.vendedor.firstName} ${comm.vendedor.lastName}` 
          : "Vendedor Desconhecido",
        totalAPagar: 0,
        totalPagas: 0,
        total: 0,
        count: 0,
        commissions: [],
      };
    }
    
    const valor = Number(comm.valorComissao) || 0;
    
    if (comm.status === "A Pagar") {
      acc[vendedorId].totalAPagar += valor;
    } else if (comm.status === "Paga") {
      acc[vendedorId].totalPagas += valor;
    }
    
    acc[vendedorId].total += valor;
    acc[vendedorId].count += 1;
    acc[vendedorId].commissions.push(comm);
    
    return acc;
  }, {} as Record<string, any>);

  const vendedoresData = Object.values(commissionsByVendedor);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-600" />
            Comissões a Pagar - Detalhamento
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 pb-4 border-b">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
            <SelectTrigger className="w-64" data-testid="select-vendedor-filter">
              <SelectValue placeholder="Filtrar por vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Vendedores</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.firstName} {v.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : vendedoresData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhuma comissão encontrada</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-4">
            {vendedoresData.map((vendedorData) => (
              <Card key={vendedorData.vendedorId} className="p-4 transition-all duration-300 hover:shadow-lg border-muted/40" data-testid={`card-vendedor-${vendedorData.vendedorId}`}>
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{vendedorData.vendedorName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {vendedorData.count} {vendedorData.count === 1 ? 'comissão' : 'comissões'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">A Pagar:</span>
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        R$ {vendedorData.totalAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Pagas:</span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        R$ {vendedorData.totalPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Veículo</TableHead>
                      <TableHead className="text-right">Valor Venda</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendedorData.commissions.map((comm: CommissionPayment) => (
                      <TableRow key={comm.id} data-testid={`row-commission-${comm.id}`}>
                        <TableCell className="font-medium">
                          {comm.veiculo 
                            ? `${comm.veiculo.brand} ${comm.veiculo.model} ${comm.veiculo.year}`
                            : "Veículo Desconhecido"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          R$ {(Number(comm.valorBase) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          R$ {(Number(comm.valorComissao) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={comm.status === "Paga" ? "default" : "secondary"}
                            className={comm.status === "A Pagar" ? "bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                          >
                            {comm.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(comm.createdAt).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
