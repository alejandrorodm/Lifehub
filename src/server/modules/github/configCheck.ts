/**
 * Avisa de un client id de GitHub con formato sospechoso. Un id de Google o un
 * id copiado al campo equivocado hace que GitHub rechace el inicio de sesión
 * sin explicar por qué: mejor avisar al arrancar que descubrirlo en el móvil.
 */
export function githubClientIdWarning(clientId: string | undefined): string | null {
  if (!clientId) return null;
  if (clientId.endsWith(".apps.googleusercontent.com")) {
    return "GITHUB_CLIENT_ID parece un id de Google (termina en apps.googleusercontent.com): GitHub no lo aceptará.";
  }
  if (!/^(Ov|Iv)[\w.]+$/.test(clientId)) {
    return "GITHUB_CLIENT_ID no tiene el formato de un Client ID de GitHub (empieza por Ov o Iv).";
  }
  return null;
}
