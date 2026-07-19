/**
 * @module validators/datetime
 * @description ISO 8601 date and time validators: datetimes, dates, times,
 * and durations.
 */
import { z } from "zod/v4";

import type { BaseOptions, UndefinedDefault } from "../types";
import { applyEnvironmentDefaults } from "./defaults";
import { attachMetadata } from "./metadata";

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
