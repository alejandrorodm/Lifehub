/**
 * Digital Asset Links de Android (https://developers.google.com/digital-asset-links),
 * sirve `/.well-known/assetlinks.json`. Vacío hasta rellenar la huella
 * SHA-256 real del keystore que firma la APK (ver `deploy/android/README.md`,
 * paso "Huella del certificado"). Sin esto la TWA sigue funcionando, solo
 * que se abre con la barra de Chrome Custom Tabs en vez de a pantalla completa.
 */
export const ASSET_LINKS: unknown[] = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.alejandrorodm.lifehub",
      sha256_cert_fingerprints: [
        "F6:1E:92:49:C4:4D:88:AC:AE:67:50:CA:AF:A0:26:40:A5:CB:7D:69:65:BA:CC:5F:2E:2A:73:2D:BD:4D:46:C6",
      ],
    },
  },
];
