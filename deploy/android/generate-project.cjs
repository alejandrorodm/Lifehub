// Genera el proyecto Android de la TWA sin pasar por el asistente
// interactivo de `bubblewrap init`/`build` (que requiere un TTY real). Usa
// directamente la librería @bubblewrap/core, igual que hace el CLI por
// debajo: construye el TwaManifest completo (con todos los valores por
// defecto que el propio bubblewrap usaría) a partir del manifest.webmanifest
// real servido por LOCAL_MANIFEST_URL.
//
// `host`/`startUrl`/`fullScopeUrl` son solo texto que queda embebido en el
// proyecto Android (AndroidManifest.xml, etc.), así que se fijan al dominio
// real ANTES de generar. `webManifestUrl`/`iconUrl`/`maskableIconUrl` sí se
// vuelven a DESCARGAR durante la generación (para copiar el manifest y los
// iconos dentro del proyecto) — esos se dejan apuntando al servidor local
// durante `createTwaProject` y solo se cambian al dominio real al guardar
// `twa-manifest.json`, ya con el proyecto generado.
const path = require("path");
const { TwaManifest, TwaGenerator, ConsoleLog } = require("@bubblewrap/core");
const { generateManifestChecksumFile } = require("@bubblewrap/cli/dist/lib/cmds/shared.js");

const LOCAL_MANIFEST_URL = process.env.LOCAL_MANIFEST_URL || "http://127.0.0.1:4555/manifest.webmanifest";
const PROD_ORIGIN = "https://lifehub.alejandrorodm.com";

async function main() {
  const targetDirectory = process.cwd();
  const manifestFile = path.join(targetDirectory, "twa-manifest.json");

  const twaManifest = await TwaManifest.fromWebManifest(LOCAL_MANIFEST_URL);

  // Estático, embebido en el proyecto: al dominio real desde ya.
  twaManifest.host = "lifehub.alejandrorodm.com";
  twaManifest.startUrl = "/";
  twaManifest.fullScopeUrl = `${PROD_ORIGIN}/`;
  twaManifest.packageId = "com.alejandrorodm.lifehub";
  twaManifest.appVersionName = "1.0.0";
  twaManifest.appVersionCode = 1;
  twaManifest.signingKey = { path: "./android.keystore", alias: "lifehub" };
  twaManifest.generatorApp = "bubblewrap-cli";
  // El default (21) es menor que el mínimo que exige androidbrowserhelper (24).
  twaManifest.minSdkVersion = 24;

  const log = new ConsoleLog("generate");
  const generator = new TwaGenerator();
  await generator.removeTwaProject(targetDirectory);
  await generator.createTwaProject(targetDirectory, twaManifest, log, () => {});

  // Ahora sí: el archivo guardado referencia el dominio real para cualquier
  // `bubblewrap update` futuro.
  twaManifest.webManifestUrl = `${PROD_ORIGIN}/manifest.webmanifest`;
  twaManifest.iconUrl = `${PROD_ORIGIN}/icons/icon-512.png`;
  twaManifest.maskableIconUrl = `${PROD_ORIGIN}/icons/icon-maskable-512.png`;
  await twaManifest.saveToFile(manifestFile);
  await generateManifestChecksumFile(manifestFile, targetDirectory);

  console.log("Proyecto Android generado, twa-manifest.json actualizado y checksum escrito.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
