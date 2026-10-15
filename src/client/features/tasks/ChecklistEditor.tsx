import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { ChecklistItemDto } from "@shared/schemas/tasks";
import { Checkbox } from "@client/components/ui/Checkbox";
import { Input } from "@client/components/ui/Input";
import {
  useAddChecklistItem,
  useDeleteChecklistItem,
  useUpdateChecklistItem,
} from "@client/features/tasks/useTasks";

export function ChecklistEditor({ taskId, items }: { taskId: string; items: ChecklistItemDto[] }) {
  const [draft, setDraft] = useState("");
  const addItem = useAddChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    addItem.mutate({ taskId, text });
    setDraft("");
  };

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Checkbox
            checked={item.done}
            onCheckedChange={(done) => updateItem.mutate({ taskId, itemId: item.id, patch: { done } })}
            aria-label={item.done ? `Marcar "${item.text}" como pendiente` : `Completar "${item.text}"`}
          />
          <span
            className={
              item.done ? "flex-1 text-sm text-text-subtle line-through" : "flex-1 text-sm text-text"
            }
          >
            {item.text}
          </span>
          <button
            type="button"
            onClick={() => deleteItem.mutate({ taskId, itemId: item.id })}
            aria-label={`Eliminar "${item.text}"`}
            className="text-text-subtle hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Añadir elemento…"
      />
    </div>
  );
}
