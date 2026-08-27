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
    "**/__tests__/**",
    // Build output. Only present after `npm run build`, so linting it locally
    // failed on the minified bundle's require() calls while CI — which builds on a
    // separate runner from the lint job — never saw it.
    "dist-server/**",
    // Cypress recordings, not source.
    "cypress/videos/**",
    "cypress/screenshots/**",
  ]),
  {
    rules: {
      // Custom rules can be added here
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": "off", // Must disable the base rule as it can report incorrect errors
      "@typescript-eslint/no-unused-vars": [
        "warn", 
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ]
    },
  },
]);

export default eslintConfig;
