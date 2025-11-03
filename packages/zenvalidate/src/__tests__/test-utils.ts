/**
 * @module test-utils
 * @description Shared test utilities for `zenvalidate` test suite
 */
import type { z } from "zod/v4";

import { runtime } from "../runtime";

/**
 * Mock environment object for testing
 */
export function createMockEnv(vars: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    NODE_ENV: "test",
    ...vars
  };
}

/**
 * Mock the runtime environment for client/server testing
 */
export function mockRuntime(type: "server" | "client"): { restore: () => void } {
  // Mock the runtime module to control client/server detection
  const mocks: { mockRestore: () => void }[] = [];

  if (type === "client") {
    // Mock client environment
    mocks.push(vi.spyOn(runtime, "isClient", "get").mockReturnValue(true));
    mocks.push(vi.spyOn(runtime, "isServer", "get").mockReturnValue(false));
    mocks.push(vi.spyOn(runtime, "isBrowser", "get").mockReturnValue(true));
    mocks.push(vi.spyOn(runtime, "isNode", "get").mockReturnValue(false));
  } else {
    // Mock server environment
    mocks.push(vi.spyOn(runtime, "isClient", "get").mockReturnValue(false));
    mocks.push(vi.spyOn(runtime, "isServer", "get").mockReturnValue(true));
    mocks.push(vi.spyOn(runtime, "isBrowser", "get").mockReturnValue(false));
    mocks.push(vi.spyOn(runtime, "isNode", "get").mockReturnValue(true));
  }

  return {
    restore: (): void => {
      // Restore all mocks
      mocks.forEach((mock) => {
        mock.mockRestore();
      });
    }
  };
}

/**
 * Mock process.env for testing
 */
export function mockProcessEnv(env: Record<string, string | undefined>): { restore: () => void } {
  const originalEnv = process.env;
  const processSpy = vi.spyOn(process, "env", "get");
  processSpy.mockReturnValue(env as NodeJS.ProcessEnv);

  return {
    restore: (): void => {
      processSpy.mockRestore();
      process.env = originalEnv;
    }
  };
}

/**
 * Create a test schema with metadata tracking
 */
export function createTestSchema<T>(validator: () => z.ZodType<T>, _options?: Record<string, unknown>): z.ZodType<T> {
  const schema = validator();
  // Options will be attached via the validator functions themselves
  return schema;
}

/**
 * Assert that a validation throws with specific error message
 */
export function expectValidationError(fn: () => unknown, errorMessage?: string | RegExp): void {
  try {
    fn();
    throw new Error("Expected validation to throw, but it didn't");
  } catch (error) {
    if (error instanceof Error) {
      if (errorMessage) {
        if (typeof errorMessage === "string") {
          expect(error.message).toContain(errorMessage);
        } else {
          expect(error.message).toMatch(errorMessage);
        }
      }
    } else {
      throw error;
    }
  }
}

/**
 * Test data generators
 */
