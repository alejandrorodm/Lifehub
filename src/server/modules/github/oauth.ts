import { config } from "../../config";
import { AppError } from "../../lib/errors";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const API = "https://api.github.com";

/**
 * `repo` es necesario para leer repos privados. Una OAuth App de GitHub no
 * tiene un permiso solo de lectura para repos privados: la app solo lee, pero
 * el token podría escribir. Por eso se documenta en la política de privacidad.
 */
export const GITHUB_SCOPE = "repo read:user";

function requireConfig(): { clientId: string; clientSecret: string } {
  const { clientId, clientSecret } = config.github;
  if (!clientId || !clientSecret) {
    throw AppError.validation("GitHub no está configurado (faltan GITHUB_CLIENT_ID y GITHUB_CLIENT_SECRET en .env).");
  }
  return { clientId, clientSecret };
}

export function buildAuthorizationUrl(state: string, redirectUri: string): string {
  const { clientId } = requireConfig();
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: GITHUB_SCOPE, state });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string; scope: string }> {
  const { clientId, clientSecret } = requireConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });
  const json = (await response.json().catch(() => ({}))) as { access_token?: string; scope?: string; error_description?: string };
  if (!response.ok || !json.access_token) {
    throw AppError.validation(`GitHub no ha aceptado la conexión${json.error_description ? `: ${json.error_description}` : "."}`);
  }
  return { accessToken: json.access_token, scope: json.scope ?? "" };
}

export async function fetchLogin(accessToken: string): Promise<string> {
  const response = await fetch(`${API}/user`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json", "User-Agent": "LifeHub" },
  });
  const json = (await response.json().catch(() => ({}))) as { login?: string };
  if (!response.ok || !json.login) throw AppError.validation("No se pudo leer tu usuario de GitHub.");
  return json.login;
}
