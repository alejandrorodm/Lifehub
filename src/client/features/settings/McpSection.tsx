import { useState } from "react";
import { Button } from "@client/components/ui/Button";
import { Input, Label } from "@client/components/ui/Input";
import { Skeleton } from "@client/components/ui/Skeleton";
import { useToast } from "@client/components/ui/Toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { McpTokenCreatedDto } from "@shared/schemas/mcp";
import { useCreateMcpToken, useMcpTokens, useRevokeMcpToken } from "./useMcp";

function configSnippet(token: string): string {
  const url = `${window.location.origin}/mcp`;
  return JSON.stringify(
    { mcpServers: { lifehub: { httpUrl: url, headers: { Authorization: `Bearer ${token}` } } } },
    null,
    2,
  );
}

/** Ajustes → Gemini: tokens personales para conectar un cliente de IA al servidor MCP de LifeHub. */
export function McpSection() {
  const { data: tokens, isPending, isError, refetch } = useMcpTokens();
  const create = useCreateMcpToken();
  const revoke = useRevokeMcpToken();
  const { show } = useToast();
  const [name, setName] = useState("Gemini CLI");
  const [created, setCreated] = useState<McpTokenCreatedDto | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate({ name }, { onSuccess: (token) => setCreated(token) });
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      show({ tone: "success", title: `${label} copiado` });
    } catch {
      show({ tone: "error", title: "No se pudo copiar. Selecciónalo y cópialo a mano." });
    }
  };

  return (
    <div className="space-y-4 rounded-md border border-border bg-bg-elevated px-4 py-3">
      <div>
        <p className="text-sm font-medium">Gemini y otros clientes de IA</p>
        <p className="text-sm text-text-muted">
          Crea un token para que un cliente de IA lea tus tareas, planes, eventos y notas. Solo lectura, y cada consulta queda registrada.
        </p>
      </div>

      {isPending && <Skeleton className="h-16" />}
      {isError && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-danger">No se pudieron cargar los tokens.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {tokens && tokens.length === 0 && <p className="text-sm text-text-muted">Todavía no tienes tokens.</p>}
      {tokens && tokens.length > 0 && (
        <ul className="space-y-2">
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {token.name} {token.revoked && <span className="text-text-subtle">(revocado)</span>}
                </p>
                <p className="text-xs text-text-subtle">
                  Creado {formatDistanceToNow(new Date(token.createdAt), { addSuffix: true, locale: es })}
                  {token.lastUsedAt
                    ? ` · último uso ${formatDistanceToNow(new Date(token.lastUsedAt), { addSuffix: true, locale: es })}`
                    : " · sin usar todavía"}
                </p>
              </div>
              {!token.revoked &&
                (confirmingId === token.id ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => revoke.mutate(token.id, { onSuccess: () => setConfirmingId(null) })}
                    disabled={revoke.isPending}
                  >
                    Confirmar revocación
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingId(token.id)}>
                    Revocar
                  </Button>
                ))}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="mcp-token-name">Nombre del token</Label>
          <Input id="mcp-token-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </div>
        <Button type="submit" variant="primary" disabled={create.isPending || name.trim() === ""}>
          Crear token
        </Button>
      </form>

      {created && (
        <div className="space-y-3 rounded-md border border-accent/30 bg-accent-soft p-3">
          <p className="text-sm font-medium">Copia este token ahora: no se volverá a mostrar.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-bg-elevated px-2 py-1 font-mono text-xs">{created.token}</code>
            <Button variant="secondary" size="sm" onClick={() => copy(created.token, "Token")}>
              Copiar token
            </Button>
          </div>
          <p className="text-sm text-text-muted">
            Para Gemini CLI, añade esto a <code>~/.gemini/settings.json</code>:
          </p>
          <pre className="overflow-x-auto rounded bg-bg-elevated p-3 font-mono text-xs">{configSnippet(created.token)}</pre>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => copy(configSnippet(created.token), "Configuración")}>
              Copiar configuración
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCreated(null)}>
              Ocultar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
