/**
 * @module types/guards
 * @description Type guard functions
 */
import { z } from "zod/v4";

import type { BaseOptions, ClientConfig } from "./options";

// Zod schemas for type validation
const ClientConfigSchema = z
  .object({
    expose: z.boolean(),
    transform: z.function().optional(),
    default: z.unknown().optional(),
    devDefault: z.unknown().optional(),
    testDefault: z.unknown().optional()
  })
  .strict();

const BaseOptionsSchema = z
  .object({
    default: z.unknown().optional(),
    devDefault: z.unknown().optional(),
    testDefault: z.unknown().optional(),
    description: z.string().optional(),
    example: z.unknown().optional(),
    client: ClientConfigSchema.optional()
  })
  .strict();

const HasBaseOptionsSchema = z
  .object({
    options: BaseOptionsSchema.optional()
  })
  .strict();

// Schema for Zod v4 internal structure validation
const ZodSchemaDefSchema = z
  .object({
    type: z.string()
  })
  .loose();

const ZodSchemaStructureSchema = z
  .object({
    _def: ZodSchemaDefSchema.optional(),
    def: ZodSchemaDefSchema.optional()
  })
  .loose()
  .refine((obj) => obj._def !== undefined || obj.def !== undefined, {
    message: "Must have either _def or def property"
  });

// Schema for error-like objects
const ErrorLikeSchema = z
  .object({
    name: z.string(),
    message: z.string()
  })
  .loose();

/**
 * Check if a value is a Zod schema.
 * @param value The value to check
 * @returns True if the value is a Zod schema
 *
 * @example
 * ```typescript
 * import { z } from 'zod/v4';
 *
 * const schema = z.string();
 * console.log(isZodSchema(schema)); // true
 * console.log(isZodSchema('not a schema')); // false
 * console.log(isZodSchema({})); // false
 * ```
 */
export function isZodSchema(value: unknown): value is z.ZodType {
  return ZodSchemaStructureSchema.safeParse(value).success;
}

/**
 * Check if a value is a string.
 * @param value The value to check
 * @returns True if the value is a string
 *
 * @example
 * ```typescript
 * console.log(isString('hello')); // true
 * console.log(isString('')); // true
 * console.log(isString(123)); // false
 * console.log(isString(null)); // false
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Check if a value is a number.
 * @param value The value to check
 * @returns True if the value is a number (including NaN)
 *
 * @example
 * ```typescript
 * console.log(isNumber(123)); // true
 * console.log(isNumber(0)); // true
 * console.log(isNumber(NaN)); // true
 * console.log(isNumber('123')); // false
 * ```
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

/**
 * Check if a value is a boolean.
 * @param value The value to check
 * @returns True if the value is a boolean
 *
 * @example
 * ```typescript
 * console.log(isBoolean(true)); // true
 * console.log(isBoolean(false)); // true
 * console.log(isBoolean(1)); // false
 * console.log(isBoolean('true')); // false
 * ```
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Check if a value is an object (and not null or array).
 * @param value The value to check
 * @returns True if the value is a plain object
 *
 * @example
 * ```typescript
 * console.log(isObject({})); // true
 * console.log(isObject({ key: 'value' })); // true
 * console.log(isObject([])); // false - arrays are not plain objects
 * console.log(isObject(null)); // false
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value);
}

/**
 * Check if a value is null or undefined.
 * @param value The value to check
 * @returns True if the value is null or undefined
 *
 * @example
 * ```typescript
 * console.log(isNullOrUndefined(null)); // true
 * console.log(isNullOrUndefined(undefined)); // true
 * console.log(isNullOrUndefined(0)); // false
 * console.log(isNullOrUndefined('')); // false
 * ```
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if a value is defined (not null or undefined).
 * @param value The value to check
 * @returns True if the value is defined
 *
 * @example
 * ```typescript
 * const value: string | undefined = process.env.VAR;
 * if (isDefined(value)) {
 *   // TypeScript knows value is string here
 *   console.log(value.toUpperCase());
 * }
 * ```
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if a value has a specific property.
 * @param value The value to check
 * @param property The property name to check for
 * @returns True if the value has the property
 *
 * @example
 * ```typescript
 * const obj = { name: 'test', age: 30 };
 * if (hasProperty(obj, 'name')) {
 *   // TypeScript knows obj has 'name' property
 *   console.log(obj.name);
 * }
 * ```
 */
export function hasProperty<K extends PropertyKey>(value: unknown, property: K): value is Record<K, unknown> {
  return isObject(value) && property in value;
}

/**
 * Check if a value has BaseOptions shape.
 * @param value The value to check
 * @returns True if the value matches BaseOptions interface
 *
 * @example
 * ```typescript
 * const valid = { options: { default: 'test', client: { expose: true } } };
 * console.log(hasBaseOptions(valid)); // true
 *
 * const invalid = { options: { unknownKey: 'test' } };
 * console.log(hasBaseOptions(invalid)); // false
 * ```
 */
export function hasBaseOptions(value: unknown): value is { options?: BaseOptions } {
  return HasBaseOptionsSchema.safeParse(value).success;
}

