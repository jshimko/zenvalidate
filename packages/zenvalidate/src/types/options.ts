/**
 * @module types/options
 * @description Simplified option interfaces for the Zenv package.
 * This module defines the clean, non-overlapping options API that replaces
 * the previous 27+ confusing client/server options.
 */
import type { z } from "zod/v4";

import type { InferWithOptional } from "./validator-overloads";

/**
 * Client-specific configuration for environment variables.
 * Controls how values are exposed and transformed on the client side.
 * @template T - The base type of the value
 * @template TChoices - The choices array type, if specified
 */
export interface ClientConfig<T = string | number | boolean, TChoices = undefined> {
  /**
   * Whether to expose this value to the client.
   * @default false - Values are server-only by default (secure by default)
   */
  expose: boolean;

  /**
   * Optional transform function to modify the value before exposing to client.
   * Useful for sanitizing sensitive data or converting internal URLs to public ones.
   * @param serverValue The original server-side value
   * @returns The transformed value for the client
   */
  transform?: ((serverValue: T) => T) | undefined;

  /**
   * Override the default value specifically for client environments.
   * Takes precedence over the base `default` option when on client.
   * When choices are specified, this must be one of the choices.
   */
  default?: (TChoices extends readonly T[] ? TChoices[number] : T) | undefined;

  /**
   * Override the development default specifically for client environments.
   * Takes precedence over the base `devDefault` option when on client in development.
   * When choices are specified, this must be one of the choices.
   */
  devDefault?: (TChoices extends readonly T[] ? TChoices[number] : T) | undefined;
}

/**
 * Base options available to all validators.
 * These options control validation, defaults, and client exposure.
 * @template T - The base type of the value
 * @template TChoices - The choices array type, if specified
 */
export interface BaseOptions<T = string | number | boolean, TChoices = undefined> {
  /**
   * Default value when the environment variable is not set in production.
   * When choices are specified, this must be one of the choices.
   */
  default?: (TChoices extends readonly T[] ? TChoices[number] : T) | undefined;

  /**
   * Default value in development environment (NODE_ENV=development).
   * When choices are specified, this must be one of the choices.
   */
  devDefault?: (TChoices extends readonly T[] ? TChoices[number] : T) | undefined;

  /**
   * Default value in test environment (NODE_ENV=test).
   * When choices are specified, this must be one of the choices.
   */
  testDefault?: (TChoices extends readonly T[] ? TChoices[number] : T) | undefined;

  /**
   * Optional human-readable description for documentation.
   */
  description?: string | undefined;

  /**
   * Example value for documentation purposes.
   */
  example?: string | undefined;

  /**
   * Client-specific configuration.
   * If not provided, the value is server-only (secure by default).
   */
  client?: ClientConfig<T, TChoices> | undefined;
}

/**
 * String-specific validator options.
 * Extends BaseOptions with string validation constraints.
 * @template TChoices - The choices array type, if specified
 */
export interface StringOptions<TChoices extends readonly string[] | undefined = undefined> extends BaseOptions<string, TChoices> {
  /**
   * Restrict to specific allowed values (enum).
   * Creates a union type in TypeScript.
   */
  choices?: TChoices | undefined;

  /**
   * Minimum string length.
   */
  min?: number | undefined;

  /**
   * Maximum string length.
   */
  max?: number | undefined;

  /**
   * Regular expression pattern for validation.
   */
  regex?: RegExp | undefined;
}

/**
 * Number-specific validator options.
 * Extends BaseOptions with number validation constraints.
 * @template TChoices - The choices array type, if specified
 */
export interface NumberOptions<TChoices extends readonly number[] | undefined = undefined> extends BaseOptions<number, TChoices> {
  /**
   * Restrict to specific allowed values (enum).
   */
  choices?: TChoices | undefined;

  /**
   * Minimum value (inclusive).
   */
  min?: number | undefined;

  /**
   * Maximum value (inclusive).
   */
  max?: number | undefined;

  /**
   * Force integer validation (no decimals).
   */
  int?: boolean | undefined;

  /**
   * Force positive number validation.
   */
  positive?: boolean | undefined;

  /**
   * Force negative number validation.
   */
  negative?: boolean | undefined;
}

/**
 * Boolean-specific validator options.
 * Extends BaseOptions for boolean values.
 */
export type BooleanOptions = BaseOptions<boolean>;

/**
 * Email-specific validator options.
 * Extends BaseOptions with email-specific validation.
 */
export interface EmailOptions extends BaseOptions<string> {
  /**
   * Custom regex pattern for email validation.
   * If not provided, uses Zod's built-in email regex validation.
   */
  regex?: RegExp | undefined;
}

/**
 * URL-specific validator options.
 * Extends BaseOptions with URL-specific validation.
 */
export interface UrlOptions extends BaseOptions<string> {
  /**
   * Restrict to specific protocols (e.g., "https" or /^https$/).
   */
  protocol?: string | RegExp | undefined;

  /**
   * Restrict to specific hostnames (e.g., "example.com" or /^example\.com$/).
   * Note that a string value must match the entire hostname exactly (including subdomain or port).
   * The regex version can be used when you need flexibility for things like partial matches,
   * multiple domains, subdomains, multiple ports, multiple domains, etc.
   */
  hostname?: string | RegExp | undefined;
}

