/**
 * @module validators
 * @description Built-in validators for common environment variable types.
 * All validators follow a consistent pattern with the new simplified options API.
 */
import { z } from "zod/v4";

import { runtime } from "./runtime";
import type {
  BaseOptions,
  BooleanOptions,
  ClientConfig,
  CustomValidatorOptions,
  EmailOptions,
  HostOptions,
  JsonOptions,
  NumberOptions,
  PortOptions,
  StringOptions,
  UndefinedDefault,
  UrlOptions
} from "./types";
import type { SchemaMetadata } from "./types/inference";

// Type guards are no longer needed after refactoring to use Zod's built-in validators

/**
 * WeakMap to store metadata without polluting Zod schemas.
 * This allows us to attach client configuration and other metadata
 * to schemas without modifying their structure.
 */
const schemaMetadata = new WeakMap<z.ZodType, SchemaMetadata>();

/**
 * Attach metadata to a Zod schema.
 * @param schema The Zod schema to attach metadata to
 * @param options The options containing metadata
 */
function attachMetadata<T>(schema: z.ZodType<T>, options?: BaseOptions<T>): void {
  if (options) {
    const metadata: SchemaMetadata = {
      options: options as BaseOptions<unknown>,
      client: options.client as ClientConfig<unknown> | undefined,
      autoExposed: false // Will be set by core.ts based on prefix detection
    };
    schemaMetadata.set(schema, metadata);
  }
}

/**
 * Get metadata from a Zod schema.
 * Retrieves the attached options and client configuration from a validator.
 *
 * @param schema - The Zod schema to get metadata from
 * @returns The attached metadata or undefined
 *
 * @example
 * Checking if a validator is client-exposed
 * ```ts
 * const validator = str({ client: { expose: true } });
 * const metadata = getMetadata(validator);
 * console.log(metadata?.client?.expose); // true
 * ```
 *
 * @example
 * Getting validator description
 * ```ts
 * const validator = num({ description: 'Port number' });
 * const metadata = getMetadata(validator);
 * console.log(metadata?.options.description); // 'Port number'
 * ```
 */
export function getMetadata<T>(schema: z.ZodType<T>): SchemaMetadata | undefined {
  return schemaMetadata.get(schema);
}

// Note: getEnvironmentDefault is currently unused but kept for potential future use
// It could be useful for debugging or alternative implementations

/**
 * Apply environment-specific defaults to a schema.
 * @param schema The Zod schema to apply defaults to
 * @param options The options containing default values
 * @returns The schema with defaults applied
 */
function applyEnvironmentDefaults<T>(schema: z.ZodType<T>, options?: BaseOptions<T>): z.ZodType<T> {
  if (!options) return schema;

  const nodeEnv = runtime.nodeEnv;

  // Apply defaults based on environment priority
  // In Zod v4, we need to make the schema optional to apply defaults
  // Use 'in' operator to check for property existence, allowing undefined as a valid default

  // Special handling for undefined and null defaults - just make the schema optional without a default
  if (nodeEnv === "test" && "testDefault" in options) {
    const value = options.testDefault;
    if (value === undefined || value === null) {
      return schema.optional() as z.ZodType<T>;
    }
    // Type assertion to satisfy Zod's NoUndefined requirement
    return schema.optional().default(value as Exclude<T, undefined>);
  } else if (nodeEnv === "development" && "devDefault" in options) {
    const value = options.devDefault;
    if (value === undefined || value === null) {
      return schema.optional() as z.ZodType<T>;
    }
    // Type assertion to satisfy Zod's NoUndefined requirement
    return schema.optional().default(value as Exclude<T, undefined>);
  } else if ("default" in options) {
    const value = options.default;
    if (value === undefined || value === null) {
      return schema.optional() as z.ZodType<T>;
    }
    // Type assertion to satisfy Zod's NoUndefined requirement
    return schema.optional().default(value as Exclude<T, undefined>);
  }

  return schema;
}

/**
 * Merge base options with override options.
 * Deep merges the client object if present in both.
 * @param base The base options
 * @param overrides The override options
 * @returns The merged options
 */
function mergeOptions<T>(base?: BaseOptions<T>, overrides?: BaseOptions<T>): BaseOptions<T> | undefined {
  if (!base && !overrides) return undefined;
  if (!base) return overrides;
  if (!overrides) return base;

  const merged: BaseOptions<T> = {
    ...base,
    ...overrides
  };

  // Deep merge client object if both exist
  if (base.client || overrides.client) {
    merged.client = {
      expose: overrides.client?.expose ?? base.client?.expose ?? false,
      transform: overrides.client?.transform ?? base.client?.transform,
      default: overrides.client?.default ?? base.client?.default,
      devDefault: overrides.client?.devDefault ?? base.client?.devDefault
    };
  }

  return merged;
}

/**
 * String validator with configurable constraints.
 * Validates environment variables as strings with optional restrictions.
 *
 * @param options - Validation options for the string
 * @returns Zod schema that validates strings
 *
 * @example
 * Basic string validation
 * ```ts
 * const env = zenv({
 *   APP_NAME: str({ default: 'MyApp' })
 * });
 * ```
 *
 * @example
 * String with choices (enum)
 * ```ts
 * const env = zenv({
 *   LOG_LEVEL: str({
 *     choices: ['debug', 'info', 'warn', 'error'],
 *     default: 'info'
 *   })
 * });
 * ```
 *
 * @example
 * String with length constraints
 * ```ts
 * const env = zenv({
 *   API_KEY: str({ min: 32, max: 64 })
 * });
 * ```
 *
 * @example
 * String with regex pattern
 * ```ts
 * const env = zenv({
 *   VERSION: str({
 *     regex: /^\d+\.\d+\.\d+$/,
 *     example: '1.2.3'
 *   })
 * });
 * ```
 *
 * @example
 * Optional string with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   OPTIONAL_KEY: str({ default: undefined }),
 *   // Optional only in dev/test, required in production
 *   STRIPE_KEY: str({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: OPTIONAL_KEY is string | undefined
 * // Type: STRIPE_KEY is string | undefined in dev/test, string in production
 * ```
 *
 * @example
 * Client-exposed string with transform
 * ```ts
 * const env = zenv({
 *   INTERNAL_URL: str({
 *     client: {
 *       expose: true,
 *       transform: (url) => url.replace('internal', 'public')
 *     }
 *   })
 * });
 * ```
 */
