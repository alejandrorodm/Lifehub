import { format, parseISO, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog } from "@client/components/ui/Dialog";
import { Button } from "@client/components/ui/Button";
import { useCarryOverOpenTasks } from "./useTaskPlan";

interface CloseDayDialogProps {
  date: string;
  openCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Cierre del día: pasa al día siguiente las tareas abiertas (las completadas no se tocan). */
export function CloseDayDialog({ date, openCount, open, onOpenChange }: CloseDayDialogProps) {
  const carryOver = useCarryOverOpenTasks();
  const nextDate = format(addDays(parseISO(date), 1), "yyyy-MM-dd");
  const nextLabel = format(parseISO(nextDate), "EEEE d 'de' MMMM", { locale: es });

  const confirm = () => {
    carryOver.mutate({ from: date, to: nextDate }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cerrar el día"
      description={
        openCount === 0
          ? "No quedan tareas abiertas en este día."
          : `Las tareas abiertas pasan al ${nextLabel} y pierden su hueco. Las completadas no se mueven.`
      }
    >
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={confirm} disabled={openCount === 0 || carryOver.isPending}>
          {openCount === 1 ? "Mover 1 tarea" : `Mover ${openCount} tareas`}
        </Button>
      </div>
    </Dialog>
  );
}
