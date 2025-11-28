import { memo } from "react";
import { Badge } from "@/components/ui/badge";

interface KanbanColumnProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

function KanbanColumnComponent({ title, count, children }: KanbanColumnProps) {
  return (
    <div className="flex h-full w-80 flex-shrink-0 flex-col rounded-lg bg-card border border-card-border">
      <div className="flex items-center justify-between border-b border-card-border p-4">
        <h3 className="font-semibold text-card-foreground">{title}</h3>
        <Badge variant="secondary" className="font-bold">
          {count}
        </Badge>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  );
}

export const KanbanColumn = memo(KanbanColumnComponent);
