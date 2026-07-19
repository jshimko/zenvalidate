export { zenv } from "./core";

// Built-in validators
export {
  // Core validators
  str,
  num,
  bool,
  json,
  makeValidator,
  // Format validators using Zod v4 built-ins
  email,
  url,
  host,
  port,
  uuid,
  ipv4,
  ipv6,
  datetime,
  isoDate,
  isoTime,
  isoDuration,
  base64,
  base64url,
  jwt,
  cuid,
  cuid2,
  ulid,
  nanoid,
  guid,
  xid,
  ksuid
} from "./validators/index";

// Types
export type {
  // Core option interfaces
  BaseOptions,
  ClientConfig,
  StringOptions,
  NumberOptions,
  BooleanOptions,
  EmailOptions,
  UrlOptions,
  HostOptions,
  PortOptions,
  JsonOptions,
  CustomValidatorOptions,
  // Zenv configuration
  ZenvOptions,
  ZenvSpec,
  ZenvValidator,
  // Type utilities
  InferValidatorType,
  InferZenvType,
  EnvAccessors,
  CleanedEnv
} from "./types";

// Re-export internal type utilities needed for declaration generation
// These are required when other packages export their env configs
export type {
  UndefinedDefault,
  HasUndefinedDefault,
  InferWithOptional,
  HasUndefinedInDefaults,
  ConditionallyBrandSchema
} from "./types/validator-overloads";

// Runtime utilities
export { runtime } from "./runtime";

// Error classes
export { ZenvError, ZenvMissingError } from "./errors";

// Client injection helpers
export { getClientEnvScript } from "./client-inject";
