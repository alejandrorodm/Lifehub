# APK de LifeHub (TWA con Bubblewrap)

Es una **Trusted Web Activity**: un envoltorio Android finísimo que abre
`https://lifehub.alejandrorodm.com` a pantalla completa, sin barra de
navegador. La "app" no lleva código propio del front — cada vez que la abres
carga la versión en vivo del sitio, así que **las actualizaciones normales
(nuevas pantallas, arreglos, fase 13 en marcha, etc.) no necesitan ni tocar
la APK**: se ven solas, como en el navegador. La APK solo hay que
reconstruirla si cambia algo del propio envoltorio (icono, nombre, color).

**No pude generar la APK yo mismo en este entorno**: ni esta máquina de
desarrollo ni el VPS tienen Java/Android SDK, y no tengo permisos para
instalarlos sin pedírtelo (este equipo no tiene `sudo` sin contraseña; el
VPS sí, pero con solo ~1&nbsp;GB de RAM y ViperTrade + LifeHub ya corriendo,
una build de Gradle ahí es arriesgada para los servicios en producción). Lo
que sí dejé listo y lo puedes ejecutar tú donde prefieras: el manifest PWA
(`src/client/public/manifest.webmanifest`), los iconos, y la config de
Bubblewrap (`twa-manifest.json`, en este directorio).

## Lo más importante: el keystore de firma

Android exige que **todas** las versiones de una app estén firmadas con el
**mismo** certificado — si el siguiente build usa uno distinto, Android lo
trata como una app diferente y te obliga a desinstalar la anterior antes de
instalar la nueva (perdiendo lo que hubiera en local, aunque aquí no hay
nada local que perder porque todo vive en el servidor).

- El paso 2 de abajo genera `android.keystore` **una sola vez, para
  siempre**.
- **Haz una copia de seguridad de `android.keystore` y de su contraseña en
  un sitio seguro fuera de este repo** (gestor de contraseñas, USB cifrado…).
  Si lo pierdes, no hay forma de recuperarlo ni de "resetearlo": tendrías
  que publicar la app como una nueva, distinta, y todo el mundo perdería la
  instalada.
- Nunca se commitea (`.gitignore` ya lo excluye).
- Cada build nueva reutiliza el mismo `android.keystore` y solo sube
  `appVersionCode` en `twa-manifest.json`.

## Pasos

Necesitas JDK 17+ (`sudo apt install openjdk-17-jdk-headless` en Linux) y
conexión a internet (Bubblewrap descarga su propio Android SDK/Gradle la
primera vez, ~1-2&nbsp;GB).

```bash
npm install -g @bubblewrap/cli   # o npx @bubblewrap/cli, sin instalar global
cd deploy/android
bubblewrap build                 # lee twa-manifest.json; la 1ª vez pide
                                  # generar android.keystore (guarda bien la contraseña)
```

Esto produce `app-release-signed.apk` (para instalar directo en un móvil) y
`app-release-bundle.aab` (para subirla a Google Play, si algún día quieres).

### Huella del certificado (para que la app abra a pantalla completa)

Sin esto, Android abre la TWA con la barra de Chrome Custom Tabs en vez de a
pantalla completa — funciona igual, pero se ve peor.

```bash
keytool -list -v -keystore android.keystore -alias lifehub
```

Copia la línea `SHA256:`. Con ese valor, edita
`src/server/lib/assetLinks.ts` (descomenta el bloque, pon tu `packageId` —
`com.alejandrorodm.lifehub`, ya en `twa-manifest.json` — y esa huella),
redespliega LifeHub, y comprueba:

```bash
curl https://lifehub.alejandrorodm.com/.well-known/assetlinks.json
```

### Instalar en el móvil

Pásate el `.apk` (USB, Drive, lo que sea) e instálalo — tendrás que permitir
"orígenes desconocidos" la primera vez. Para una actualización posterior,
basta con instalar el nuevo `.apk` encima: al estar firmado con el mismo
keystore, Android lo actualiza sin pedir desinstalar nada.

## Si prefieres que lo monte yo

Dos opciones que sí podría ejecutar:

- **En el VPS**, aceptando el riesgo de que una build de Gradle (bastante
  más pesada que Node) presione la RAM mientras ViperTrade/LifeHub siguen
  corriendo — lo haría en una ventana controlada y vigilando memoria.
- **GitHub Actions**, en este repo: un workflow que instala Bubblewrap, usa
  un keystore guardado como *secret* del repo, y te deja la APK como
  artefacto descargable en cada ejecución. No lo he montado todavía — hay
  que decidirlo porque toca GitHub Actions, que de momento está fuera de
  alcance del proyecto (ver fase 12, "CI/CD automático").
