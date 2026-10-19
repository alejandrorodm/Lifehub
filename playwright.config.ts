import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://127.0.0.1:4310",
    trace: "retain-on-failure",
    storageState: "./.e2e-data/storageState.json",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4310",
    reuseExistingServer: false,
    env: {
      LIFEHUB_PORT: "4311",
      LIFEHUB_CLIENT_PORT: "4310",
      LIFEHUB_DATA_DIR: "./.e2e-data",
    },
    timeout: 30_000,
  },
  projects: [
    { name: "Desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    // Tablet con el motor de Chromium (no WebKit): solo se comprueba el
    // breakpoint responsive de 768px, no el motor de renderizado de Safari.
    { name: "Tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "Mobile", use: { ...devices["Pixel 7"] } },
  ],
});
