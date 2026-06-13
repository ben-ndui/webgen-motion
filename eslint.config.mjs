import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefacts générés / non-source : build Rust, bundle Next standalone
    // recopié dans la coque Tauri, runners packagés, et assets de design
    // handoff. Aucun de ces fichiers n'est écrit à la main.
    "src-tauri/target/**",
    "src-tauri/standalone/**",
    "src-tauri/runners/**",
    "design_handoff_genmotion/**",
  ]),
  {
    rules: {
      // Contenu FR plein d'apostrophes/guillemets typographiques dans le
      // JSX — échapper chaque caractère n'apporte rien (React les rend
      // très bien) et alourdit le texte. Bruit pur, désactivé.
      "react/no-unescaped-entities": "off",

      // Règles expérimentales du React Compiler (eslint-plugin-react-hooks
      // v6). Elles signalent des patterns (setState dans un effet de
      // data-fetching, lectures non-pures, mutations locales) qui
      // fonctionnent correctement ici. On les garde en `warn` — visibles
      // pour nettoyage progressif — sans bloquer la CI ni imposer un
      // refactor risqué juste avant le lancement.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
