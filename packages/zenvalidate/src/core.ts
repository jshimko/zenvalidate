/**
 * @module core
 * @description Core zenv validation function with runtime protection.
 * This module implements the main validation logic with client/server separation,
 * auto-detection of client-safe prefixes, and protective proxy patterns.
 */
import { z } from "zod/v4";

import { ZenvError } from "./errors";
import { runtime } from "./runtime";
import type { CleanedEnv, EnvAccessors, ZenvOptions, ZenvSpec } from "./types";
import { getErrorMessage, isZodError, isZodSchema, startsWithAny } from "./types/guards";
import type { SchemaMetadata } from "./types/inference";
import { getMetadata } from "./validators";

/**
 * Add NODE_ENV convenience properties to the environment object.
 * These properties are non-enumerable to keep the env object clean.
 * @param env The validated environment object
 * @param rawEnv The raw environment source
 * @returns Environment with accessor properties
 * ```
 */
function addEnvAccessors<T extends Record<string, unknown>>(env: T, rawEnv: Record<string, unknown> | NodeJS.ProcessEnv): T & EnvAccessors {
  // Always use runtime.nodeEnv as the source of truth for environment detection
  // This ensures consistency between client and server, and works even when
  // NODE_ENV is not exposed to the client
  const envNodeEnv = (env as Record<string, unknown>).NODE_ENV;
  const rawEnvNodeEnv = (rawEnv as Record<string, unknown> | undefined)?.NODE_ENV;

  // Prefer explicit NODE_ENV from env if available, otherwise use runtime detection
  // This allows users to override if they expose NODE_ENV, but falls back to
  // runtime detection which works correctly on both client and server
  const nodeEnvValue = envNodeEnv ?? rawEnvNodeEnv ?? runtime.nodeEnv;
  const nodeEnv =
    typeof nodeEnvValue === "string" ? nodeEnvValue : typeof nodeEnvValue === "number" ? nodeEnvValue.toString() : runtime.nodeEnv;
  const isProd = nodeEnv === "production";

  return Object.defineProperties(env, {
    isDevelopment: { value: nodeEnv === "development", enumerable: false },
    isDev: { value: nodeEnv === "development", enumerable: false },
    isProduction: { value: isProd, enumerable: false },
    isProd: { value: isProd, enumerable: false },
    isTest: { value: nodeEnv === "test", enumerable: false }
  }) as T & EnvAccessors;
}

/**
 * Create a protective proxy with client access control.
 * This proxy prevents unauthorized access to server-only variables on the client
 * and prevents mutation of all environment values.
 * @param env The validated environment object
 * @param metadata Map of variable names to their metadata
 * @param options Zenv options for client access error handling
 * @param rawEnv The raw environment source to check if values were explicitly set
 * @returns Protected environment proxy
 */
