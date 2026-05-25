import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import onlyWarn from "eslint-plugin-only-warn";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/** Warn on inline React Query keys outside `packages/data-access/src/lib/query-keys.ts`. */
export const noInlineQueryKeySyntaxRule = {
  selector: "Property[key.name='queryKey'] > ArrayExpression",
  message:
    "Use queryKeys, appQueryKeys, or internalQueryKeys from @workspace/data-access instead of inline queryKey arrays.",
};

/** Warn on inline keys passed as the first argument to `useAPIQuery`. */
export const noInlineUseApiQueryKeySyntaxRule = {
  selector:
    "CallExpression[callee.name='useAPIQuery'] > ArrayExpression.arguments:first-child",
  message:
    "Use queryKeys or appQueryKeys from @workspace/data-access (via @/lib/api/query-keys) instead of inline useAPIQuery key arrays.",
};

/** Warn on direct `process.env` reads outside config/bootstrap modules. */
export const noProcessEnvSyntaxRule = {
  selector:
    "MemberExpression[object.object.name='process'][property.name='env']",
  message:
    "Read environment variables via AppConfigService or shared config modules, not process.env.",
};

/** Warn on inline arrays inside `invalidateKeys` on mutations. */
export const noInlineInvalidateKeysSyntaxRule = {
  selector:
    "Property[key.name='invalidateKeys'] > ArrayExpression > ArrayExpression",
  message:
    "Use queryKeys or appQueryKeys factories in invalidateKeys instead of inline string arrays.",
};

export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",

      "no-empty": ["warn", { allowEmptyCatch: true }],

      "sort-imports": [
        "warn",
        {
          ignoreCase: true,
          ignoreDeclarationSort: true, 
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
          allowSeparatedGroups: true,
        },
      ],
      "no-duplicate-imports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ["dist/**", ".next/**", "**/node_modules/**", "**/*.spec.ts", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/unbound-method": "off",
    },
  },
];
