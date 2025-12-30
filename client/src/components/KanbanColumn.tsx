import { memo } from "react";
import { Badge } from "@/components/ui/badge";

interface KanbanColumnProps {
  title: string;
  count: number;
  children: React.ReactNode;
  color?: string;
  statusKey?: string;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Entrada": { 
    bg: "bg-blue-50 dark:bg-blue-950/30", 
    text: "text-blue-700 dark:text-blue-300", 
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500"
  },
  "Em Reparos": { 
    bg: "bg-orange-50 dark:bg-orange-950/30", 
    text: "text-orange-700 dark:text-orange-300", 
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500"
  },
  "Em Higienização": { 
    bg: "bg-purple-50 dark:bg-purple-950/30", 
    text: "text-purple-700 dark:text-purple-300", 
    border: "border-purple-200 dark:border-purple-800",
    dot: "bg-purple-500"
  },
  "Pronto para Venda": { 
    bg: "bg-emerald-50 dark:bg-emerald-950/30", 
    text: "text-emerald-700 dark:text-emerald-300", 
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500"
  },
};

export const KanbanColumn = memo(function KanbanColumn({ 
  title, 
  count, 
  children, 
  statusKey,
  onDragOver,
  onDrop
}: KanbanColumnProps) {
  const colorKey = statusKey || title;
  const colors = STATUS_COLORS[colorKey] || STATUS_COLORS["Entrada"];
  
  return (
    <div 
      className="flex h-full w-72 flex-shrink-0 flex-col rounded-xl bg-muted/30 dark:bg-muted/10 border border-border/50"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${colors.bg} border-b ${colors.border}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
          <h3 className={`font-semibold text-sm ${colors.text}`}>{title}</h3>
        </div>
        <Badge 
          variant="secondary" 
          className={`${colors.bg} ${colors.text} border ${colors.border} font-bold text-xs px-2 py-0.5`}
          data-testid={`badge-count-${statusKey || title}`}
        >
          {count}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
});
