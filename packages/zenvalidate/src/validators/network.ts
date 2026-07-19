/**
 * @module validators/network
 * @description Network and address validators: emails, URLs, hostnames,
 * ports, and IP addresses.
 */
import { z } from "zod/v4";

import type { BaseOptions, EmailOptions, HostOptions, PortOptions, UndefinedDefault, UrlOptions } from "../types";
import { applyEnvironmentDefaults } from "./defaults";
import { attachMetadata } from "./metadata";

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
