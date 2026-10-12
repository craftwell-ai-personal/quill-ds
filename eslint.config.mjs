// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

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
    // Build artifacts (static Storybook served by the Next app):
    "public/storybook/**",
    "storybook-static/**",
    ".vercel/**",
    // Scratch (gitignored): theme-qa reports, and leftovers from the retired Figma tooling:
    ".theme-qa/**",
    ".figma-type-audit/**",
    ".visual/**",
    // Vendored minified library (not app code):
    "public/axe.min.js",
    // Generated icon modules (scripts/build-icons.mjs) — machine-written; their
    // ~1000 anonymous default exports drowned every real warning in lint output:
    "src/components/ui/icons/**",
  ]),
  ...storybook.configs["flat/recommended"]
]);

export default eslintConfig;
