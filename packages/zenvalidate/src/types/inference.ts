/**
 * @module types/inference
 * @description Type inference helpers for the Zenv package.
 * This module provides advanced TypeScript type inference utilities
 * for extracting and transforming types at compile time.
 */
import type { z } from "zod/v4";

import type { BaseOptions, ClientConfig, ZenvSpec } from "./options";

/**
 * Extract the base type from a Zod schema.
 *
 * @example
 * ```typescript
 * const stringSchema = z.string();
 * type StringType = InferZodType<typeof stringSchema>; // string
 *
 * const numberSchema = z.number();
 * type NumberType = InferZodType<typeof numberSchema>; // number
 * ```
 */
export type InferZodType<T> = T extends z.ZodType<infer U> ? U : never;

/**
 * Check if a validator has client exposure configuration.
 *
 * @example
 * ```typescript
 * const publicVar = str({ client: { expose: true } });
 * type IsPublic = HasClientExposure<typeof publicVar>; // true
 *
 * const privateVar = str();
 * type IsPrivate = HasClientExposure<typeof privateVar>; // false
 * ```
 */
export type HasClientExposure<V> = V extends { _clientExposed: true } ? true : false;

/**
 * Extract the client configuration from options.
 *
 * @example
 * ```typescript
 * type Options = { client: { expose: true; transform: (v: string) => number } };
 * type Config = ExtractClientConfig<Options>;
 * // Config = { expose: true; transform: (v: string) => number }
 * ```
 */
export type ExtractClientConfig<O> = O extends { client: infer C } ? (C extends ClientConfig ? C : never) : never;

/**
 * Check if options indicate client exposure.
 *
 * @example
 * ```typescript
 * type PublicOptions = { client: { expose: true } };
 * type IsPublic = IsClientExposed<PublicOptions>; // true
 *
 * type PrivateOptions = { client: { expose: false } };
 * type IsPrivate = IsClientExposed<PrivateOptions>; // false
 * ```
 */
export type IsClientExposed<O> = O extends { client: { expose: true } } ? true : false;

/**
 * Extract the transform function return type from client config.
 */
export type ExtractTransformType<C> = C extends { transform: (value: unknown) => infer O } ? O : never;

/**
 * Infer the client-side type for a value.
 * If there's a transform, use its return type.
 * If there's a client default, use that type.
 * Otherwise, use the server type.
 *
 * @example
 * ```typescript
 * // With transform
 * type ClientNumber = InferClientType<string, {
 *   client: { transform: (v: string) => number }
 * }>; // number
 *
 * // With client default
 * type ClientString = InferClientType<string, {
 *   client: { default: 'client-value' }
 * }>; // string
 *
 * // No client config
 * type SameType = InferClientType<string, {}>; // string
 * ```
 */
export type InferClientType<ServerType, Options> = Options extends { client: { transform: (value: ServerType) => infer TransformType } }
  ? TransformType
  : Options extends { client: { default: infer ClientDefault } }
    ? ClientDefault
    : ServerType;

/**
 * Infer the server-side type for a value.
 * This is always the base Zod schema type.
 */
export type InferServerType<V> = V extends z.ZodType<infer T> ? T : never;

/**
 * Check if a key should be included in client types.
 * Based on whether it has client.expose = true
 */
export type IsClientKey<K extends string, V> = V extends { _metadata: { client: { expose: true } } } ? K : never;

/**
 * Filter object keys to only those exposed to client.
 */
export type ClientKeys<T extends ZenvSpec> = {
  [K in keyof T]: IsClientExposed<T[K]> extends true ? K : never;
}[keyof T];

/**
 * Filter object keys to only server-only values.
 */
export type ServerOnlyKeys<T extends ZenvSpec> = {
  [K in keyof T]: IsClientExposed<T[K]> extends true ? never : K;
}[keyof T];

/**
 * Create the client-side environment type.
 * Only includes fields that are explicitly exposed.
 *
 * @example
 * ```typescript
 * const spec = {
 *   PUBLIC_API: str({ client: { expose: true } }),
 *   SECRET_KEY: str()
 * };
 * type Client = ClientEnv<typeof spec>;
 * // Client = { PUBLIC_API: string }
 * // SECRET_KEY is excluded
 * ```
 */
export type ClientEnv<T extends ZenvSpec> = {
  [K in ClientKeys<T>]: InferClientType<InferZodType<T[K]>, T[K]>;
};

/**
 * Create the server-side environment type.
 * Includes all fields with their full types.
 *
 * @example
 * ```typescript
 * const spec = {
 *   PUBLIC_API: str({ client: { expose: true } }),
 *   SECRET_KEY: str()
 * };
 * type Server = ServerEnv<typeof spec>;
 * // Server = { PUBLIC_API: string; SECRET_KEY: string }
 * // All fields included
 * ```
 */
export type ServerEnv<T extends ZenvSpec> = {
  [K in keyof T]: InferZodType<T[K]>;
};

/**
 * Universal environment type that works in both contexts.
 * All fields are present but client-only sees exposed values.
 * This is what we actually return from zenv() for simplicity.
 */