/**
 * Check if a value is a valid ClientConfig.
 * @param value The value to check
 * @returns True if the value is a valid ClientConfig
 *
 * @example
 * ```typescript
 * const valid = { expose: true, transform: (v: string) => v.toUpperCase() };
 * console.log(isClientConfig(valid)); // true
 *
 * const invalid = { expose: 'yes' }; // expose must be boolean
 * console.log(isClientConfig(invalid)); // false
 * ```
 */
export function isClientConfig(value: unknown): value is ClientConfig {
  return ClientConfigSchema.safeParse(value).success;
}

/**
 * Check if a string starts with any of the given prefixes.
 * @param str The string to check
 * @param prefixes The prefixes to check against
 * @returns True if the string starts with any prefix
 *
 * @example
 * ```typescript
 * console.log(startsWithAny('NEXT_PUBLIC_API', ['NEXT_PUBLIC_', 'VITE_'])); // true
 * console.log(startsWithAny('SECRET_KEY', ['NEXT_PUBLIC_', 'VITE_'])); // false
 * console.log(startsWithAny('VITE_APP_TITLE', ['NEXT_PUBLIC_', 'VITE_'])); // true
 * ```
 */
export function startsWithAny(str: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => str.startsWith(prefix));
}

/**
 * Safely get a property from an object.
 * @param obj The object to get the property from
 * @param key The property key
 * @returns The property value or undefined
 *
 * @example
 * ```typescript
 * const obj = { name: 'test' };
 * console.log(safeGet(obj, 'name')); // 'test'
 * console.log(safeGet(obj, 'unknown' as any)); // undefined
 *
 * // Handles property access errors gracefully
 * const proxy = new Proxy({}, { get: () => { throw new Error(); } });
 * console.log(safeGet(proxy, 'any')); // undefined
 * ```
 */
export function safeGet<T extends object, K extends keyof T>(obj: T, key: K): T[K] | undefined {
  try {
    return obj[key];
  } catch {
    return undefined;
  }
}

/**
 * Check if a value is a valid environment variable value (string or undefined).
 * @param value The value to check
 * @returns True if the value is a valid env var value
 *
 * @example
 * ```typescript
 * console.log(isEnvValue('production')); // true
 * console.log(isEnvValue(undefined)); // true
 * console.log(isEnvValue(123)); // false - numbers not valid
 * console.log(isEnvValue(null)); // false - null not valid
 * ```
 */
