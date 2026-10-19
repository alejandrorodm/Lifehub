import { resolveDataDir, resolveDbPath, resolveBackupsDir } from "./lib/paths";

export const config = {
  host: process.env.LIFEHUB_HOST ?? "127.0.0.1",
  port: Number(process.env.LIFEHUB_PORT ?? 3131),
  dataDir: resolveDataDir(),
  dbPath: resolveDbPath(),
  backupsDir: resolveBackupsDir(),
  isProduction: process.env.NODE_ENV === "production",
  // Número de copias de seguridad automáticas a conservar (rotación).
  backupRetention: 14,
  // Origen público real (p. ej. "https://lifehub.midominio.com") cuando el
  // servidor está detrás de un reverse proxy (Caddy/nginx) y escucha en
  // 127.0.0.1: sin esto, la redirección tras el login de Google usaría el
  // host/puerto internos, inalcanzables desde el navegador del usuario. Ver
  // `deploy/README.md`. Sin configurar, no cambia nada (fallback a host:puerto).
  publicUrl: process.env.LIFEHUB_PUBLIC_URL,
  // Fase 9, integraciones opt-in: sin estas variables, las rutas correspondientes
  // devuelven "no configurado" en vez de fallar; la app funciona igual sin ellas.
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  },
  webPush: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@localhost",
  },
  // Fase 10: resumen de actividad de GitHub por proyecto, solo lectura.
  github: {
    token: process.env.GITHUB_TOKEN,
  },
};

export function isGoogleConfigured(): boolean {
  return Boolean(config.google.clientId && config.google.clientSecret && config.google.redirectUri);
}

export function isWebPushConfigured(): boolean {
  return Boolean(config.webPush.vapidPublicKey && config.webPush.vapidPrivateKey);
}

export function isGithubConfigured(): boolean {
  return Boolean(config.github.token);
}
