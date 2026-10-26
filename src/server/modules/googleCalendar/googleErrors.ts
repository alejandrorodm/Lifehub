/**
 * Traduce una respuesta de error de la API de Google Calendar a un texto que
 * el usuario pueda entender y resolver. Los mensajes técnicos de Google se
 * quedan en el registro del servidor; aquí solo va la causa y lo que hacer.
 */
export function describeGoogleFailure(status: number, body: unknown): string {
  const text = JSON.stringify(body ?? {});
  const reasons = extractReasons(body);

  if (text.includes("accessNotConfigured") || text.includes("SERVICE_DISABLED") || text.includes("has not been used")) {
    const api = text.includes("Tasks API") ? "Google Tasks API" : "Google Calendar API";
    return `La ${api} no está habilitada en el proyecto de Google Cloud de LifeHub. Habilítala en Google Cloud Console y vuelve a intentarlo.`;
  }
  if (reasons.includes("insufficientPermissions") || text.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT")) {
    return "Falta el permiso de Google Tasks. Desconecta Google Calendar y vuelve a conectarlo para aceptarlo.";
  }
  if (status === 401 || text.includes("invalid_grant")) {
    return "Google ha revocado el acceso. Desconecta Google Calendar y vuelve a conectarlo.";
  }
  if (status === 429 || reasons.some((r) => r === "rateLimitExceeded" || r === "userRateLimitExceeded")) {
    return "Google está limitando las peticiones. Inténtalo de nuevo más tarde.";
  }
  if (status === 403) {
    return "Google ha denegado el acceso a tu calendario. Revisa los permisos de LifeHub en tu cuenta de Google.";
  }
  if (status >= 500) {
    return "Google Calendar no está disponible ahora mismo. Inténtalo más tarde.";
  }
  return `Google Calendar respondió con un error (código ${status}).`;
}

function extractReasons(body: unknown): string[] {
  const errors = (body as { error?: { errors?: { reason?: string }[] } } | null)?.error?.errors ?? [];
  return errors.map((e) => e.reason ?? "").filter(Boolean);
}
