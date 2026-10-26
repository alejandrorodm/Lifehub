/** Correo de contacto que aparece en la política. Rellenar antes de publicar. */
const CONTACT_EMAIL = "";
const LAST_UPDATED = "26 de octubre de 2026";

/**
 * Política de privacidad pública de LifeHub. Es accesible sin iniciar sesión
 * (la exige Google para registrar la app de OAuth), por eso vive fuera de AppShell.
 */
export function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10 text-text">
      <header className="space-y-2">
        <h1 className="text-2xl">Política de privacidad de LifeHub</h1>
        <p className="text-sm text-text-muted">Última actualización: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg">Qué es LifeHub</h2>
        <p className="text-sm text-text-muted">
          LifeHub es una aplicación personal para gestionar tareas, calendario, notas, hábitos y finanzas. Se aloja en un
          servidor privado y no tiene un servicio de terceros que gestione tus datos.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg">Datos que se guardan</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-muted">
          <li>Tu cuenta: nombre y contraseña (guardada como hash, no en texto plano).</li>
          <li>Lo que introduces: tareas, eventos, notas, hábitos, proyectos, finanzas y ajustes.</li>
          <li>Si conectas Google Calendar: los tokens de acceso y actualización de Google, y los eventos y tareas que decides sincronizar.</li>
          <li>Una cookie de sesión, necesaria para mantenerte dentro de la app. No usamos cookies de seguimiento ni publicidad.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg">Uso de los datos de Google</h2>
        <p className="text-sm text-text-muted">
          LifeHub usa los permisos de Google Calendar solo para leer y escribir los eventos y las tareas con fecha que tú
          decides sincronizar. No vendemos esos datos, no los usamos para publicidad y no los compartimos con terceros.
          El uso de la información recibida de las APIs de Google cumple la{" "}
          <a
            className="underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
          >
            Política de datos de usuario de los servicios de API de Google
          </a>
          , incluidos sus requisitos de uso limitado.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg">Sin telemetría</h2>
        <p className="text-sm text-text-muted">
          LifeHub no envía analíticas, métricas ni datos de uso a ningún servicio externo.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg">Tus derechos y cómo borrar tus datos</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-muted">
          <li>Exportar todos tus datos en JSON desde Ajustes → Datos → Exportar JSON.</li>
          <li>Desconectar Google Calendar desde Ajustes → Google Calendar. Así se revoca el acceso y se borran los enlaces con Google.</li>
          <li>Borrar todo tu contenido desde Ajustes → Datos → Borrar todos los datos.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg">Contacto</h2>
        <p className="text-sm text-text-muted">
          {CONTACT_EMAIL ? (
            <>
              Para cualquier consulta sobre esta política escribe a{" "}
              <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            "Para cualquier consulta sobre esta política, contacta con el responsable de esta instancia de LifeHub."
          )}
        </p>
      </section>
    </main>
  );
}
