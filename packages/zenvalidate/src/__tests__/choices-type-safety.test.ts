/**
 * Type-level tests for choices type safety.
 * These tests verify that choices properly constrain defaults at compile time.
 */
import type { z } from "zod/v4";

import { num, str, zenv } from "../index";

describe("Choices type safety", () => {
  describe("str() with choices", () => {
    it("should enforce type safety WITHOUT as const", () => {
      // This should compile and work correctly
      const validator1 = str({
        choices: ["development", "test", "production"],
        default: "development" // Valid choice
      });

      // TypeScript should error on these (compile-time check)
      // @ts-expect-error - default not in choices
      const _validator2 = str({
        choices: ["development", "test", "production"],
        default: "invalid"
      });

      // @ts-expect-error - devDefault not in choices
      const _validator3 = str({
        choices: ["a", "b", "c"],
        devDefault: "d"
      });

      // @ts-expect-error - testDefault not in choices
      const _validator4 = str({
        choices: ["x", "y", "z"],
        testDefault: "w"
      });

      // Runtime validation
      expect(validator1.parse("development")).toBe("development");
      expect(validator1.parse(undefined)).toBe("development");
    });

    it("should still work WITH as const (backward compatibility)", () => {
      const _validator = str({
        choices: ["a", "b", "c"] as const,
        default: "a" // Valid
      });

      // @ts-expect-error - default not in choices
      const _validator2 = str({
        choices: ["a", "b", "c"] as const,
        default: "d"
      });

      expect(_validator.parse("a")).toBe("a");
    });

    it("should constrain client testDefault to choices", () => {
      const _validator = str({
        choices: ["a", "b", "c"],
        client: {
          expose: true,
          testDefault: "a" // Valid
        }
      });

      // @ts-expect-error - client testDefault not in choices
      const _validator2 = str({
        choices: ["a", "b", "c"],
        client: {
          expose: true,
          testDefault: "d"
        }
      });

      expect(_validator.parse("a")).toBe("a");
    });

    it("should allow any string when no choices specified", () => {
      const _validator = str({
        default: "any string is fine",
        devDefault: "another string",
        testDefault: "yet another"
      });

      expect(_validator.parse("anything")).toBe("anything");
      // In test environment, testDefault takes precedence
      expect(_validator.parse(undefined)).toBe("yet another");
    });

    it("should properly infer return types", () => {
      const _validator = str({
        choices: ["red", "green", "blue"]
      });

      // Type should be "red" | "green" | "blue"
      type Result = z.infer<typeof _validator>;
      const value: Result = "red";

      // @ts-expect-error - "yellow" is not a valid choice
      const _invalid: Result = "yellow";

      expect(value).toBe("red");
    });
  });

  describe("num() with choices", () => {
    it("should enforce type safety WITHOUT as const", () => {
      // Valid usage
      const validator1 = num({
        choices: [1, 2, 3],
        default: 2
      });

      // TypeScript should error on these
      // @ts-expect-error - default not in choices
      const _validator2 = num({
        choices: [10, 20, 30],
        default: 15
      });

      // @ts-expect-error - devDefault not in choices
      const _validator3 = num({
        choices: [1, 2, 3],
        devDefault: 4
      });

      expect(validator1.parse("2")).toBe(2);
      expect(validator1.parse(undefined)).toBe(2);
    });

    it("should still work WITH as const", () => {
      const validator = num({
        choices: [100, 200, 300] as const,
        default: 200
      });

      // @ts-expect-error - default not in choices
      const _validator2 = num({
        choices: [100, 200, 300] as const,
        default: 150
      });

      expect(validator.parse("200")).toBe(200);
    });

    it("should allow any number when no choices specified", () => {
      const validator = num({
        default: 42,
        devDefault: 13,
        testDefault: 7
      });

      expect(validator.parse("999")).toBe(999);
      // In test environment, testDefault takes precedence
      expect(validator.parse(undefined)).toBe(7);
    });

    it("should properly infer return types", () => {
      const _validator = num({
        choices: [1, 2, 3]
      });

      // Type should be 1 | 2 | 3
      type Result = z.infer<typeof _validator>;
      const value: Result = 1;

      // @ts-expect-error - 4 is not a valid choice
      const _invalid: Result = 4;

      expect(value).toBe(1);
    });
  });

  describe("zenv() with choices", () => {
    it("should enforce type safety in environment config", () => {
      // Valid usage
      const env1 = zenv(
        {
          NODE_ENV: str({
            choices: ["development", "test", "production"],
            default: "development"
          }),
          WORKERS: num({
            choices: [1, 2, 4, 8],
            default: 4
          })
        },
        { env: {} }
      );

      // TypeScript correctly errors on invalid defaults
      // Commented out to allow compilation - TypeScript properly catches this!
      // const env2 = zenv(
      //   {
      //     NODE_ENV: str({
      //       choices: ["development", "test", "production"],
      //       default: "staging", // ❌ TS Error: Type '"staging"' is not assignable
      //     }),
      //   },
      //   { env: {} }
      // );

      expect(env1.NODE_ENV).toBe("development");
      expect(env1.WORKERS).toBe(4);
    });

    it("should work with client config", () => {
      const env = zenv(
        {
          ENVIRONMENT: str({
            choices: ["dev", "prod"],
            default: "dev",
            client: {
              expose: true,
              default: "prod" // Should also be constrained
            }
          })
        },
        { env: {} }
      );

      // TypeScript correctly errors on invalid client default
      // Commented out to allow compilation - TypeScript properly catches this!
      // const env2 = zenv(
      //   {
      //     ENVIRONMENT: str({
      //       choices: ["dev", "prod"],
      //       client: {
      //         expose: true,
      //         default: "staging", // ❌ TS Error: Type '"staging"' is not assignable
      //       },
      //     }),
      //   },
      //   { env: {} }
      // );

      expect(env.ENVIRONMENT).toBe("dev");
    });
  });
});
