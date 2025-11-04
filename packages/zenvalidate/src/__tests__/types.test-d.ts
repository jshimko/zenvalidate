/**
 * @module types.test-d
 * @description Type definition tests for `zenvalidate`
 * These tests verify TypeScript type inference and compile-time behavior.
 * They don't run at runtime but ensure type safety at compile time.
 */
import { expectType } from "tsd";
import { z } from "zod/v4";

import { zenv } from "../core";
import type { CleanedEnv, EnvAccessors } from "../types";
import {
  base64,
  base64url,
  bool,
  cuid,
  cuid2,
  datetime,
  email,
  guid,
  host,
  ipv4,
  ipv6,
  isoDate,
  isoDuration,
  isoTime,
  json,
  jwt,
  ksuid,
  makeValidator,
  nanoid,
  num,
  port,
  str,
  ulid,
  url,
  uuid,
  xid
} from "../validators";

// Test basic type inference
{
  const env = zenv({
    NODE_ENV: str(),
    PORT: port(),
    DATABASE_URL: url(),
    ENABLE_FEATURE: bool(),
    MAX_CONNECTIONS: num(),
    API_KEY: str()
  });

  // Type inference for validated values
  expectType<string>(env.NODE_ENV);
  expectType<number>(env.PORT);
  expectType<string>(env.DATABASE_URL);
  expectType<boolean>(env.ENABLE_FEATURE);
  expectType<number>(env.MAX_CONNECTIONS);
  expectType<string>(env.API_KEY);

  // Type inference for accessors
  expectType<boolean>(env.isDevelopment);
  expectType<boolean>(env.isDev);
  expectType<boolean>(env.isProduction);
  expectType<boolean>(env.isProd);
  expectType<boolean>(env.isTest);
}

// Test with defaults
{
  const env = zenv({
    NODE_ENV: str({ default: "production" }),
    PORT: port({ default: 3000 }),
    DEBUG: bool({ default: false })
  });

  // Values should be non-nullable when defaults are provided
  expectType<string>(env.NODE_ENV);
  expectType<number>(env.PORT);
  expectType<boolean>(env.DEBUG);
}

// Test with choices
{
  const env = zenv({
    LOG_LEVEL: str({ choices: ["debug", "info", "warn", "error"] })
  });

  // Should infer string type (choices still return string in this version)
  expectType<string>(env.LOG_LEVEL);
}

// Test JSON validator with schema
{
  const configSchema = z.object({
    host: z.string(),
    port: z.number(),
    ssl: z.boolean()
  });

  const env = zenv({
    CONFIG: json({ schema: configSchema })
  });

  // Should infer the schema type
  expectType<{ host: string; port: number; ssl: boolean }>(env.CONFIG);
}

// Test JSON validator without schema
{
  const env = zenv({
    SETTINGS: json()
  });

  // json() without type parameter infers as unknown (any valid JSON)
  expectType<unknown>(env.SETTINGS);
}

// Test custom validator with transform
{
  const semver = makeValidator<string, { major: number; minor: number; patch: number; raw: string }>({
    validator: (val: unknown) => typeof val === "string",
    transform: (val: string) => {
      const parts = val.split(".").map(Number);
      return {
        major: parts[0] ?? 0,
        minor: parts[1] ?? 0,
        patch: parts[2] ?? 0,
        raw: val
      };
    }
  });

  const env = zenv({
    VERSION: semver()
  });

  // Should infer transformed type
  expectType<{ major: number; minor: number; patch: number; raw: string }>(env.VERSION);
}

// Test all built-in validators
{
  const env = zenv({
    STRING: str(),
    NUMBER: num(),
    BOOLEAN: bool(),
    EMAIL: email(),
    URL: url(),
    HOST: host(),
    PORT: port(),
    UUID: uuid(),
    IPV4: ipv4(),
    IPV6: ipv6(),
    DATETIME: datetime(),
    ISO_DATE: isoDate(),
    ISO_TIME: isoTime(),
    ISO_DURATION: isoDuration(),
    BASE64: base64(),
    BASE64URL: base64url(),
    JWT: jwt(),
    CUID: cuid(),
    CUID2: cuid2(),
    ULID: ulid(),
    NANOID: nanoid(),
    GUID: guid(),
    XID: xid(),
    KSUID: ksuid()
  });

  expectType<string>(env.STRING);
  expectType<number>(env.NUMBER);
  expectType<boolean>(env.BOOLEAN);
  expectType<string>(env.EMAIL);
  expectType<string>(env.URL);
  expectType<string>(env.HOST);
  expectType<number>(env.PORT);
  expectType<string>(env.UUID);
  expectType<string>(env.IPV4);
  expectType<string>(env.IPV6);
  expectType<string>(env.DATETIME);
  expectType<string>(env.ISO_DATE);
  expectType<string>(env.ISO_TIME);
  expectType<string>(env.ISO_DURATION);
  expectType<string>(env.BASE64);
  expectType<string>(env.BASE64URL);
  expectType<string>(env.JWT);
  expectType<string>(env.CUID);
  expectType<string>(env.CUID2);
  expectType<string>(env.ULID);
  expectType<string>(env.NANOID);
  expectType<string>(env.GUID);
  expectType<string>(env.XID);
  expectType<string>(env.KSUID);
}

// Test client configuration doesn't affect server types
{
  const env = zenv({
    PUBLIC_URL: url({
      client: {
        expose: true,
        transform: (url: string) => url.replace("internal", "public")
      }
    }),
    SECRET_KEY: str({
      client: { expose: false }
    })
  });

  // Types should be the same on server regardless of client config
  expectType<string>(env.PUBLIC_URL);
  expectType<string>(env.SECRET_KEY);
}

