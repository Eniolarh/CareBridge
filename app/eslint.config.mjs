import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // Data fetching and wallet restoration intentionally hydrate state from
      // effects; the newer React compiler heuristic is too strict for this app.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
