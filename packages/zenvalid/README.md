# zenvalid

**Type-safe environment variable validation for TypeScript applications**

A lightweight, zero-dependency (except Zod) library that provides bulletproof environment variable validation with full TypeScript support, client/server separation, and runtime safety for both Node.js and browser environments.

[![Zod](https://img.shields.io/badge/Zod-v4-purple)](https://zod.dev/)
[![Node](https://img.shields.io/badge/Node-22%2B-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## ✨ Key Features

- **Type-safe by default** - Full TypeScript inference with zero type annotations needed
- **Universal** - Works seamlessly in Node.js, browsers, and edge runtimes
- **Secure client/server separation** - Prevent sensitive variables from leaking to the client
- **Built-in validators** - 30+ validators for common formats (email, URL, UUID, JWT, etc.)
- **Runtime validation** - Catch configuration errors before they cause problems
- **Environment-specific defaults** - Different defaults for development, test, and production
- **Custom validators** - Easy-to-create domain-specific validators
- **Zero config** - Sensible defaults that just work
- **Lightweight** - Only dependency is Zod v4! (as peerDependency)

## 📦 Installation

```bash
npm install zenvalid zod@^4
# or
pnpm add zenvalid zod@^4
# or
yarn add zenvalid zod@^4
```

## 🚀 Quick Start

```typescript
import { bool, num, str, url, zenv } from "zenvalid";

// Define and validate your environment variables
const env = zenv({
  // Server configuration
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development"
  }),
  PORT: port({ default: 3000, devDefault: 3001, testDefault: 4000 }),

  // Database
  // Default URL's in local dev/test and a required value in production
  DATABASE_URL: url({
    description: "PostgreSQL connection string",
    devDefault: "postgresql://admin:admin123@localhost:5432/mydb",
    testDefault: "postgresql://admin:admin123@localhost:5432/testdb"
  }),

  // Feature flags with common defaults
  ENABLE_ANALYTICS: bool({
    default: true,
    devDefault: false, // disabled in development
    testDefault: false // disabled in tests
  }),

  // API configuration
  API_KEY: str({
    min: 32 // Minimum length validation
  })
});

// Use with full type safety
console.log(env.PORT); // number
console.log(env.DATABASE_URL); // string
console.log(env.ENABLE_ANALYTICS); // boolean

// Convenience properties
if (env.isDevelopment) {
  console.log("Running in development mode");
}
```

## 🎯 Core Concepts

### Validators

zenv provides a comprehensive set of validators for common environment variable types:

```typescript
import {
  bool,
  email,
  json,
  num,
  port,
  str,
  url,
  uuid
  // ... and 20+ more
} from "zenvalid";
```

### Client/Server Separation

zenv automatically protects sensitive variables from being exposed to the client:

```typescript
const env = zenv(
  {
    // Public variables (auto-exposed with NEXT_PUBLIC_ prefix setting below)
    NEXT_PUBLIC_APP_NAME: str(),
    NEXT_PUBLIC_API_URL: url(),

    // Server-only variables (never exposed to client)
    DATABASE_URL: url(),
    SECRET_API_KEY: str(),

    // Explicitly control exposure and transform values
    INTERNAL_URL: url({
      client: {
        expose: true,
        transform: (url) => url.replace("internal", "public")
      }
    })
  },
  {
    // Auto-expose variables with these prefixes
    clientSafePrefixes: ["NEXT_PUBLIC_", "VITE_", "PUBLIC_"]
  }
);
```

### Environment-Specific Defaults

Different defaults for different environments:

```typescript
const env = zenv({
  LOG_LEVEL: str({
    choices: ["debug", "info", "warn", "error"],
    default: "error", // Production default
    devDefault: "debug", // Development default
    testDefault: "warn" // Test default
  }),

  // Default database URL's in local dev/test, but required value in production
  DATABASE_URL: url({
    description: "PostgreSQL connection string",
    devDefault: "postgresql://admin:admin123@localhost:5432/mydb",
    testDefault: "postgresql://admin:admin123@localhost:5432/testdb"
  }),

  API_TIMEOUT: num({
    default: 30000, // 30 seconds in production backend
    devDefault: 60000, // 60 seconds in development backend
    client: {
      expose: true,
      default: 10000, // 10 seconds on client in production
      devDefault: 5000 // 5 seconds on client in dev
    }
  })
});
```

### Environment-Specific Optionality

Use `undefined` as a default value to make variables optional in specific environments. This provides full type safety with TypeScript knowing exactly which variables are optional:

```typescript
const env = zenv({
  // Required in production, optional in dev/test
  STRIPE_API_KEY: str({
    devDefault: undefined, // Optional with undefined value in dev
    testDefault: undefined // Optional with undefined value in test
    // No production default = required in production
  }),

  // Optional in all environments
  FEATURE_FLAG: str({
    default: undefined // Optional everywhere with undefined value
  }),

  // Complex: Required in prod, uses DATABASE_URL in dev, optional/undefined in test
  DATABASE_REPLICA_URL: str({
    devDefault: process.env.DATABASE_URL, // Use main DB in dev
    testDefault: undefined // Optional in test
    // No production default = required in production
  }),

  // Works with all validator types
  OPTIONAL_PORT: port({ default: undefined }),
  WEBHOOK_URL: url({ default: undefined }),
  CONFIG_JSON: json<ConfigType>({ default: undefined }),
  SESSION_ID: uuid({ default: undefined })
});

// TypeScript provides full type safety
if (env.STRIPE_API_KEY) {
  // Type is string inside this block (not string | undefined)
  processPayment(env.STRIPE_API_KEY);
}

// Optional chaining works correctly
const webhookHost = env.WEBHOOK_URL?.split("/")[2];

// Pattern matching for optional configs
switch (env.FEATURE_FLAG) {
  case "experimental":
    enableExperimentalFeatures();
    break;
  case undefined:
    // Feature flag not set
    break;
  default:
    // Type: string (TypeScript knows undefined is handled)
    console.log(`Unknown feature flag: ${env.FEATURE_FLAG}`);
}
```

This pattern is particularly useful for:

- **Third-party services**: API keys that aren't needed in development
- **Optional features**: Configuration that can be enabled/disabled
- **Gradual rollouts**: Features that are optional during testing
- **Multi-environment deployments**: Different requirements per environment
- **Backwards compatibility**: Making new config optional initially

## 📖 Validator Reference

### String Validators

#### `str(options?)`

Validates string values with optional constraints.

```typescript
// Basic string
const env = zenv({
  APP_NAME: str({ default: 'MyApp' })
});

// String with choices (enum)
const env = zenv({
  LOG_LEVEL: str({
    choices: ['debug', 'info', 'warn', 'error'],
    default: 'info' // typed to only allow the choices above
  })
});
// env.LOG_LEVEL type will be: 'debug' | 'info' | 'warn' | 'error'

// String with length constraints
const env = zenv({
  API_KEY: str({
    min: 32,
    max: 64,
    description: 'API key must be 32-64 characters'
  })
});

// String with regex pattern
const env = zenv({
  VERSION: str({
    regex: /^\d+\.\d+\.\d+$/,
    example: '1.2.3'
  })
});
```

### Number Validators

#### `num(options?)`

Parses and validates numbers with automatic string-to-number coercion.

```typescript
// Basic number with range
const env = zenv({
  WORKERS: num({
    min: 1,
    max: 100,
    default: 4
  })
});

// Integer validation
const env = zenv({
  RETRY_COUNT: num({
    int: true,
    positive: true,
    default: 3
  })
});

// Number with choices
const env = zenv({
  PRIORITY: num({
    choices: [1, 2, 3, 4, 5],
    default: 3 // typed to only allow the choices above
  })
});
// env.PRIORITY type will be: 1 | 2 | 3 | 4 | 5
```

#### `port(options?)`

Specialized number validator for TCP/UDP ports.

```typescript
const env = zenv({
  PORT: port({ default: 3000 }),
  CUSTOM_PORT: port({
    min: 8000,
    max: 8999,
    default: 8080
  })
});
```

### Boolean Validator

#### `bool(options?)`

Parses boolean values from various string representations.

```typescript
const env = zenv({
  DEBUG: bool({ default: false }),
  ENABLE_CACHE: bool({
    default: true,
    devDefault: false // Disable in development
    testDefault: false // Disable in tests
  })
});

// Accepts: true, false, "true", "false", "1", "0", "yes", "no", "on", "off"
```

### URL & Network Validators

#### `url(options?)`

Validates URLs with optional protocol and hostname restrictions.

```typescript
const env = zenv({
  API_URL: url({
    default: "https://api.example.com"
  }),

  // HTTPS only
  SECURE_URL: url({
    protocol: "https",
    description: "Must use HTTPS"
  }),

  // Internal URLs only
  INTERNAL_API: url({
    hostname: /^(localhost|127\.0\.0\.1|.*\.internal)$/
  })
});
```

#### `email(options?)`

Validates email addresses.

```typescript
const env = zenv({
  ADMIN_EMAIL: email({
    default: "admin@example.com"
  }),

  // Custom regex for corporate emails
  CORP_EMAIL: email({
    regex: /@mycompany\.com$/,
    description: "Must be a company email"
  })
});
```

#### `host(options?)`

Validates hostnames and IP addresses.

```typescript
const env = zenv({
  DATABASE_HOST: host({
    default: "localhost"
  }),

  // Hostname only (no IPs)
  API_HOST: host({
    allowIP: false
  }),

  // IPv4 only
  IPV4_HOST: host({
    ipv4Only: true,
    default: "127.0.0.1"
  })
});
```

### JSON Validator

#### `json<T>(options?)`

Parses and validates JSON strings with optional schema validation.

```typescript
import { z } from 'zod/v4';

// Basic JSON parsing
const env = zenv({
  CONFIG: json<{ enabled: boolean }>({
    default: { enabled: true }
  })
});

// JSON with Zod schema validation
const configSchema = z.object({
  apiKey: z.string(),
  timeout: z.number(),
  features: z.array(z.string())
});

const env = zenv({
  APP_CONFIG: json({
    schema: configSchema,
    default: {
      apiKey: 'default-key',
      timeout: 5000,
      features: []
    }
  })
});

// Array parsing
const env = zenv({
  ALLOWED_ORIGINS: json<string[]>({
    default: ['http://localhost:3000']
  })
});
```

### Format Validators

zenv includes validators for common data formats:

```typescript
const env = zenv({
  // UUIDs
  SESSION_ID: uuid(), // Any UUID version
  REQUEST_ID: uuid({ version: "v4" }), // UUID v4 specifically

  // Date and time
  START_DATE: isoDate(), // YYYY-MM-DD
  START_TIME: isoTime(), // HH:MM:SS
  CREATED_AT: datetime(), // ISO 8601 datetime
  CACHE_TTL: isoDuration(), // ISO 8601 duration (e.g., PT1H)

  // Encoding
  API_SECRET: base64(), // Standard base64
  URL_TOKEN: base64url(), // URL-safe base64

  // Tokens and IDs
  AUTH_TOKEN: jwt(), // JSON Web Token
  AUTH_TOKEN_HS256: jwt({ alg: "HS256" }), // JWT with specific algorithm

  // Various ID formats
  DOC_ID: cuid(), // CUID
  SESSION_ID: cuid2(), // CUID2 (more secure)
  EVENT_ID: ulid(), // ULID (sortable)
  SHORT_ID: nanoid(), // Nano ID
  RESOURCE_ID: guid(), // GUID/UUID Microsoft format
  NODE_ID: xid(), // XID
  REQUEST_ID: ksuid(), // KSUID (time-sortable)

  // IP addresses
  SERVER_IP: ipv4(), // IPv4 address
  IPV6_ADDR: ipv6() // IPv6 address
});
```

## 🔧 Advanced Usage

### Custom Validators

Create domain-specific validators with the `makeValidator` function:

```typescript
import { makeValidator } from "zenvalid";

// Semantic version validator
const semver = makeValidator<string>({
  validator: (input) => /^\d+\.\d+\.\d+$/.test(input),
  description: "Semantic version (e.g., 1.2.3)"
});

// Base64 to Buffer transformer
const secret = makeValidator<string, Buffer>({
  validator: (input) => {
    try {
      return Buffer.from(input, "base64").length === 32;
    } catch {
      return false;
    }
  },
  transform: (input) => Buffer.from(input, "base64"),
  description: "32-byte base64 encoded secret"
});

// Use in your environment
const env = zenv({
  APP_VERSION: semver({ default: "1.0.0" }),
  ENCRYPTION_KEY: secret()
});
```

### Client-Safe Prefixes

Automatically expose variables to the client based on naming conventions:

```typescript
const env = zenv(
  {
    // Auto-exposed to client (NEXT_PUBLIC_ prefix)
    NEXT_PUBLIC_APP_NAME: str(),
    NEXT_PUBLIC_API_URL: url(),

    // Auto-exposed (VITE_ prefix)
    VITE_APP_TITLE: str(),

    // Server-only (no special prefix)
    DATABASE_URL: url(),
    SECRET_KEY: str()
  },
  {
    // Configure auto-exposure prefixes
    clientSafePrefixes: ["NEXT_PUBLIC_", "VITE_", "PUBLIC_"],

    // Force certain prefixes to be server-only
    serverOnlyPrefixes: ["SECRET_", "PRIVATE_", "DATABASE_"]
  }
);
```

### Client Value Transformation

Transform values before exposing them to the client:

```typescript
const env = zenv({
  INTERNAL_API_URL: url({
    default: "http://internal-api:3000",
    client: {
      expose: true,
      // Transform internal URL to public URL for client
      transform: (url) => url.replace("internal-api:3000", "api.example.com")
    }
  }),

  DEBUG_INFO: json({
    default: { verbose: true, details: "sensitive" },
    client: {
      expose: true,
      // Strip sensitive data for client
      transform: (data) => ({ verbose: data.verbose })
    }
  })
});
```

### Error Handling Strategies

Configure how validation errors are handled:

```typescript
// Development: Show warnings but continue
const env = zenv({
  API_KEY: str()
}, {
  onError: 'return',  // Return partial results on error
  onClientAccessError: 'warn'  // Warn when accessing server-only vars
});

// Production: Fail fast
const env = zenv({
  API_KEY: str()
}, {
  onError: 'exit',  // Exit process on error (Node.js)
  onClientAccessError: 'ignore'  // Silently return undefined
});

// Testing: Throw exceptions
const env = zenv({
  API_KEY: str()
}, {
  onError: 'throw',  // Throw exception on error
  reporter: (errors) => {
    // Custom error reporting
    console.error('Validation failed:', errors);
    throw new Error('Environment validation failed');
  }
});
```

### Strict Mode

Prevent access to non-validated environment variables:

```typescript
const env = zenv(
  {
    VALIDATED_VAR: str()
  },
  {
    strict: true // Default
  }
);

// ✅ Works
console.log(env.VALIDATED_VAR);

// ❌ Throws ReferenceError
console.log(env.UNVALIDATED_VAR);
```

## 🎨 TypeScript Support

zenv provides complete TypeScript inference without any type annotations:

```typescript
// Define your environment
const env = zenv({
  PORT: num(),
  API_URL: url(),
  FEATURES: json<string[]>(),
  LOG_LEVEL: str({ choices: ["debug", "info", "error"] }),
  ENABLE_CACHE: bool()
});

// TypeScript knows all the types
type Env = typeof env;
// {
//   PORT: number;
//   API_URL: string;
//   FEATURES: string[];
//   LOG_LEVEL: 'debug' | 'info' | 'error';
//   ENABLE_CACHE: boolean;
//   isDevelopment: boolean;
//   isProduction: boolean;
//   // ... other convenience properties
// }

// Autocomplete and type checking work perfectly
env.PORT.toFixed(2); // ✅ number methods available
env.LOG_LEVEL === "debug"; // ✅ literal type checking
env.FEATURES.map((f) => f.toUpperCase()); // ✅ array methods available
```

### Type Utilities

Extract types from validators and specs:

```typescript
import type { InferValidatorType, InferZenvType } from "zenvalid";

// Get type from a single validator
const portValidator = port({ default: 3000 });
type PortType = InferValidatorType<typeof portValidator>; // number

// Get type from entire spec
const spec = {
  PORT: num(),
  API_URL: url(),
  DEBUG: bool()
};
type EnvType = InferZenvType<typeof spec>;
// { PORT: number; API_URL: string; DEBUG: boolean }
```

## 🏗️ Runtime Utilities

The `runtime` object provides environment detection utilities:

```typescript
import { runtime } from "zenvalid";

// Environment detection
if (runtime.isServer) {
  // Server-only code
  const fs = await import("fs");
}

if (runtime.isClient) {
  // Client-only code
  window.localStorage.setItem("key", "value");
}

// NODE_ENV detection
if (runtime.isDevelopment) {
  console.log("Development mode");
}

if (runtime.isProduction) {
  enableOptimizations();
}

if (runtime.isTest) {
  useMockData();
}

// Access raw environment
const rawValue = runtime.env.SOME_VAR;

// Get defaults based on environment
const errorBehavior = runtime.defaultErrorBehavior;
// 'exit' on server, 'throw' on client
```

## 🔒 Security Best Practices

### 1. Never Expose Secrets

```typescript
const env = zenv(
  {
    // ❌ Bad: Could expose secret if using auto-exposure
    PUBLIC_API_KEY: str(),

    // ✅ Good: Explicitly marked as server-only
    API_KEY: str({
      client: { expose: false }
    }),

    // ✅ Good: Use server-only prefix
    SECRET_API_KEY: str()
  },
  {
    serverOnlyPrefixes: ["SECRET_", "PRIVATE_"]
  }
);
```

### 2. Validate Early

```typescript
// ✅ Good: Validate at startup
const env = zenv(
  {
    DATABASE_URL: url()
  },
  {
    onError: "exit" // Fail fast in production
  }
);

// Then use throughout your app
export default env;
```

### 3. Use Appropriate Validators

```typescript
const env = zenv({
  // ✅ Good: Use specific validators
  EMAIL: email(),
  API_URL: url({ protocol: /^https$/ }),
  PORT: port(),

  // ❌ Bad: Too permissive
  EMAIL_STRING: str(), // No email validation
  API_URL_STRING: str(), // No URL validation
  PORT_STRING: str() // No port range validation
});
```

### 4. Transform Sensitive Data for Client

```typescript
const env = zenv({
  DATABASE_URL: url({
    client: {
      expose: true,
      // Only expose the database type, not credentials
      transform: (url) => new URL(url).protocol.replace(":", "")
    }
  })
});
```

## 🔄 Migration Guide

### From `dotenv`

```typescript
// Before (dotenv)
import dotenv from 'dotenv';
dotenv.config();

const port = parseInt(process.env.PORT || '3000');
const debug = process.env.DEBUG === 'true';

// After (zenv)
import { zenv, num, bool } from 'zenvalid';

const env = zenv({
  PORT: num({ default: 3000 }),
  DEBUG: bool({ default: false })
});

const port = env.PORT;  // Already parsed as number
const debug = env.DEBUG;  // Already parsed as boolean
```

### From `envalid`

```typescript
// Before (envalid)
import { cleanEnv, str, port } from 'envalid';

const env = cleanEnv(process.env, {
  PORT: port({ default: 3000 }),
  NODE_ENV: str({ choices: ['development', 'production'] })
});

// After (zenv)
import { zenv, port, str } from 'zenvalid';

const env = zenv({
  PORT: port({ default: 3000 }),
  NODE_ENV: str({ choices: ['development', 'production'] })
});
```

### From Plain `process.env`

```typescript
// Before (unsafe)
const port = process.env.PORT; // string | undefined
const maxRetries = process.env.MAX_RETRIES; // string | undefined

if (port) {
  server.listen(parseInt(port)); // Manual parsing
}

// After (type-safe)
const env = zenv({
  PORT: port({ default: 3000 }),
  MAX_RETRIES: num({ default: 3, min: 1, max: 10 })
});

server.listen(env.PORT); // Type-safe, validated, parsed
```

## 📚 API Reference

### Main Function

#### `zenv(specs, options?)`

Validates environment variables against a specification.

**Parameters:**

- `specs`: Record of variable names to validators
- `options`: Optional configuration object

**Options:**

| Option                | Type                            | Default                               | Description                               |
| --------------------- | ------------------------------- | ------------------------------------- | ----------------------------------------- |
| `env`                 | `NodeJS.ProcessEnv`             | `process.env`                         | Environment source                        |
| `clientSafePrefixes`  | `string[]`                      | `[]`                                  | Prefixes for auto-exposed variables       |
| `serverOnlyPrefixes`  | `string[]`                      | `[]`                                  | Prefixes for forced server-only variables |
| `onError`             | `'throw' \| 'exit' \| 'return'` | `'exit'` (server), `'throw'` (client) | Error handling strategy                   |
| `onClientAccessError` | `'throw' \| 'warn' \| 'ignore'` | `'warn'` (dev), `'ignore'` (prod)     | Client access error handling              |
| `reporter`            | `function \| null`              | `null`                                | Custom error reporter                     |
| `strict`              | `boolean`                       | `true`                                | Prevent access to non-validated variables |

### Validator Options

#### Common Options (BaseOptions)

Available to all validators:

| Option        | Type           | Description                       |
| ------------- | -------------- | --------------------------------- |
| `default`     | `T`            | Default value in production       |
| `devDefault`  | `T`            | Default value in development      |
| `testDefault` | `T`            | Default value in test environment |
| `description` | `string`       | Human-readable description        |
| `example`     | `string`       | Example value for documentation   |
| `client`      | `ClientConfig` | Client-specific configuration     |

#### ClientConfig Options

| Option       | Type              | Description                     |
| ------------ | ----------------- | ------------------------------- |
| `expose`     | `boolean`         | Whether to expose to client     |
| `transform`  | `(value: T) => T` | Transform function for client   |
| `default`    | `T`               | Override default for client     |
| `devDefault` | `T`               | Override dev default for client |

### Built-in Validators

| Validator       | Description           | Specific Options                                       |
| --------------- | --------------------- | ------------------------------------------------------ |
| `str()`         | String validation     | `choices`, `min`, `max`, `regex`                       |
| `num()`         | Number validation     | `choices`, `min`, `max`, `int`, `positive`, `negative` |
| `bool()`        | Boolean validation    | -                                                      |
| `json()`        | JSON parsing          | `schema` (Zod schema)                                  |
| `email()`       | Email validation      | `regex`                                                |
| `url()`         | URL validation        | `protocol`, `hostname`                                 |
| `host()`        | Host/IP validation    | `allowIP`, `ipv4Only`, `ipv6Only`                      |
| `port()`        | Port number (1-65535) | `min`, `max`                                           |
| `uuid()`        | UUID validation       | `version`                                              |
| `ipv4()`        | IPv4 address          | -                                                      |
| `ipv6()`        | IPv6 address          | -                                                      |
| `datetime()`    | ISO 8601 datetime     | `offset`, `local`, `precision`                         |
| `isoDate()`     | ISO date (YYYY-MM-DD) | -                                                      |
| `isoTime()`     | ISO time (HH:MM:SS)   | `precision`                                            |
| `isoDuration()` | ISO 8601 duration     | -                                                      |
| `base64()`      | Base64 encoding       | -                                                      |
| `base64url()`   | URL-safe base64       | -                                                      |
| `jwt()`         | JSON Web Token        | `alg`                                                  |
| `cuid()`        | CUID identifier       | -                                                      |
| `cuid2()`       | CUID2 identifier      | -                                                      |
| `ulid()`        | ULID identifier       | -                                                      |
| `nanoid()`      | Nano ID               | -                                                      |
| `guid()`        | GUID/UUID Microsoft   | -                                                      |
| `xid()`         | XID identifier        | -                                                      |
| `ksuid()`       | KSUID identifier      | -                                                      |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © Jeremy Shimko
