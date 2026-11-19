import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@client/components/ui/Button";
import { Input, Label } from "@client/components/ui/Input";
import { Skeleton } from "@client/components/ui/Skeleton";
import { useToast } from "@client/components/ui/Toast";
import type { AgentRunnerTokenCreatedDto } from "@shared/schemas/agents";
import { useCreateRunnerToken, useRevokeRunnerToken, useRunnerTokens } from "./useAgents";

const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });

/** Ajustes → Agentes de Claude: el token con el que el ejecutor de tu PC habla con LifeHub. */
export function AgentRunnerSection() {
  const { data: tokens, isPending, isError, refetch } = useRunnerTokens();
  const create = useCreateRunnerToken();
  const revoke = useRevokeRunnerToken();
  const { show } = useToast();
  const [name, setName] = useState("Mi PC");
  const [created, setCreated] = useState<AgentRunnerTokenCreatedDto | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const envLine = created ? `LIFEHUB_RUNNER_TOKEN=${created.token}` : "";

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      show({ tone: "success", title: "Copiado" });
    } catch {
      show({ tone: "error", title: "No se pudo copiar. Selecciónalo y cópialo a mano." });
    }
  };

  return (
    <div className="space-y-4 rounded-md border border-border bg-bg-elevated px-4 py-3">
      <div>
        <p className="text-sm font-medium">Agentes de Claude</p>
        <p className="text-sm text-text-muted">
          El ejecutor corre en tu PC y le pide trabajo a LifeHub con este token. LifeHub nunca se conecta a tu
          PC. Los pasos de instalación están en <code>deploy/agent-runner.md</code>.
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
      {tokens && tokens.length === 0 && (
        <p className="text-sm text-text-muted">Todavía no tienes ningún ejecutor.</p>
      )}
      {tokens && tokens.length > 0 && (
        <ul className="space-y-2">
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {token.name} {token.revoked && <span className="text-text-subtle">(revocado)</span>}
                </p>
                <p className="text-xs text-text-subtle">
                  Creado {ago(token.createdAt)}
                  {token.lastUsedAt
                    ? ` · se conectó ${ago(token.lastUsedAt)}`
                    : " · no se ha conectado todavía"}
                </p>
              </div>
              {!token.revoked &&
                (confirmingId === token.id ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(token.id, { onSuccess: () => setConfirmingId(null) })}
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

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(name, { onSuccess: (token) => setCreated(token) });
        }}
      >
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="runner-token-name">Nombre del ejecutor</Label>
          <Input
            id="runner-token-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </div>
        <Button type="submit" disabled={create.isPending || name.trim() === ""}>
          Crear token
        </Button>
      </form>

      {created && (
        <div className="space-y-3 rounded-md border border-accent/30 bg-accent-soft p-3">
          <p className="text-sm font-medium">Copia este token ahora: no se volverá a mostrar.</p>
          <p className="text-sm text-text-muted">
            Guárdalo en tu PC en <code>~/.config/lifehub-runner/env</code>:
          </p>
          <pre className="overflow-x-auto rounded bg-bg-elevated p-3 font-mono text-xs">{envLine}</pre>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => copy(envLine)}>
              Copiar
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