// Overload when choices is provided - const modifier forces literal inference
export function str<const TChoices extends readonly string[]>(
  options: StringOptions<TChoices> & { choices: TChoices }
): z.ZodType<TChoices[number]>;

// Overloads for undefined default detection without choices
export function str(
  options: Omit<StringOptions, "choices"> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Overload when choices is not provided
export function str(options?: Omit<StringOptions, "choices">): z.ZodType<string>;

// Implementation signature
export function str<TChoices extends readonly string[] | undefined = undefined>(
  options?: StringOptions<TChoices>
): z.ZodType<TChoices extends readonly string[] ? TChoices[number] : string> {
  let schema = z.string();

  // Apply constraints
  if (options?.min !== undefined) {
    schema = schema.min(options.min);
  }
  if (options?.max !== undefined) {
    schema = schema.max(options.max);
  }
  if (options?.regex) {
    schema = schema.regex(options.regex);
  }
  if (options?.choices && options.choices.length > 0) {
    // Create enum schema for choices
    let enumSchema = z.enum(options.choices);
    // Apply defaults before returning
    enumSchema = applyEnvironmentDefaults(enumSchema, options as BaseOptions<string>) as typeof enumSchema;
    attachMetadata(enumSchema, options as BaseOptions<string>);
    // Enum is a valid string schema
    return enumSchema as unknown as z.ZodType<TChoices extends readonly string[] ? TChoices[number] : string>;
  }

  // Apply environment defaults and attach metadata
  schema = applyEnvironmentDefaults(schema, options as BaseOptions<string>) as z.ZodString;
  attachMetadata(schema, options as BaseOptions<string>);

  return schema as unknown as z.ZodType<TChoices extends readonly string[] ? TChoices[number] : string>;
}

/**
 * Number validator with automatic string-to-number coercion.
 * Parses environment variables as numbers with optional constraints.
 *
 * @param options - Validation options for the number
 * @returns Zod number schema with metadata
 *
 * @example
 * Basic number with default
 * ```ts
 * const env = zenv({
 *   PORT: num({ default: 3000 })
 * });
 * ```
 *
 * @example
 * Number with min/max range
 * ```ts
 * const env = zenv({
 *   WORKERS: num({ min: 1, max: 100, default: 4 })
 * });
 * ```
 *
 * @example
 * Integer validation
 * ```ts
 * const env = zenv({
 *   RETRY_COUNT: num({ int: true, default: 3 })
 * });
 * ```
 *
 * @example
 * Positive number only
 * ```ts
 * const env = zenv({
 *   TIMEOUT_MS: num({ positive: true })
 * });
 * ```
 *
 * @example
 * Number with choices (enum)
 * ```ts
 * const env = zenv({
 *   LOG_LEVEL_NUM: num({
 *     choices: [0, 1, 2, 3],
 *     default: 1
 *   })
 * });
 * ```
 *
 * @example
 * Environment-specific defaults
 * ```ts
 * const env = zenv({
 *   POOL_SIZE: num({
 *     default: 10,
 *     devDefault: 2,
 *     testDefault: 1
 *   })
 * });
 * ```
 *
 * @example
 * Optional number with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   CUSTOM_PORT: num({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   MAX_WORKERS: num({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: CUSTOM_PORT is number | undefined
 * // Type: MAX_WORKERS is number | undefined in dev/test, number in production
 * ```
 */
// Overload when choices is provided - const modifier forces literal inference
export function num<const TChoices extends readonly number[]>(
  options: NumberOptions<TChoices> & { choices: TChoices }
): z.ZodType<TChoices[number]>;

// Overloads for undefined default detection without choices
export function num(
  options: Omit<NumberOptions, "choices"> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<number> & UndefinedDefault;

// Overload when choices is not provided
export function num(options?: Omit<NumberOptions, "choices">): z.ZodType<number>;

// Implementation signature
export function num<TChoices extends readonly number[] | undefined = undefined>(
  options?: NumberOptions<TChoices>
): z.ZodType<TChoices extends readonly number[] ? TChoices[number] : number> {
  // Parse string to number with coercion
  let schema = z.coerce.number() as z.ZodNumber;

  // Apply constraints
  if (options?.min !== undefined) {
    schema = schema.min(options.min);
  }
  if (options?.max !== undefined) {
    schema = schema.max(options.max);
  }
  if (options?.int === true) {
    schema = schema.int();
  }
  if (options?.positive === true) {
    schema = schema.positive();
  }
  if (options?.negative === true) {
    schema = schema.negative();
  }

  // Handle choices if provided
  if (options?.choices && options.choices.length > 0) {
    // Create union schema for number choices with coercion
    const [first, ...rest] = options.choices;
    // Create a schema that first coerces to number, then validates against choices
    const choicesSchema = z.preprocess(
      (val) => {
        // Coerce to number first
        if (typeof val === "string") {
          const num = Number(val);
          return isNaN(num) ? val : num;
        }
        return val;
      },
      z.union([z.literal(first), ...rest.map((v) => z.literal(v))] as [z.ZodLiteral<number>, ...z.ZodLiteral<number>[]])
    );

    // Apply environment defaults and attach metadata
    const finalSchema = applyEnvironmentDefaults(choicesSchema, options as BaseOptions<number>);
    attachMetadata(finalSchema, options as BaseOptions<number>);
    return finalSchema as unknown as z.ZodType<TChoices extends readonly number[] ? TChoices[number] : number>;
  }

  // Apply environment defaults and attach metadata
  schema = applyEnvironmentDefaults(schema, options as BaseOptions<number>) as z.ZodNumber;
  attachMetadata(schema, options as BaseOptions<number>);

  return schema as unknown as z.ZodType<TChoices extends readonly number[] ? TChoices[number] : number>;
}

/**
 * Boolean validator with precise string-to-boolean parsing.
 * Handles common boolean string representations accurately.
 *
 * @param options - Validation options for the boolean
 * @returns Zod schema that outputs boolean
 *
 * @example
 * Basic boolean with default
 * ```ts
 * const env = zenv({
 *   DEBUG: bool({ default: false })
 * });
 * ```
 *
 * @example
 * Parsing various boolean strings
 * ```ts
 * // All of these parse correctly:
 * // "true", "false", "1", "0", "yes", "no", "on", "off"
 * const env = zenv({
 *   FEATURE_ENABLED: bool(),
 *   USE_CACHE: bool(),
 *   VERBOSE: bool()
 * });
 * ```
 *
 * @example
 * Environment-specific defaults
 * ```ts
 * const env = zenv({
 *   ENABLE_TELEMETRY: bool({
 *     default: true,
 *     devDefault: false,
 *     testDefault: false
 *   })
 * });
 * ```
 *
 * @example
 * Client-exposed boolean
 * ```ts
 * const env = zenv({
 *   SHOW_DEBUG_UI: bool({
 *     client: {
 *       expose: true,
 *       default: false,
 *       devDefault: true
 *     }
 *   })
 * });
 * ```
 *
 * @example
 * Optional boolean with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   EXPERIMENTAL_FEATURE: bool({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   ENABLE_MONITORING: bool({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: EXPERIMENTAL_FEATURE is boolean | undefined
 * // Type: ENABLE_MONITORING is boolean | undefined in dev/test, boolean in production
 * ```
 */
// Overloads for undefined default detection
export function bool(
  options: BooleanOptions & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<boolean> & UndefinedDefault;

// Original overload
export function bool(options?: BooleanOptions): z.ZodType<boolean>;

// Implementation
export function bool(options?: BooleanOptions): z.ZodType<boolean> {
  // Create precise boolean parser that handles specific string values
  // Note: z.coerce.boolean() would treat "false" as true (truthy string)
  // So we need explicit handling for proper boolean string parsing
  const schema = z.union([
    // Native boolean
    z.boolean(),
    // Specific string literals with explicit transforms
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false),
    z.literal("1").transform(() => true),
    z.literal("0").transform(() => false),
    z.literal("yes").transform(() => true),
    z.literal("no").transform(() => false),
    z.literal("on").transform(() => true),
    z.literal("off").transform(() => false),
    // Case-insensitive string handling
    z
      .string()
      .regex(/^(true|false|1|0|yes|no|on|off)$/i, { message: "Invalid boolean value" })
      .transform((val) => {
        const lower = val.toLowerCase();
        return ["true", "1", "yes", "on"].includes(lower);
      })
  ]);

  // Apply environment defaults and attach metadata
  const finalSchema = applyEnvironmentDefaults(schema, options);
  attachMetadata(finalSchema, options);

  // The union schema outputs boolean, so this is type-safe
  return finalSchema;
}

/**
 * Email validator using Zod v4's built-in email validator.
 * Validates email addresses with optional custom regex.
 *
 * @param options - Validation options for the email
 * @returns Zod email schema with metadata
 *
 * @example
 * Basic email validation
 * ```ts
 * const env = zenv({
 *   ADMIN_EMAIL: email({ default: 'admin@example.com' })
 * });
 * ```
 *
 * @example
 * Email with custom regex
 * ```ts
 * const env = zenv({
 *   COMPANY_EMAIL: email({
 *     regex: /@mycompany\.com$/,
 *     description: 'Must be a company email address'
 *   })
 * });
 * ```
 *
 * @example
 * Environment-specific defaults
 * ```ts
 * const env = zenv({
 *   NOTIFICATION_EMAIL: email({
 *     default: 'noreply@example.com',
 *     devDefault: 'dev@example.com',
 *     testDefault: 'test@example.com'
 *   })
 * });
 * ```
 *
 * @example
 * Optional email with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   ADMIN_EMAIL: email({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   SUPPORT_EMAIL: email({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: ADMIN_EMAIL is string | undefined
 * // Type: SUPPORT_EMAIL is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function email(
  options: EmailOptions & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function email(options?: EmailOptions): z.ZodType<string>;

// Implementation
export function email(options?: EmailOptions): z.ZodType<string> {
  // Use Zod v4's built-in email validator function
  let schema: z.ZodType<string> = z.email();

  // Support custom regex override if provided
  if (options?.regex) {
    // Apply custom regex pattern instead of default email validation
    schema = z.string().regex(options.regex, { message: "Email must match custom regex pattern" });
  }

  // Apply environment defaults and attach metadata
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);

  return schema;
}

/**
 * URL validator using Zod v4's built-in URL validator.
 * Validates URLs with optional protocol and hostname restrictions.
 *
 * @param options - Validation options for the URL
 * @returns Zod URL schema with metadata
 *
 * @example
 * Basic URL validation
 * ```ts
 * const env = zenv({
 *   API_URL: url({ default: 'https://api.example.com' })
 * });
 * ```
 *
 * @example
 * URL with protocol restriction
 * ```ts
 * const env = zenv({
 *   SECURE_URL: url({
 *     protocol: /^https$/,
 *     description: 'Must use HTTPS protocol'
 *   })
 * });
 * ```
 *
 * @example
 * URL with hostname restriction
 * ```ts
 * const env = zenv({
 *   INTERNAL_API: url({
 *     hostname: /^(localhost|127\.0\.0\.1|.*\.internal)$/,
 *     description: 'Must be an internal URL'
 *   })
 * });
 * ```
 *
 * @example
 * Client-exposed with transform
 * ```ts
 * const env = zenv({
 *   BACKEND_URL: url({
 *     default: 'http://localhost:3000',
 *     client: {
 *       expose: true,
 *       transform: (url) => url.replace('localhost', 'api.example.com')
 *     }
 *   })
 * });
 * ```
 *
 * @example
 * Optional URL with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   WEBHOOK_URL: url({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   CDN_URL: url({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: WEBHOOK_URL is string | undefined
 * // Type: CDN_URL is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function url(
  options: UrlOptions & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function url(options?: UrlOptions): z.ZodType<string>;

// Implementation
export function url(options?: UrlOptions): z.ZodType<string> {
  // Use Zod v4's built-in URL validator function
  let schema: z.ZodType<string> = z.url();

  // Apply protocol restriction if provided
  if (options?.protocol) {
    schema = schema.refine(
      (val) => {
        // If protocol is a string, check for exact match (including port)
        if (typeof options.protocol === "string") {
          return val.startsWith(`${options.protocol}:`);
        }
        // otherwise, protocol is a regex, check for match
        try {
          const u = new URL(val);
          return options.protocol?.test(u.protocol.replace(":", ""));
        } catch {
          return false;
        }
      },
      { message: `URL must match protocol pattern: ${options.protocol}` }
    );
  }

  // Apply hostname restriction if provided
  if (options?.hostname) {
    schema = schema.refine(
      (val) => {
        try {
          const u = new URL(val);
          // If hostname is a string, check for exact match
          if (typeof options.hostname === "string") {
            return u.hostname === options.hostname;
          }
          // otherwise, hostname is a regex, check for match
          return options.hostname?.test(u.hostname);
        } catch {
          return false;
        }
      },
      { message: `URL must match hostname pattern: ${options.hostname}` }
    );
  }

  // Apply environment defaults and attach metadata
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);

  return schema;
}

/**
 * Host validator with simplified options.
 * Validates hostnames and optionally IP addresses.
 *
 * @param options - Validation options for the host
 * @returns Zod host schema with metadata
 *
 * @example
 * Basic hostname validation
 * ```ts
 * const env = zenv({
 *   DATABASE_HOST: host({ default: 'localhost' })
 * });
 * ```
 *
 * @example
 * Hostname only (no IP addresses)
 * ```ts
 * const env = zenv({
 *   API_HOST: host({
 *     allowIP: false,
 *     description: 'Must be a valid hostname, not an IP'
 *   })
 * });
 * ```
 *
 * @example
 * IPv4 addresses only
 * ```ts
 * const env = zenv({
 *   IPV4_HOST: host({
 *     ipv4Only: true,
 *     default: '127.0.0.1'
 *   })
 * });
 * ```
 *
 * @example
 * IPv6 addresses only
 * ```ts
 * const env = zenv({
 *   IPV6_HOST: host({
 *     ipv6Only: true,
 *     default: '::1'
 *   })
 * });
 * ```
 *
 * @example
 * Optional host with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   PROXY_HOST: host({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   BACKUP_HOST: host({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: PROXY_HOST is string | undefined
 * // Type: BACKUP_HOST is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function host(
  options: HostOptions & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function host(options?: HostOptions): z.ZodType<string>;

// Implementation
export function host(options?: HostOptions): z.ZodType<string> {
  const allowIP = options?.allowIP !== false; // Default true

  let schema: z.ZodType<string>;

  // Since z.hostname() is not available in Zod v4, use regex patterns from z.regexes
  const hostnameRegex =
    /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;

  if (!allowIP) {
    // Use hostname regex only
    schema = z.string().regex(hostnameRegex, { message: "Invalid hostname" });
  } else if (options?.ipv6Only) {
    // IPv6 only with hostname
    schema = z.union([z.string().regex(hostnameRegex), z.ipv6()]);
  } else if (options?.ipv4Only) {
    // IPv4 only with hostname
    schema = z.union([z.string().regex(hostnameRegex), z.ipv4()]);
  } else {
    // Both IPv4 and IPv6 with hostname
    schema = z.union([z.string().regex(hostnameRegex), z.ipv4(), z.ipv6()]);
  }

  // Apply environment defaults and attach metadata
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);

  return schema;
}

/**
 * Port validator using Zod v4's coerce.number with constraints.
 * Validates port numbers within the valid TCP/UDP port range.
 *
 * @param options - Validation options for the port
 * @returns Zod port number schema with metadata
 *
 * @example
 * Basic port with default
 * ```ts
 * const env = zenv({
 *   PORT: port({ default: 3000 })
 * });
 * ```
 *
 * @example
 * Port with custom range
 * ```ts
 * const env = zenv({
 *   CUSTOM_PORT: port({
 *     min: 3000,
 *     max: 9999,
 *     default: 3000
 *   })
 * });
 * ```
 *
 * @example
 * Environment-specific ports
 * ```ts
 * const env = zenv({
 *   SERVER_PORT: port({
 *     default: 8080,
 *     devDefault: 3000,
 *     testDefault: 0  // 0 = random port for tests
 *   })
 * });
 * ```
 *
 * @example
 * Optional port with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   DEBUG_PORT: port({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   METRICS_PORT: port({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: DEBUG_PORT is number | undefined
 * // Type: METRICS_PORT is number | undefined in dev/test, number in production
 * ```
 */
// Overloads for undefined default detection
export function port(
  options: PortOptions & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodNumber & UndefinedDefault;

// Original overload
export function port(options?: PortOptions): z.ZodNumber;

// Implementation
export function port(options?: PortOptions): z.ZodNumber {
  const min = options?.min ?? 1;
  const max = options?.max ?? 65535;

  // Use Zod v4's coerce.number() for automatic string-to-number conversion
  let schema = z.coerce.number().int().min(min).max(max) as z.ZodNumber;

  // Apply environment defaults and attach metadata
  schema = applyEnvironmentDefaults(schema, options) as z.ZodNumber;
  attachMetadata(schema, options);

  return schema;
}

/**
 * JSON validator with optional schema validation.
 * Parses JSON strings and optionally validates against a Zod schema.
 *
 * @param options - Validation options including optional schema
 * @returns Zod schema for parsed JSON with metadata
 *
 * @example
 * Basic JSON parsing
 * ```ts
 * const env = zenv({
 *   CONFIG: json({ default: { enabled: true } })
 * });
 * ```
 *
 * @example
 * JSON with schema validation
 * ```ts
 * const configSchema = z.object({
 *   apiKey: z.string(),
 *   timeout: z.number(),
 *   features: z.array(z.string())
 * });
 *
 * const env = zenv({
 *   APP_CONFIG: json({
 *     schema: configSchema,
 *     default: {
 *       apiKey: 'default-key',
 *       timeout: 5000,
 *       features: []
 *     }
 *   })
 * });
 * ```
 *
 * @example
 * Complex nested JSON
 * ```ts
 * const env = zenv({
 *   FEATURE_FLAGS: json<Record<string, boolean>>({
 *     default: {},
 *     example: '{"feature1": true, "feature2": false}'
 *   })
 * });
 * ```
 *
 * @example
 * Optional json with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   CONFIG_JSON: json({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   SETTINGS_JSON: json({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: CONFIG_JSON is T | undefined
 * // Type: SETTINGS_JSON is T | undefined in dev/test, T in production
 * ```
 */
// Overloads for undefined default detection
export function json<T = Record<string, unknown>>(
  options: JsonOptions<T> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<T> & UndefinedDefault;

// Original overload
export function json<T = Record<string, unknown>>(options?: JsonOptions<T>): z.ZodType<T>;

// Implementation
export function json<T = Record<string, unknown>>(options?: JsonOptions<T>): z.ZodType<T> {
  // Create parser that handles JSON strings
  let schema: z.ZodType<T>;

  if (options?.schema) {
    // Use provided schema for validation
    schema = z.string().transform((val, ctx) => {
      try {
        const parsed = JSON.parse(val) as T;
        const schemaValidator = options.schema;
        if (!schemaValidator) {
          return parsed;
        }
        const result = schemaValidator.safeParse(parsed);
        if (result.success) {
          return result.data;
        } else {
          ctx.addIssue({
            code: "custom" as const,
            message: "JSON validation failed"
          });
          return z.NEVER;
        }
      } catch (e) {
        ctx.addIssue({
          code: "custom" as const,
          message: isError(e) ? e.message : "Invalid JSON"
        });
        return z.NEVER;
      }
    }) as z.ZodType<T>;
  } else {
    // Parse as generic JSON
    schema = z.string().transform((val, ctx) => {
      try {
        return JSON.parse(val) as T;
      } catch (e) {
        ctx.addIssue({
          code: "custom" as const,
          message: isError(e) ? e.message : "Invalid JSON"
        });
        return z.NEVER;
      }
    }) as z.ZodType<T>;
  }

  // Apply environment defaults and attach metadata
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);

  return schema;
}

/**
 * Type guard to check if an error is an Error instance.
 * Helper function for error handling in validators.
 */
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * UUID validator using Zod v4's built-in UUID validator.
 * Validates UUIDs with optional version specification.
 *
 * @param options - Validation options including UUID version
 * @returns Zod UUID schema with metadata
 *
 * @example
 * Basic UUID validation (any version)
 * ```ts
 * const env = zenv({
 *   SESSION_ID: uuid()
 * });
 * ```
 *
 * @example
 * UUID v4 specifically
 * ```ts
 * const env = zenv({
 *   REQUEST_ID: uuid({
 *     version: 'v4',
 *     example: '550e8400-e29b-41d4-a716-446655440000'
 *   })
 * });
 * ```
 *
 * @example
 * UUID with default value
 * ```ts
 * const env = zenv({
 *   TRACE_ID: uuid({
 *     default: '00000000-0000-0000-0000-000000000000'
 *   })
 * });
 * ```
 *
 * @example
 * Optional uuid with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   REQUEST_ID: uuid({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   CORRELATION_ID: uuid({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: REQUEST_ID is string | undefined
 * // Type: CORRELATION_ID is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function uuid(
  options: (BaseOptions<string> & { version?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8" }) &
    ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function uuid(
  options?: BaseOptions<string> & {
    version?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8";
  }
): z.ZodType<string>;

// Implementation
export function uuid(
  options?: BaseOptions<string> & {
    version?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8";
  }
): z.ZodType<string> {
  let schema: z.ZodType<string> = z.uuid(options?.version ? { version: options.version } : undefined);

  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * IPv4 address validator using Zod v4's built-in ipv4 validator.
 * Validates IPv4 addresses in standard dotted decimal notation.
 *
 * @param options - Validation options
 * @returns Zod IPv4 schema with metadata
 *
 * @example
 * Basic IPv4 validation
 * ```ts
 * const env = zenv({
 *   SERVER_IP: ipv4({ default: '127.0.0.1' })
 * });
 * ```
 *
 * @example
 * IPv4 with environment-specific defaults
 * ```ts
 * const env = zenv({
 *   BIND_ADDRESS: ipv4({
 *     default: '0.0.0.0',
 *     devDefault: '127.0.0.1'
 *   })
 * });
 * ```
 *
 * @example
 * Optional IPv4 with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   BIND_IP: ipv4({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   PUBLIC_IP: ipv4({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: BIND_IP is string | undefined
 * // Type: PUBLIC_IP is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function ipv4(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function ipv4(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function ipv4(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.ipv4();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * IPv6 address validator using Zod v4's built-in ipv6 validator.
 * Validates IPv6 addresses in standard notation.
 *
 * @param options - Validation options
 * @returns Zod IPv6 schema with metadata
 *
 * @example
 * Basic IPv6 validation
 * ```ts
 * const env = zenv({
 *   IPV6_ADDRESS: ipv6({ default: '::1' })
 * });
 * ```
 *
 * @example
 * IPv6 with fallback
 * ```ts
 * const env = zenv({
 *   LISTEN_IPV6: ipv6({
 *     default: '::',
 *     description: 'IPv6 address to bind to'
 *   })
 * });
 * ```
 *
 * @example
 * Optional IPv6 with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   IPV6_BIND: ipv6({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   IPV6_PUBLIC: ipv6({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: IPV6_BIND is string | undefined
 * // Type: IPV6_PUBLIC is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function ipv6(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function ipv6(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function ipv6(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.ipv6();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * ISO datetime validator using Zod v4's built-in iso.datetime.
 * Validates ISO 8601 datetime strings with optional timezone and precision.
 *
 * @param options - Validation options with offset, local, and precision
 * @returns Zod ISO datetime schema with metadata
 *
 * @example
 * Basic ISO datetime
 * ```ts
 * const env = zenv({
 *   SCHEDULED_AT: datetime()
 *   // Accepts: '2024-01-01T12:00:00Z'
 * });
 * ```
 *
 * @example
 * Datetime with timezone offset
 * ```ts
 * const env = zenv({
 *   EVENT_TIME: datetime({
 *     offset: true,
 *     example: '2024-01-01T12:00:00+02:00'
 *   })
 * });
 * ```
 *
 * @example
 * Datetime with millisecond precision
 * ```ts
 * const env = zenv({
 *   TIMESTAMP: datetime({
 *     precision: 3,
 *     example: '2024-01-01T12:00:00.123Z'
 *   })
 * });
 * ```
 *
 * @example
 * Optional datetime with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   CREATED_AT: datetime({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   UPDATED_AT: datetime({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: CREATED_AT is string | undefined
 * // Type: UPDATED_AT is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function datetime(
  options: (BaseOptions<string> & { offset?: boolean; local?: boolean; precision?: number }) &
    ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function datetime(
  options?: BaseOptions<string> & {
    offset?: boolean;
    local?: boolean;
    precision?: number;
  }
): z.ZodType<string>;

// Implementation
export function datetime(
  options?: BaseOptions<string> & {
    offset?: boolean;
    local?: boolean;
    precision?: number;
  }
): z.ZodType<string> {
  // Build options object only with defined properties to satisfy exactOptionalPropertyTypes
  const datetimeOptions: { offset?: boolean; local?: boolean; precision?: number } = {};
  if (options?.offset !== undefined) datetimeOptions.offset = options.offset;
  if (options?.local !== undefined) datetimeOptions.local = options.local;
  if (options?.precision !== undefined) datetimeOptions.precision = options.precision;

  let schema: z.ZodType<string> = z.iso.datetime(Object.keys(datetimeOptions).length > 0 ? datetimeOptions : undefined);

  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * ISO date validator using Zod v4's built-in iso.date.
 * Validates ISO 8601 date strings (YYYY-MM-DD format).
 *
 * @param options - Validation options
 * @returns Zod ISO date schema with metadata
 *
 * @example
 * Basic ISO date
 * ```ts
 * const env = zenv({
 *   START_DATE: isoDate({ default: '2024-01-01' })
 * });
 * ```
 *
 * @example
 * Date with validation message
 * ```ts
 * const env = zenv({
 *   EXPIRY_DATE: isoDate({
 *     description: 'License expiry date in YYYY-MM-DD format'
 *   })
 * });
 * ```
 *
 * @example
 * Optional isoDate with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   START_DATE: isoDate({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   LAUNCH_DATE: isoDate({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: START_DATE is string | undefined
 * // Type: LAUNCH_DATE is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function isoDate(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function isoDate(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function isoDate(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.iso.date();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * ISO time validator using Zod v4's built-in iso.time.
 * Validates ISO 8601 time strings (HH:MM:SS format).
 *
 * @param options - Validation options with optional precision
 * @returns Zod ISO time schema with metadata
 *
 * @example
 * Basic time validation
 * ```ts
 * const env = zenv({
 *   DAILY_BACKUP_TIME: isoTime({ default: '03:00:00' })
 * });
 * ```
 *
 * @example
 * Time with millisecond precision
 * ```ts
 * const env = zenv({
 *   PRECISE_TIME: isoTime({
 *     precision: 3,
 *     example: '14:30:45.123'
 *   })
 * });
 * ```
 *
 * @example
 * Optional isoTime with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   DAILY_BACKUP_TIME: isoTime({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   SCHEDULED_TIME: isoTime({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: DAILY_BACKUP_TIME is string | undefined
 * // Type: SCHEDULED_TIME is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function isoTime(
  options: (BaseOptions<string> & { precision?: number }) &
    ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function isoTime(options?: BaseOptions<string> & { precision?: number }): z.ZodType<string>;

// Implementation
export function isoTime(options?: BaseOptions<string> & { precision?: number }): z.ZodType<string> {
  // Build options object only with defined properties to satisfy exactOptionalPropertyTypes
  const timeOptions: { precision?: number } = {};
  if (options?.precision !== undefined) timeOptions.precision = options.precision;

  let schema: z.ZodType<string> = z.iso.time(Object.keys(timeOptions).length > 0 ? timeOptions : undefined);
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * ISO duration validator using Zod v4's built-in iso.duration.
 * Validates ISO 8601 duration strings (e.g., P1DT2H3M4S).
 *
 * @param options - Validation options
 * @returns Zod ISO duration schema with metadata
 *
 * @example
 * Basic duration
 * ```ts
 * const env = zenv({
 *   CACHE_TTL: isoDuration({ default: 'PT1H' })  // 1 hour
 * });
 * ```
 *
 * @example
 * Complex duration
 * ```ts
 * const env = zenv({
 *   RETENTION_PERIOD: isoDuration({
 *     default: 'P30D',  // 30 days
 *     example: 'P1Y2M3DT4H5M6S'  // 1 year, 2 months, 3 days, 4 hours, 5 minutes, 6 seconds
 *   })
 * });
 * ```
 *
 * @example
 * Optional isoDuration with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   CACHE_TTL: isoDuration({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   SESSION_TIMEOUT: isoDuration({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: CACHE_TTL is string | undefined
 * // Type: SESSION_TIMEOUT is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function isoDuration(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function isoDuration(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function isoDuration(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.iso.duration();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * Base64 validator using Zod v4's built-in base64 validator.
 * Validates standard base64 encoded strings.
 *
 * @param options - Validation options
 * @returns Zod base64 schema with metadata
 *
 * @example
 * Basic base64 validation
 * ```ts
 * const env = zenv({
 *   ENCRYPTED_KEY: base64()
 * });
 * ```
 *
 * @example
 * Base64 with default
 * ```ts
 * const env = zenv({
 *   API_SECRET: base64({
 *     default: 'c2VjcmV0',  // 'secret' in base64
 *     description: 'Base64 encoded API secret'
 *   })
 * });
 * ```
 *
 * @example
 * Optional base64 with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   ENCODED_SECRET: base64({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   API_CREDENTIALS: base64({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: ENCODED_SECRET is string | undefined
 * // Type: API_CREDENTIALS is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function base64(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function base64(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function base64(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.base64();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * Base64URL validator using Zod v4's built-in base64url validator.
 * Validates URL-safe base64 encoded strings (using - and _ instead of + and /).
 *
 * @param options - Validation options
 * @returns Zod base64url schema with metadata
 *
 * @example
 * Basic base64url validation
 * ```ts
 * const env = zenv({
 *   URL_SAFE_TOKEN: base64url()
 * });
 * ```
 *
 * @example
 * Base64url for JWT components
 * ```ts
 * const env = zenv({
 *   JWT_SECRET: base64url({
 *     description: 'URL-safe base64 encoded JWT secret'
 *   })
 * });
 * ```
 *
 * @example
 * Optional base64url with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   URL_SAFE_TOKEN: base64url({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   SIGNED_PAYLOAD: base64url({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: URL_SAFE_TOKEN is string | undefined
 * // Type: SIGNED_PAYLOAD is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function base64url(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function base64url(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function base64url(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.base64url();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * JWT validator using Zod v4's built-in jwt validator.
 * Validates JSON Web Token strings with optional algorithm specification.
 *
 * @param options - Validation options with optional algorithm
 * @returns Zod JWT schema with metadata
 *
 * @example
 * Basic JWT validation
 * ```ts
 * const env = zenv({
 *   AUTH_TOKEN: jwt()
 * });
 * ```
 *
 * @example
 * JWT with specific algorithm
 * ```ts
 * const env = zenv({
 *   ACCESS_TOKEN: jwt({
 *     alg: 'HS256',
 *     description: 'JWT access token using HS256 algorithm'
 *   })
 * });
 * ```
 *
 * @example
 * JWT with example token
 * ```ts
 * const env = zenv({
 *   API_TOKEN: jwt({
 *     example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSM'
 *   })
 * });
 * ```
 *
 * @example
 * Optional jwt with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   ACCESS_TOKEN: jwt({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   REFRESH_TOKEN: jwt({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: ACCESS_TOKEN is string | undefined
 * // Type: REFRESH_TOKEN is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function jwt(
  options: (BaseOptions<string> & { alg?: string }) & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function jwt(options?: BaseOptions<string> & { alg?: string }): z.ZodType<string>;

// Implementation
export function jwt(options?: BaseOptions<string> & { alg?: string }): z.ZodType<string> {
  let schema: z.ZodType<string> = z.jwt(options?.alg ? { alg: options.alg } : undefined);
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * CUID validator using Zod v4's built-in cuid validator.
 * Validates collision-resistant unique identifiers (CUIDs).
 *
 * @param options - Validation options
 * @returns Zod CUID schema with metadata
 *
 * @example
 * Basic CUID validation
 * ```ts
 * const env = zenv({
 *   REQUEST_ID: cuid()
 * });
 * ```
 *
 * @example
 * CUID with default
 * ```ts
 * const env = zenv({
 *   CORRELATION_ID: cuid({
 *     default: 'cjld2cjxh0000qzrmn831i7rn',
 *     description: 'Unique correlation ID for tracking'
 *   })
 * });
 * ```
 *
 * @example
 * Optional cuid with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   USER_ID: cuid({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   SESSION_ID: cuid({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: USER_ID is string | undefined
 * // Type: SESSION_ID is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function cuid(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function cuid(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function cuid(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.cuid();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * CUID2 validator using Zod v4's built-in cuid2 validator.
 * Validates CUID2 identifiers (improved version with better security).
 *
 * @param options - Validation options
 * @returns Zod CUID2 schema with metadata
 *
 * @example
 * Basic CUID2 validation
 * ```ts
 * const env = zenv({
 *   SESSION_ID: cuid2()
 * });
 * ```
 *
 * @example
 * CUID2 for secure tokens
 * ```ts
 * const env = zenv({
 *   SECURE_TOKEN: cuid2({
 *     description: 'Secure CUID2 token for authentication'
 *   })
 * });
 * ```
 *
 * @example
 * Optional cuid2 with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   SECURE_ID: cuid2({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   TRACKING_ID: cuid2({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: SECURE_ID is string | undefined
 * // Type: TRACKING_ID is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function cuid2(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function cuid2(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function cuid2(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.cuid2();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * ULID validator using Zod v4's built-in ulid validator.
 * Validates Universally Unique Lexicographically Sortable Identifiers.
 *
 * @param options - Validation options
 * @returns Zod ULID schema with metadata
 *
 * @example
 * Basic ULID validation
 * ```ts
 * const env = zenv({
 *   EVENT_ID: ulid()
 * });
 * ```
 *
 * @example
 * ULID for sortable IDs
 * ```ts
 * const env = zenv({
 *   TRANSACTION_ID: ulid({
 *     description: 'Sortable transaction identifier',
 *     example: '01ARZ3NDEKTSV4RRFFQ69G5FAV'
 *   })
 * });
 * ```
 *
 * @example
 * Optional ulid with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   EVENT_ID: ulid({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   MESSAGE_ID: ulid({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: EVENT_ID is string | undefined
 * // Type: MESSAGE_ID is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function ulid(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function ulid(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function ulid(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.ulid();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * Nanoid validator using Zod v4's built-in nanoid validator.
 * Validates Nano ID strings (compact, URL-safe unique IDs).
 *
 * @param options - Validation options
 * @returns Zod nanoid schema with metadata
 *
 * @example
 * Basic nanoid validation
 * ```ts
 * const env = zenv({
 *   SHORT_ID: nanoid()
 * });
 * ```
 *
 * @example
 * Nanoid for URLs
 * ```ts
 * const env = zenv({
 *   SHARE_ID: nanoid({
 *     description: 'Short sharable ID',
 *     example: 'V1StGXR8_Z5jdHi6B-myT'
 *   })
 * });
 * ```
 *
 * @example
 * Optional nanoid with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   SHORT_ID: nanoid({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   REFERENCE_ID: nanoid({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: SHORT_ID is string | undefined
 * // Type: REFERENCE_ID is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function nanoid(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function nanoid(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function nanoid(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.nanoid();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * GUID validator using Zod v4's built-in guid validator.
 * Validates globally unique identifiers (Microsoft format).
 *
 * @param options - Validation options
 * @returns Zod GUID schema with metadata
 *
 * @example
 * Basic GUID validation
 * ```ts
 * const env = zenv({
 *   RESOURCE_GUID: guid()
 * });
 * ```
 *
 * @example
 * GUID with default
 * ```ts
 * const env = zenv({
 *   TENANT_ID: guid({
 *     default: '{00000000-0000-0000-0000-000000000000}',
 *     example: '{123e4567-e89b-12d3-a456-426614174000}'
 *   })
 * });
 * ```
 *
 * @example
 * Optional guid with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   WINDOWS_ID: guid({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   DEVICE_ID: guid({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: WINDOWS_ID is string | undefined
 * // Type: DEVICE_ID is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function guid(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function guid(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function guid(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.guid();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * XID validator using Zod v4's built-in xid validator.
 * Validates globally unique IDs with embedded timestamp.
 *
 * @param options - Validation options
 * @returns Zod XID schema with metadata
 *
 * @example
 * Basic XID validation
 * ```ts
 * const env = zenv({
 *   DOCUMENT_ID: xid()
 * });
 * ```
 *
 * @example
 * XID for distributed systems
 * ```ts
 * const env = zenv({
 *   NODE_ID: xid({
 *     description: 'Distributed node identifier',
 *     example: '9m4e2mr0ui3e8a215n4g'
 *   })
 * });
 * ```
 *
 * @example
 * Optional xid with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   DISTRIBUTED_ID: xid({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   NODE_ID: xid({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: DISTRIBUTED_ID is string | undefined
 * // Type: NODE_ID is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function xid(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function xid(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function xid(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.xid();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * KSUID validator using Zod v4's built-in ksuid validator.
 * Validates K-Sortable Unique Identifiers (time-sortable with ms precision).
 *
 * @param options - Validation options
 * @returns Zod KSUID schema with metadata
 *
 * @example
 * Basic KSUID validation
 * ```ts
 * const env = zenv({
 *   REQUEST_ID: ksuid()
 * });
 * ```
 *
 * @example
 * KSUID for time-ordered events
 * ```ts
 * const env = zenv({
 *   EVENT_KSUID: ksuid({
 *     description: 'Time-sortable event identifier',
 *     example: '1srOrx2ZWZBpBUvZwXKQmoEYga2'
 *   })
 * });
 * ```
 *
 * @example
 * Optional ksuid with undefined default
 * ```ts
 * const env = zenv({
 *   // Optional in all environments
 *   SORTED_ID: ksuid({ default: undefined }),
 *   // Optional in dev/test, required in production
 *   ORDER_ID: ksuid({
 *     devDefault: undefined,
 *     testDefault: undefined
 *   })
 * });
 * // Type: SORTED_ID is string | undefined
 * // Type: ORDER_ID is string | undefined in dev/test, string in production
 * ```
 */
// Overloads for undefined default detection
export function ksuid(
  options: BaseOptions<string> & ({ default: undefined } | { devDefault: undefined } | { testDefault: undefined })
): z.ZodType<string> & UndefinedDefault;

// Original overload
export function ksuid(options?: BaseOptions<string>): z.ZodType<string>;

// Implementation
export function ksuid(options?: BaseOptions<string>): z.ZodType<string> {
  let schema: z.ZodType<string> = z.ksuid();
  schema = applyEnvironmentDefaults(schema, options);
  attachMetadata(schema, options);
  return schema;
}

/**
 * Create a custom validator with factory pattern.
 * Returns a function that can be called with option overrides.
 *
 * @param baseOptions - Base options for all uses of this validator
 * @returns Factory function that creates validators with merged options
 *
 * @example
 * Custom validator with validation function
 * ```ts
 * const semver = makeValidator<string, string>({
 *   validator: (input) => /^\d+\.\d+\.\d+$/.test(input),
 *   description: 'Semantic version string'
 * });
 *
 * const env = zenv({
 *   APP_VERSION: semver({ default: '1.0.0' })
 * });
 * ```
 *
 * @example
 * Custom validator with transform
 * ```ts
 * const secret = makeValidator<string, Buffer>({
 *   validator: (input) => Buffer.from(input, 'base64').length === 32,
 *   transform: (input) => Buffer.from(input, 'base64'),
 *   description: '32-byte secret key'
 * });
 *
 * const env = zenv({
 *   ENCRYPTION_KEY: secret()
 * });
 * ```
 *
 * @example
 * Custom validator with Zod schema factory
 * ```ts
 * const jsonArray = makeValidator<string, string[]>({
 *   schemaFactory: () => z.string().transform(val => JSON.parse(val)),
 *   description: 'JSON array of strings'
 * });
 *
 * const env = zenv({
 *   ALLOWED_ORIGINS: jsonArray({ default: '["http://localhost:3000"]' })
 * });
 * ```
 */
export function makeValidator<TInput = string, TOutput = TInput>(
  baseOptions: CustomValidatorOptions<TInput, TOutput>
): (overrides?: BaseOptions<TOutput>) => z.ZodType<TOutput> {
  return (overrides?: BaseOptions<TOutput>) => {
    // Merge options with overrides taking precedence
    const mergedOptions = mergeOptions(baseOptions, overrides);

    // Create custom schema based on options
    let schema: z.ZodType<TOutput>;

    if (baseOptions.schemaFactory) {
      // Use provided schema factory
      schema = baseOptions.schemaFactory(undefined as TInput);
    } else if (baseOptions.validator && baseOptions.transform) {
      // Custom validation with transform
      schema = z
        .custom<TInput>((val) => {
          if (!baseOptions.validator) return true;
          return baseOptions.validator(val as TInput);
        })
        .transform(baseOptions.transform) as z.ZodType<TOutput>;
    } else if (baseOptions.transform) {
      // Transform without validation
      schema = z.custom<TInput>(() => true).transform(baseOptions.transform) as z.ZodType<TOutput>;
    } else if (baseOptions.validator) {
      // Custom validation without transform
      schema = z.custom<TOutput>((val) => {
        if (!baseOptions.validator) return true;
        return baseOptions.validator(val as TInput);
      });
    } else {
      // Default: pass through with custom validation
      schema = z.custom<TOutput>(() => true);
    }

    // Apply environment defaults and attach metadata
    schema = applyEnvironmentDefaults(schema, mergedOptions);
    attachMetadata(schema, mergedOptions);

    return schema;
  };
}
