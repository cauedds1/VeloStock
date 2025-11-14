import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PendingTasksNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: observations = [] } = useQuery<any[]>({
    queryKey: ["/api/store-observations"],
  });

  useEffect(() => {
    if (hasShown || vehicles.length === 0) return;

    let pendingTasks = 0;
    let taskMessages: string[] = [];

    vehicles.forEach((vehicle: any) => {
      // Só notificar checklist para veículos "Pronto para Venda"
      if (vehicle.status !== "Pronto para Venda") {
        return;
      }

      if (vehicle.checklist) {
        const checklist = vehicle.checklist;
        const allItems = [
          ...(checklist.pneus || []),
          ...(checklist.interior || []),
          ...(checklist.somEletrica || []),
          ...(checklist.lataria || []),
          ...(checklist.documentacao || []),
        ];

        const totalItems = ["Pneus Dianteiros", "Pneus Traseiros", "Limpeza", "Estado dos bancos", "Tapetes", "Porta-objetos", "Funcionamento do som", "Vidros elétricos", "Ar-condicionado", "Travas elétricas", "Arranhões", "Amassados", "Pintura desbotada", "Documento do veículo", "IPVA", "Licenciamento"].length;
        const completed = allItems.length;
        
        if (completed < totalItems) {
          pendingTasks += totalItems - completed;
        }
      }
    });

    const pendingObservations = observations.filter((obs: any) => obs.status === "Pendente").length;
    
    if (pendingObservations > 0) {
      taskMessages.push(`${pendingObservations} ${pendingObservations === 1 ? 'observação pendente' : 'observações pendentes'}`);
    }

    if (pendingTasks > 0 || pendingObservations > 0) {
      setIsVisible(true);
      setHasShown(true);
      
      setTimeout(() => {
        setIsVisible(false);
      }, 8000);
    } else {
      setHasShown(true);
    }
  }, [vehicles, observations, hasShown]);

  const pendingCount = observations.filter((obs: any) => obs.status === "Pendente").length;
  let checklistPending = 0;
  
  vehicles.forEach((vehicle: any) => {
    // Só notificar checklist para veículos "Pronto para Venda"
    if (vehicle.status !== "Pronto para Venda") {
      return;
    }

    if (vehicle.checklist) {
      const checklist = vehicle.checklist;
      const allItems = [
        ...(checklist.pneus || []),
        ...(checklist.interior || []),
        ...(checklist.somEletrica || []),
        ...(checklist.lataria || []),
        ...(checklist.documentacao || []),
      ];
      const totalItems = 16;
      checklistPending += totalItems - allItems.length;
    }
  });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, y: -20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed right-6 top-20 z-50 w-96"
        >
          <Card className="border-l-4 border-l-yellow-500 bg-card shadow-2xl">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {checklistPending > 0 || pendingCount > 0 ? (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground">
                      {checklistPending > 0 || pendingCount > 0 ? 'Tarefas Pendentes' : 'Tudo em Dia!'}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {checklistPending > 0 && (
                        <p>• {checklistPending} {checklistPending === 1 ? 'item de checklist pendente' : 'itens de checklist pendentes'}</p>
                      )}
                      {pendingCount > 0 && (
                        <p>• {pendingCount} {pendingCount === 1 ? 'observação geral pendente' : 'observações gerais pendentes'}</p>
                      )}
                      {checklistPending === 0 && pendingCount === 0 && (
                        <p>Não há tarefas pendentes no momento</p>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-2 -mt-1"
                  onClick={() => setIsVisible(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
