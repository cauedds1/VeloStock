import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";
import { EditHistoryDialog } from "@/components/EditHistoryDialog";

interface TimelineEvent {
  id: string;
  status: string;
  date: string;
  user: string;
  notes?: string;
  toStatus?: string;
  toPhysicalLocation?: string | null;
  toPhysicalLocationDetail?: string | null;
  movedAt?: string;
}

interface VehicleTimelineProps {
  events: TimelineEvent[];
  vehicleId?: string;
}

export function VehicleTimeline({ events, vehicleId }: VehicleTimelineProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-6 text-lg font-semibold text-card-foreground">Histórico de Movimentação</h3>
      <div className="space-y-6">
        {events.map((event, index) => (
          <div key={event.id} className="relative flex gap-4">
            <div className="relative flex flex-col items-center">
              {index === 0 ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
              {index !== events.length - 1 && (
                <div className="mt-2 h-full w-0.5 bg-border" />
              )}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-card-foreground">{event.status}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.date} • {event.user}
                  </p>
                  {event.notes && (
                    <p className="mt-2 text-sm text-card-foreground">{event.notes}</p>
                  )}
                </div>
                {vehicleId && event.toStatus && event.movedAt && (
                  <EditHistoryDialog
                    vehicleId={vehicleId}
                    historyEntry={{
                      id: event.id,
                      toStatus: event.toStatus,
                      toPhysicalLocation: event.toPhysicalLocation,
                      toPhysicalLocationDetail: event.toPhysicalLocationDetail,
                      notes: event.notes,
                      movedAt: event.movedAt,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
