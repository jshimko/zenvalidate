/**
 * @module core-immutability.test
 * @description Tests for core.ts immutability, validation errors, and edge cases
 */
import { z } from "zod/v4";

import { zenv } from "../core";
import { ZenvError } from "../errors";
import { num, str } from "../validators";
import { mockProcessEnv, suppressConsole } from "./test-utils";

describe("core immutability and protection", () => {
  it("should prevent mutation of environment variables", () => {
    const env = mockProcessEnv({
      API_URL: "https://api.example.com"
    });

    const result = zenv({
      API_URL: str()
    });

    // Attempt to mutate - should throw TypeError
    expect(() => {
      result.API_URL = "https://new-api.example.com";
    }).toThrow(TypeError);

    expect(() => {
      result.API_URL = "https://new-api.example.com";
    }).toThrow("[zenv] Attempt to mutate environment value: API_URL");

    // Try mutating with different property
    expect(() => {
      // @ts-expect-error Testing runtime mutation prevention
      result.NEW_VAR = "value";
    }).toThrow("[zenv] Attempt to mutate environment value: NEW_VAR");

    env.restore();
  });

  it("should reject non-Zod validators", () => {
    const env = mockProcessEnv({
      PORT: "3000"
    });
    const { restore: suppressRestore } = suppressConsole();

    // Try with string instead of Zod schema
    let error1: unknown;
    try {
      zenv(
        {
          // @ts-expect-error Testing runtime type check
          PORT: "not a schema"
        },
        {
          onError: "throw"
        }
      );
    } catch (error) {
      error1 = error;
    }
    expect(error1).toBeInstanceOf(ZenvError);
    const zenvErr1 = error1 as ZenvError;
    expect(zenvErr1.message).toBe("Environment validation failed");
    expect(zenvErr1.zodErrors?.[0]?.issues[0]?.message).toContain('Invalid validator for "PORT": must be a Zod schema');

    // Try with number
    let error2: unknown;
    try {
      zenv(
        {
          // @ts-expect-error Testing runtime type check
          PORT: 123
        },
        {
          onError: "throw"
        }
      );
    } catch (error) {
      error2 = error;
    }
    expect(error2).toBeInstanceOf(ZenvError);
    const zenvErr2 = error2 as ZenvError;
    expect(zenvErr2.zodErrors?.[0]?.issues[0]?.message).toContain('Invalid validator for "PORT": must be a Zod schema');

    // Try with plain object
    let error3: unknown;
    try {
      zenv(
        {
          // @ts-expect-error Testing runtime type check
          PORT: { type: "number" }
        },
        {
          onError: "throw"
        }
      );
    } catch (error) {
      error3 = error;
    }
    expect(error3).toBeInstanceOf(ZenvError);
    const zenvErr3 = error3 as ZenvError;
    expect(zenvErr3.zodErrors?.[0]?.issues[0]?.message).toContain('Invalid validator for "PORT": must be a Zod schema');

    // Try with function that returns non-Zod
    let error4: unknown;
    try {
      zenv(
        {
          // @ts-expect-error Testing runtime type check
          PORT: ((): unknown => "not a schema")()
        },
        {
          onError: "throw"
        }
      );
    } catch (error) {
      error4 = error;
    }
    expect(error4).toBeInstanceOf(ZenvError);
    const zenvErr4 = error4 as ZenvError;
    expect(zenvErr4.zodErrors?.[0]?.issues[0]?.message).toContain('Invalid validator for "PORT": must be a Zod schema');

    suppressRestore();
    env.restore();
  });

  it("should properly categorize missing required variables in error messages", () => {
    const env = mockProcessEnv({
      // Intentionally not setting required variables
    });

    const { restore: suppressRestore } = suppressConsole();

    let caughtError: unknown;
    try {
      zenv(
        {
          API_KEY: str(), // Required, no default
          DATABASE_URL: str(), // Required, no default
          PORT: num() // Required, no default
        },
        {
          onError: "throw"
        }
      );
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(ZenvError);
    const zenvErr = caughtError as ZenvError;
    // The error message is generic, detailed info is in zodErrors
    expect(zenvErr.message).toBe("Environment validation failed");
    expect(zenvErr.zodErrors).toBeDefined();
    expect(zenvErr.zodErrors?.length).toBeGreaterThan(0);

    suppressRestore();
    env.restore();
  });

  it("should return partial results with metadata when onError is 'return'", (): void => {
    const env = mockProcessEnv({
      VALID_VAR: "valid"
      // Missing REQUIRED_VAR
    });

    const { restore: suppressRestore } = suppressConsole();

    const result = zenv(
      {
        VALID_VAR: str(),
        REQUIRED_VAR: str() // This will fail validation
      },
      {
        onError: "return",
        clientSafePrefixes: ["NEXT_PUBLIC_", "VITE_"]
      }
    );

    // Check that valid variables are still accessible
    expect(result.VALID_VAR).toBe("valid");

    // Check that __clientSafePrefixes__ property exists but is not enumerable
    // This tests line 435 in core.ts
    expect(result.__clientSafePrefixes__).toEqual(["NEXT_PUBLIC_", "VITE_"]);
    expect(Object.keys(result)).not.toContain("__clientSafePrefixes__");

    // Verify property descriptor
    const descriptor = Object.getOwnPropertyDescriptor(result, "__clientSafePrefixes__");
    expect(descriptor).toBeDefined();
    expect(descriptor?.enumerable).toBe(false);
    expect(descriptor?.writable).toBe(false);
    expect(descriptor?.configurable).toBe(false);

    suppressRestore();
    env.restore();
  });

  it("should handle ZenvError properly with missing variables", (): void => {
    const env = mockProcessEnv({});
    const { restore: suppressRestore } = suppressConsole();

    let caughtError: unknown;
    try {
      zenv(
        {
          MISSING_VAR: str()
        },
        {
          onError: "throw"
        }
      );
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(ZenvError);
    const zenvErr = caughtError as ZenvError;
    expect(zenvErr.message).toBe("Environment validation failed");

    suppressRestore();
    env.restore();
  });

  it("should handle ZenvError properly with invalid variables", (): void => {
    const env = mockProcessEnv({
      PORT: "not-a-number"
    });
    const { restore: suppressRestore } = suppressConsole();

    let caughtError: unknown;
    try {
      zenv(
        {
          PORT: num()
        },
        {
          onError: "throw"
        }
      );
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(ZenvError);
    const zenvErr = caughtError as ZenvError;
    expect(zenvErr.message).toBe("Environment validation failed");

    suppressRestore();
    env.restore();
  });

  it("should handle missing variables with custom Zod schemas", (): void => {
    const env = mockProcessEnv({});
    const { restore: suppressRestore } = suppressConsole();

    const customSchema = z.string().min(10).describe("Custom API key");

    let caughtError: unknown;
    try {
      zenv(
        {
          CUSTOM_API_KEY: customSchema
        },
        {
          onError: "throw"
        }
      );
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(ZenvError);
    const zenvErr = caughtError as ZenvError;
    expect(zenvErr.message).toBe("Environment validation failed");

    suppressRestore();
    env.restore();
  });
});
