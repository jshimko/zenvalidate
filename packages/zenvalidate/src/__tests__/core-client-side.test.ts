/**
 * @module core-client-side.test
 * @description Tests for client-side specific behaviors in core.ts
 */
import { zenv } from "../core";
import { runtime } from "../runtime";
import { str } from "../validators";
import { mockProcessEnv, mockRuntime, suppressConsole } from "./test-utils";

describe("client-side server-only variable handling", () => {
  it("should skip validation of server-only variables on client", () => {
    // This tests lines 295-305 in core.ts
    const clientMock = mockRuntime("client");
    const env = mockProcessEnv({
      // Client-safe variables are present
      NEXT_PUBLIC_API_URL: "https://api.example.com",
      PUBLIC_VERSION: "1.0.0"
      // Server-only variables are NOT present (typical in browser)
      // DATABASE_URL and SECRET_KEY are missing
    });

    // This should NOT throw even though DATABASE_URL and SECRET_KEY are missing
    // Because on client-side, server-only variables are skipped
    const result = zenv(
      {
        // Client-safe (auto-exposed via prefix)
        NEXT_PUBLIC_API_URL: str(),
        PUBLIC_VERSION: str(),
        // Server-only (no prefix, not explicitly exposed)
        DATABASE_URL: str(),
        SECRET_KEY: str()
      },
      {
        clientSafePrefixes: ["NEXT_PUBLIC_", "PUBLIC_"]
      }
    );

    // Client-safe variables should be accessible
    expect(result.NEXT_PUBLIC_API_URL).toBe("https://api.example.com");
    expect(result.PUBLIC_VERSION).toBe("1.0.0");

    // Server-only variables should be undefined (through proxy) on client
    // They're not in the validated object but proxy returns undefined for non-existent keys
    expect(result.DATABASE_URL).toBeUndefined();
    expect(result.SECRET_KEY).toBeUndefined();

    clientMock.restore();
    env.restore();
  });

  it("should skip validation for explicitly non-exposed variables on client", () => {
    const clientMock = mockRuntime("client");
    const env = mockProcessEnv({
      PUBLIC_VAR: "public"
      // SERVER_ONLY_VAR is missing
    });

    const result = zenv(
      {
        PUBLIC_VAR: str({
          client: { expose: true }
        }),
        SERVER_ONLY_VAR: str({
          client: { expose: false } // Explicitly not exposed
        })
      },
      {}
    );

    expect(result.PUBLIC_VAR).toBe("public");
    expect(result.SERVER_ONLY_VAR).toBeUndefined();

    clientMock.restore();
    env.restore();
  });

  it("should validate explicitly exposed variables on client", () => {
    const clientMock = mockRuntime("client");
    const env = mockProcessEnv({
      API_HOST: "api.example.com"
    });

    const result = zenv(
      {
        API_HOST: str({
          client: {
            expose: true,
            transform: (host) => `https://${host}`
          }
        }),
        SECRET_KEY: str() // Not exposed, should be skipped
      },
      {}
    );

    // Explicitly exposed variable should work
    expect(result.API_HOST).toBe("https://api.example.com");

    // Non-exposed should return undefined
    expect(result.SECRET_KEY).toBeUndefined();

    clientMock.restore();
    env.restore();
  });

  it("should use client devDefault when variable is missing in development", () => {
    // This tests line 137 in core.ts
    const clientMock = mockRuntime("client");

    // Mock development environment
    vi.spyOn(runtime, "isDevelopment", "get").mockReturnValue(true);
    vi.spyOn(runtime, "nodeEnv", "get").mockReturnValue("development");

    const env = mockProcessEnv({
      NODE_ENV: "development"
      // NEXT_PUBLIC_DEBUG_MODE is not set in environment
    });

    const result = zenv(
      {
        NEXT_PUBLIC_DEBUG_MODE: str({
          client: {
            expose: true,
            devDefault: "client-dev-debug", // Client-specific devDefault
            default: "client-prod-default"
          },
          devDefault: "server-dev-debug", // Server devDefault (should be ignored on client)
          default: "server-prod-default"
        })
      },
      {
        clientSafePrefixes: ["NEXT_PUBLIC_"]
      }
    );

    // Should use client's devDefault in development when variable is missing
    expect(result.NEXT_PUBLIC_DEBUG_MODE).toBe("client-dev-debug");

    vi.restoreAllMocks();
    clientMock.restore();
    env.restore();
  });

  it("should use client default when variable is missing in production", () => {
    const clientMock = mockRuntime("client");

    // Mock production environment
    vi.spyOn(runtime, "isProduction", "get").mockReturnValue(true);
    vi.spyOn(runtime, "isDevelopment", "get").mockReturnValue(false);
    vi.spyOn(runtime, "nodeEnv", "get").mockReturnValue("production");

    const env = mockProcessEnv({
      NODE_ENV: "production"
      // NEXT_PUBLIC_API_URL is not set
    });

    const result = zenv(
      {
        NEXT_PUBLIC_API_URL: str({
          client: {
            expose: true,
            default: "https://api.production.com" // Client default
          },
          default: "https://internal.api.com" // Server default
        })
      },
      {
        clientSafePrefixes: ["NEXT_PUBLIC_"]
      }
    );

    // Should use client's default in production
    expect(result.NEXT_PUBLIC_API_URL).toBe("https://api.production.com");

    vi.restoreAllMocks();
    clientMock.restore();
    env.restore();
  });

  describe("client default resolution in test environment", () => {
    // NODE_ENV is already "test" under vitest, so no runtime getter spying is needed
    it("should use client testDefault over client default in test", () => {
      const clientMock = mockRuntime("client");
      const env = mockProcessEnv({ NODE_ENV: "test" });

      const result = zenv({
        FLAG: str({
          default: undefined,
          client: {
            expose: true,
            testDefault: "client-test",
            default: "client-prod"
          }
        })
      });

      expect(result.FLAG).toBe("client-test");

      clientMock.restore();
      env.restore();
    });

    it("should inherit client devDefault in test when client testDefault is not set", () => {
      const clientMock = mockRuntime("client");
      const env = mockProcessEnv({ NODE_ENV: "test" });

      const result = zenv({
        FLAG: str({
          default: undefined,
          client: {
            expose: true,
            devDefault: "client-dev",
            default: "client-prod"
          }
        })
      });

      expect(result.FLAG).toBe("client-dev");

      clientMock.restore();
      env.restore();
    });

    it("should block inheritance in test when client testDefault is explicitly undefined", () => {
      const clientMock = mockRuntime("client");
      const env = mockProcessEnv({ NODE_ENV: "test" });

      const result = zenv({
        FLAG: str({
          default: undefined,
          client: {
            expose: true,
            testDefault: undefined,
            devDefault: "client-dev",
            default: "client-prod"
          }
        })
      });

      expect(result.FLAG).toBe(undefined);

      clientMock.restore();
      env.restore();
    });

    it("should not fall through to client default in development when client devDefault is explicitly undefined", () => {
      const clientMock = mockRuntime("client");
      vi.spyOn(runtime, "isDevelopment", "get").mockReturnValue(true);
      vi.spyOn(runtime, "nodeEnv", "get").mockReturnValue("development");
      const env = mockProcessEnv({ NODE_ENV: "development" });

      const result = zenv({
        FLAG: str({
          default: undefined,
          client: {
            expose: true,
            devDefault: undefined,
            default: "client-prod"
          }
        })
      });

      expect(result.FLAG).toBe(undefined);

      vi.restoreAllMocks();
      clientMock.restore();
      env.restore();
    });

    it("should not consult client testDefault or devDefault in production", () => {
      const clientMock = mockRuntime("client");
      vi.spyOn(runtime, "isProduction", "get").mockReturnValue(true);
      vi.spyOn(runtime, "isDevelopment", "get").mockReturnValue(false);
      vi.spyOn(runtime, "nodeEnv", "get").mockReturnValue("production");
      const env = mockProcessEnv({ NODE_ENV: "production" });

      const result = zenv({
        FLAG: str({
          default: undefined,
          client: {
            expose: true,
            testDefault: "client-test",
            devDefault: "client-dev",
            default: "client-prod"
          }
        })
      });

      expect(result.FLAG).toBe("client-prod");

      vi.restoreAllMocks();
      clientMock.restore();
      env.restore();
    });

    it("should prefer an explicitly set env value over client defaults in test", () => {
      const clientMock = mockRuntime("client");
      const env = mockProcessEnv({ NODE_ENV: "test", FLAG: "actual-value" });

      const result = zenv({
        FLAG: str({
          default: undefined,
          client: {
            expose: true,
            testDefault: "client-test"
          }
        })
      });

      expect(result.FLAG).toBe("actual-value");

      clientMock.restore();
      env.restore();
    });

    it("should override the server-resolved base default when client default is explicitly undefined", () => {
      const clientMock = mockRuntime("client");
      vi.spyOn(runtime, "isProduction", "get").mockReturnValue(true);
      vi.spyOn(runtime, "isDevelopment", "get").mockReturnValue(false);
      vi.spyOn(runtime, "nodeEnv", "get").mockReturnValue("production");
      const env = mockProcessEnv({ NODE_ENV: "production" });

      const result = zenv({
        FLAG: str({
          default: "server-val",
          client: {
            expose: true,
            default: undefined
          }
        })
      });

      expect(result.FLAG).toBe(undefined);

      vi.restoreAllMocks();
      clientMock.restore();
      env.restore();
    });

    it("should treat an empty-string env value as unset and apply client defaults in test", () => {
      const clientMock = mockRuntime("client");
      const env = mockProcessEnv({ NODE_ENV: "test", FLAG: "" });

      const result = zenv({
        FLAG: str({
          default: undefined,
          client: {
            expose: true,
            testDefault: "client-test"
          }
        })
      });

      expect(result.FLAG).toBe("client-test");

      clientMock.restore();
      env.restore();
    });

    it("should treat an empty-string env value as explicitly set when emptyStringAsMissing is false", () => {
      const clientMock = mockRuntime("client");
      const env = mockProcessEnv({ NODE_ENV: "test", FLAG: "" });

      const result = zenv(
        {
          FLAG: str({
            default: undefined,
            client: {
              expose: true,
              testDefault: "client-test"
            }
          })
        },
        { emptyStringAsMissing: false }
      );

      expect(result.FLAG).toBe("");

      clientMock.restore();
      env.restore();
    });
  });

  it("should handle mixed client/server variables correctly", () => {
    const clientMock = mockRuntime("client");
    const env = mockProcessEnv({
      NEXT_PUBLIC_APP_NAME: "MyApp",
      VITE_API_URL: "https://api.example.com",
      PUBLIC_VERSION: "2.0.0"
      // Server-only variables are missing: DATABASE_URL, REDIS_URL, JWT_SECRET
    });

    const result = zenv(
      {
        // Auto-exposed via prefixes
        NEXT_PUBLIC_APP_NAME: str(),
        VITE_API_URL: str(),
        PUBLIC_VERSION: str(),
        // Server-only (no prefix)
        DATABASE_URL: str(),
        REDIS_URL: str(),
        JWT_SECRET: str()
      },
      {
        clientSafePrefixes: ["NEXT_PUBLIC_", "VITE_", "PUBLIC_"]
      }
    );

    // Client variables should work
    expect(result.NEXT_PUBLIC_APP_NAME).toBe("MyApp");
    expect(result.VITE_API_URL).toBe("https://api.example.com");
    expect(result.PUBLIC_VERSION).toBe("2.0.0");

    // Server variables should return undefined
    expect(result.DATABASE_URL).toBeUndefined();
    expect(result.REDIS_URL).toBeUndefined();
    expect(result.JWT_SECRET).toBeUndefined();

    clientMock.restore();
    env.restore();
  });

  it("should handle onClientAccessError options on client", () => {
    const clientMock = mockRuntime("client");
    // Also mock development mode for warning to be logged
    const devMock = vi.spyOn(runtime, "isDevelopment", "get").mockReturnValue(true);
    const env = mockProcessEnv({
      PUBLIC_VAR: "public"
    });
    const { restore: suppressRestore, getWarnings } = suppressConsole();

    // Test with "warn" mode
    const result = zenv(
      {
        PUBLIC_VAR: str({ client: { expose: true } }),
        SECRET_VAR: str()
      },
      {
        onClientAccessError: "warn"
      }
    );

    // Access server-only variable
    const value = result.SECRET_VAR;
    expect(value).toBeUndefined();

    // Should have logged a warning
    const warnings = getWarnings();
    expect(warnings.length).toBeGreaterThan(0);

    suppressRestore();
    devMock.mockRestore();
    clientMock.restore();
    env.restore();
  });

  it("should skip server-only validation even with required custom schemas", () => {
    const clientMock = mockRuntime("client");
    const env = mockProcessEnv({
      NEXT_PUBLIC_CONFIG: '{"enabled":true}'
      // SERVER_CONFIG is missing
    });

    // Custom required schemas
    const jsonSchema = str().transform((val): unknown => JSON.parse(val));

    const result = zenv(
      {
        NEXT_PUBLIC_CONFIG: jsonSchema,
        SERVER_CONFIG: jsonSchema // Required schema but server-only
      },
      {
        clientSafePrefixes: ["NEXT_PUBLIC_"]
      }
    );

    expect(result.NEXT_PUBLIC_CONFIG).toEqual({ enabled: true });
    expect(result.SERVER_CONFIG).toBeUndefined();

    clientMock.restore();
    env.restore();
  });
});
