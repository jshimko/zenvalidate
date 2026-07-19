/**
 * @module client-inject.test
 * @description Comprehensive tests for the client-inject module
 * Focus on security to ensure server-side secrets NEVER leak to client
 */
import { getClientEnvScript } from "../client-inject";
import { zenv } from "../core";
import { runtime } from "../runtime";
import type { EnvAccessors } from "../types";
import { bool, str } from "../validators";
import { mockRuntime } from "./test-utils";

/**
 * Helper to create a mock environment with required accessor properties
 */
function createMockEnv(vars: Record<string, unknown>): Record<string, unknown> & EnvAccessors {
  const env: Record<string, unknown> = { ...vars };
  return Object.assign(env, {
    isDevelopment: false,
    isDev: false,
    isTest: true,
    isProduction: false,
    isProd: false
  });
}

describe("client-inject - getClientEnvScript", () => {
  describe("Security - Critical Tests", () => {
    it("should NEVER expose server-only secrets with common secret patterns", () => {
      const env = createMockEnv({
        // Public variables (should be included)
        PUBLIC_API_URL: "https://api.example.com",
        PUBLIC_APP_NAME: "MyApp",
        PUBLIC_FEATURE_FLAG: "true",

        // Server secrets (should NEVER be included)
        DATABASE_URL: "postgresql://user:password@localhost/db",
        POSTGRES_URL: "postgresql://admin:secret@db.example.com/prod",
        MONGODB_URI: "mongodb://admin:password@localhost:27017/db",
        REDIS_URL: "redis://default:password@redis.example.com:6379",

        // API Keys and Secrets (should NEVER be included)
        SECRET_KEY: "super-secret-key-123",
        API_SECRET: "api-secret-456",
        PRIVATE_KEY: "-----BEGIN RSA PRIVATE KEY-----",
        JWT_SECRET: "jwt-secret-token",
        SESSION_SECRET: "session-secret-key",
        ENCRYPTION_KEY: "AES256-encryption-key",

        // Service Credentials (should NEVER be included)
        AWS_SECRET_ACCESS_KEY: "aws-secret-key",
        AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
        STRIPE_SECRET_KEY: "sk_live_abc123",
        STRIPE_WEBHOOK_SECRET: "whsec_abc123",
        SENDGRID_API_KEY: "SG.abc123",
        TWILIO_AUTH_TOKEN: "auth-token-123",
        GITHUB_TOKEN: "ghp_abc123",
        OPENAI_API_KEY: "sk-abc123",

        // Other sensitive data (should NEVER be included)
        ADMIN_PASSWORD: "admin123",
        ROOT_PASSWORD: "root123",
        MASTER_KEY: "master-key-456",
        INTERNAL_API_URL: "http://internal.service:8080",
        PRIVATE_ENDPOINT: "https://internal.api.com"
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const clientEnv = extractClientEnv(script);

      // Verify ONLY public variables are included
      expect(Object.keys(clientEnv)).toEqual(["PUBLIC_API_URL", "PUBLIC_APP_NAME", "PUBLIC_FEATURE_FLAG"]);

      // Explicitly verify each secret is NOT exposed
      expect(clientEnv.DATABASE_URL).toBeUndefined();
      expect(clientEnv.POSTGRES_URL).toBeUndefined();
      expect(clientEnv.SECRET_KEY).toBeUndefined();
      expect(clientEnv.API_SECRET).toBeUndefined();
      expect(clientEnv.JWT_SECRET).toBeUndefined();
      expect(clientEnv.AWS_SECRET_ACCESS_KEY).toBeUndefined();
      expect(clientEnv.STRIPE_SECRET_KEY).toBeUndefined();
      expect(clientEnv.ADMIN_PASSWORD).toBeUndefined();

      // Verify script doesn't contain any secret values
      expect(script).not.toContain("password");
      expect(script).not.toContain("secret");
      expect(script).not.toContain("postgresql://");
      expect(script).not.toContain("mongodb://");
      expect(script).not.toContain("sk_live");
      expect(script).not.toContain("ghp_");
    });

    it("should respect prefix boundaries to prevent leaks", () => {
      const env = createMockEnv({
        PUBLIC_KEY: "public-key-value",
        PUBLIC_KEY_SECRET: "this-should-not-leak", // Longer than prefix but contains SECRET
        PUBLIC_: "edge-case-exact-prefix",
        PUBLICKEY: "no-underscore-should-not-match",
        PUBLIC: "missing-underscore-should-not-match",
        NOT_PUBLIC_KEY: "prefix-not-at-start",
        _PUBLIC_KEY: "underscore-before-prefix"
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const clientEnv = extractClientEnv(script);

      // Only exact prefix matches from start should be included
      expect(clientEnv.PUBLIC_KEY).toBe("public-key-value");
      expect(clientEnv.PUBLIC_KEY_SECRET).toBe("this-should-not-leak"); // Matches PUBLIC_ prefix
      expect(clientEnv.PUBLIC_).toBe("edge-case-exact-prefix");

      // These should NOT be included
      expect(clientEnv.PUBLICKEY).toBeUndefined();
      expect(clientEnv.PUBLIC).toBeUndefined();
      expect(clientEnv.NOT_PUBLIC_KEY).toBeUndefined();
      expect(clientEnv._PUBLIC_KEY).toBeUndefined();
    });

    it("should be case-sensitive for prefix matching", () => {
      const env = createMockEnv({
        PUBLIC_VAR: "included",
        public_var: "not-included",
        Public_Var: "not-included",
        PuBlIc_VaR: "not-included"
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const clientEnv = extractClientEnv(script);

      expect(clientEnv.PUBLIC_VAR).toBe("included");
      expect(clientEnv.public_var).toBeUndefined();
      expect(clientEnv.Public_Var).toBeUndefined();
      expect(clientEnv.PuBlIc_VaR).toBeUndefined();
    });

    it("should handle XSS attempts safely by escaping </script> tags", () => {
      const env = createMockEnv({
        PUBLIC_XSS_ATTEMPT: '</script><script>alert("XSS")</script>',
        PUBLIC_QUOTES: "Value with \"quotes\" and 'single quotes'",
        PUBLIC_BACKSLASH: "Path\\with\\backslashes",
        PUBLIC_UNICODE: '{"emoji":"😈","text":"<script>alert(1)</script>"}',
        PUBLIC_HTML: "<img src=x onerror=alert(1)>",
        PUBLIC_JS_CODE: "javascript:alert(document.cookie)",
        PUBLIC_MIXED_CASE: "</ScRiPt>mixed case</SCRIPT>"
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);

      // Verify the script structure
      expect(script).toContain("window.__ZENV_CLIENT__ =");

      // IMPORTANT: </script> tags should be escaped to prevent breaking out of script context
      expect(script).not.toContain("</script>");
      expect(script).not.toContain("</Script>");
      expect(script).not.toContain("</SCRIPT>");

      // Should contain escaped versions
      expect(script).toContain("<\\/script>");

      // Parse and verify values are correctly preserved after escaping
      const clientEnv = extractClientEnv(script);
      expect(clientEnv.PUBLIC_XSS_ATTEMPT).toBe('</script><script>alert("XSS")</script>');
      expect(clientEnv.PUBLIC_QUOTES).toBe("Value with \"quotes\" and 'single quotes'");
      expect(clientEnv.PUBLIC_BACKSLASH).toBe("Path\\with\\backslashes");
      expect(clientEnv.PUBLIC_UNICODE).toBe('{"emoji":"😈","text":"<script>alert(1)</script>"}');
      expect(clientEnv.PUBLIC_HTML).toBe("<img src=x onerror=alert(1)>");
      expect(clientEnv.PUBLIC_JS_CODE).toBe("javascript:alert(document.cookie)");
      expect(clientEnv.PUBLIC_MIXED_CASE).toBe("</ScRiPt>mixed case</SCRIPT>");

      // Verify that when parsed, the values are strings and not executable
      expect(typeof clientEnv.PUBLIC_XSS_ATTEMPT).toBe("string");
      expect(typeof clientEnv.PUBLIC_JS_CODE).toBe("string");
    });
  });

  describe("Basic Functionality", () => {
    it("should return empty string when called on client side", () => {
      const clientMock = mockRuntime("client");

      const env = createMockEnv({
        PUBLIC_VAR: "value"
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      expect(script).toBe("");

      clientMock.restore();
    });

    it("should return valid JavaScript for server side", () => {
      const serverMock = mockRuntime("server");

      const env = createMockEnv({
        PUBLIC_VAR: "value"
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      expect(script).toBe('window.__ZENV_CLIENT__ = {"PUBLIC_VAR":"value"};');

      serverMock.restore();
    });

    it("should filter variables by prefix correctly", () => {
      const env = createMockEnv({
        PUBLIC_VAR1: "public1",
        PUBLIC_VAR2: "public2",
        NEXT_PUBLIC_VAR: "next-public",
        VITE_VAR: "vite",
        SECRET_VAR: "secret",
        PRIVATE_VAR: "private"
      });

      const script = getClientEnvScript(env, ["PUBLIC_", "VITE_"]);
      const clientEnv = extractClientEnv(script);

      expect(clientEnv).toEqual({
        PUBLIC_VAR1: "public1",
        PUBLIC_VAR2: "public2",
        VITE_VAR: "vite"
      });

      expect(clientEnv.NEXT_PUBLIC_VAR).toBeUndefined();
      expect(clientEnv.SECRET_VAR).toBeUndefined();
      expect(clientEnv.PRIVATE_VAR).toBeUndefined();
    });

    it("should handle multiple prefix patterns", () => {
      const env = createMockEnv({
        PUBLIC_VAR: "public",
        NEXT_PUBLIC_VAR: "next",
        VITE_VAR: "vite",
        REACT_APP_VAR: "react",
        OTHER_VAR: "other"
      });

      const script = getClientEnvScript(env, ["PUBLIC_", "NEXT_PUBLIC_", "VITE_", "REACT_APP_"]);
      const clientEnv = extractClientEnv(script);

      expect(Object.keys(clientEnv).sort()).toEqual(["NEXT_PUBLIC_VAR", "PUBLIC_VAR", "REACT_APP_VAR", "VITE_VAR"]);
    });

    it("should exclude undefined values", () => {
      const env = createMockEnv({
        PUBLIC_DEFINED: "value",
        PUBLIC_UNDEFINED: undefined,
        PUBLIC_EMPTY: "",
        PUBLIC_NULL: null,
        PUBLIC_FALSE: false,
        PUBLIC_ZERO: 0
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const clientEnv = extractClientEnv(script);

      expect(clientEnv.PUBLIC_DEFINED).toBe("value");
      expect(clientEnv.PUBLIC_UNDEFINED).toBeUndefined();
      expect(clientEnv.PUBLIC_EMPTY).toBe("");
      expect(clientEnv.PUBLIC_NULL).toBe(null);
      expect(clientEnv.PUBLIC_FALSE).toBe(false);
      expect(clientEnv.PUBLIC_ZERO).toBe(0);

      // Verify undefined is not in the keys
      expect(Object.keys(clientEnv)).not.toContain("PUBLIC_UNDEFINED");
    });
  });

  describe("Auto-detection of clientSafePrefixes", () => {
    it("should use __clientSafePrefixes__ when no explicit prefixes provided", () => {
      const env = createMockEnv({
        PUBLIC_AUTO: "auto-detected",
        SECRET_VAR: "secret",
        __clientSafePrefixes__: ["PUBLIC_"]
      });

      const script = getClientEnvScript(env); // No explicit prefixes
      const clientEnv = extractClientEnv(script);

      expect(clientEnv.PUBLIC_AUTO).toBe("auto-detected");
      expect(clientEnv.SECRET_VAR).toBeUndefined();
    });

    it("should prefer explicit prefixes over __clientSafePrefixes__", () => {
      const env = createMockEnv({
        PUBLIC_VAR: "public",
        CUSTOM_VAR: "custom",
        SECRET_VAR: "secret",
        __clientSafePrefixes__: ["PUBLIC_"]
      });

      const script = getClientEnvScript(env, ["CUSTOM_"]); // Explicit override
      const clientEnv = extractClientEnv(script);

      expect(clientEnv.CUSTOM_VAR).toBe("custom");
      expect(clientEnv.PUBLIC_VAR).toBeUndefined(); // Not included despite __clientSafePrefixes__
      expect(clientEnv.SECRET_VAR).toBeUndefined();
    });

    it("should return empty object when no prefixes configured", () => {
      const env = createMockEnv({
        PUBLIC_VAR: "public",
        SECRET_VAR: "secret"
        // No __clientSafePrefixes__ property
      });

      const script = getClientEnvScript(env); // No prefixes at all
      const clientEnv = extractClientEnv(script);

      expect(clientEnv).toEqual({});
      expect(script).toBe("window.__ZENV_CLIENT__ = {};");
    });

    it("should work with zenv-created environment", () => {
      const env = zenv(
        {
          PUBLIC_API_URL: str({ default: "https://api.example.com" }),
          PUBLIC_APP_NAME: str({ default: "TestApp" }),
          SECRET_KEY: str({ default: "secret123" }),
          DATABASE_URL: str({ default: "postgres://localhost/test" })
        },
        {
          clientSafePrefixes: ["PUBLIC_"],
          onError: "return"
        }
      );

      const script = getClientEnvScript(env);
      const clientEnv = extractClientEnv(script);

      expect(clientEnv.PUBLIC_API_URL).toBe("https://api.example.com");
      expect(clientEnv.PUBLIC_APP_NAME).toBe("TestApp");
      expect(clientEnv.SECRET_KEY).toBeUndefined();
      expect(clientEnv.DATABASE_URL).toBeUndefined();
    });

    it("should verify __clientSafePrefixes__ is non-enumerable", () => {
      const env = zenv(
        {
          PUBLIC_VAR: str({ default: "value" }),
          SECRET_VAR: str({ default: "secret" })
        },
        {
          clientSafePrefixes: ["PUBLIC_"],
          onError: "return"
        }
      );

      // __clientSafePrefixes__ should exist but not be enumerable
      expect(env.__clientSafePrefixes__).toEqual(["PUBLIC_"]);
      expect(Object.keys(env)).not.toContain("__clientSafePrefixes__");
      expect(Object.getOwnPropertyNames(env)).toContain("__clientSafePrefixes__");

      const descriptor = Object.getOwnPropertyDescriptor(env, "__clientSafePrefixes__");
      expect(descriptor?.enumerable).toBe(false);
      expect(descriptor?.writable).toBe(false);
      expect(descriptor?.configurable).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty prefix array", () => {
      const env = createMockEnv({
        PUBLIC_VAR: "public",
        OTHER_VAR: "other"
      });

      const script = getClientEnvScript(env, []); // Empty array
      const clientEnv = extractClientEnv(script);

      expect(clientEnv).toEqual({});
    });

    it("should handle non-string primitive values", () => {
      const env = createMockEnv({
        PUBLIC_STRING: "string",
        PUBLIC_NUMBER: 42,
        PUBLIC_BOOLEAN: true,
        PUBLIC_NULL: null,
        PUBLIC_UNDEFINED: undefined
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const clientEnv = extractClientEnv(script);

      expect(clientEnv.PUBLIC_STRING).toBe("string");
      expect(clientEnv.PUBLIC_NUMBER).toBe(42);
      expect(clientEnv.PUBLIC_BOOLEAN).toBe(true);
      expect(clientEnv.PUBLIC_NULL).toBe(null);
      expect(clientEnv.PUBLIC_UNDEFINED).toBeUndefined();
    });

    it("should handle complex values (objects and arrays)", () => {
      const env = createMockEnv({
        PUBLIC_OBJECT: { key: "value", nested: { prop: 123 } },
        PUBLIC_ARRAY: [1, 2, 3, "four"],
        PUBLIC_MIXED: { arr: [1, 2], obj: { a: "b" } }
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const clientEnv = extractClientEnv(script);

      expect(clientEnv.PUBLIC_OBJECT).toEqual({ key: "value", nested: { prop: 123 } });
      expect(clientEnv.PUBLIC_ARRAY).toEqual([1, 2, 3, "four"]);
      expect(clientEnv.PUBLIC_MIXED).toEqual({ arr: [1, 2], obj: { a: "b" } });
    });

    it("should handle very long values", () => {
      const longString = "x".repeat(10000);
      const env = createMockEnv({
        PUBLIC_LONG: longString,
        PUBLIC_NORMAL: "normal"
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const clientEnv = extractClientEnv(script);

      expect(clientEnv.PUBLIC_LONG).toBe(longString);
      expect(clientEnv.PUBLIC_NORMAL).toBe("normal");
    });

    it("should handle special characters in variable names", () => {
      const env = createMockEnv({
        "PUBLIC_VAR-WITH-DASHES": "dashes",
        "PUBLIC_VAR.WITH.DOTS": "dots",
        PUBLIC_VAR$WITH$DOLLAR: "dollar",
        PUBLIC_123_NUMBERS: "numbers"
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const clientEnv = extractClientEnv(script);

      expect(clientEnv["PUBLIC_VAR-WITH-DASHES"]).toBe("dashes");
      expect(clientEnv["PUBLIC_VAR.WITH.DOTS"]).toBe("dots");
      expect(clientEnv.PUBLIC_VAR$WITH$DOLLAR).toBe("dollar");
      expect(clientEnv.PUBLIC_123_NUMBERS).toBe("numbers");
    });

    it("should handle empty environment object", () => {
      const env = createMockEnv({});

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      expect(script).toBe("window.__ZENV_CLIENT__ = {};");
    });

    it("should handle environment with no matching prefixes", () => {
      const env = createMockEnv({
        SECRET_VAR1: "secret1",
        PRIVATE_VAR2: "private2",
        INTERNAL_VAR3: "internal3"
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const clientEnv = extractClientEnv(script);

      expect(clientEnv).toEqual({});
    });
  });

  describe("Output Format", () => {
    it("should generate valid JavaScript code", () => {
      const env = createMockEnv({
        PUBLIC_VAR: "value"
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);

      // Should be valid JS that can be evaluated
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function(script);
      }).not.toThrow();

      expect(script).toMatch(/^window\.__ZENV_CLIENT__ = .+;$/);
    });

    it("should create parseable JSON object", () => {
      const env = createMockEnv({
        PUBLIC_STRING: "string",
        PUBLIC_NUMBER: 123,
        PUBLIC_BOOL: true,
        PUBLIC_NULL: null,
        PUBLIC_OBJECT: { key: "value" }
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const jsonStr = script.replace("window.__ZENV_CLIENT__ = ", "").replace(";", "");

      let didThrow = false;
      try {
        JSON.parse(jsonStr);
      } catch {
        didThrow = true;
      }
      expect(didThrow).toBe(false);

      type ParsedType = {
        PUBLIC_STRING: string;
        PUBLIC_NUMBER: number;
        PUBLIC_BOOL: boolean;
        PUBLIC_NULL: null;
        PUBLIC_OBJECT: { key: string };
      };
      const parsed = JSON.parse(jsonStr) as ParsedType;
      expect(parsed.PUBLIC_STRING).toBe("string");
      expect(parsed.PUBLIC_NUMBER).toBe(123);
      expect(parsed.PUBLIC_BOOL).toBe(true);
      expect(parsed.PUBLIC_NULL).toBe(null);
      expect(parsed.PUBLIC_OBJECT).toEqual({ key: "value" });
    });

    it("should maintain proper JSON structure for nested data", () => {
      const env = createMockEnv({
        PUBLIC_NESTED: {
          level1: {
            level2: {
              level3: "deep-value",
              array: [1, 2, { nested: true }]
            }
          }
        }
      });

      const script = getClientEnvScript(env, ["PUBLIC_"]);
      const clientEnv = extractClientEnv(script);

      expect(clientEnv.PUBLIC_NESTED).toEqual({
        level1: {
          level2: {
            level3: "deep-value",
            array: [1, 2, { nested: true }]
          }
        }
      });
    });
  });

  describe("Runtime Behavior", () => {
    it("should check runtime.isClient for client detection", () => {
      const isClientSpy = vi.spyOn(runtime, "isClient", "get");

      // Mock as client without existing window.__ZENV_CLIENT__
      isClientSpy.mockReturnValue(true);
      const env = createMockEnv({ PUBLIC_VAR: "value" });

      const scriptOnClient = getClientEnvScript(env, ["PUBLIC_"]);
      expect(scriptOnClient).toBe("");
      expect(isClientSpy).toHaveBeenCalled();

      // Mock as server
      isClientSpy.mockReturnValue(false);
      const scriptOnServer = getClientEnvScript(env, ["PUBLIC_"]);
      expect(scriptOnServer).toContain("window.__ZENV_CLIENT__");

      isClientSpy.mockRestore();
    });

    it("should handle hydration scenario by returning stable script when window.__ZENV_CLIENT__ exists", () => {
      const isClientSpy = vi.spyOn(runtime, "isClient", "get");

      // Set up window object with existing __ZENV_CLIENT__ (simulating SSR injection)
      const originalWindow = global.window;
      global.window = {
        __ZENV_CLIENT__: {
          PUBLIC_API_URL: "https://api.example.com",
          PUBLIC_APP_NAME: "TestApp"
        }
      } as unknown as Window & typeof globalThis;

      // Mock as client (during hydration)
      isClientSpy.mockReturnValue(true);
      const env = createMockEnv({ PUBLIC_VAR: "value" });

      const scriptDuringHydration = getClientEnvScript(env, ["PUBLIC_"]);

      // Should return a script that recreates the same window.__ZENV_CLIENT__
      expect(scriptDuringHydration).toBe(
        'window.__ZENV_CLIENT__ = {"PUBLIC_API_URL":"https://api.example.com","PUBLIC_APP_NAME":"TestApp"};'
      );

      // Clean up
      global.window = originalWindow;
      isClientSpy.mockRestore();
    });

    it("should escape </script> tags even during hydration", () => {
      const isClientSpy = vi.spyOn(runtime, "isClient", "get");

      // Set up window object with XSS attempt in existing __ZENV_CLIENT__
      const originalWindow = global.window;
      global.window = {
        __ZENV_CLIENT__: {
          PUBLIC_XSS: "</script><script>alert('XSS')</script>"
        }
      } as unknown as Window & typeof globalThis;

      // Mock as client (during hydration)
      isClientSpy.mockReturnValue(true);
      const env = createMockEnv({ PUBLIC_VAR: "value" });

      const scriptDuringHydration = getClientEnvScript(env, ["PUBLIC_"]);

      // Should escape the </script> tag
      expect(scriptDuringHydration).not.toContain("</script>");
      expect(scriptDuringHydration).toContain("<\\/script>");

      // Clean up
      global.window = originalWindow;
      isClientSpy.mockRestore();
    });
  });

  describe("Boolean Default Values", () => {
    it("should correctly serialize boolean values with defaults to client", () => {
      // Test with actual zenv to ensure the full flow works
      const mockEnv = {
        PUBLIC_FEATURE_ENABLED: undefined, // Should use default
        PUBLIC_DEBUG_MODE: "false", // Explicitly false
        PUBLIC_SHOW_BANNER: "true", // Explicitly true
        SECRET_BOOL: "true" // Server-only, should not be included
      };

      const originalEnv = process.env;
      process.env = mockEnv;

      try {
        const env = zenv(
          {
            PUBLIC_FEATURE_ENABLED: bool({ default: true }), // Default to true
            PUBLIC_DEBUG_MODE: bool({ default: true }), // Default true, but explicitly set to false
            PUBLIC_SHOW_BANNER: bool({ default: false }), // Default false, but explicitly set to true
            SECRET_BOOL: bool({ default: true }) // No PUBLIC prefix, should not be exposed
          },
          {
            clientSafePrefixes: ["PUBLIC_"],
            onError: "return"
          }
        );

        const script = getClientEnvScript(env);
        const clientEnv = extractClientEnv(script);

        // Verify boolean values are correctly serialized
        expect(clientEnv.PUBLIC_FEATURE_ENABLED).toBe(true); // Should use default
        expect(clientEnv.PUBLIC_DEBUG_MODE).toBe(false); // Should respect explicit false
        expect(clientEnv.PUBLIC_SHOW_BANNER).toBe(true); // Should respect explicit true
        expect(clientEnv.SECRET_BOOL).toBeUndefined(); // Should not be exposed
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle boolean defaults with environment-specific values", () => {
      const originalEnv = process.env;
      const originalNodeEnv = process.env.NODE_ENV;

      // Test development environment
      process.env = {
        NODE_ENV: "development"
      };

      try {
        const env = zenv(
          {
            PUBLIC_DEV_TOOLS: bool({
              default: false, // Production default
              devDefault: true // Development default
            })
          },
          {
            clientSafePrefixes: ["PUBLIC_"],
            onError: "return"
          }
        );

        const script = getClientEnvScript(env);
        const clientEnv = extractClientEnv(script);

        // In development, should use devDefault
        expect(clientEnv.PUBLIC_DEV_TOOLS).toBe(true);
      } finally {
        process.env = originalEnv;
        if (originalNodeEnv !== undefined) {
          process.env.NODE_ENV = originalNodeEnv;
        }
      }
    });
  });
});

/**
 * Helper function to extract the client environment from the generated script
 */
function extractClientEnv(script: string): Record<string, unknown> {
  if (script === "") return {};

  const jsonStr = script.replace("window.__ZENV_CLIENT__ = ", "").replace(";", "");
  return JSON.parse(jsonStr) as Record<string, unknown>;
}