function createProtectiveProxy<T extends Record<string, unknown>>(
  env: T,
  metadata: Map<string, SchemaMetadata>,
  options: ZenvOptions,
  rawEnv: NodeJS.ProcessEnv | Record<string, unknown>
): T {
  const { strict = true, onClientAccessError = runtime.defaultClientAccessError } = options;

  // Symbols and properties that should pass through without checks
  const inspectables = [
    "length",
    "inspect",
    "hasOwnProperty",
    "toJSON",
    Symbol.toStringTag,
    Symbol.iterator,
    "asymmetricMatch",
    "nodeType",
    "$$typeof",
    "then",
    "__esModule",
    "__clientSafePrefixes__" // Allow access to client safe prefixes metadata
  ];

  // Accessor properties that should always be accessible
  const accessorProps = ["isDevelopment", "isDev", "isProduction", "isProd", "isTest"];

  return new Proxy(env, {
    get(target, prop: string | symbol): unknown {
      // Allow inspection properties
      if (inspectables.includes(prop)) {
        return target[prop as keyof T];
      }

      const propName = String(prop);
      const propExists = prop in target;

      // Always allow accessor properties - they're computed from runtime
      // and should be available on both client and server
      if (accessorProps.includes(propName)) {
        return target[prop as keyof T];
      }

      // On client, check if this variable is exposed
      if (runtime.isClient) {
        const meta = metadata.get(propName);

        // If we have metadata for this property, it was defined in specs
        if (meta) {
          // Check if variable is server-only (either by prefix or explicit setting)
          const isServerOnly = meta.serverOnly ?? false;
          const isExposed = !isServerOnly && (meta.client?.expose ?? meta.autoExposed);

          if (!isExposed) {
            // Handle server-only variable access on client
            if (onClientAccessError === "throw") {
              throw new Error(`Cannot access server-only environment variable '${propName}' on client`);
            } else if (onClientAccessError === "warn" && runtime.isDevelopment) {
              console.warn(`[zenv] Warning: Attempted to access server-only variable "${propName}" on client`);
            }
            // Return undefined for server-only vars on client
            return undefined;
          }

          // Get the value from target
          let value = propExists ? target[prop as keyof T] : undefined;

          // Check if the value was explicitly set in the raw environment
          // If not, and we have client-specific defaults, use those instead
          const wasExplicitlySet = (rawEnv as Record<string, unknown> | undefined) && propName in rawEnv;

          if (!wasExplicitlySet && meta.client) {
            const { default: clientDefault, devDefault: clientDevDefault } = meta.client;

            // Apply client environment-specific default if available
            if (runtime.isDevelopment && clientDevDefault !== undefined) {
              value = clientDevDefault as T[keyof T];
            } else if (clientDefault !== undefined) {
              value = clientDefault as T[keyof T];
            }
          }

          // Apply client transform if specified
          if (value !== undefined && meta.client?.transform !== undefined) {
            return meta.client.transform(value);
          }
          return value;
        }
      }

      // If property doesn't exist and strict mode is enabled
      if (!propExists && strict) {
        throw new ReferenceError(`[zenv] Environment variable not found: ${propName}`);
      }

      return target[prop as keyof T];
    },

    set(_target, prop: string | symbol): never {
      throw new TypeError(`[zenv] Attempt to mutate environment value: ${String(prop)}`);
    },

    defineProperty(_target, prop: string | symbol): never {
      throw new TypeError(`[zenv] Attempt to define property on environment: ${String(prop)}`);
    },

    deleteProperty(_target, _prop: string | symbol): boolean {
      // Silently ignore delete attempts but return true to avoid errors
      return true;
    },

    // For Object.keys, Object.entries, etc
    ownKeys(target): (string | symbol)[] {
      // Must return ALL properties (including non-enumerable) for proper proxy invariants
      // The non-enumerable properties will be filtered out by Object.keys based on descriptors
      return Reflect.ownKeys(target);
    },

    getOwnPropertyDescriptor(target, prop: string | symbol): PropertyDescriptor | undefined {
      // Return the actual descriptor which includes the enumerable flag
      // This allows Object.keys to properly filter out non-enumerable properties
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
  });
}

/**
 * Report validation errors to the console with formatted output
 * Groups errors into "missing" and "invalid" categories for clarity
 */
function reportErrors(errors: z.ZodError[], onError: string): void {
  const missingVars: string[] = [];
  const invalidVars: string[] = [];

  errors.forEach((error) => {
    error.issues.forEach((issue) => {
      // Join the path to create a readable variable name
      // For nested paths (e.g., ["CONFIG", "timeout"]), this creates "CONFIG.timeout"
      const varName = issue.path.join(".");

      // Determine if this is a missing variable error
      // Check both the code and the received value to catch all missing var cases
      if (issue.code === "invalid_type" && (issue as { received?: string }).received === "undefined") {
        missingVars.push(`    ${varName}: ${issue.message}`);
      } else {
        invalidVars.push(`    ${varName}: ${issue.message}`);
      }
    });
  });

  // Build formatted error output with clear categories
  const output = [
    "================================",
    ...(invalidVars.length ? [" Invalid environment variables:", ...invalidVars] : []),
    ...(missingVars.length ? [" Missing environment variables:", ...missingVars] : []),
    "================================"
  ].join("\n");

  console.error(output);

  if (onError === "exit" && runtime.isNode) {
    console.error("\n Exiting with error code 1");
  }
}

/**
 * Validate a single environment variable with a Zod schema.
 * Handles metadata extraction and client/server logic.
 * @param key The environment variable name
 * @param schema The Zod schema to validate against
 * @param value The raw value to validate
 * @param metadata Map to store extracted metadata
 * @param options Zenv options
 * @returns The validated value
 */
function validateSingleSpec(
  key: string,
  schema: z.ZodType,
  value: string | undefined,
  metadata: Map<string, SchemaMetadata>,
  options: ZenvOptions
): unknown {
  // Extract metadata from the schema
  const meta = getMetadata(schema);

  // Check for auto-exposure based on prefixes
  const { clientSafePrefixes = [], serverOnlyPrefixes = [] } = options;

  // Server-only prefixes take precedence over any expose settings
  const isServerOnly = serverOnlyPrefixes.length > 0 && startsWithAny(key, serverOnlyPrefixes);
  const isAutoExposed = !isServerOnly && clientSafePrefixes.length > 0 && startsWithAny(key, clientSafePrefixes);

  // Store metadata with auto-exposure information
  // Server-only prefixes override client.expose settings
  const finalMeta: SchemaMetadata = {
    ...meta,
    autoExposed: isAutoExposed,
    serverOnly: isServerOnly
  };

  // If server-only prefix, force client.expose to false
  if (isServerOnly && finalMeta.client) {
    finalMeta.client = { ...finalMeta.client, expose: false };
  }

  metadata.set(key, finalMeta);

  // Parse and validate the value
  // Note: Client-specific defaults are handled in the proxy get trap,
  // not during validation, since validation happens on the server
  return schema.parse(value);
}

/**
 * Validate all environment variable specifications.
 * This is the main validation function that processes all specs.
 * @param specs The environment variable specifications
 * @param env The raw environment source
 * @param options Zenv options
 * @returns Validated environment and metadata
 */
function validateSpecs(
  specs: ZenvSpec,
  env: NodeJS.ProcessEnv,
  options: ZenvOptions
): { result: Record<string, unknown>; metadata: Map<string, SchemaMetadata>; errors: z.ZodError[] } {
  const errors: z.ZodError[] = [];
  const result: Record<string, unknown> = {};
  const metadata = new Map<string, SchemaMetadata>();
  const { clientSafePrefixes = [], emptyStringAsMissing = true } = options;

  for (const [key, validator] of Object.entries(specs)) {
    try {
      // Ensure validator is a Zod schema
      if (!isZodSchema(validator)) {
        throw new Error(`Invalid validator for "${key}": must be a Zod schema`);
      }

      // On client, skip validation of server-only variables
      if (runtime.isClient) {
        const meta = getMetadata(validator);
        const isAutoExposed = clientSafePrefixes.length > 0 && startsWithAny(key, clientSafePrefixes);
        const isExplicitlyExposed = meta?.client?.expose === true;

        // Skip validation if this variable is NOT exposed to client
        const shouldSkip = !isAutoExposed && !isExplicitlyExposed;

        if (shouldSkip) {
          // Store metadata indicating this is server-only, but don't validate
          metadata.set(key, { ...meta, serverOnly: true });
          continue;
        }
      }

      // When env is undefined or empty object, rawValue will be undefined
      // This is fine - the validator should handle undefined and apply defaults
      // A bare `VAR=` line in dotenv/compose arrives as "" — by default treat
      // it as unset too (emptyStringAsMissing), so defaults apply and required
      // variables report as missing rather than the empty string validating.
      const raw = env[key];
      const rawValue = emptyStringAsMissing && raw === "" ? undefined : raw;
      result[key] = validateSingleSpec(key, validator, rawValue, metadata, options);
    } catch (error) {
      if (isZodError(error)) {
        // Add the variable name to the error path if it's missing
        const enhancedError = new z.ZodError(
          error.issues.map((issue) => ({
            ...issue,
            path: issue.path.length === 0 ? [key] : [key, ...issue.path]
          }))
        );
        errors.push(enhancedError);
      } else {
        // Convert other errors to ZodError format
        const zodError = new z.ZodError([
          {
            code: "custom",
            message: getErrorMessage(error),
            path: [key],
            input: undefined
          }
        ]);
        errors.push(zodError);
      }
    }
  }

  return { result, metadata, errors };
}

/**
 * @module zenv
 * @description Zod-based environment variable validation with client/server separation.
 * Validates environment variables against a schema specification and returns a type-safe,
 * immutable environment object.
 *
 * @param specs - Object mapping environment variable names to Zod schemas
 * @param options - Optional configuration for validation behavior
 * @returns Validated environment object with NODE_ENV convenience properties
 *
 * @example
 * Basic Usage
 * ```ts
 * import { zenv, str, num, bool } from 'zenvalidate';
 *
 * const env = zenv({
 *   NODE_ENV: str({ choices: ['development', 'production', 'test'] }),
 *   PORT: num({ default: 3000 }),
 *   DEBUG: bool({ default: false }),
 *   API_KEY: str() // Server-only by default
 * });
 *
 * console.log(env.PORT); // number
 * console.log(env.isDevelopment); // boolean
 * ```
 *
 * @example
 * Client Exposure with Transform
 * ```ts
 * const env = zenv({
 *   // Expose to client with transform
 *   API_URL: url({
 *     client: {
 *       expose: true,
 *       transform: (url) => url.replace('internal', 'public')
 *     }
 *   }),
 *   // Server-only (secure by default)
 *   SECRET_KEY: str()
 *   // Auto-exposed to client based on prefix config below
 *   NEXT_PUBLIC_APP_NAME: str(),
 * }, {
 *   clientSafePrefixes: ['NEXT_PUBLIC_', 'VITE_']
 * });
 * ```
 *
 * @example
 * Environment-Specific Defaults
 * ```ts
 * const env = zenv({
 *   LOG_LEVEL: str({
 *     default: 'info',
 *     devDefault: 'debug',
 *     testDefault: 'error'
 *   }),
 *   FEATURE_FLAG: bool({
 *     default: false,
 *     client: {
 *       expose: true,
 *       default: true // Different default on client
 *     }
 *   })
 * });
 * ```
 *
 * @throws {ZenvError} When validation fails and onError is 'throw'
 * @throws {ReferenceError} When accessing non-validated variables in strict mode
 * @throws {Error} When accessing server-only variables on client (if configured)
 */
export function zenv<T extends ZenvSpec>(specs: T, options: ZenvOptions = {}): CleanedEnv<T> {
  const { reporter = null, onError = runtime.defaultErrorBehavior, env = runtime.env } = options;

  // Validate all specifications
  const { result, metadata, errors } = validateSpecs(specs, env, options);

  // Handle validation errors
  if (errors.length > 0) {
    if (reporter) {
      reporter(errors, env as Record<string, string | undefined>);
    } else {
      // Default error reporting
      reportErrors(errors, onError);
    }

    if (onError === "throw") {
      throw new ZenvError("Environment validation failed", errors);
    } else if (onError === "exit" && runtime.isNode) {
      process.exit(1);
    } else if (onError === "return") {
      // Return partial result with successfully validated values
      const envWithAccessors = addEnvAccessors(result, env);

      // Attach clientSafePrefixes as non-enumerable property for use by getClientEnvScript
      if (options.clientSafePrefixes) {
        Object.defineProperty(envWithAccessors, "__clientSafePrefixes__", {
          value: options.clientSafePrefixes,
          enumerable: false,
          writable: false,
          configurable: false
        });
      }

      return createProtectiveProxy(envWithAccessors, metadata, options, env) as CleanedEnv<T>;
    }
  }

  // Add convenience accessors and create protective proxy
  const envWithAccessors = addEnvAccessors(result, env);

  // Attach clientSafePrefixes as non-enumerable property for use by getClientEnvScript
  if (options.clientSafePrefixes) {
    Object.defineProperty(envWithAccessors, "__clientSafePrefixes__", {
      value: options.clientSafePrefixes,
      enumerable: false,
      writable: false,
      configurable: false
    });
  }

  return createProtectiveProxy(envWithAccessors, metadata, options, env) as CleanedEnv<T>;
}
