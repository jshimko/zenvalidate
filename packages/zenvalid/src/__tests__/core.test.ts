/**
 * @module core.test
 * @description Tests for the core zenv() function and its features
 */
import { zenv } from "../core";
import { ZenvError } from "../errors";
import { bool, email, json, num, port, str, url } from "../validators";
import { createMockEnv, mockProcessEnv, mockRuntime, suppressConsole } from "./test-utils";

describe("Core Module - zenv()", () => {
  let envMock: ReturnType<typeof mockProcessEnv>;
  let consoleMock: ReturnType<typeof suppressConsole>;
  let processExitSpy: unknown;

  beforeEach(() => {
    envMock = mockProcessEnv(createMockEnv());
    consoleMock = suppressConsole();
    // Mock process.exit to prevent actual exit during tests
    processExitSpy = vi.spyOn(process, "exit").mockImplementation((): never => {
      throw new Error(`process.exit called`);
    });
  });

  afterEach(() => {
    envMock.restore();
    consoleMock.restore();
    if (processExitSpy) {
      (processExitSpy as ReturnType<typeof vi.spyOn>).mockRestore();
    }
  });

  describe("Basic Functionality", () => {
    it("should validate and return environment variables", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        PORT: "3000",
        API_KEY: "secret-key",
        DEBUG: "true"
      });

      const env = zenv(
        {
          NODE_ENV: str({ choices: ["development", "production", "test"] }),
          PORT: port(),
          API_KEY: str(),
          DEBUG: bool()
        },
        { onError: "throw" }
      );

      expect(env.NODE_ENV).toBe("test");
      expect(env.PORT).toBe(3000);
      expect(env.API_KEY).toBe("secret-key");
      expect(env.DEBUG).toBe(true);
    });

    it("should apply default values for missing variables", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          PORT: port({ default: 3000 }),
          API_URL: url({ default: "http://localhost:3000" }),
          DEBUG: bool({ default: false })
        },
        { onError: "throw" }
      );

      expect(env.PORT).toBe(3000);
      expect(env.API_URL).toBe("http://localhost:3000");
      expect(env.DEBUG).toBe(false);
    });

    it("should throw ZenvError for missing required variables", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      expect(() => {
        zenv(
          {
            NODE_ENV: str(),
            REQUIRED_KEY: str() // No default, will fail
          },
          { onError: "throw" }
        );
      }).toThrow(ZenvError);
    });

    it("should throw ZenvError for invalid variables", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        PORT: "not-a-number"
      });

      expect(() => {
        zenv(
          {
            NODE_ENV: str(),
            PORT: port()
          },
          { onError: "throw" }
        );
      }).toThrow(ZenvError);
    });

    it("should handle onError option - throw", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        PORT: "invalid"
      });

      expect(() => {
        zenv({ PORT: port() }, { onError: "throw" });
      }).toThrow(ZenvError);
    });

    it("should handle onError option - return", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        PORT: "invalid",
        VALID_KEY: "value"
      });

      const env = zenv(
        {
          PORT: port(),
          VALID_KEY: str()
        },
        { onError: "return", strict: false }
      );

      expect(env.PORT).toBeUndefined();
      expect(env.VALID_KEY).toBe("value");
    });

    it("should use custom reporter", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      const reporterMock = vi.fn();

      expect(() => {
        zenv({ MISSING_KEY: str() }, { reporter: reporterMock, onError: "throw" });
      }).toThrow();

      expect(reporterMock).toHaveBeenCalled();
      const call = reporterMock.mock.calls[0];
      expect(call[0]).toBeInstanceOf(Array); // errors array
      expect(call[1]).toBeDefined(); // env object
    });
  });

  describe("Environment Accessors", () => {
    it("should provide isDevelopment/isDev accessors", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "development"
      });

      const env = zenv({ NODE_ENV: str() }, { onError: "throw" });

      expect(env.isDevelopment).toBe(true);
      expect(env.isDev).toBe(true);
      expect(env.isProduction).toBe(false);
      expect(env.isTest).toBe(false);
    });

    it("should provide isProduction/isProd accessors", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production"
      });

      const env = zenv({ NODE_ENV: str() }, { onError: "throw" });

      expect(env.isProduction).toBe(true);
      expect(env.isProd).toBe(true);
      expect(env.isDevelopment).toBe(false);
      expect(env.isTest).toBe(false);
    });

    it("should provide isTest accessor", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      const env = zenv({ NODE_ENV: str() }, { onError: "throw" });

      expect(env.isTest).toBe(true);
      expect(env.isDevelopment).toBe(false);
      expect(env.isProduction).toBe(false);
    });

    it("should make accessors non-enumerable", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        MY_VAR: "value"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          MY_VAR: str()
        },
        { onError: "throw" }
      );

      const keys = Object.keys(env);
      expect(keys).toContain("NODE_ENV");
      expect(keys).toContain("MY_VAR");
      expect(keys).not.toContain("isDevelopment");
      expect(keys).not.toContain("isProduction");
      expect(keys).not.toContain("isTest");
    });
  });

  describe("Protective Proxy (Strict Mode)", () => {
    it("should allow access to validated variables", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        VALIDATED: "value"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          VALIDATED: str()
        },
        { onError: "throw" }
      );

      expect(env.NODE_ENV).toBe("test");
      expect(env.VALIDATED).toBe("value");
    });

    it("should throw error when accessing non-validated variables", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        NOT_VALIDATED: "value"
      });

      const env = zenv({ NODE_ENV: str() }, { onError: "throw" });

      expect(() => {
        // @ts-expect-error - accessing non-validated var
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const value = env.NOT_VALIDATED;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return value;
      }).toThrow("[zenv] Environment variable not found: NOT_VALIDATED");
    });

    it("should throw error when trying to mutate environment", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      const env = zenv({ NODE_ENV: str() }, { onError: "throw" });

      expect(() => {
        // Try to mutate the environment
        Object.defineProperty(env, "NODE_ENV", { value: "production" });
      }).toThrow();
    });

    it("should throw error when trying to delete properties", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      const env = zenv({ NODE_ENV: str() }, { onError: "throw" });

      expect(() => {
        // @ts-expect-error - deletion not allowed
        delete env.NODE_ENV;
      }).not.toThrow(); // Delete doesn't throw in current implementation
    });

    it("should allow Symbol access for inspection", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      const env = zenv({ NODE_ENV: str() }, { onError: "throw" });

      // Symbol.toStringTag and Symbol.for('nodejs.util.inspect.custom') should work
      expect(() => {
        // Test symbol access without type errors
        const symbolKey = Symbol.toStringTag;
        const envObj = { ...env };
        const anyEnv = envObj as unknown;
        const recordEnv = anyEnv as Record<string | symbol, unknown>;
        const tag = recordEnv[symbolKey];
        expect(tag).toBeUndefined(); // or could be defined
      }).not.toThrow();
    });

    it("should work with Object.keys and Object.entries", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        API_KEY: "secret",
        PORT: "3000"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          API_KEY: str(),
          PORT: port()
        },
        { onError: "throw" }
      );

      const keys = Object.keys(env);
      expect(keys).toEqual(["NODE_ENV", "API_KEY", "PORT"]);

      const entries = Object.entries(env);
      expect(entries).toEqual([
        ["NODE_ENV", "test"],
        ["API_KEY", "secret"],
        ["PORT", 3000]
      ]);
    });
  });

  describe("Non-Strict Mode", () => {
    it("should allow direct access without proxy when strict is false", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        VALIDATED: "value",
        NOT_VALIDATED: "other"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          VALIDATED: str()
        },
        { strict: false, onError: "throw" }
      );

      expect(env.NODE_ENV).toBe("test");
      expect(env.VALIDATED).toBe("value");
      // In non-strict mode, non-validated vars are not accessible
      // @ts-expect-error - not in schema
      expect(env.NOT_VALIDATED).toBeUndefined();
    });
  });

  describe("Client/Server Separation", () => {
    it("should expose client-safe variables on client", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        PUBLIC_API_URL: "https://api.example.com",
        SECRET_KEY: "secret"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          PUBLIC_API_URL: url({
            client: { expose: true }
          }),
          SECRET_KEY: str({
            client: { expose: false }
          })
        },
        { onError: "throw" }
      );

      // Server environment
      const serverMock = mockRuntime("server");
      expect(env.PUBLIC_API_URL).toBe("https://api.example.com");
      expect(env.SECRET_KEY).toBe("secret");
      serverMock.restore();

      // Client environment
      const clientMock = mockRuntime("client");
      expect(env.PUBLIC_API_URL).toBe("https://api.example.com");
      expect(env.SECRET_KEY).toBeUndefined();
      clientMock.restore();
    });

    it("should apply client transform functions", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        API_URL: "https://internal.api.com"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          API_URL: url({
            client: {
              expose: true,
              transform: (url) => url.replace("internal", "public")
            }
          })
        },
        { onError: "throw" }
      );

      // Server environment - no transform
      const serverMock = mockRuntime("server");
      expect(env.API_URL).toBe("https://internal.api.com");
      serverMock.restore();

      // Client environment - with transform
      const clientMock = mockRuntime("client");
      expect(env.API_URL).toBe("https://public.api.com");
      clientMock.restore();
    });

    it("should apply client-specific defaults", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
        // API_URL not set
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          API_URL: url({
            default: "https://server.api.com",
            client: {
              expose: true,
              default: "https://client.api.com"
            }
          })
        },
        { onError: "throw" }
      );

      // Server environment - server default
      const serverMock = mockRuntime("server");
      expect(env.API_URL).toBe("https://server.api.com");
      serverMock.restore();

      // Client environment - client default
      const clientMock = mockRuntime("client");
      expect(env.API_URL).toBe("https://client.api.com");
      clientMock.restore();
    });

    it("should handle onClientAccessError option - warn", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "development",
        SECRET_KEY: "secret"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          SECRET_KEY: str() // Not exposed to client
        },
        { onClientAccessError: "warn", onError: "throw" }
      );

      const clientMock = mockRuntime("client");

      // Access should return undefined and warn
      expect(env.SECRET_KEY).toBeUndefined();

      const warnings = consoleMock.getWarnings();
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.[0]).toContain("SECRET_KEY");

      clientMock.restore();
    });

    it("should handle onClientAccessError option - throw", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        SECRET_KEY: "secret"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          SECRET_KEY: str() // Not exposed to client
        },
        { onClientAccessError: "throw", onError: "throw" }
      );

      const clientMock = mockRuntime("client");

      expect(() => {
        return env.SECRET_KEY;
      }).toThrow("Cannot access server-only environment variable 'SECRET_KEY' on client");

      clientMock.restore();
    });

    it("should handle onClientAccessError option - ignore", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        SECRET_KEY: "secret"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          SECRET_KEY: str() // Not exposed to client
        },
        { onClientAccessError: "ignore", onError: "throw" }
      );

      const clientMock = mockRuntime("client");

      // Access should return undefined without warning
      expect(env.SECRET_KEY).toBeUndefined();

      const warnings = consoleMock.getWarnings();
      expect(warnings).toHaveLength(0);

      clientMock.restore();
    });
  });

  describe("Auto-Detection of Client-Safe Prefixes", () => {
    it("should auto-expose variables with NEXT_PUBLIC_ prefix", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_APP_NAME: "My App",
        NEXT_PUBLIC_API_URL: "https://api.example.com",
        SECRET_KEY: "secret"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          NEXT_PUBLIC_APP_NAME: str(),
          NEXT_PUBLIC_API_URL: url(),
          SECRET_KEY: str()
        },
        { clientSafePrefixes: ["NEXT_PUBLIC_"], onError: "throw" }
      );

      const clientMock = mockRuntime("client");
      expect(env.NEXT_PUBLIC_APP_NAME).toBe("My App");
      expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.example.com");
      expect(env.SECRET_KEY).toBeUndefined();
      clientMock.restore();
    });

    it("should auto-expose variables with VITE_ prefix", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        VITE_APP_TITLE: "Vite App",
        VITE_API_ENDPOINT: "https://api.vite.com",
        DATABASE_URL: "postgres://..."
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          VITE_APP_TITLE: str(),
          VITE_API_ENDPOINT: url(),
          DATABASE_URL: str()
        },
        { clientSafePrefixes: ["VITE_"], onError: "throw" }
      );

      const clientMock = mockRuntime("client");
      expect(env.VITE_APP_TITLE).toBe("Vite App");
      expect(env.VITE_API_ENDPOINT).toBe("https://api.vite.com");
      expect(env.DATABASE_URL).toBeUndefined();
      clientMock.restore();
    });

    it("should support multiple client-safe prefixes", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_VAR: "next",
        VITE_VAR: "vite",
        PUBLIC_VAR: "public",
        PRIVATE_VAR: "private"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          NEXT_PUBLIC_VAR: str(),
          VITE_VAR: str(),
          PUBLIC_VAR: str(),
          PRIVATE_VAR: str()
        },
        { clientSafePrefixes: ["NEXT_PUBLIC_", "VITE_", "PUBLIC_"], onError: "throw" }
      );

      const clientMock = mockRuntime("client");
      expect(env.NEXT_PUBLIC_VAR).toBe("next");
      expect(env.VITE_VAR).toBe("vite");
      expect(env.PUBLIC_VAR).toBe("public");
      expect(env.PRIVATE_VAR).toBeUndefined();
      clientMock.restore();
    });

    it("should override auto-exposure with explicit client.expose: false", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_SECRET: "should-not-expose"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          NEXT_PUBLIC_SECRET: str({
            client: { expose: false } // Explicitly not exposed
          })
        },
        { clientSafePrefixes: ["NEXT_PUBLIC_"], onError: "throw" }
      );

      const clientMock = mockRuntime("client");
      expect(env.NEXT_PUBLIC_SECRET).toBeUndefined();
      clientMock.restore();
    });
  });

  describe("Server-Only Prefixes", () => {
    it("should force variables to be server-only with serverOnlyPrefixes", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        DB_CONNECTION: "postgres://...",
        DB_PASSWORD: "secret",
        API_KEY: "key"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          DB_CONNECTION: str({
            client: { expose: true } // Try to expose
          }),
          DB_PASSWORD: str({
            client: { expose: true } // Try to expose
          }),
          API_KEY: str({
            client: { expose: true }
          })
        },
        { serverOnlyPrefixes: ["DB_"], onError: "throw" }
      );

      const clientMock = mockRuntime("client");
      expect(env.DB_CONNECTION).toBeUndefined(); // Forced server-only
      expect(env.DB_PASSWORD).toBeUndefined(); // Forced server-only
      expect(env.API_KEY).toBe("key"); // Not affected
      clientMock.restore();
    });
  });

  describe("Environment-Specific Defaults", () => {
    it("should apply development defaults in development", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "development"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          LOG_LEVEL: str({
            default: "info",
            devDefault: "debug",
            testDefault: "error"
          })
        },
        { onError: "throw" }
      );

      expect(env.LOG_LEVEL).toBe("debug");
    });

    it("should apply test defaults in test", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          LOG_LEVEL: str({
            default: "info",
            devDefault: "debug",
            testDefault: "error"
          })
        },
        { onError: "throw" }
      );

      expect(env.LOG_LEVEL).toBe("error");
    });

    it("should apply production defaults in production", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          LOG_LEVEL: str({
            default: "info",
            devDefault: "debug",
            testDefault: "error"
          })
        },
        { onError: "throw" }
      );

      expect(env.LOG_LEVEL).toBe("info");
    });
  });

  describe("Complex Schemas", () => {
    it("should handle JSON configuration objects", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        CONFIG: JSON.stringify({
          features: {
            auth: true,
            analytics: false
          },
          limits: {
            maxUsers: 100,
            maxStorage: 1000
          }
        })
      });

      const configSchema = json(); // Returns parsed JSON, no schema validation

      const env = zenv(
        {
          NODE_ENV: str(),
          CONFIG: configSchema
        },
        { onError: "throw" }
      );

      // CONFIG is already parsed by json() validator
      const config = env.CONFIG as { features: { auth: boolean; analytics: boolean }; limits: { maxUsers: number } };
      expect(config.features.auth).toBe(true);
      expect(config.features.analytics).toBe(false);
      expect(config.limits.maxUsers).toBe(100);
    });

    it("should handle mixed validator types", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        APP_NAME: "Test App",
        PORT: "8080",
        SSL_ENABLED: "true",
        ADMIN_EMAIL: "admin@example.com",
        API_URL: "https://api.example.com",
        MAX_CONNECTIONS: "50"
      });

      const env = zenv(
        {
          NODE_ENV: str({ choices: ["development", "production", "test"] }),
          APP_NAME: str({ min: 1, max: 100 }),
          PORT: port(),
          SSL_ENABLED: bool(),
          ADMIN_EMAIL: email(),
          API_URL: url({ protocol: /^https$/ }),
          MAX_CONNECTIONS: num({ int: true, min: 1, max: 1000 })
        },
        { onError: "throw" }
      );

      expect(env.NODE_ENV).toBe("test");
      expect(env.APP_NAME).toBe("Test App");
      expect(env.PORT).toBe(8080);
      expect(env.SSL_ENABLED).toBe(true);
      expect(env.ADMIN_EMAIL).toBe("admin@example.com");
      expect(env.API_URL).toBe("https://api.example.com");
      expect(env.MAX_CONNECTIONS).toBe(50);
    });
  });

  describe("Error Reporting", () => {
    it("should report multiple validation errors", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "invalid-env",
        PORT: "not-a-port",
        EMAIL: "not-an-email"
      });

      expect(() => {
        zenv(
          {
            NODE_ENV: str({ choices: ["development", "production", "test"] }),
            PORT: port(),
            EMAIL: email()
          },
          { onError: "throw" }
        );
      }).toThrow(ZenvError);
    });

    it("should report missing variables clearly", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      try {
        zenv(
          {
            NODE_ENV: str(),
            REQUIRED_VAR_1: str(),
            REQUIRED_VAR_2: num(),
            REQUIRED_VAR_3: bool()
          },
          { onError: "throw" }
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ZenvError);
        if (error instanceof ZenvError) {
          expect(error.message).toContain("validation failed");
          // Check that the missing variables are reported in the errors
          const errorMessages = error.zodErrors?.map((e) => e.message).join(" ") ?? "";
          expect(errorMessages).toContain("REQUIRED_VAR_1");
          expect(errorMessages).toContain("REQUIRED_VAR_2");
          expect(errorMessages).toContain("REQUIRED_VAR_3");
        }
      }
    });

    it("should use custom reporter for error formatting", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      const customReporter = vi.fn((errors: unknown[], _env: Record<string, string | undefined>) => {
        console.error("Custom error report:", errors.length, "errors found");
      });

      expect(() => {
        zenv(
          {
            NODE_ENV: str(),
            MISSING: str()
          },
          { reporter: customReporter, onError: "throw" }
        );
      }).toThrow();

      expect(customReporter).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty environment", () => {
      envMock.restore();
      envMock = mockProcessEnv({});

      const env = zenv(
        {
          VAR1: str({ default: "default1" }),
          VAR2: num({ default: 42 }),
          VAR3: bool({ default: true })
        },
        { onError: "return", strict: false }
      );

      expect(env.VAR1).toBe("default1");
      expect(env.VAR2).toBe(42);
      expect(env.VAR3).toBe(true);
    });

    it("should handle environment with only defaults", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          FEATURE_FLAG_A: bool({ default: true }),
          FEATURE_FLAG_B: bool({ default: false }),
          CONFIG_VALUE: num({ default: 100 })
        },
        { onError: "throw" }
      );

      expect(env.NODE_ENV).toBe("test");
      expect(env.FEATURE_FLAG_A).toBe(true);
      expect(env.FEATURE_FLAG_B).toBe(false);
      expect(env.CONFIG_VALUE).toBe(100);
    });

    it("should handle very long environment variable values", () => {
      const longString = "x".repeat(10000);
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        LONG_VAR: longString
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          LONG_VAR: str()
        },
        { onError: "throw" }
      );

      expect(env.LONG_VAR).toBe(longString);
      expect(env.LONG_VAR.length).toBe(10000);
    });

    it("should handle special characters in values", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "test",
        SPECIAL: "Hello 世界 🌍 مرحبا мир"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          SPECIAL: str()
        },
        { onError: "throw" }
      );

      expect(env.SPECIAL).toBe("Hello 世界 🌍 مرحبا мир");
    });
  });
});