/**
 * Host-specific validator options.
 * Extends BaseOptions with host/IP validation.
 */
export interface HostOptions extends BaseOptions<string> {
  /**
   * Allow IP addresses in addition to hostnames.
   * @default true
   */
  allowIP?: boolean | undefined;

  /**
   * Restrict to IPv4 addresses only.
   */
  ipv4Only?: boolean | undefined;

  /**
   * Restrict to IPv6 addresses only.
   */
  ipv6Only?: boolean | undefined;
}

/**
 * Port-specific validator options.
 * Extends BaseOptions with port-specific constraints.
 */
export interface PortOptions extends BaseOptions<number> {
  /**
   * Minimum port number.
   * @default 1
   */
  min?: number | undefined;

  /**
   * Maximum port number.
   * @default 65535
   */
  max?: number | undefined;
}

/**
 * JSON-specific validator options.
 * Parses and validates JSON strings.
 */
export interface JsonOptions<T = Record<string, unknown>> extends BaseOptions<T> {
  /**
   * Zod schema to validate the parsed JSON against.
   * Ensures type safety for complex configuration objects.
   */
  schema?: z.ZodType<T> | undefined;
}

/**
 * Custom validator options for creating domain-specific validators.
 */
export interface CustomValidatorOptions<TInput = string, TOutput = TInput> extends BaseOptions<TOutput> {
  /**
   * Custom validation function.
   * @param value The input value to validate
   * @returns true if valid, false otherwise
   */
  validator?: ((value: TInput) => boolean) | undefined;

  /**
   * Transform function to convert input to output type.
   * Applied after validation succeeds.
   */
  transform?: ((value: TInput) => TOutput) | undefined;

  /**
   * Zod schema factory for complex validation logic.
   * Provides full Zod schema capabilities.
   */
  schemaFactory?: ((input: TInput) => z.ZodType<TOutput>) | undefined;
}

/**
 * Options for the main zenv function.
 * Controls validation behavior and client-side handling.
 */
export interface ZenvOptions {
  /**
   * Environment source.
   * @default process.env
   */
  env?: NodeJS.ProcessEnv;

  /**
   * Prefixes that automatically mark variables as client-safe.
   * Variables starting with these prefixes are automatically exposed to client.
   * @default [] - No auto-exposure by default (secure by default)
   * @example ['NEXT_PUBLIC_', 'VITE_', 'PUBLIC_']
   */
  clientSafePrefixes?: string[];

  /**
   * Prefixes that enforce server-only access.
   * Variables starting with these prefixes cannot be exposed to client,
   * even if explicitly configured.
   * @default [] - No forced server-only prefixes
   * @example ['DATABASE_', 'SECRET_', 'PRIVATE_']
   */
  serverOnlyPrefixes?: string[];

  /**
   * How to handle client access to server-only variables.
   * - 'throw': Throw an error when accessing server-only vars on client
   * - 'warn': Log a warning in development, return undefined
   * - 'ignore': Silently return undefined
   * @default 'warn' in development, 'ignore' in production
   */
  onClientAccessError?: "throw" | "warn" | "ignore";

  /**
   * Custom error reporter function.
   * If provided, validation errors are passed to this function instead of default handling.
   */
  reporter?: ((errors: z.ZodError[], env: Record<string, string | undefined>) => void) | null;

  /**
   * Error handling strategy when validation fails.
   * - 'throw': Throw an error
   * - 'exit': Exit the process (Node.js only)
   * - 'return': Return partial result with validated values
   * @default 'exit' on server, 'throw' on client
   */
  onError?: "throw" | "exit" | "return";

  /**
   * Enable strict proxy that prevents access to non-validated variables.
   * @default true
   */
  strict?: boolean;
}

/**
 * Validator type that can be used in zenv specs.
 * Can be a Zod schema or a validator with metadata.
 */
export type ZenvValidator<T = unknown> = z.ZodType<T>;

/**
 * Specification object for environment variables.
 * Maps variable names to their validators.
 */
export type ZenvSpec = Record<string, ZenvValidator>;

/**
 * Type for extracting the output type from a validator.
 * Uses InferWithOptional to properly handle undefined defaults.
 */
export type InferValidatorType<V> = V extends z.ZodType ? InferWithOptional<V> : never;

/**
 * Type for the cleaned environment object with proper types.
 */
export type InferZenvType<T extends ZenvSpec> = {
  [K in keyof T]: InferValidatorType<T[K]>;
};

/**
 * Environment convenience accessors.
 * Added to the environment object for easy NODE_ENV checks.
 */
export interface EnvAccessors {
  readonly isDevelopment: boolean;
  readonly isDev: boolean;
  readonly isTest: boolean;
  readonly isProduction: boolean;
  readonly isProd: boolean;
}

/**
 * Final type for the cleaned environment object.
 * Combines inferred types with convenience accessors.
 * May include a non-enumerable __clientSafePrefixes__ property for internal use.
 */
export type CleanedEnv<T extends ZenvSpec> = InferZenvType<T> &
  EnvAccessors & {
    /**
     * Internal property storing the clientSafePrefixes configured in zenv options.
     * This is a non-enumerable property used by getClientEnvScript.
     * @internal
     */
    __clientSafePrefixes__?: string[];
  };