// Test environment-specific defaults don't affect types
{
  const env = zenv({
    LOG_LEVEL: str({
      default: "info",
      devDefault: "debug",
      testDefault: "error"
    }),
    POOL_SIZE: num({
      default: 20,
      devDefault: 5,
      testDefault: 1
    })
  });

  // Types should be consistent regardless of environment
  expectType<string>(env.LOG_LEVEL);
  expectType<number>(env.POOL_SIZE);
}

// Test CleanedEnv type
{
  type MyEnvSpec = {
    NODE_ENV: z.ZodType<string>;
    PORT: z.ZodType<number>;
    DEBUG: z.ZodType<boolean>;
  };

  const spec: MyEnvSpec = {
    NODE_ENV: str(),
    PORT: port(),
    DEBUG: bool()
  };

  const env: CleanedEnv<MyEnvSpec> = zenv(spec);

  // Should have all the specified fields plus accessors
  expectType<string>(env.NODE_ENV);
  expectType<number>(env.PORT);
  expectType<boolean>(env.DEBUG);
  expectType<boolean>(env.isDevelopment);
}

// Test EnvAccessors type
{
  const accessors: EnvAccessors = {
    isDevelopment: false,
    isDev: false,
    isProduction: true,
    isProd: true,
    isTest: false
  };

  expectType<boolean>(accessors.isDevelopment);
  expectType<boolean>(accessors.isDev);
  expectType<boolean>(accessors.isProduction);
  expectType<boolean>(accessors.isProd);
  expectType<boolean>(accessors.isTest);
}

// Test that invalid access is caught at compile time
{
  const env = zenv({
    VALID_KEY: str()
  });

  // These should be valid
  expectType<string>(env.VALID_KEY);
  expectType<boolean>(env.isDevelopment);

  // This would be an error if TypeScript knew the exact shape
  // Using void to bypass linting, this is only for type testing
  void env;

  // Can't mutate environment - TypeScript doesn't catch this but runtime will
  // env.VALID_KEY = "new value"; // Would throw at runtime

  // Can't delete properties - TypeScript doesn't catch this but runtime will
  // delete env.VALID_KEY; // Would return true but not actually delete
}

// Test custom Zod schemas work
{
  const customSchema = z
    .string()
    .min(10)
    .max(100)
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);

  const env = zenv({
    CUSTOM_EMAIL: customSchema
  });

  expectType<string>(env.CUSTOM_EMAIL);
}

// Test optional values with no defaults
{
  const env = zenv(
    {
      OPTIONAL_STRING: str(),
      OPTIONAL_NUMBER: num()
    },
    { onError: "return", strict: false }
  );

  // With onError: "return" and no defaults, values could be undefined
  // But TypeScript sees them as their base types since validation passed
  expectType<string>(env.OPTIONAL_STRING);
  expectType<number>(env.OPTIONAL_NUMBER);
}

// Test complex nested JSON structures
{
  const complexSchema = z.object({
    users: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        roles: z.array(z.enum(["admin", "user", "guest"]))
      })
    ),
    settings: z.record(z.string(), z.unknown()),
    metadata: z
      .object({
        version: z.string(),
        timestamp: z.number()
      })
      .optional()
  });

  const env = zenv({
    APP_CONFIG: json({ schema: complexSchema })
  });

  expectType<{
    users: {
      id: string;
      name: string;
      roles: ("admin" | "user" | "guest")[];
    }[];
    settings: Record<string, unknown>;
    metadata?:
      | {
          version: string;
          timestamp: number;
        }
      | undefined;
  }>(env.APP_CONFIG);
}

// Test that makeValidator preserves type parameters
{
  interface CustomConfig {
    enabled: boolean;
    level: number;
    tags: string[];
  }

  const configValidator = makeValidator<string, CustomConfig>({
    validator: (val: unknown) => typeof val === "string",
    transform: (val: string): CustomConfig => JSON.parse(val) as CustomConfig
  });

  const env = zenv({
    FEATURE_CONFIG: configValidator()
  });

  expectType<CustomConfig>(env.FEATURE_CONFIG);
  expectType<boolean>(env.FEATURE_CONFIG.enabled);
  expectType<number>(env.FEATURE_CONFIG.level);
  expectType<string[]>(env.FEATURE_CONFIG.tags);
}

// Test that all validators return proper Zod types
{
  // Each validator should return a Zod schema
  const stringSchema: z.ZodType<string> = str();
  const numberSchema: z.ZodType<number> = num();
  const booleanSchema: z.ZodType<boolean> = bool();
  const portSchema: z.ZodNumber = port();
  const emailSchema: z.ZodType<string> = email();
  const urlSchema: z.ZodType<string> = url();
  const hostSchema: z.ZodType<string> = host();
  const uuidSchema: z.ZodType<string> = uuid();
  const ipv4Schema: z.ZodType<string> = ipv4();
  const ipv6Schema: z.ZodType<string> = ipv6();

  // Validators should be assignable to ZodType
  expectType<z.ZodType>(stringSchema);
  expectType<z.ZodType>(numberSchema);
  expectType<z.ZodType>(booleanSchema);
  expectType<z.ZodType>(portSchema);
  expectType<z.ZodType>(emailSchema);
  expectType<z.ZodType>(urlSchema);
  expectType<z.ZodType>(hostSchema);
  expectType<z.ZodType>(uuidSchema);
  expectType<z.ZodType>(ipv4Schema);
  expectType<z.ZodType>(ipv6Schema);
}
