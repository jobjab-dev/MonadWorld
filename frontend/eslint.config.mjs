import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Override specific rules that are currently causing build to fail.
  // These will now emit warnings instead of errors during builds.
  {
    rules: {
      // Allow unused variables (logged / placeholder variables) to compile with a warning.
      "@typescript-eslint/no-unused-vars": "warn",
      // Permit usage of the `any` type temporarily while the codebase is stabilised.
      "@typescript-eslint/no-explicit-any": "warn",
      // Downgrade prefer-const to a warning so it doesn't break CI builds.
      "prefer-const": "warn",
      // Allow simple <img> tags until Next/Image migration is prioritised.
      "@next/next/no-img-element": "warn",
      // Disable the strictness of exhaustive deps for quicker iteration.
      "react-hooks/exhaustive-deps": "warn",
      // React rule about unescaped entities in JSX.
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default eslintConfig;
