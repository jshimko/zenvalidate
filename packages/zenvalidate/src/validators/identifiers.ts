/**
 * @module validators/identifiers
 * @description Unique identifier validators: UUID, GUID, CUID, CUID2, ULID,
 * Nano ID, XID, and KSUID.
 */
import { z } from "zod/v4";

import type { BaseOptions, UndefinedDefault } from "../types";
import { applyEnvironmentDefaults } from "./defaults";
import { attachMetadata } from "./metadata";

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
  // z.cuid() is deprecated upstream (CUID v1 embeds timestamps) but kept for backwards compatibility
  // eslint-disable-next-line @typescript-eslint/no-deprecated
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
