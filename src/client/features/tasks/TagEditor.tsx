import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@client/components/ui/Input";
import { cn } from "@client/lib/utils";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

/** Edición de etiquetas en línea: escribir y pulsar Enter o coma para añadir. */
export function TagEditor({ tags, onChange }: TagEditorProps) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const name = draft.trim();
    if (!name) return;
    if (!tags.some((t) => t.toLowerCase() === name.toLowerCase())) {
      onChange([...tags, name]);
    }
    setDraft("");
  };

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-bg-elevated p-2")}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-bg-subtle px-2 py-1 text-xs text-text"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            aria-label={`Quitar etiqueta ${tag}`}
            className="text-text-subtle hover:text-text"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? "Añadir etiqueta…" : ""}
        className="min-w-24 flex-1 border-none p-0.5 focus-visible:outline-none"
      />
    </div>
  );
}
