/**
 * @module validators/metadata
 * @description WeakMap-backed metadata storage for validator schemas.
 * Allows client configuration and options to be associated with Zod schemas
 * without modifying the schema objects themselves.
 */
import type { z } from "zod/v4";

import type { BaseOptions, ClientConfig } from "../types";
import type { SchemaMetadata } from "../types/inference";

/**
 * WeakMap to store metadata without polluting Zod schemas.
 * This allows us to attach client configuration and other metadata
 * to schemas without modifying their structure.
 */
const schemaMetadata = new WeakMap<z.ZodType, SchemaMetadata>();

/**
 * Attach metadata to a Zod schema.
 * @param schema The Zod schema to attach metadata to
 * @param options The options containing metadata
 */
export function attachMetadata<T>(schema: z.ZodType<T>, options?: BaseOptions<T>): void {
  if (options) {
    const metadata: SchemaMetadata = {
      options: options as BaseOptions<unknown>,
      client: options.client as ClientConfig<unknown> | undefined,
      autoExposed: false // Will be set by core.ts based on prefix detection
    };
    schemaMetadata.set(schema, metadata);
  }
}

/**
 * Get metadata from a Zod schema.
 * Retrieves the attached options and client configuration from a validator.
 *
 * @param schema - The Zod schema to get metadata from
 * @returns The attached metadata or undefined
 *
 * @example
 * Checking if a validator is client-exposed
 * ```ts
 * const validator = str({ client: { expose: true } });
 * const metadata = getMetadata(validator);
 * console.log(metadata?.client?.expose); // true
 * ```
 *
 * @example
 * Getting validator description
 * ```ts
 * const validator = num({ description: 'Port number' });
 * const metadata = getMetadata(validator);
 * console.log(metadata?.options.description); // 'Port number'
 * ```
 */
export function getMetadata<T>(schema: z.ZodType<T>): SchemaMetadata | undefined {
  return schemaMetadata.get(schema);
}
