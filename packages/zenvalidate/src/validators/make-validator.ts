/**
 * @module validators/make-validator
 * @description Factory for creating custom validators with reusable base
 * options, validation functions, transforms, or schema factories.
 */
import { z } from "zod/v4";

import type { BaseOptions, CustomValidatorOptions } from "../types";
import { applyEnvironmentDefaults } from "./defaults";
import { attachMetadata } from "./metadata";

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
        .transform(baseOptions.transform);
    } else if (baseOptions.transform) {
      // Transform without validation
      schema = z.custom<TInput>(() => true).transform(baseOptions.transform);
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
