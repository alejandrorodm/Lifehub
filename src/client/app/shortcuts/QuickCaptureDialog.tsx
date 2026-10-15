import { useState } from "react";
import { Dialog } from "@client/components/ui/Dialog";
import { Textarea } from "@client/components/ui/Input";
import { Button } from "@client/components/ui/Button";
import { useToast } from "@client/components/ui/Toast";
import { useCreateInboxItem } from "@client/features/inbox/useInbox";

interface QuickCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Captura en el mínimo número de pasos: escribir y pulsar Enter. */
export function QuickCaptureDialog({ open, onOpenChange }: QuickCaptureDialogProps) {
  const [text, setText] = useState("");
  const createInboxItem = useCreateInboxItem();
  const { show } = useToast();

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    createInboxItem.mutate(
      { text: trimmed, kindHint: "unsorted" },
      {
        onSuccess: () => {
          show({ tone: "success", title: "Capturado en el inbox" });
          setText("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setText("");
      }}
      title="Captura rápida"
      description="Se guarda en el inbox. Podrás decidir qué hacer con ello más tarde."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3"
      >
        <Textarea
          autoFocus
          rows={3}
          placeholder="¿Qué quieres recordar?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={!text.trim() || createInboxItem.isPending}>
            Capturar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
