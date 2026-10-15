import { useEffect, useRef, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Link as LinkIcon,
} from "lucide-react";
import { marked } from "marked";
import TurndownService from "turndown";
import { cn } from "@client/lib/utils";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
turndown.addRule("taskListItems", {
  filter: (node) => node.nodeName === "LI" && (node as HTMLElement).getAttribute("data-type") === "taskItem",
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    return `- [${checked ? "x" : " "}] ${content.trim()}\n`;
  },
});

export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return "";
  return marked.parse(markdown, { async: false, gfm: true, breaks: false });
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim();
}

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}

function ToolbarButton({ active, onClick, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-subtle hover:text-text",
        active && "bg-accent-soft text-accent",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Negrita"
      >
        <Bold className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Cursiva"
      >
        <Italic className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Encabezado"
      >
        <Heading2 className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Lista"
      >
        <List className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Lista numerada"
      >
        <ListOrdered className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        label="Checklist"
      >
        <ListTodo className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        label="Cita"
      >
        <Quote className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        label="Código"
      >
        <Code className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("link")}
        label="Enlace"
        onClick={() => {
          const current = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("URL del enlace", current ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }
        }}
      >
        <LinkIcon className="size-4" aria-hidden />
      </ToolbarButton>
    </div>
  );
}

interface RichTextEditorProps {
  markdown: string;
  onChange: (markdown: string, plainText: string) => void;
  placeholder?: string;
}

/**
 * Editor de texto enriquecido (TipTap) que persiste en Markdown: convierte
 * HTML↔Markdown con `marked`/`turndown` porque el contenido en Markdown es
 * la decisión de arquitectura de la fase 1 (portable, exportable, legible
 * por un LLM). Formato básico, según PLAN.md: títulos, listas, checklist,
 * negrita/cursiva, enlaces, código, citas.
 */
export function RichTextEditor({ markdown, onChange, placeholder }: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Escribe algo…" }),
    ],
    content: markdownToHtml(markdown),
    onUpdate: ({ editor }) => {
      onChangeRef.current(htmlToMarkdown(editor.getHTML()), editor.getText());
    },
    editorProps: {
      attributes: { class: "max-w-none px-3 py-2 focus:outline-none" },
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-md border border-border bg-bg-elevated">
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-h-[60vh] min-h-32 max-w-none overflow-y-auto [&_.is-editor-empty]:before:pointer-events-none [&_.is-editor-empty]:before:float-left [&_.is-editor-empty]:before:h-0 [&_.is-editor-empty]:before:text-text-subtle [&_.is-editor-empty]:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
