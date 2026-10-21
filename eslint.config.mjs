import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
  resolvePluginsRelativeTo: path.dirname(require.resolve("eslint-config-next/package.json")),
});
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "backups/**",
      "tmp/**",
      "GitHub upload*/**",
      "flutter-prototype/**",
      ".pnpm-store/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  { files: ["tests/**"], rules: { "@typescript-eslint/no-require-imports": "off" } },
];
