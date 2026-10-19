# APK de LifeHub (TWA)

Es una **Trusted Web Activity**: un envoltorio Android finísimo que abre
`https://lifehub.alejandrorodm.com` a pantalla completa, sin barra de
navegador. La "app" no lleva código propio del front — cada vez que la abres
carga la versión en vivo del sitio, así que **las actualizaciones normales
no necesitan tocar la APK en absoluto**: se ven solas, como en el navegador.
La APK solo hay que reconstruirla si cambia algo del propio envoltorio
(icono, nombre, color).

Generada y firmada en esta sesión: `app-release-signed.apk` (para instalar
directo en un móvil) y `app-release-bundle.aab` (para Google Play, si algún
día quieres). Ninguno de los dos se commitea (`.gitignore`).

## Lo más importante: el keystore de firma

Android exige que **todas** las versiones de una app estén firmadas con el
**mismo** certificado — si el siguiente build usa uno distinto, Android lo
trata como una app diferente y obliga a desinstalar la anterior.

- `android.keystore` (en este directorio, no commiteado) se generó **una
  sola vez**, con `keytool`, alias `lifehub`.
- Su contraseña vive en `~/.local/lifehub-tools/lifehub-keystore-password.txt`
  en esta máquina (permisos 600) — **haz una copia de `android.keystore` y de
  esa contraseña en un sitio seguro fuera de este repo** (gestor de
  contraseñas, USB cifrado…). Si se pierden, no hay forma de recuperarlos:
  tendrías que publicar la app como una nueva, distinta, y quien la tenga
  instalada perdería la actualización automática.
- Huella SHA-256 del certificado (para `assetlinks.json`, ya puesta en
  `src/server/lib/assetLinks.ts`):
  `F6:1E:92:49:C4:4D:88:AC:AE:67:50:CA:AF:A0:26:40:A5:CB:7D:69:65:BA:CC:5F:2E:2A:73:2D:BD:4D:46:C6`

## Cómo se construyó (y cómo reconstruir para una actualización de la APK)

`bubblewrap build` normal pide varias cosas por un asistente interactivo
(JDK, Android SDK, regenerar el proyecto, contraseñas del keystore) que
necesitan una terminal real — en un entorno sin terminal interactiva falla.
`generate-project.cjs` hace lo mismo que ese asistente pero sin preguntar
nada, usando directamente la librería `@bubblewrap/core`.

Necesitas:
- JDK 17+ y el Android SDK (`platform-tools`, `platforms;android-36`,
  `build-tools;36.1.0`) — aquí se instalaron sin root en
  `~/.local/lifehub-tools/` (JDK) y `~/.local/lifehub-tools/android-sdk/`
  (SDK), sin usar el paquete del sistema.
- `~/.bubblewrap/config.json` con `{"jdkPath": "...", "androidSdkPath": "..."}`
  apuntando a esas rutas (evita el asistente de primera vez).
- El sitio tiene que estar sirviendo `manifest.webmanifest` y los iconos en
  una URL alcanzable — en producción ya lo hace
  (`https://lifehub.alejandrorodm.com`); si no está desplegado, se puede
  levantar `npm run build && npm start` en local y apuntar
  `LOCAL_MANIFEST_URL` a esa instancia (`generate-project.cjs` ya separa las
  URLs usadas solo para generar de las que quedan guardadas en
  `twa-manifest.json`, que siempre son las de producción).

```bash
cd deploy/android
npm install --no-save @bubblewrap/cli   # si no está ya

# si necesitas generar contra un servidor local en vez del de producción:
#   LOCAL_MANIFEST_URL=http://127.0.0.1:PUERTO/manifest.webmanifest node generate-project.cjs
node generate-project.cjs

BUBBLEWRAP_KEYSTORE_PASSWORD=$(cat ~/.local/lifehub-tools/lifehub-keystore-password.txt) \
BUBBLEWRAP_KEY_PASSWORD=$(cat ~/.local/lifehub-tools/lifehub-keystore-password.txt) \
  ../../node_modules/.bin/bubblewrap build
```

Antes de una actualización de verdad, sube `appVersionCode` en
`twa-manifest.json` (y usa el mismo `android.keystore` de siempre).

## Instalar en el móvil

Pásate `app-release-signed.apk` (USB, Drive, lo que sea) e instálalo —
tendrás que permitir "orígenes desconocidos" la primera vez. Para
actualizarla más adelante, basta con instalar el nuevo `.apk` encima: al
estar firmado con el mismo keystore, Android lo actualiza sin pedir
desinstalar nada.

## Pantalla completa (Digital Asset Links)

Ya configurado: `src/server/lib/assetLinks.ts` tiene la huella real del
keystore, servida en `/.well-known/assetlinks.json`. Esto solo hace efecto
una vez que ese código esté desplegado en `lifehub.alejandrorodm.com` (en
el momento de generar esta APK, el servidor de producción todavía tenía el
código de antes de la fase 13/14 — hay que desplegar antes de que la TWA
abra a pantalla completa en vez de con la barra de Chrome Custom Tabs).
