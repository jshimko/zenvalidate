/**
 * @module validators
 * @description Built-in validators for common environment variable types.
 * All validators follow a consistent pattern with the new simplified options API.
 *
 * Implementations are grouped by domain in this directory; this barrel
 * re-exports the full public validator API so consumers can import
 * everything from a single path.
 */

// Schema metadata helpers (WeakMap-backed)
export { attachMetadata, getMetadata } from "./metadata";

// Primitive validators
export { bool, num, str } from "./primitives";

// Network & address validators
export { email, host, ipv4, ipv6, port, url } from "./network";

// Date & time validators
export { datetime, isoDate, isoDuration, isoTime } from "./datetime";

// Encoding & token validators
export { base64, base64url, jwt } from "./encoding";

// Unique identifier validators
export { cuid, cuid2, guid, ksuid, nanoid, ulid, uuid, xid } from "./identifiers";

// Structured data validators
export { json } from "./json";

// Custom validator factory
export { makeValidator } from "./make-validator";
