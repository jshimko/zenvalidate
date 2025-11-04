// @ts-check
import eslint from "@eslint/js";
import vitestPlugin from "@vitest/eslint-plugin";
import prettierConfig from "eslint-config-prettier";
import jsdoc from "eslint-plugin-jsdoc";
import { globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  globalIgnores(["dist", "node_modules", ".turbo", "tsconfig.tsbuildinfo", "coverage"]),

  // Base ESLint recommended config
  eslint.configs.recommended,

  // TypeScript ESLint configs
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // JSdoc config
  jsdoc.configs["flat/recommended"],

  // Prettier config (disables conflicting rules)
  prettierConfig,

  // Main overrides
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "max-len": [
        "warn",
        {
          code: 140,
          ignoreUrls: true
        }
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "allow"
        }
      ],
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true
        }
      ],

      // JSDocs
      "jsdoc/require-jsdoc": "error",
      "jsdoc/require-param": "off",
      "jsdoc/require-param-type": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-type": "off",
      "jsdoc/tag-lines": "off"
    }
  },

  {
    // Test files configuration
    files: ["**/*.test.{ts,tsx}", "**/__tests__/**/*"],
    plugins: {
      vitest: vitestPlugin
    },
    languageOptions: {
      globals: {
        ...vitestPlugin.environments.env.globals
      }
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      "@typescript-eslint/unbound-method": "off",
      "vitest/no-importing-vitest-globals": "error",
      "vitest/expect-expect": [
        "error",
        {
          assertFunctionNames: [
            "expect",
            "assert",
            "expectTypeOf",
            "expectValidationError",
            "assertHasClasses",
            "assertAttributes",
            "testAccessibility",
            "testAllVariants",
            "verifyDataSlot",
            "testChildrenRendering",
            "testForwardRef",
            "testCSSVariables",
            "testResponsiveBehavior",
            "testAnimation",
            "testComponentStates"
          ],
          additionalTestBlockFunctions: []
        }
      ]
    }
  }
];
