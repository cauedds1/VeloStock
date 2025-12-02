import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BetaBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isClosed = localStorage.getItem("beta-banner-closed");
    setIsVisible(!isClosed);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("beta-banner-closed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 rounded-lg p-4 max-w-xs shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 flex-1">
          Sistema em Beta: Bugs podem acontecer. Reporte-os em seu perfil!
        </p>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleClose}
          className="h-5 w-5 p-0 flex-shrink-0 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          data-testid="button-close-beta-banner"
        >
          <X className="w-4 h-4 text-amber-900 dark:text-amber-100" />
        </Button>
      </div>
    </div>
  );
}
