/**
 * @module validators/defaults
 * @description Environment-specific default resolution shared by all validator modules.
 * Internal helper — intentionally not re-exported from the public validators barrel.
 */
import type { z } from "zod/v4";

import { runtime } from "../runtime";
import type { BaseOptions } from "../types";

/**
 * Apply environment-specific defaults to a schema.
 * @param schema The Zod schema to apply defaults to
 * @param options The options containing default values
 * @returns The schema with defaults applied
 */
export function applyEnvironmentDefaults<T>(schema: z.ZodType<T>, options?: BaseOptions<T>): z.ZodType<T> {
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
