import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const reactRuleOverrides = Object.fromEntries(
  nextVitals
    .flatMap((config) => Object.keys(config.rules ?? {}))
    .filter((ruleName) => ruleName.startsWith("react/"))
    .map((ruleName) => [ruleName, "off"]),
);

const reactHooksRuleOverrides = {
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/preserve-manual-memoization": "off",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      ...reactRuleOverrides,
      ...reactHooksRuleOverrides,
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
