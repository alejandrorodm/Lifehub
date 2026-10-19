import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "src/server/db/migrations",
      "playwright-report",
      "test-results",
      // Script de build de la APK (deploy/android/, ver su README): un .cjs
      // suelto fuera de src/, ejecutado directamente con Node, no con el
      // resto del bundle — no tiene sentido aplicarle las reglas de estilo
      // del proyecto (ESM, sin `require`, etc.).
      "deploy/android/generate-project.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/client/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["src/server/**/*.ts", "*.config.{ts,js}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      // En el servidor, console.log del arranque/migraciones es la salida
      // esperada de un proceso CLI local, no un rastro de depuración.
      "no-console": "off",
    },
  },
  {
    // Primitivas de UI y proveedores de contexto: es habitual exportar el
    // componente junto con su hook o tipos asociados en el mismo archivo.
    files: ["src/client/components/ui/**/*.tsx", "src/client/app/shortcuts/ShortcutsContext.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Service worker (fase 9): corre en su propio contexto global, sin DOM.
    files: ["src/client/public/sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.serviceworker,
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "tests/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Client-side code should never leave stray console.log in production;
    // the server is a local CLI process where startup logs are expected
    // (see the "no-console": "off" override above).
    files: ["src/client/**/*.{ts,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
);