export function isEnvValue(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

/**
 * Ensure a value is a string, converting if necessary.
 * @param value The value to ensure as string
 * @returns The value as a string
 * @throws {Error} Error if the value cannot be converted to string
 *
 * @example
 * ```typescript
 * console.log(ensureString('hello')); // 'hello'
 * console.log(ensureString(123)); // '123'
 * console.log(ensureString(true)); // 'true'
 * console.log(ensureString({ key: 'value' })); // '{"key":"value"}'
 *
 * try {
 *   ensureString(null); // throws Error
 * } catch (e) {
 *   console.error(e.message); // 'Cannot convert null or undefined to string'
 * }
 * ```
 */
export function ensureString(value: unknown): string {
  if (isString(value)) return value;
  if (isNumber(value)) {
    // Handle special number values
    if (isNaN(value)) {
      return "NaN";
    }
    if (!isFinite(value)) {
      return "null"; // Convert Infinity and -Infinity to "null"
    }
    return value.toString();
  }
  if (isBoolean(value)) return value.toString();
  if (isNullOrUndefined(value)) {
    throw new Error("Cannot convert null or undefined to string");
  }
  // For objects, use JSON.stringify to avoid [object Object]
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  // For symbols or other primitives
  if (typeof value === "symbol") {
    return value.toString();
  }
  // For anything else (should not reach here in practice)
  return JSON.stringify(value);
}

/**
 * Ensure a value is a number, converting if necessary.
 * @param value The value to ensure as number
 * @returns The value as a number
 * @throws {Error} Error if the value cannot be converted to number
 *
 * @example
 * ```typescript
 * console.log(ensureNumber(123)); // 123
 * console.log(ensureNumber('456')); // 456
 * console.log(ensureNumber('3.14')); // 3.14
 *
 * try {
 *   ensureNumber('not a number'); // throws Error
 * } catch (e) {
 *   console.error(e.message); // 'Cannot convert "not a number" to number'
 * }
 * ```
 */
export function ensureNumber(value: unknown): number {
  if (isNumber(value)) {
    // Return the number even if it's NaN
    return value;
  }
  if (isString(value)) {
    // Empty string is not a valid number
    if (value === "") {
      throw new Error(`Cannot convert empty string to number`);
    }
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Cannot convert "${value}" to number`);
    }
    return num;
  }
  throw new Error(`Cannot convert ${typeof value} to number`);
}

/**
 * Ensure a value is a boolean, converting if necessary.
 * @param value The value to ensure as boolean
 * @returns The value as a boolean
 *
 * @example
 * ```typescript
 * console.log(ensureBoolean(true)); // true
 * console.log(ensureBoolean('true')); // true
 * console.log(ensureBoolean('yes')); // true
 * console.log(ensureBoolean('1')); // true
 * console.log(ensureBoolean('false')); // false
 * console.log(ensureBoolean('no')); // false
 * console.log(ensureBoolean(0)); // false
 * console.log(ensureBoolean(1)); // true
 * ```
 */
export function ensureBoolean(value: unknown): boolean {
  if (isBoolean(value)) return value;
  if (isString(value)) {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes" || lower === "on") {
      return true;
    }
    if (lower === "false" || lower === "0" || lower === "no" || lower === "off") {
      return false;
    }
  }
  if (isNumber(value)) return value !== 0;
  return Boolean(value);
}

/**
 * Type guard to check if an error is a Zod error.
 * @param error The error to check
 * @returns True if the error is a ZodError
 *
 * @example
 * ```typescript
 * import { z } from 'zod/v4';
 *
 * try {
 *   z.string().parse(123);
 * } catch (error) {
 *   if (isZodError(error)) {
 *     console.log('Zod validation failed');
 *     error.issues.forEach(issue => {
 *       console.log(issue.message);
 *     });
 *   }
 * }
 * ```
 */
export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}

/**
 * Type guard to check if an error is a standard Error.
 * @param error The error to check
 * @returns True if the error is an Error
 *
 * @example
 * ```typescript
 * const err1 = new Error('test');
 * console.log(isError(err1)); // true
 *
 * const err2 = { name: 'Error', message: 'test' };
 * console.log(isError(err2)); // true - error-like object
 *
 * console.log(isError('error string')); // false
 * console.log(isError(null)); // false
 * ```
 */
export function isError(error: unknown): error is Error {
  if (error instanceof Error) return true;

  // Check for error-like objects using Zod schema
  return ErrorLikeSchema.safeParse(error).success;
}

/**
 * Get the message from an error safely.
 * @param error The error to get the message from
 * @returns The error message or a default message
 *
 * @example
 * ```typescript
 * console.log(getErrorMessage(new Error('test'))); // 'test'
 * console.log(getErrorMessage('string error')); // 'string error'
 * console.log(getErrorMessage(null)); // 'null'
 * console.log(getErrorMessage(undefined)); // 'undefined'
 * console.log(getErrorMessage(123)); // '123'
 * console.log(getErrorMessage({})); // 'Unknown error'
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (isZodError(error)) {
    return error.issues.map((issue) => issue.message).join(", ");
  }
  if (isError(error)) return error.message;
  if (isString(error)) return error;
  // Convert other types to string
  if (error === null) return "null";
  if (error === undefined) return "undefined";
  if (typeof error === "number" || typeof error === "boolean") {
    return String(error);
  }
  return "Unknown error";
}

/**
 * Create a type guard function for a specific type.
 * This is a utility function that can be used with generic types.
 * @param check The check function
 * @returns A type guard function
 *
 * @example
 * ```typescript
 * interface User { name: string; age: number }
 *
 * const isUser = createTypeGuard<User>((value) => {
 *   return isObject(value) &&
 *          'name' in value && isString(value.name) &&
 *          'age' in value && isNumber(value.age);
 * });
 *
 * const data: unknown = { name: 'John', age: 30 };
 * if (isUser(data)) {
 *   // TypeScript knows data is User here
 *   console.log(data.name);
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function createTypeGuard<T>(check: (value: unknown) => boolean): (value: unknown) => value is T {
  return (value: unknown): value is T => check(value);
}

/**
 * Compose multiple type guards with AND logic.
 * @param guards The type guards to compose
 * @returns A composed type guard
 *
 * @example
 * ```typescript
 * interface Config { port: number; host: string }
 *
 * const hasPort = (v: unknown): v is { port: number } =>
 *   isObject(v) && 'port' in v && isNumber(v.port);
 *
 * const hasHost = (v: unknown): v is { host: string } =>
 *   isObject(v) && 'host' in v && isString(v.host);
 *
 * const isConfig = composeGuards<Config>(hasPort, hasHost);
 *
 * const valid = { port: 3000, host: 'localhost' };
 * console.log(isConfig(valid)); // true
 * ```
 */
export function composeGuards<T>(...guards: ((value: unknown) => value is T)[]): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    return guards.every((guard) => guard(value));
  };
}

/**
 * Create a type guard for an object with specific properties.
 * @param props The properties to check for
 * @returns A type guard function
 *
 * @example
 * ```typescript
 * const hasUserProps = hasProperties('name', 'email', 'age');
 *
 * const valid = { name: 'John', email: 'john@example.com', age: 30 };
 * console.log(hasUserProps(valid)); // true
 *
 * const invalid = { name: 'John' }; // missing email and age
 * console.log(hasUserProps(invalid)); // false
 * ```
 */
export function hasProperties<K extends string>(...props: K[]): (value: unknown) => value is Record<K, unknown> {
  return (value: unknown): value is Record<K, unknown> => {
    if (!isObject(value)) return false;
    return props.every((prop) => prop in value);
  };
}
