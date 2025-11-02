/**
 * @module integration.test
 * @description Integration tests for real-world usage scenarios
 */
import type { z } from "zod/v4";

import { zenv } from "../core";
import { ZenvError } from "../errors";
import { bool, email, json, makeValidator, num, port, str, url } from "../validators";
import { createMockEnv, mockProcessEnv, mockRuntime, suppressConsole } from "./test-utils";

describe("Integration Tests", () => {
  let envMock: ReturnType<typeof mockProcessEnv>;
  let consoleMock: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    envMock = mockProcessEnv(createMockEnv());
    consoleMock = suppressConsole();
  });

  afterEach(() => {
    envMock.restore();
    consoleMock.restore();
  });

  describe("Real-World Scenarios", () => {
    it("should handle typical web application configuration", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        PORT: "3000",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/mydb",
        REDIS_URL: "redis://localhost:6379",
        SESSION_SECRET: "super-secret-key",
        JWT_SECRET: "jwt-secret-key",
        CORS_ORIGIN: "https://app.example.com",
        LOG_LEVEL: "info",
        ENABLE_METRICS: "true",
        MAX_UPLOAD_SIZE: "10485760", // 10MB
        API_RATE_LIMIT: "100"
      });

      const env = zenv(
        {
          NODE_ENV: str({ choices: ["development", "production", "test"] }),
          PORT: port({ default: 3000 }),
          DATABASE_URL: url(),
          REDIS_URL: url({ default: "redis://localhost:6379" }),
          SESSION_SECRET: str(),
          JWT_SECRET: str(),
          CORS_ORIGIN: url(),
          LOG_LEVEL: str({
            choices: ["debug", "info", "warn", "error"],
            default: "info"
          }),
          ENABLE_METRICS: bool({ default: false }),
          MAX_UPLOAD_SIZE: num({ int: true, min: 0 }),
          API_RATE_LIMIT: num({ int: true, min: 1, default: 100 })
        },
        { onError: "throw" }
      );

      expect(env.NODE_ENV).toBe("production");
      expect(env.PORT).toBe(3000);
      expect(env.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/mydb");
      expect(env.REDIS_URL).toBe("redis://localhost:6379");
      expect(env.SESSION_SECRET).toBe("super-secret-key");
      expect(env.JWT_SECRET).toBe("jwt-secret-key");
      expect(env.CORS_ORIGIN).toBe("https://app.example.com");
      expect(env.LOG_LEVEL).toBe("info");
      expect(env.ENABLE_METRICS).toBe(true);
      expect(env.MAX_UPLOAD_SIZE).toBe(10485760);
      expect(env.API_RATE_LIMIT).toBe(100);

      // Check accessors
      expect(env.isProduction).toBe(true);
      expect(env.isDevelopment).toBe(false);
      expect(env.isTest).toBe(false);
    });

    it("should handle microservice configuration", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        SERVICE_NAME: "user-service",
        SERVICE_PORT: "8080",
        KAFKA_BROKERS: JSON.stringify(["kafka1:9092", "kafka2:9092"]),
        TRACING_ENABLED: "true",
        JAEGER_ENDPOINT: "http://jaeger:14268/api/traces",
        HEALTH_CHECK_PATH: "/health",
        SHUTDOWN_TIMEOUT_MS: "30000"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          SERVICE_NAME: str(),
          SERVICE_PORT: port(),
          KAFKA_BROKERS: json(),
          TRACING_ENABLED: bool({ default: false }),
          JAEGER_ENDPOINT: url(),
          HEALTH_CHECK_PATH: str({ default: "/health" }),
          SHUTDOWN_TIMEOUT_MS: num({ int: true, min: 0, default: 30000 })
        },
        { onError: "throw" }
      );

      expect(env.SERVICE_NAME).toBe("user-service");
      expect(env.SERVICE_PORT).toBe(8080);
      expect(env.KAFKA_BROKERS).toEqual(["kafka1:9092", "kafka2:9092"]);
      expect(env.TRACING_ENABLED).toBe(true);
      expect(env.JAEGER_ENDPOINT).toBe("http://jaeger:14268/api/traces");
      expect(env.HEALTH_CHECK_PATH).toBe("/health");
      expect(env.SHUTDOWN_TIMEOUT_MS).toBe(30000);
    });

    it("should handle Next.js application with client/server separation", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_NAME: "My App",
        NEXT_PUBLIC_API_URL: "https://api.example.com",
        NEXT_PUBLIC_GA_ID: "GA-123456789",
        DATABASE_URL: "postgresql://user:pass@db:5432/app",
        SECRET_API_KEY: "secret-key",
        STRIPE_SECRET_KEY: "sk_live_xxx",
        NEXT_PUBLIC_STRIPE_PUBLIC_KEY: "pk_live_xxx"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          NEXT_PUBLIC_APP_NAME: str(),
          NEXT_PUBLIC_API_URL: url(),
          NEXT_PUBLIC_GA_ID: str(),
          DATABASE_URL: url({
            client: { expose: false }
          }),
          SECRET_API_KEY: str({
            client: { expose: false }
          }),
          STRIPE_SECRET_KEY: str({
            client: { expose: false }
          }),
          NEXT_PUBLIC_STRIPE_PUBLIC_KEY: str()
        },
        {
          clientSafePrefixes: ["NEXT_PUBLIC_"],
          onError: "throw"
        }
      );

      // Server environment - all vars accessible
      const serverMock = mockRuntime("server");
      expect(env.NEXT_PUBLIC_APP_NAME).toBe("My App");
      expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.example.com");
      expect(env.DATABASE_URL).toBe("postgresql://user:pass@db:5432/app");
      expect(env.SECRET_API_KEY).toBe("secret-key");
      expect(env.STRIPE_SECRET_KEY).toBe("sk_live_xxx");
      expect(env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY).toBe("pk_live_xxx");
      serverMock.restore();

      // Client environment - only public vars accessible
      const clientMock = mockRuntime("client");
      expect(env.NEXT_PUBLIC_APP_NAME).toBe("My App");
      expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.example.com");
      expect(env.NEXT_PUBLIC_GA_ID).toBe("GA-123456789");
      expect(env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY).toBe("pk_live_xxx");
      expect(env.DATABASE_URL).toBeUndefined();
      expect(env.SECRET_API_KEY).toBeUndefined();
      expect(env.STRIPE_SECRET_KEY).toBeUndefined();
      clientMock.restore();
    });

    it("should handle API gateway configuration with complex validation", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        GATEWAY_PORT: "8080",
        UPSTREAM_SERVICES: JSON.stringify({
          users: "http://users:3001",
          products: "http://products:3002",
          orders: "http://orders:3003"
        }),
        RATE_LIMIT_CONFIG: JSON.stringify({
          window: 60000,
          max: 100,
          keyGenerator: "ip"
        }),
        CORS_ALLOWED_ORIGINS: JSON.stringify(["https://app.example.com", "https://admin.example.com"]),
        AUTH_JWT_SECRET: "supersecretkey12345",
        AUTH_JWT_EXPIRES_IN: "24h",
        CACHE_TTL_SECONDS: "300",
        REQUEST_TIMEOUT_MS: "30000"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          GATEWAY_PORT: port(),
          UPSTREAM_SERVICES: json(),
          RATE_LIMIT_CONFIG: json(),
          CORS_ALLOWED_ORIGINS: json(),
          AUTH_JWT_SECRET: str({ min: 16 }),
          AUTH_JWT_EXPIRES_IN: str({ regex: /^\d+[hdms]$/ }),
          CACHE_TTL_SECONDS: num({ int: true, min: 0, max: 86400 }),
          REQUEST_TIMEOUT_MS: num({ int: true, min: 1000, max: 60000 })
        },
        { onError: "throw" }
      );

      expect(env.GATEWAY_PORT).toBe(8080);
      expect(env.UPSTREAM_SERVICES).toEqual({
        users: "http://users:3001",
        products: "http://products:3002",
        orders: "http://orders:3003"
      });
      expect(env.RATE_LIMIT_CONFIG).toEqual({
        window: 60000,
        max: 100,
        keyGenerator: "ip"
      });
      expect(env.CORS_ALLOWED_ORIGINS).toEqual(["https://app.example.com", "https://admin.example.com"]);
      expect(env.AUTH_JWT_EXPIRES_IN).toBe("24h");
      expect(env.CACHE_TTL_SECONDS).toBe(300);
      expect(env.REQUEST_TIMEOUT_MS).toBe(30000);
    });
  });

  describe("Client/Server Behavior", () => {
    it("should apply transforms only on client", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        API_URL: "http://internal-api:3000",
        PUBLIC_URL: "http://internal-app:8080"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          API_URL: url({
            client: {
              expose: true,
              transform: (url: string) => url.replace("internal-api", "api.example.com")
            }
          }),
          PUBLIC_URL: url({
            client: {
              expose: true,
              transform: (url: string) => url.replace("internal-app", "app.example.com")
            }
          })
        },
        { onError: "throw" }
      );

      // Server sees internal URLs
      const serverMock = mockRuntime("server");
      expect(env.API_URL).toBe("http://internal-api:3000");
      expect(env.PUBLIC_URL).toBe("http://internal-app:8080");
      serverMock.restore();

      // Client sees transformed public URLs
      const clientMock = mockRuntime("client");
      expect(env.API_URL).toBe("http://api.example.com:3000");
      expect(env.PUBLIC_URL).toBe("http://app.example.com:8080");
      clientMock.restore();
    });

    it("should use different defaults for client and server", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production"
        // Note: No API_ENDPOINT or LOG_LEVEL set
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          API_ENDPOINT: url({
            default: "http://localhost:3000/api",
            client: {
              expose: true,
              default: "https://api.example.com"
            }
          }),
          LOG_LEVEL: str({
            default: "debug",
            client: {
              expose: true,
              default: "error"
            }
          })
        },
        { onError: "throw" }
      );

      // Server uses server defaults
      const serverMock = mockRuntime("server");
      expect(env.API_ENDPOINT).toBe("http://localhost:3000/api");
      expect(env.LOG_LEVEL).toBe("debug");
      serverMock.restore();

      // Client uses client defaults
      const clientMock = mockRuntime("client");
      expect(env.API_ENDPOINT).toBe("https://api.example.com");
      expect(env.LOG_LEVEL).toBe("error");
      clientMock.restore();
    });

    it("should enforce serverOnlyPrefixes even with explicit exposure", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        DB_HOST: "localhost",
        DB_PORT: "5432",
        DB_NAME: "myapp",
        DB_USER: "appuser",
        DB_PASS: "secret",
        CACHE_HOST: "localhost",
        PUBLIC_API: "https://api.example.com"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          DB_HOST: str({ client: { expose: true } }), // Try to expose
          DB_PORT: port({ client: { expose: true } }), // Try to expose
          DB_NAME: str({ client: { expose: true } }), // Try to expose
          DB_USER: str({ client: { expose: true } }), // Try to expose
          DB_PASS: str({ client: { expose: true } }), // Try to expose
          CACHE_HOST: str({ client: { expose: true } }),
          PUBLIC_API: url({ client: { expose: true } })
        },
        {
          serverOnlyPrefixes: ["DB_"],
          onError: "throw"
        }
      );

      const clientMock = mockRuntime("client");
      // All DB_ vars should be undefined on client despite explicit expose: true
      expect(env.DB_HOST).toBeUndefined();
      expect(env.DB_PORT).toBeUndefined();
      expect(env.DB_NAME).toBeUndefined();
      expect(env.DB_USER).toBeUndefined();
      expect(env.DB_PASS).toBeUndefined();
      // Non-DB_ vars should be exposed
      expect(env.CACHE_HOST).toBe("localhost");
      expect(env.PUBLIC_API).toBe("https://api.example.com");
      clientMock.restore();
    });
  });

  describe("Error Scenarios", () => {
    it("should aggregate multiple validation errors", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "invalid",
        PORT: "not-a-port",
        EMAIL: "not-an-email",
        URL: "not a url",
        BOOL: "maybe"
      });

      let error: ZenvError | undefined;
      try {
        zenv(
          {
            NODE_ENV: str({ choices: ["development", "production", "test"] }),
            PORT: port(),
            EMAIL: email(),
            URL: url(),
            BOOL: bool()
          },
          { onError: "throw" }
        );
      } catch (e) {
        if (e instanceof ZenvError) {
          error = e;
        }
      }

      expect(error).toBeInstanceOf(ZenvError);
      expect(error?.message).toContain("validation failed");
      // The error should contain information about all failed validations
      const errorStr = error?.zodErrors?.map((e) => e.message).join(" ") ?? "";
      expect(errorStr).toContain("NODE_ENV");
      expect(errorStr).toContain("PORT");
      expect(errorStr).toContain("EMAIL");
      expect(errorStr).toContain("URL");
      expect(errorStr).toContain("BOOL");
    });

    it("should handle partial success with onError: return", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        VALID_STRING: "hello",
        VALID_NUMBER: "42",
        INVALID_PORT: "not-a-port",
        INVALID_EMAIL: "not-an-email",
        VALID_BOOL: "true"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          VALID_STRING: str(),
          VALID_NUMBER: num(),
          INVALID_PORT: port(),
          INVALID_EMAIL: email(),
          VALID_BOOL: bool()
        },
        { onError: "return", strict: false }
      );

      // Valid vars should be available
      expect(env.NODE_ENV).toBe("production");
      expect(env.VALID_STRING).toBe("hello");
      expect(env.VALID_NUMBER).toBe(42);
      expect(env.VALID_BOOL).toBe(true);

      // Invalid vars should be undefined
      expect(env.INVALID_PORT).toBeUndefined();
      expect(env.INVALID_EMAIL).toBeUndefined();
    });

    it("should handle missing required variables with clear error", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production"
        // Missing all other required vars
      });

      let error: ZenvError | undefined;
      try {
        zenv(
          {
            NODE_ENV: str(),
            DATABASE_URL: url(), // Required, no default
            API_KEY: str(), // Required, no default
            SERVICE_PORT: port() // Required, no default
          },
          { onError: "throw" }
        );
      } catch (e) {
        if (e instanceof ZenvError) {
          error = e;
        }
      }

      expect(error).toBeInstanceOf(ZenvError);
      const errorStr = error?.zodErrors?.map((e) => e.message).join(" ") ?? "";
      expect(errorStr).toContain("DATABASE_URL");
      expect(errorStr).toContain("API_KEY");
      expect(errorStr).toContain("SERVICE_PORT");
    });

    it("should use custom reporter for error formatting", () => {
      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "invalid",
        PORT: "not-a-port"
      });

      const reportedErrors: { key: string; error: string }[] = [];
      const customReporter = (errors: z.ZodError[], _env: Record<string, string | undefined>): void => {
        errors.forEach((error) => {
          reportedErrors.push({
            key: error.issues[0]?.path.join(".") ?? "unknown",
            error: error.issues.map((i) => i.message).join(", ")
          });
        });
      };

      expect(() => {
        zenv(
          {
            NODE_ENV: str({ choices: ["development", "production", "test"] }),
            PORT: port()
          },
          { reporter: customReporter, onError: "throw" }
        );
      }).toThrow();

      expect(reportedErrors).toHaveLength(2);
      expect(reportedErrors.some((e) => e.key === "NODE_ENV")).toBe(true);
      expect(reportedErrors.some((e) => e.key === "PORT")).toBe(true);
    });
  });

  describe("Custom Validator Integration", () => {
    it("should work with domain-specific custom validators", () => {
      // Semver validator
      const semver = makeValidator({
        validator: (val: unknown) => {
          if (typeof val !== "string") return false;
          return /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(val);
        },
        transform: (val: unknown) => {
          const str = val as string;
          const [version, prerelease] = str.split("-");
          const versionParts = version.split(".");
          const [major, minor, patch] = versionParts.map(Number);
          return { major, minor, patch, prerelease, raw: str };
        }
      });

      // MongoDB connection string validator
      const mongoUri = makeValidator<string, { uri: string; isSrv: boolean }>({
        validator: (val: unknown) => {
          if (typeof val !== "string") return false;
          return /^mongodb(\+srv)?:\/\/.+/.test(val);
        },
        transform: (val: unknown) => {
          const str = val as string;
          const isSrv = str.startsWith("mongodb+srv");
          return { uri: str, isSrv };
        }
      });

      // Cron expression validator
      const cron = makeValidator({
        validator: (val: unknown) => {
          if (typeof val !== "string") return false;
          const parts = val.split(" ");
          return parts.length >= 5 && parts.length <= 6;
        }
      });

      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        APP_VERSION: "1.2.3-beta.1",
        MONGO_URI: "mongodb+srv://user:pass@cluster.mongodb.net/db",
        BACKUP_SCHEDULE: "0 2 * * *"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          APP_VERSION: semver(),
          MONGO_URI: mongoUri(),
          BACKUP_SCHEDULE: cron()
        },
        { onError: "throw" }
      );

      expect(env.APP_VERSION).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: "beta.1",
        raw: "1.2.3-beta.1"
      });
      expect(env.MONGO_URI).toEqual({
        uri: "mongodb+srv://user:pass@cluster.mongodb.net/db",
        isSrv: true
      });
      expect(env.BACKUP_SCHEDULE).toBe("0 2 * * *");
    });

    it("should compose validators for complex scenarios", () => {
      // API key validator with specific format
      const apiKey = makeValidator<string, { value: string; prefix: string; id: string }>({
        validator: (val: unknown) => {
          if (typeof val !== "string") return false;
          return /^sk_[a-zA-Z0-9]{32}$/.test(val);
        },
        transform: (val: unknown) => {
          const str = val as string;
          return {
            value: str,
            prefix: str.substring(0, 3),
            id: str.substring(3)
          };
        }
      });

      // Color validator supporting multiple formats
      const color = makeValidator<string, { type: string; value: string }>({
        validator: (val: unknown) => {
          if (typeof val !== "string") return false;
          return /^#[0-9A-Fa-f]{6}$/.test(val) || /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/.test(val) || /^[a-z]+$/.test(val);
        },
        transform: (val: unknown) => {
          const str = val as string;
          if (str.startsWith("#")) return { type: "hex", value: str };
          if (str.startsWith("rgb")) return { type: "rgb", value: str };
          return { type: "named", value: str };
        }
      });

      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        STRIPE_KEY: "sk_test1234567890123456789012345678",
        PRIMARY_COLOR: "#FF5733",
        SECONDARY_COLOR: "rgb(100, 150, 200)",
        ACCENT_COLOR: "blue"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          STRIPE_KEY: apiKey(),
          PRIMARY_COLOR: color(),
          SECONDARY_COLOR: color(),
          ACCENT_COLOR: color()
        },
        { onError: "throw" }
      );

      expect(env.STRIPE_KEY).toEqual({
        value: "sk_test1234567890123456789012345678",
        prefix: "sk_",
        id: "test1234567890123456789012345678"
      });
      expect(env.PRIMARY_COLOR).toEqual({ type: "hex", value: "#FF5733" });
      expect(env.SECONDARY_COLOR).toEqual({ type: "rgb", value: "rgb(100, 150, 200)" });
      expect(env.ACCENT_COLOR).toEqual({ type: "named", value: "blue" });
    });

    it("should handle feature flag patterns", () => {
      const featureFlag = makeValidator<string, { enabled: boolean; status: string; isBeta: boolean; isAlpha: boolean }>({
        validator: (val: unknown) => {
          if (typeof val !== "string") return false;
          return /^(enabled|disabled|beta|alpha)$/.test(val);
        },
        transform: (val: unknown) => {
          const str = val as string;
          return {
            enabled: str === "enabled" || str === "beta" || str === "alpha",
            status: str,
            isBeta: str === "beta",
            isAlpha: str === "alpha"
          };
        }
      });

      envMock.restore();
      envMock = mockProcessEnv({
        NODE_ENV: "production",
        FEATURE_NEW_UI: "enabled",
        FEATURE_ANALYTICS: "beta",
        FEATURE_AI_ASSIST: "alpha",
        FEATURE_LEGACY: "disabled"
      });

      const env = zenv(
        {
          NODE_ENV: str(),
          FEATURE_NEW_UI: featureFlag(),
          FEATURE_ANALYTICS: featureFlag(),
          FEATURE_AI_ASSIST: featureFlag(),
          FEATURE_LEGACY: featureFlag()
        },
        { onError: "throw" }
      );

      expect(env.FEATURE_NEW_UI).toEqual({
        enabled: true,
        status: "enabled",
        isBeta: false,
        isAlpha: false
      });
      expect(env.FEATURE_ANALYTICS).toEqual({
        enabled: true,
        status: "beta",
        isBeta: true,
        isAlpha: false
      });
      expect(env.FEATURE_AI_ASSIST).toEqual({
        enabled: true,
        status: "alpha",
        isBeta: false,
        isAlpha: true
      });
      expect(env.FEATURE_LEGACY).toEqual({
        enabled: false,
        status: "disabled",
        isBeta: false,
        isAlpha: false
      });
    });
  });

  describe("Environment-Specific Behavior", () => {
    it("should apply different defaults per environment", () => {
      // Test environment
      envMock.restore();
      envMock = mockProcessEnv({ NODE_ENV: "test" });
      const testEnv = zenv(
        {
          NODE_ENV: str(),
          LOG_LEVEL: str({
            default: "info",
            devDefault: "debug",
            testDefault: "error"
          }),
          DB_POOL_SIZE: num({
            default: 20,
            devDefault: 5,
            testDefault: 1
          }),
          CACHE_ENABLED: bool({
            default: true,
            devDefault: false,
            testDefault: false
          })
        },
        { onError: "throw" }
      );
      expect(testEnv.LOG_LEVEL).toBe("error");
      expect(testEnv.DB_POOL_SIZE).toBe(1);
      expect(testEnv.CACHE_ENABLED).toBe(false);

      // Development environment
      envMock.restore();
      envMock = mockProcessEnv({ NODE_ENV: "development" });
      const devEnv = zenv(
        {
          NODE_ENV: str(),
          LOG_LEVEL: str({
            default: "info",
            devDefault: "debug",
            testDefault: "error"
          }),
          DB_POOL_SIZE: num({
            default: 20,
            devDefault: 5,
            testDefault: 1
          }),
          CACHE_ENABLED: bool({
            default: true,
            devDefault: false,
            testDefault: false
          })
        },
        { onError: "throw" }
      );
      expect(devEnv.LOG_LEVEL).toBe("debug");
      expect(devEnv.DB_POOL_SIZE).toBe(5);
      expect(devEnv.CACHE_ENABLED).toBe(false);

      // Production environment
      envMock.restore();
      envMock = mockProcessEnv({ NODE_ENV: "production" });
      const prodEnv = zenv(
        {
          NODE_ENV: str(),
          LOG_LEVEL: str({
            default: "info",
            devDefault: "debug",
            testDefault: "error"
          }),
          DB_POOL_SIZE: num({
            default: 20,
            devDefault: 5,
            testDefault: 1
          }),
          CACHE_ENABLED: bool({
            default: true,
            devDefault: false,
            testDefault: false
          })
        },
        { onError: "throw" }
      );
      expect(prodEnv.LOG_LEVEL).toBe("info");
      expect(prodEnv.DB_POOL_SIZE).toBe(20);
      expect(prodEnv.CACHE_ENABLED).toBe(true);
    });
  });
});
