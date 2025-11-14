import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StickyNote, Plus, Edit2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { StoreObservation } from "@shared/schema";
import { StoreObservationDialog } from "@/components/StoreObservationDialog";

export default function Notes() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingObservation, setEditingObservation] = useState<StoreObservation | undefined>(undefined);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: observations = [], isLoading } = useQuery<StoreObservation[]>({
    queryKey: ["/api/store-observations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/store-observations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao deletar observação");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-observations"] });
      toast({
        title: "Observação deletada",
        description: "A observação foi removida com sucesso.",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível deletar a observação.",
      });
    },
  });

  const filteredObservations = observations.filter((obs) => {
    const matchesCategory = categoryFilter === "all" || obs.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || obs.status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const pendingCount = observations.filter(o => o.status === "Pendente").length;
  const resolvedCount = observations.filter(o => o.status === "Resolvido").length;

  // Derivar categorias únicas dos dados
  const uniqueCategories = Array.from(
    new Set(observations.map(o => o.category).filter(Boolean))
  ).sort();

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Observações Gerais</h1>
          <p className="mt-2 text-muted-foreground">
            Registre lembretes sobre a loja: estoque de materiais (papel higiênico, café, copos, pretinho, etc.) e manutenção da propriedade (portão, lâmpadas, etc.)
          </p>
          <div className="mt-4 flex gap-4">
            <Badge variant="outline" className="text-sm">
              <AlertCircle className="mr-1 h-3 w-3" />
              {pendingCount} Pendente{pendingCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="text-sm">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {resolvedCount} Resolvido{resolvedCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        <Button onClick={() => {
          setEditingObservation(undefined);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Observação
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {uniqueCategories.map((cat) => (
              <SelectItem key={cat} value={cat!}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Resolvido">Resolvido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filteredObservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <StickyNote className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">
            {observations.length === 0 
              ? "Nenhuma observação registrada ainda"
              : "Nenhuma observação encontrada com os filtros aplicados"}
          </p>
          {observations.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Clique em "Nova Observação" para adicionar lembretes sobre a loja
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredObservations.map((obs) => (
            <Card key={obs.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {obs.status === "Pendente" ? (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      <CardTitle className="text-lg">
                        {obs.category ? obs.category : "Sem categoria"}
                      </CardTitle>
                      <Badge 
                        variant={obs.status === "Pendente" ? "default" : "outline"}
                        className={obs.status === "Pendente" ? "bg-yellow-500 text-white" : ""}
                      >
                        {obs.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Criado em {format(new Date(obs.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                      {obs.resolvedAt && (
                        <> • Resolvido em {format(new Date(obs.resolvedAt), "dd/MM/yyyy 'às' HH:mm")}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingObservation(obs);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setDeleteId(obs.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {obs.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredObservations.length > 0 && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Mostrando {filteredObservations.length} de {observations.length} {observations.length === 1 ? 'observação' : 'observações'}
        </div>
      )}

      <StoreObservationDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingObservation(undefined);
        }}
        observation={editingObservation}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta observação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
