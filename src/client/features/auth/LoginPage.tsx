import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Input } from "@client/components/ui/Input";
import { Button } from "@client/components/ui/Button";
import { ApiError } from "@client/lib/api";
import { useLogin } from "./useAuth";

export function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ name, password });
  };

  const errorMessage = login.error instanceof ApiError ? login.error.message : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-bg-elevated p-6"
      >
        <div className="flex flex-col items-center gap-2 pb-2 text-center">
          <Lock className="size-6 text-text-muted" aria-hidden />
          <h1 className="text-lg font-semibold text-text">LifeHub</h1>
          <p className="text-sm text-text-muted">Inicia sesión para continuar.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-name" className="text-sm font-medium text-text">
            Nombre
          </label>
          <Input
            id="login-name"
            autoFocus
            autoComplete="username"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="text-sm font-medium text-text">
            Contraseña
          </label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={login.isPending || !name || !password}>
          {login.isPending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
