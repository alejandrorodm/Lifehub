import { describe, expect, it } from "vitest";
import { describeGoogleFailure } from "./googleErrors";

// Cuerpo real que devuelve Google cuando la API no está habilitada en el proyecto.
const serviceDisabled = {
  error: {
    code: 403,
    message: "Google Calendar API has not been used in project 500925819073 before or it is disabled.",
    errors: [{ reason: "accessNotConfigured", domain: "usageLimits" }],
    status: "PERMISSION_DENIED",
    details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "SERVICE_DISABLED" }],
  },
};

describe("describeGoogleFailure", () => {
  it("explica que la API no está habilitada en el proyecto", () => {
    expect(describeGoogleFailure(403, serviceDisabled)).toMatch(/no está habilitada en el proyecto/);
  });

  it("pide volver a conectar cuando Google ha revocado el acceso", () => {
    expect(describeGoogleFailure(401, { error: "invalid_grant" })).toMatch(/vuelve a conectarlo/);
  });

  it("avisa de los límites de peticiones", () => {
    const body = { error: { errors: [{ reason: "rateLimitExceeded" }] } };
    expect(describeGoogleFailure(403, body)).toMatch(/limitando las peticiones/);
    expect(describeGoogleFailure(429, {})).toMatch(/limitando las peticiones/);
  });

  it("un 403 sin motivo conocido indica revisar los permisos", () => {
    expect(describeGoogleFailure(403, { error: { errors: [{ reason: "forbidden" }] } })).toMatch(/permisos/);
  });

  it("un fallo del servidor de Google se describe como no disponible", () => {
    expect(describeGoogleFailure(503, {})).toMatch(/no está disponible/);
  });

  it("cualquier otro caso muestra el código HTTP", () => {
    expect(describeGoogleFailure(418, {})).toBe("Google Calendar respondió con un error (código 418).");
  });
});

describe("permiso de Google Tasks", () => {
  it("un permiso insuficiente pide volver a conectar para aceptar Google Tasks", () => {
    const body = { error: { errors: [{ reason: "insufficientPermissions" }] } };
    expect(describeGoogleFailure(403, body)).toMatch(/Google Tasks/);
  });
});
