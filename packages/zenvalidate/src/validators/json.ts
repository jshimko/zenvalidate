/**
 * @module validators/json
 * @description JSON validator that parses JSON strings from environment
 * variables, with optional Zod schema validation of the parsed value.
 */
import { z } from "zod/v4";

import type { JsonOptions, UndefinedDefault } from "../types";
import { applyEnvironmentDefaults } from "./defaults";
import { attachMetadata } from "./metadata";

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
    });
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
    });
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
