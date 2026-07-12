import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Oculi intentionally hydrates client-only settings/localStorage and
      // synchronizes imperative Mapbox state after mount. Those effects must
      // update React state; the rule treats every such update as an error even
      // when React is the consumer of an external browser system.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "out/**",
    "build/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    ".playwright-mcp/**",
    "next-env.d.ts",
  ]),
]);
