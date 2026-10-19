/**
 * Digital Asset Links de Android (https://developers.google.com/digital-asset-links),
 * sirve `/.well-known/assetlinks.json`. Vacío hasta rellenar la huella
 * SHA-256 real del keystore que firma la APK (ver `deploy/android/README.md`,
 * paso "Huella del certificado"). Sin esto la TWA sigue funcionando, solo
 * que se abre con la barra de Chrome Custom Tabs en vez de a pantalla completa.
 */
export const ASSET_LINKS: unknown[] = [
  // {
  //   relation: ["delegate_permission/common.handle_all_urls"],
  //   target: {
  //     namespace: "android_app",
  //     package_name: "com.alejandrorodm.lifehub",
  //     sha256_cert_fingerprints: ["<huella del keystore>"],
  //   },
  // },
];
