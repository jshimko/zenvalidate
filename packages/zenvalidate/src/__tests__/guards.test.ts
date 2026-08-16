/**
 * @module guards.test
 * @description Tests for type guard functions
 */
import { z } from "zod/v4";

import {
  composeGuards,
  createTypeGuard,
  ensureBoolean,
  ensureNumber,
  ensureString,
  getErrorMessage,
  hasBaseOptions,
  hasProperties,
  hasProperty,
  isBoolean,
  isClientConfig,
  isDefined,
  isEnvValue,
  isError,
  isNullOrUndefined,
  isNumber,
  isObject,
  isString,
  isZodError,
  isZodSchema,
  safeGet,
  startsWithAny
} from "../types/guards";

describe("Type Guards Module", () => {
  describe("isZodSchema", () => {
    it("should identify valid Zod schemas", () => {
      expect(isZodSchema(z.string())).toBe(true);
      expect(isZodSchema(z.number())).toBe(true);
      expect(isZodSchema(z.boolean())).toBe(true);
      expect(isZodSchema(z.object({ key: z.string() }))).toBe(true);
      expect(isZodSchema(z.array(z.string()))).toBe(true);
    });

    it("should reject non-Zod schemas", () => {
      expect(isZodSchema(null)).toBe(false);
      expect(isZodSchema(undefined)).toBe(false);
      expect(isZodSchema("string")).toBe(false);
      expect(isZodSchema(123)).toBe(false);
      expect(isZodSchema({})).toBe(false);
      expect(isZodSchema({ _def: null })).toBe(false);
      expect(isZodSchema({ _def: { type: 123 } })).toBe(false); // type not string
    });
  });

  describe("Primitive Type Guards", () => {
    describe("isString", () => {
      it("should identify strings", () => {
        expect(isString("hello")).toBe(true);
        expect(isString("")).toBe(true);
        expect(isString("123")).toBe(true);
      });

      it("should reject non-strings", () => {
        expect(isString(123)).toBe(false);
        expect(isString(true)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString({})).toBe(false);
        expect(isString([])).toBe(false);
      });
    });

    describe("isNumber", () => {
      it("should identify numbers", () => {
        expect(isNumber(0)).toBe(true);
        expect(isNumber(123)).toBe(true);
        expect(isNumber(-123)).toBe(true);
        expect(isNumber(3.14)).toBe(true);
        expect(isNumber(NaN)).toBe(true); // NaN is typeof number
        expect(isNumber(Infinity)).toBe(true);
      });

      it("should reject non-numbers", () => {
        expect(isNumber("123")).toBe(false);
        expect(isNumber(true)).toBe(false);
        expect(isNumber(null)).toBe(false);
        expect(isNumber(undefined)).toBe(false);
        expect(isNumber({})).toBe(false);
      });
    });

    describe("isBoolean", () => {
      it("should identify booleans", () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
      });

      it("should reject non-booleans", () => {
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean(0)).toBe(false);
        expect(isBoolean("true")).toBe(false);
        expect(isBoolean(null)).toBe(false);
        expect(isBoolean(undefined)).toBe(false);
      });
    });
  });

  describe("Complex Type Guards", () => {
    describe("isObject", () => {
      it("should identify objects", () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ key: "value" })).toBe(true);
        expect(isObject(new Date())).toBe(true);
      });

      it("should reject non-objects", () => {
        expect(isObject(null)).toBe(false);
        expect(isObject(undefined)).toBe(false);
        expect(isObject("string")).toBe(false);
        expect(isObject(123)).toBe(false);
        expect(isObject([])).toBe(false); // Arrays are not plain objects
      });
    });
  });

  describe("Null/Undefined Guards", () => {
    describe("isNullOrUndefined", () => {
      it("should identify null and undefined", () => {
        expect(isNullOrUndefined(null)).toBe(true);
        expect(isNullOrUndefined(undefined)).toBe(true);
      });

      it("should reject defined values", () => {
        expect(isNullOrUndefined(0)).toBe(false);
        expect(isNullOrUndefined("")).toBe(false);
        expect(isNullOrUndefined(false)).toBe(false);
        expect(isNullOrUndefined({})).toBe(false);
      });
    });

    describe("isDefined", () => {
      it("should identify defined values", () => {
        expect(isDefined(0)).toBe(true);
        expect(isDefined("")).toBe(true);
        expect(isDefined(false)).toBe(true);
        expect(isDefined({})).toBe(true);
        expect(isDefined([])).toBe(true);
      });

      it("should reject null and undefined", () => {
        expect(isDefined(null)).toBe(false);
        expect(isDefined(undefined)).toBe(false);
      });
    });
  });

  describe("Error Guards", () => {
    describe("isZodError", () => {
      it("should identify ZodError instances", () => {
        const zodError = new z.ZodError([]);
        expect(isZodError(zodError)).toBe(true);
      });

      it("should reject non-ZodError instances", () => {
        expect(isZodError(new Error("test"))).toBe(false);
        expect(isZodError("error")).toBe(false);
        expect(isZodError({})).toBe(false);
        expect(isZodError(null)).toBe(false);
      });
    });

    describe("isError", () => {
      it("should identify Error instances", () => {
        expect(isError(new Error("test"))).toBe(true);
        expect(isError(new TypeError("test"))).toBe(true);
        expect(isError(new SyntaxError("test"))).toBe(true);
        expect(isError(new z.ZodError([]))).toBe(true);
      });

      it("should reject non-Error instances", () => {
        expect(isError("error")).toBe(false);
        expect(isError({ message: "error" })).toBe(false);
        expect(isError(null)).toBe(false);
        expect(isError(undefined)).toBe(false);
      });
    });
  });

  describe("Environment Value Guard", () => {
    describe("isEnvValue", () => {
      it("should identify valid environment values", () => {
        expect(isEnvValue("value")).toBe(true);
        expect(isEnvValue("")).toBe(true);
        expect(isEnvValue(undefined)).toBe(true);
      });

      it("should reject non-environment values", () => {
        expect(isEnvValue(123)).toBe(false);
        expect(isEnvValue(true)).toBe(false);
        expect(isEnvValue(null)).toBe(false);
        expect(isEnvValue({})).toBe(false);
      });
    });
  });

  describe("Conversion Helpers", () => {
    describe("ensureString", () => {
      it("should convert values to strings", () => {
        expect(ensureString("hello")).toBe("hello");
        expect(ensureString(123)).toBe("123");
        expect(ensureString(true)).toBe("true");
        expect(ensureString(false)).toBe("false");
        expect(ensureString({ key: "value" })).toBe('{"key":"value"}');
        expect(ensureString([1, 2, 3])).toBe("[1,2,3]");
      });

      it("should handle Symbol values", () => {
        const sym = Symbol("test");
        expect(ensureString(sym)).toBe("Symbol(test)");
      });

      it("should throw for null/undefined", () => {
        expect(() => ensureString(null)).toThrow();
        expect(() => ensureString(undefined)).toThrow();
      });
    });

    describe("ensureNumber", () => {
      it("should convert values to numbers", () => {
        expect(ensureNumber(123)).toBe(123);
        expect(ensureNumber("123")).toBe(123);
        expect(ensureNumber("3.14")).toBe(3.14);
        expect(ensureNumber("-42")).toBe(-42);
      });

      it("should throw for NaN results", () => {
        expect(() => ensureNumber("not a number")).toThrow();
        expect(() => ensureNumber("")).toThrow();
        expect(() => ensureNumber({})).toThrow();
      });

      it("should throw for null/undefined", () => {
        expect(() => ensureNumber(null)).toThrow();
        expect(() => ensureNumber(undefined)).toThrow();
      });
    });

    describe("ensureBoolean", () => {
      it("should convert values to booleans", () => {
        expect(ensureBoolean(true)).toBe(true);
        expect(ensureBoolean(false)).toBe(false);
        expect(ensureBoolean("true")).toBe(true);
        expect(ensureBoolean("false")).toBe(false);
        expect(ensureBoolean("1")).toBe(true);
        expect(ensureBoolean("0")).toBe(false);
        expect(ensureBoolean("yes")).toBe(true);
        expect(ensureBoolean("no")).toBe(false);
        expect(ensureBoolean("on")).toBe(true);
        expect(ensureBoolean("off")).toBe(false);
      });

      it("should handle number conversion", () => {
        expect(ensureBoolean(1)).toBe(true);
        expect(ensureBoolean(0)).toBe(false);
        expect(ensureBoolean(123)).toBe(true);
        expect(ensureBoolean(-1)).toBe(true);
      });

      it("should fallback to Boolean() for other values", () => {
        expect(ensureBoolean({})).toBe(true);
        expect(ensureBoolean([])).toBe(true);
        expect(ensureBoolean("")).toBe(false);
        expect(ensureBoolean(null)).toBe(false);
        expect(ensureBoolean(undefined)).toBe(false);
      });
    });
  });

  describe("Utility Guards", () => {
    describe("hasProperty", () => {
      it("should check for property existence", () => {
        const obj = { key: "value", nested: { prop: true } };
        expect(hasProperty(obj, "key")).toBe(true);
        expect(hasProperty(obj, "nested")).toBe(true);
        expect(hasProperty(obj, "missing")).toBe(false);
      });

      it("should handle null/undefined", () => {
        expect(hasProperty(null, "key")).toBe(false);
        expect(hasProperty(undefined, "key")).toBe(false);
      });
    });

    describe("startsWithAny", () => {
      it("should check if string starts with any prefix", () => {
        expect(startsWithAny("NEXT_PUBLIC_VAR", ["NEXT_PUBLIC_"])).toBe(true);
        expect(startsWithAny("VITE_VAR", ["NEXT_PUBLIC_", "VITE_"])).toBe(true);
        expect(startsWithAny("SECRET_VAR", ["NEXT_PUBLIC_", "VITE_"])).toBe(false);
      });

      it("should handle empty arrays", () => {
        expect(startsWithAny("anything", [])).toBe(false);
      });

      it("should handle empty string", () => {
        expect(startsWithAny("", ["prefix"])).toBe(false);
      });
    });

    describe("isClientConfig", () => {
      it("should validate valid ClientConfig", () => {
        expect(isClientConfig({ expose: true })).toBe(true);
        expect(isClientConfig({ expose: false })).toBe(true);
        expect(
          isClientConfig({
            expose: true,
            transform: (val: string) => val.toUpperCase()
          })
        ).toBe(true);
        expect(
          isClientConfig({
            expose: true,
            default: "value",
            devDefault: "dev-value"
          })
        ).toBe(true);
      });

      it("should accept testDefault in ClientConfig", () => {
        expect(
          isClientConfig({
            expose: true,
            default: "value",
            devDefault: "dev-value",
            testDefault: "test-value"
          })
        ).toBe(true);
      });

      it("should reject invalid ClientConfig", () => {
        expect(isClientConfig({})).toBe(false); // missing expose
        expect(isClientConfig({ expose: "true" })).toBe(false); // expose not boolean
        expect(isClientConfig({ expose: true, transform: "not-a-function" })).toBe(false);
        expect(isClientConfig(null)).toBe(false);
        expect(isClientConfig(undefined)).toBe(false);
      });
    });

    describe("hasBaseOptions", () => {
      it("should validate objects with BaseOptions structure", () => {
        expect(hasBaseOptions({ options: { default: "value" } })).toBe(true);
        expect(hasBaseOptions({ options: { devDefault: "dev" } })).toBe(true);
        expect(hasBaseOptions({ options: { testDefault: "test" } })).toBe(true);
        expect(hasBaseOptions({ options: { description: "desc" } })).toBe(true);
        expect(hasBaseOptions({ options: { example: "example" } })).toBe(true);
        expect(hasBaseOptions({ options: { client: { expose: true } } })).toBe(true);
      });

      it("should accept empty objects", () => {
        expect(hasBaseOptions({})).toBe(true);
      });

      it("should reject non-objects", () => {
        expect(hasBaseOptions(null)).toBe(false);
        expect(hasBaseOptions(undefined)).toBe(false);
        expect(hasBaseOptions("string")).toBe(false);
      });
    });

    describe("safeGet", () => {
      it("should safely get property values", () => {
        const obj = { key: "value", nested: { prop: true } };
        expect(safeGet(obj, "key")).toBe("value");
        expect(safeGet(obj, "nested")).toEqual({ prop: true });
        expect(safeGet(obj as Record<string, unknown>, "missing" as keyof typeof obj)).toBeUndefined();
      });

      it("should handle errors gracefully", () => {
        const obj: { throwingProp?: string } = {};
        Object.defineProperty(obj, "throwingProp", {
          get(): never {
            throw new Error("Property error");
          }
        });
        expect(safeGet(obj, "throwingProp")).toBeUndefined();
      });

      it("should handle null/undefined", () => {
        // Test with type assertions for edge cases
        const emptyObj: { key?: string } = {};
        const result1 = safeGet(emptyObj, "key");
        expect(result1).toBeUndefined();

        // These should be tested differently since safeGet expects an object
        // The function signature prevents null/undefined from being passed
      });
    });

    describe("getErrorMessage", () => {
      it("should extract error messages", () => {
        expect(getErrorMessage(new Error("test error"))).toBe("test error");
        expect(getErrorMessage(new TypeError("type error"))).toBe("type error");
      });

      it("should handle ZodError", () => {
        const zodError = new z.ZodError([
          { code: "custom", message: "Error 1", path: [], input: undefined },
          { code: "custom", message: "Error 2", path: [], input: undefined }
        ]);
        expect(getErrorMessage(zodError)).toContain("Error 1");
        expect(getErrorMessage(zodError)).toContain("Error 2");
      });

      it("should use fallback for non-errors", () => {
        expect(getErrorMessage("string")).toBe("string");
        expect(getErrorMessage(123)).toBe("123");
        expect(getErrorMessage(null)).toBe("null");
      });
    });
  });

  describe("Advanced Guards", () => {
    describe("createTypeGuard", () => {
      it("should create custom type guards", () => {
        const isPositiveNumber = createTypeGuard<number>((val): val is number => typeof val === "number" && val > 0);

        expect(isPositiveNumber(5)).toBe(true);
        expect(isPositiveNumber(-5)).toBe(false);
        expect(isPositiveNumber("5")).toBe(false);
      });
    });

    describe("composeGuards", () => {
      it("should compose multiple guards with AND logic", () => {
        const isStringOrNumber = composeGuards(
          (val: unknown): val is string | number => typeof val === "string" || typeof val === "number",
          (val: unknown): val is string | number => val !== null && val !== undefined
        );

        expect(isStringOrNumber("hello")).toBe(true);
        expect(isStringOrNumber(123)).toBe(true);
        expect(isStringOrNumber(null)).toBe(false);
        expect(isStringOrNumber(undefined)).toBe(false);
      });
    });

    describe("hasProperties", () => {
      it("should check for multiple properties", () => {
        const obj = { a: 1, b: 2, c: 3 };
        expect(hasProperties("a", "b")(obj)).toBe(true);
        expect(hasProperties("a", "b", "c")(obj)).toBe(true);
        expect(hasProperties("a", "d")(obj)).toBe(false);
      });

      it("should handle empty property list", () => {
        expect(hasProperties()({})).toBe(true);
      });

      it("should handle null/undefined", () => {
        expect(hasProperties("key")(null)).toBe(false);
        expect(hasProperties("key")(undefined)).toBe(false);
      });
    });
  });
});
