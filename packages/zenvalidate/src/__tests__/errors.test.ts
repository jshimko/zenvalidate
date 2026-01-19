/**
 * @module errors.test
 * @description Tests for custom error classes
 */
import { z } from "zod/v4";

import { ZenvError, ZenvMissingError } from "../errors";

describe("Errors Module", () => {
  describe("ZenvError", () => {
    it("should create error with message only", () => {
      const error = new ZenvError("Test error message");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZenvError);
      expect(error.message).toBe("Test error message");
      expect(error.name).toBe("ZenvError");
      expect(error.zodErrors).toBeUndefined();
    });

    it("should create error with ZodErrors array", () => {
      const zodErrors = [
        new z.ZodError([{ code: "custom", message: "Error 1", path: ["field1"], input: undefined }]),
        new z.ZodError([{ code: "custom", message: "Error 2", path: ["field2"], input: undefined }])
      ];

      const error = new ZenvError("Validation failed", zodErrors);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Validation failed");
      expect(error.zodErrors).toBe(zodErrors);
      expect(error.zodErrors).toHaveLength(2);
    });

    it("should have correct error stack trace", () => {
      const error = new ZenvError("Stack trace test");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("ZenvError");
      expect(error.stack).toContain("Stack trace test");
    });

    it("should properly inherit from Error", () => {
      const error = new ZenvError("Inheritance test");
      expect(error.name + ": " + error.message).toBe("ZenvError: Inheritance test");
      expect(Object.getPrototypeOf(error)).toBe(ZenvError.prototype);
      expect(error instanceof Error).toBe(true);
    });

    it("should preserve ZodError details", () => {
      const zodError = new z.ZodError([
        {
          code: "invalid_type",
          expected: "string",
          message: "Expected string, received number",
          path: ["nested", "field"],
          input: 123
        }
      ]);

      const error = new ZenvError("Validation error", [zodError]);
      expect(error.zodErrors?.[0]).toBe(zodError);
      expect(error.zodErrors?.[0]?.issues[0]?.path).toEqual(["nested", "field"]);
    });
  });

  describe("ZenvMissingError", () => {
    it("should create error with default message", () => {
      const error = new ZenvMissingError();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ReferenceError);
      expect(error).toBeInstanceOf(ZenvMissingError);
      expect(error.message).toBe("Missing required environment variables");
      expect(error.name).toBe("ZenvMissingError");
    });

    it("should create error with custom message", () => {
      const error = new ZenvMissingError("Custom missing vars message");
      expect(error.message).toBe("Custom missing vars message");
      expect(error.name).toBe("ZenvMissingError");
    });

    it("should properly inherit from ReferenceError", () => {
      const error = new ZenvMissingError("Reference test");
      expect(error.name + ": " + error.message).toBe("ZenvMissingError: Reference test");
      expect(Object.getPrototypeOf(error)).toBe(ZenvMissingError.prototype);
      expect(error instanceof ReferenceError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it("should have correct error stack trace", () => {
      const error = new ZenvMissingError("Stack trace test");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("ZenvMissingError");
      expect(error.stack).toContain("Stack trace test");
    });

    it("should be distinguishable from ZenvError", () => {
      const missingError = new ZenvMissingError();
      const validationError = new ZenvError("Validation error");

      expect(missingError instanceof ZenvMissingError).toBe(true);
      expect(missingError instanceof ZenvError).toBe(false);
      expect(validationError instanceof ZenvError).toBe(true);
      expect(validationError instanceof ZenvMissingError).toBe(false);
    });
  });

  describe("Error Usage Patterns", () => {
    it("should differentiate between missing and invalid errors", () => {
      // Simulate missing variable error
      const missingError = new ZenvMissingError("DATABASE_URL is required");
      expect(missingError.message).toContain("DATABASE_URL");

      // Simulate invalid variable error
      const invalidError = new ZenvError("PORT must be a number", [
        new z.ZodError([{ code: "invalid_type", expected: "number", message: "Invalid type", path: ["PORT"], input: "not-a-number" }])
      ]);
      expect(invalidError.message).toContain("PORT");
      expect(invalidError.zodErrors).toHaveLength(1);
    });

    it("should handle multiple validation errors", () => {
      const errors = [
        new z.ZodError([{ code: "too_small", origin: "number", minimum: 1, message: "Port too small", path: ["PORT"], input: 0 }]),
        new z.ZodError([{ code: "invalid_format", format: "email", message: "Invalid email", path: ["EMAIL"], input: "not-an-email" }]),
        new z.ZodError([
          { code: "invalid_value", values: ["production"], message: "Invalid environment", path: ["NODE_ENV"], input: "invalid" }
        ])
      ];

      const error = new ZenvError("Multiple validation failures", errors);
      expect(error.zodErrors).toHaveLength(3);
      expect(error.message).toBe("Multiple validation failures");
    });

    it("should be catchable with specific error types", () => {
      const throwMissingError = (): never => {
        throw new ZenvMissingError("Missing variable");
      };

      const throwValidationError = (): never => {
        throw new ZenvError("Invalid variable");
      };

      // Test catching ZenvMissingError
      let missingErr: unknown;
      try {
        throwMissingError();
      } catch (e) {
        missingErr = e;
      }
      expect(missingErr).toBeInstanceOf(ZenvMissingError);
      expect((missingErr as ZenvMissingError).message).toBe("Missing variable");

      // Test catching ZenvError
      let validationErr: unknown;
      try {
        throwValidationError();
      } catch (e) {
        validationErr = e;
      }
      expect(validationErr).toBeInstanceOf(ZenvError);
      expect((validationErr as ZenvError).message).toBe("Invalid variable");
    });
  });
});
