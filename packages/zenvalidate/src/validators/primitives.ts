/**
 * @module validators/primitives
 * @description Primitive validators for the core environment variable types:
 * strings (with choices/enum support), numbers, and booleans.
 */
import { z } from "zod/v4";

import type { BaseOptions, BooleanOptions, NumberOptions, StringOptions, UndefinedDefault } from "../types";
import { applyEnvironmentDefaults } from "./defaults";
import { attachMetadata } from "./metadata";

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