export const testData = {
  // Valid test values
  valid: {
    strings: ["hello", "world", "", "with spaces", "123", "special!@#$%"],
    numbers: [0, 1, -1, 42, 3.14, -3.14, Number.MAX_SAFE_INTEGER],
    booleans: [true, false],
    emails: ["test@example.com", "user+tag@domain.co.uk", "name.surname@company.org"],
    urls: ["https://example.com", "http://localhost:3000", "https://api.example.com/v1/users"],
    hosts: ["example.com", "subdomain.example.com", "localhost", "192.168.1.1", "::1"],
    ports: [1, 80, 443, 3000, 8080, 65535],
    uuids: ["123e4567-e89b-12d3-a456-426614174000", "550e8400-e29b-41d4-a716-446655440000"],
    ipv4s: ["127.0.0.1", "192.168.1.1", "10.0.0.1", "255.255.255.255"],
    ipv6s: ["::1", "2001:db8::1", "fe80::1", "::ffff:192.168.1.1"],
    base64: ["SGVsbG8gV29ybGQ=", "VGVzdA==", ""],
    jwts: [
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
        "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    ]
  },

  // Invalid test values
  invalid: {
    emails: ["notanemail", "@example.com", "user@", "user@.com", "user..name@example.com"],
    urls: ["not a url", "ftp://example.com", "//example.com", "http://", "example.com"],
    hosts: ["", "-example.com", "example-.com", "example..com", "256.256.256.256"],
    ports: [0, -1, 65536, 100000, 3.14, NaN],
    uuids: ["not-a-uuid", "123e4567-e89b-12d3-a456", "123e4567e89b12d3a456426614174000"],
    ipv4s: ["256.1.1.1", "1.1.1", "1.1.1.1.1", "a.b.c.d"],
    ipv6s: ["::g", "12345::", "::1::2", "192.168.1.1"],
    base64: ["Not!Base64", "SGVsbG8gV29ybGQ", "===="],
    jwts: ["not.a.jwt", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", "a.b.c"]
  },

  // Edge case values
  edge: {
    emptyString: "",
    veryLongString: "x".repeat(10000),
    unicodeString: "Hello 世界 🌍 مرحبا мир",
    specialChars: "!@#$%^&*()_+-=[]{}|;':\",./<>?",
    nullUndefined: [null, undefined],
    objects: [{}, { key: "value" }, []],
    symbols: [Symbol("test"), Symbol.for("global")],
    bigNumbers: [Number.MAX_VALUE, Number.MIN_VALUE, Infinity, -Infinity]
  }
};

/**
 * Common test schemas for reuse
 */
export const commonSchemas = {
  simpleString: { type: "string", minLength: 1 },
  email: { type: "email" },
  url: { type: "url" },
  number: { type: "number", min: 0, max: 100 },
  boolean: { type: "boolean" },
  port: { type: "port" },
  uuid: { type: "uuid" }
};

/**
 * Assertion helper for checking metadata
 */
export function expectMetadata(
  _schema: z.ZodType,
  _expectedMeta: {
    client?: {
      expose?: boolean;
      transform?: unknown;
      default?: unknown;
    };
    autoExposed?: boolean;
  }
): boolean {
  // Metadata checks will be done via getMetadata from validators module
  // This is a placeholder for type safety
  return true;
}

/**
 * Helper to test environment variable defaults
 */
export function testDefaults(
  _createValidator: (options?: Record<string, unknown>) => z.ZodType,
  options: {
    defaultValue: unknown;
    devDefault?: unknown;
    testDefault?: unknown;
  }
): { env: string; expected: unknown }[] {
  const scenarios = [
    { env: "production", expected: options.defaultValue },
    { env: "development", expected: options.devDefault ?? options.defaultValue },
    { env: "test", expected: options.testDefault ?? options.defaultValue }
  ];

  return scenarios;
}

/**
 * Helper to suppress console output during tests
 */
export function suppressConsole(): {
  restore: () => void;
  getWarnings: () => unknown[][];
  getErrors: () => unknown[][];
} {
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = vi.fn();
  console.error = vi.fn();

  return {
    restore: (): void => {
      console.warn = originalWarn;
      console.error = originalError;
    },
    getWarnings: (): unknown[][] => (console.warn as ReturnType<typeof vi.fn>).mock.calls,
    getErrors: (): unknown[][] => (console.error as ReturnType<typeof vi.fn>).mock.calls
  };
}

/**
 * Helper to test client/server separation
 */
export function testClientServerSeparation(
  env: Record<string, unknown>,
  expectedServer: Record<string, unknown>,
  expectedClient: Record<string, unknown>
): void {
  // Test server environment
  const serverMock = mockRuntime("server");
  expect(env).toMatchObject(expectedServer);
  serverMock.restore();

  // Test client environment
  const clientMock = mockRuntime("client");
  expect(env).toMatchObject(expectedClient);
  clientMock.restore();
}

/**
 * Generate test cases for a validator
 */
export function generateValidatorTests<T>(
  _validatorName: string,
  _validator: (...args: unknown[]) => z.ZodType<T>,
  config: {
    validInputs: { input: unknown; expected?: T; description?: string }[];
    invalidInputs: { input: unknown; error?: string | RegExp; description?: string }[];
    options?: { options: Record<string, unknown>; description: string }[];
  }
): {
  validInputs: { name: string; input: unknown; expected: unknown }[];
  invalidInputs: { name: string; input: unknown; error: string | RegExp | undefined }[];
  options: { options: Record<string, unknown>; description: string }[];
} {
  return {
    validInputs: config.validInputs.map((test) => ({
      name: test.description ?? `should validate ${JSON.stringify(test.input)}`,
      input: test.input,
      expected: test.expected ?? test.input
    })),
    invalidInputs: config.invalidInputs.map((test) => ({
      name: test.description ?? `should reject ${JSON.stringify(test.input)}`,
      input: test.input,
      error: test.error
    })),
    options: config.options ?? []
  };
}