export type UniversalEnv<T extends ZenvSpec> = {
  [K in keyof T]: InferZodType<T[K]>;
};

/**
 * Check if a string matches a prefix pattern.
 */
export type MatchesPrefix<S extends string, P extends string> = S extends `${P}${string}` ? true : false;

/**
 * Check if a key matches any of the client-safe prefixes.
 */
export type IsAutoExposed<K extends string, Prefixes extends readonly string[]> = Prefixes extends readonly [infer First, ...infer Rest]
  ? First extends string
    ? MatchesPrefix<K, First> extends true
      ? true
      : Rest extends readonly string[]
        ? IsAutoExposed<K, Rest>
        : false
    : false
  : false;

/**
 * Deep partial type helper.
 * Makes all properties and nested properties optional.
 *
 * @example
 * ```typescript
 * interface Config {
 *   server: { port: number; host: string };
 *   database: { url: string };
 * }
 * type PartialConfig = DeepPartial<Config>;
 * // All properties at all levels become optional
 * ```
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Deep required type helper.
 * Makes all properties and nested properties required.
 *
 * @example
 * ```typescript
 * interface Config {
 *   server?: { port?: number; host?: string };
 *   database?: { url?: string };
 * }
 * type RequiredConfig = DeepRequired<Config>;
 * // All properties at all levels become required
 * ```
 */
export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: DeepRequired<T[P]>;
    }
  : T;

/**
 * Merge two types with the second taking precedence.
 */
export type Merge<A, B> = Omit<A, keyof B> & B;

/**
 * Deep merge two types with the second taking precedence.
 */
export type DeepMerge<A, B> = A extends object
  ? B extends object
    ? {
        [K in keyof A | keyof B]: K extends keyof B ? (K extends keyof A ? DeepMerge<A[K], B[K]> : B[K]) : K extends keyof A ? A[K] : never;
      }
    : B
  : B;

/**
 * Extract the default value type from options.
 */
export type ExtractDefault<O> = O extends { default: infer D }
  ? D
  : O extends { devDefault: infer D }
    ? D
    : O extends { testDefault: infer D }
      ? D
      : undefined;

/**
 * Make a type optional if it has a default value.
 */
export type MaybeOptional<T, O> = ExtractDefault<O> extends undefined ? T : T | undefined;

/**
 * Create a branded type for server-only values.
 * This is a phantom type that exists only at compile time.
 */
export type ServerOnly<T> = T & { readonly __serverOnly?: never };

/**
 * Create a branded type for client-safe values.
 * This is a phantom type that exists only at compile time.
 */
export type ClientSafe<T> = T & { readonly __clientSafe: true };

/**
 * Type guard signature for checking if a value is server-only.
 */
export type IsServerOnly<T> = T extends ServerOnly<infer _> ? true : false;

/**
 * Type guard signature for checking if a value is client-safe.
 */
export type IsClientSafe<T> = T extends ClientSafe<infer _> ? true : false;

/**
 * Utility type to ensure exhaustive checking in switch statements.
 */
export type Exhaustive<T> = T extends never ? true : false;

/**
 * Create a discriminated union from an object type.
 */
export type Discriminate<T, K extends keyof T> = T extends object
  ? T[K] extends PropertyKey
    ? { [P in T[K]]: T & Record<K, P> }[T[K]]
    : never
  : never;

/**
 * Helper type for creating validators with metadata.
 * This is used internally to attach client configuration to Zod schemas.
 *
 * @example
 * ```typescript
 * const validator: ValidatorWithMetadata<string> = z.string();
 * validator._metadata = {
 *   client: { expose: true, transform: (v) => v.toUpperCase() }
 * };
 * ```
 */
export interface ValidatorWithMetadata<T = unknown> extends z.ZodType<T> {
  _metadata?:
    | {
        client?: ClientConfig<T> | undefined;
        autoExposed?: boolean | undefined;
        serverOnly?: boolean | undefined;
      }
    | undefined;
}

/**
 * Type for the metadata storage WeakMap key.
 */
export type MetadataKey = z.ZodType | object;

/**
 * Type for the metadata storage value.
 */
export interface SchemaMetadata<T = unknown> {
  options?: BaseOptions<T> | undefined;
  client?: ClientConfig<T> | undefined;
  autoExposed?: boolean | undefined;
  serverOnly?: boolean | undefined;
}

/**
 * Helper to create a properly typed validator with metadata.
 */
export type WithMetadata<V extends z.ZodType, M extends SchemaMetadata> = V & {
  _metadata: M;
};

/**
 * Extract metadata from a validator if it exists.
 */
export type ExtractMetadata<V> = V extends { _metadata: infer M } ? M : never;

/**
 * Check if a validator has metadata attached.
 */
export type HasMetadata<V> = V extends { _metadata: SchemaMetadata } ? true : false;

/**
 * Utility type to make specific keys optional.
 */
export type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type to make specific keys required.
 */
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract non-nullable type.
 */
export type NonNullable<T> = T extends null | undefined ? never : T;
