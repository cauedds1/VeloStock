import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface UndoNotificationProps {
  vehicleModel: string;
  fromStatus: string;
  toStatus: string;
  onUndo: () => void;
  onClose: () => void;
}

export function UndoNotification({
  vehicleModel,
  fromStatus,
  toStatus,
  onUndo,
  onClose,
}: UndoNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(8);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {vehicleModel}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Alterada: <span className="font-medium">{fromStatus}</span> → <span className="font-medium">{toStatus}</span>
            </p>
            <div className="mt-2 w-full bg-muted rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(timeLeft / 8) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={onUndo}
              className="text-xs"
              data-testid="button-undo-change"
            >
              Desfazer
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8"
              data-testid="button-close-undo"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
