# zenvalidate

[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

_(Zod + env + validate)_

**Type-safe environment variable validation and strict type safety built on Zod v4.**

## Why zenvalidate?

Managing environment variables across multiple deployments can be very error-prone and all type checking or coercion is completely manual. Zenvalidate aims to solves these problems with automatic runtime validation/coercion, full TypeScript inference, and automatic client/server separation for full stack frameworks (Next.js, Tanstack Start, etc.).

I was originally inspired to build this project because I had been using [envalid](https://github.com/af/envalid?tab=readme-ov-file) in all of my TypeScript projects for years, but I wanted to take it a step further to support using Zod for more complex validation and transformation options using an API most JS developers are already familiar with. So big thanks to [@af](https://github.com/af) for the initial inspiration and the nice API (the public API of `zenvalidate` is nearly identical to `envalid` for most common usage).

So I essentially tried to keep the same great DX, but wrote all of the validation and type inference pieces with Zod instead. This allows using battle-tested Zod validation and also adds a lot of flexibility for more complex validation and transformation logic using Zod API's that everyone is probably already familiar with and using in their projects already.

### Key Features

- **25+ built-in validators** - Common env var formats out of the box
- **Environment-specific defaults** - Different defaults for dev/test/prod
- **Full type inference** - No coercion or type annotations needed
- **Client/server separation** - Automatic security boundaries
- **Zero dependencies** - Only Zod v4 as a peer dependency
- **Framework agnostic** - Works with Next.js, Vite, Remix, plain Node.js
- **Transform functions** - Sanitize values for client exposure
- **Strict validation** - Catch configuration errors immediately and fail fast at runtime

## Quick Start

```bash
# npm
npm install zenvalidate zod@^4

# pnpm
pnpm add zenvalidate zod@^4

# yarn
yarn add zenvalidate zod@^4
```

### Basic Usage

```typescript
import { num, port, str, url, zenv } from "zenvalidate";

// Define and validate your environment
const env = zenv({
  DATABASE_URL: url(),
  PORT: port({ default: 3000 }),
  LOG_LEVEL: str({ choices: ["debug", "info", "warn", "error"] }),
  NODE_ENV: str({ choices: ["development", "production", "test"] })
});

// Validated with Zod and TypeScript knows the exact types
console.log(env.DATABASE_URL); // string (valid URL guaranteed)
console.log(env.PORT); // number (1-65535), default 3000
console.log(env.LOG_LEVEL); // (union) 'debug' | 'info' | 'warn' | 'error'
console.log(env.NODE_ENV); // (union) 'development' | 'production' | 'test'
```

## Validators

zenvalidate provides the following built-in validators as well as a utility for creating your own custom validators with Zod directly.

### String Validators

- **`str()`** - Basic string validation with optional constraints (min/max length, regex, choices)
- **`email()`** - Email address validation with optional custom regex patterns

### Number Validators

- **`num()`** - Number validation with automatic string-to-number coercion and constraints (min/max, integer, positive/negative, choices)
- **`port()`** - Port number validation (1-65535 by default, customizable range)

### Boolean Validators

- **`bool()`** - Boolean validation with precise string-to-boolean parsing (handles "true", "false", "1", "0", "yes", "no", "on", "off")

### URL/Network Validators

- **`url()`** - URL validation with optional protocol and hostname restrictions
- **`host()`** - Hostname validation with optional IP address support (IPv4/IPv6)
- **`ipv4()`** - IPv4 address validation in dotted decimal notation
- **`ipv6()`** - IPv6 address validation in standard notation

### Identifier Validators

- **`uuid()`** - UUID validation with optional version specification (v1-v8)
- **`cuid()`** - CUID (Collision-resistant Unique Identifier) validation
- **`cuid2()`** - CUID2 validation (improved version with better security)
- **`ulid()`** - ULID (Universally Unique Lexicographically Sortable Identifier) validation
- **`nanoid()`** - Nano ID validation (compact, URL-safe unique identifiers)
- **`guid()`** - GUID validation (Microsoft's globally unique identifier format)
- **`xid()`** - XID validation (globally unique, sortable identifiers)
- **`ksuid()`** - KSUID validation (K-Sortable Unique Identifier with timestamp ordering)

### Date/Time Validators

- **`datetime()`** - ISO 8601 datetime validation with optional timezone offset and precision
- **`isoDate()`** - ISO 8601 date validation (YYYY-MM-DD format)
- **`isoTime()`** - ISO 8601 time validation (HH:MM:SS format) with optional precision
- **`isoDuration()`** - ISO 8601 duration validation (e.g., P1DT2H3M4S)

### Encoding Validators

- **`base64()`** - Standard base64 encoded string validation
- **`base64url()`** - URL-safe base64 encoded string validation (using - and \_ instead of + and /)
- **`jwt()`** - JSON Web Token validation with optional algorithm specification

### Data Structure Validators

- **`json()`** - JSON string parsing with optional schema validation

### Custom Validators

- **`makeValidator()`** - Create custom validators with domain-specific validation logic

## Core Features

### Environment-Specific Defaults

Different defaults for development, test, and production:

```typescript
const env = zenv({
  LOG_LEVEL: str({
    choices: ["debug", "info", "warn", "error"],
    default: "info", // Production default
    devDefault: "debug", // Development override
    testDefault: "warn" // Test override
  }),

  DATABASE_URL: url({
    devDefault: "postgresql://localhost:5432/dev",
    testDefault: "postgresql://localhost:5432/test"
    // No production default, so a value is required in production
  }),

  CACHE_TTL: num({
    default: 3600, // 1 hour in production
    devDefault: 0, // No cache in development
    testDefault: 60 // 1 minute in tests
  })
});
```

### Type Safety

Full TypeScript inference without type annotations:

```typescript
// Literal types with choices
const env = zenv({
  LOG_LEVEL: str({
    choices: ["debug", "info", "warn", "error"],
    devDefault: "debug",
    default: "info"
  })
});
// env.LOG_LEVEL - union type: "debug" | "info"  | "warn" | "error"

// make variables optional by explicitly setting undefined as the default value
const env = zenv({
  OPTIONAL_API_KEY: str({ default: undefined })
});
// env.OPTIONAL_API_KEY - string | undefined
```

**JSON values**

```typescript
// define the type of your JSON value
interface Config {
  timeout: number;
  retries: number;
}

// and pass it to the json() validator
const env = zenv({
  SERVICE_CONFIG: json<Config>({
    default: { timeout: 5000, retries: 3 } // type inferred
  })
});
// env.SERVICE_CONFIG - typed as Config
```

**IMPORTANT**: The above example does **NOT** validate the JSON with Zod. It simply casts the output from `JSON.parse()` as your provided type and provides type safety on defaults. If you want to also strictly validate the JSON at runtime (recommended), you should pass a custom Zod schema to the validator like this:

```typescript
const configSchema = z.object({
  timeout: z.number().positive().default(5000), // non-zero positive number
  retries: z.number().nonnegative().default(3) // allows for 0 retries
});

type Config = z.infer<typeof configSchema>;

// and then pass it to the json() validator
const env = zenv({
  SERVICE_CONFIG: json({ schema: configSchema })
});
// env.SERVICE_CONFIG - fully parsed/validated JSON of type Config
```

## Client/Server Separation

Automatic security boundaries for client/server frameworks:

```typescript
const env = zenv(
  {
    // Server-only by default
    DATABASE_URL: url(),
    SECRET_KEY: str(),

    // Explicit client exposure control per variable
    API_HOST: host({
      client: {
        expose: true,
        transform: (host) => host.replace(".internal", ".public")
      }
    }),

    // exposed to client by clientSafePrefixes option below
    NEXT_PUBLIC_API_URL: url(), // Next.js public
    VITE_API_URL: url(), // Vite public
    PUBLIC_VERSION: str() // Generic public
  },
  {
    clientSafePrefixes: ["NEXT_PUBLIC_", "VITE_", "PUBLIC_"]
  }
);
```

### Framework Integration

#### Next.js (or similar)

```ts
// env.ts
import { num, str, url, zenv } from "zenvalidate";

export const env = zenv(
  {
    // Client-safe variables (see clientSafePrefixes config below)
    NEXT_PUBLIC_API_URL: url({ devDefault: "http://localhost:3000/api" }),
    NEXT_PUBLIC_APP_NAME: str({ default: "My App", devDefault: "My App (dev)" }),

    // Server-only variables
    DATABASE_URL: url({ devDefault: "postgresql://user:pass@localhost:5432/dev" }),
    JWT_SECRET: str(),

    // Runtime configuration
    PORT: num({ default: 3000 }),
    NODE_ENV: str({
      choices: ["development", "production", "test"]
    })
  },
  {
    clientSafePrefixes: ["NEXT_PUBLIC_"]
  }
);
```

```tsx
// app/layout.tsx - Inject client-safe env into your page <head> during SSR
import { getClientEnvScript } from "zenvalidate";

import { env } from "@/config/env";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: getClientEnvScript(env)
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

The above script returned by `getClientEnvScript(env)` writes your client-safe values to `window.__ZENV_CLIENT__` under the hood
and then the `env` API will get the values from there when called in the browser. Any other client/server framework that functions similarly can be configured this way.

#### Node.js / Express (or any other server-side framework)

```ts
import express from "express";
import { host, num, port, str, url, zenv } from "zenvalidate";

const env = zenv({
  // Server configuration
  HOST: host({ default: "0.0.0.0" }),
  PORT: port({ default: 3000 }),

  // Database
  DATABASE_URL: url({
    protocol: /^postgres|postgresql$/, // supports regex or string
    devDefault: "postgresql://user:pass@localhost:5432/dev"
  }),
  DATABASE_POOL_SIZE: num({
    int: true,
    min: 1,
    max: 100,
    default: 10
  }),

  // Redis
  REDIS_URL: url({
    protocol: "redis",
    devDefault: "redis://localhost:6379"
  }),
  CACHE_TTL: num({ default: 3600 }),

  // Logging defaults
  LOG_LEVEL: str({
    choices: ["debug", "info", "warn", "error"],
    default: "info",
    devDefault: "debug"
  })
});

const app = express();

app.listen(env.PORT, env.HOST, () => {
  console.log(`Server running at http://${env.HOST}:${env.PORT}`);
});
```

## Advanced Usage

### Custom Validators

Create domain-specific validators:

```typescript
import { makeValidator } from "zenvalidate";
import { z } from "zod";

// Simple custom validator for a semver string
// makeValidator<InputType, OutputType>
// (input type is always string, output type should match your parsed/validated output)
const semver = makeValidator<string, string>({
  // provide a custom Zod schema
  schema: z.string().regex(/^\d+\.\d+\.\d+$/),
  // or write a custom validation function that returns a boolean or throws
  // validator: (value) => /^\d+\.\d+\.\d+$/.test(value),
  message: "Invalid semantic version",
  description: "Semantic version (e.g., 1.2.3)"
});

// Use in your schema
const env = zenv({
  APP_VERSION: semver({ devDefault: "0.0.0" })
});
```

### Error Handling

Configure error behavior:

```typescript
const env = zenv(specs, {
  // Error handling strategies
  onError: "exit", // Exit process (default on server)
  onError: "throw", // Throw an error
  onError: "return", // Log warnings and just return invalid value (useful for testing, build time, etc.)

  // Client access errors
  // Values are always undefined on client by default, but you can customize
  // what happens if client side code tries to access a server-only variable.
  onClientAccessError: "throw", // Throw on access (strict)
  onClientAccessError: "warn", // Console warning (default dev)
  onClientAccessError: "ignore", // Silent (default prod)

  // Validation options
  strict: true, // Prevent access to un-validated vars
  env: customEnvObject // Use custom env source (testing, etc.), process.env by default
});

// Handle errors programmatically
try {
  const env = zenv(specs, { onError: "throw" });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Validation failed:", error.errors);
  }
}
```

### Complex Validation

Leverage Zod's full power for complex validation:

```typescript
const env = zenv({
  // Number constraints
  PORT: port({ min: 3000, max: 9999, default: 3000 }),
  WORKERS: num({ int: true, min: 1, max: 16 }),
  TIMEOUT: num({ positive: true, int: true, default: 30000 }),

  // String constraints
  ADMIN_EMAIL: email({
    regex: /@mycompany\.com$/,
    description: "Must be a company email address"
  }),
  STRIPE_API_KEY: str({
    regex: /^sk-[a-zA-Z0-9]{48}$/,
    description: "Stripe secret key"
  }),

  // JSON with schema validation
  FEATURE_FLAGS: json({
    schema: z.object({
      newUI: z.boolean(),
      betaFeatures: z.boolean(),
      maxUploadSize: z.number().positive().optional()
    }),
    default: {
      newUI: false,
      betaFeatures: false,
      maxUploadSize: 10485760
    },
    // different defaults in dev
    devDefault: {
      newUI: true,
      betaFeatures: true
    }
  }),

  // Transform functions
  API_ENDPOINT: url({
    transform: (url) => url.replace("http://", "https://"),
    client: {
      expose: true,
      transform: (url) => url.replace("/internal", "/public")
    }
  })
});
```

## API Reference

### Validator Options

All validators share common base options:

```typescript
interface BaseOptions<T> {
  default?: T; // Default value
  devDefault?: T; // Override when NODE_ENV=development
  testDefault?: T; // Override when NODE_ENV=test
  description?: string; // Documentation
  example?: string; // Example value
  client?: {
    expose: boolean; // Allow client access
    transform?: (v: T) => T; // Transform for client
    default?: T; // Client-specific default
    devDefault?: T; // Client-specific dev default
  };
}
```

#### String Options

```typescript
interface StringOptions extends BaseOptions<string> {
  choices?: readonly string[]; // Allowed values (creates union type)
  min?: number; // Minimum length
  max?: number; // Maximum length
  regex?: RegExp; // Pattern match
}
```

#### Number Options

```typescript
interface NumberOptions extends BaseOptions<number> {
  choices?: readonly number[]; // Allowed values (creates union type)
  min?: number; // Minimum value
  max?: number; // Maximum value
  int?: boolean; // Integer only
  positive?: boolean; // Positive only
  negative?: boolean; // Negative only
}
```

#### Email Options

```typescript
interface EmailOptions extends BaseOptions<string> {
  regex?: RegExp; // Custom email pattern (overrides default)
}
```

#### URL Options

```typescript
interface UrlOptions extends BaseOptions<string> {
  protocol?: string | RegExp; // Required protocol (e.g., "https" or /^https$/)
  hostname?: string | RegExp; // Required hostname (e.g., "example.com" or /\.example\.com$/)
}
```

#### Host Options

```typescript
interface HostOptions extends BaseOptions<string> {
  allowIP?: boolean; // Allow IP addresses (default: true)
  ipv4Only?: boolean; // Restrict to IPv4 only
  ipv6Only?: boolean; // Restrict to IPv6 only
}
```

#### Port Options

```typescript
interface PortOptions extends BaseOptions<number> {
  min?: number; // Minimum port (default: 1)
  max?: number; // Maximum port (default: 65535)
}
```

#### JSON Options

```typescript
interface JsonOptions<T> extends BaseOptions<T> {
  schema?: z.ZodType<T>; // Zod schema for validation
}
```

#### UUID Options

```typescript
interface UUIDOptions extends BaseOptions<string> {
  version?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8"; // UUID version
}
```

#### Datetime Options

```typescript
interface DatetimeOptions extends BaseOptions<string> {
  offset?: boolean; // Require timezone offset
  local?: boolean; // Allow local time (no timezone)
  precision?: number; // Decimal precision for seconds (0-9)
}
```

#### ISO Time Options

```typescript
interface ISOTimeOptions extends BaseOptions<string> {
  precision?: number; // Decimal precision for seconds (0-9)
}
```

#### JWT Options

```typescript
interface JWTOptions extends BaseOptions<string> {
  alg?: string; // Optional algorithm (e.g., "HS256", "RS256")
}
```

## Migration Guide

### From envalid

Almost identical API!

```typescript
// Before (envalid)
import { cleanEnv, str, port, bool } from "envalid";

const env = cleanEnv(process.env, {
  PORT: port({ default: 3000 }),
  NODE_ENV: str({ choices: ["development", "production", "test"] }),
  DEBUG: bool({ default: false })
});

// After (zenvalidate)
import { zenv, port, str, bool } from "zenvalidate";

// cleanEnv -> zenv and passing process.env is optional
// That's it!
const env = zenv({
  PORT: port({ default: 3000 }),
  NODE_ENV: str({ choices: ["development", "production", "test"] }),
  DEBUG: bool({ default: false })
});
```

### From dotenv

```typescript
// Before (dotenv)
require("dotenv").config();
const port = parseInt(process.env.PORT || "3000");
const debug = process.env.DEBUG === "true";
const apiUrl = process.env.API_URL; // Could be undefined

// After (zenvalidate)
import { zenv, port, bool, url } from "zenvalidate";

const env = zenv({
  PORT: port({ default: 3000 }),
  DEBUG: bool({ default: false, devDefault: true }),
  API_URL: url({ devDefault: "http://localhost:3000", default: "https://api.example.com" })
});
// Types are all guaranteed, validation is automatic, defaults are applied automatically based on NODE_ENV
```

### From plain process.env

```typescript
// Before (manual validation)
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
if (isNaN(port)) throw new Error("Invalid PORT");

const apiUrl = process.env.API_URL;
if (!apiUrl) throw new Error("API_URL required");
if (!apiUrl.startsWith("https://")) throw new Error("API_URL must be HTTPS");

// After (zenvalidate)
const env = zenv({
  PORT: port({ default: 3000 }),
  API_URL: url({ protocol: "https" })
});
// Validation is declarative and type-safe
```

## Performance

- **One-time validation** - Runs once at startup
- **Zero runtime overhead** - After validation, access is direct property lookup
- **WeakMap metadata** - Efficient storage without schema pollution
- **Proxy-based protection** - Minimal overhead for client/server separation

## Links

- **npm**: https://www.npmjs.com/package/zenvalidate
- **GitHub**: https://github.com/jshimko/zenvalidate
- **Issues**: https://github.com/jshimko/zenvalidate/issues

## License

MIT © 2025 Jeremy Shimko
