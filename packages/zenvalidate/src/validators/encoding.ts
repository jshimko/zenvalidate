/**
 * @module validators/encoding
 * @description Encoding and token validators: base64, URL-safe base64, and
 * JSON Web Tokens.
 */
import { z } from "zod/v4";

import type { BaseOptions, UndefinedDefault } from "../types";
import { applyEnvironmentDefaults } from "./defaults";
import { attachMetadata } from "./metadata";

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
