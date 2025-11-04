# zenvalidate

[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe environment variable validation built on Zod v4.

I was originally inspired to build this project after using [envalid](https://github.com/af/envalid?tab=readme-ov-file) in all of my TypeScript projects for years, so lots of credit due to [@af](https://github.com/af) for the general approach and the API (`zenvalidate` is nearly identical!). I essentially kept all of the API's I liked, but did all of the validation and type inference with Zod instead. This allowed for more complex validation and transformation logic using Zod API's that everyone is already familiar with (see `makeValidator`) while also maintaining the great DX of `envalid`.

## Why zenvalidate?

Environment variables are the standard way to configure Node.js applications, but they're error-prone: missing variables crash production, typos go unnoticed, and type checking and coercion is manual. zenvalidate solves these problems with runtime validation, full TypeScript inference, and automatic client/server separation for security.

### Key Features

- **Zero dependencies** - Only Zod v4 as a peer dependency
- **Full type inference** - No coercion or type annotations needed
- **Client/server separation** - Automatic security boundaries
- **30+ built-in validators** - Common env var formats out of the box
- **Environment-specific defaults** - Different defaults for dev/test/prod
- **Framework agnostic** - Works with Next.js, Vite, Remix, Node.js
- **Transform functions** - Sanitize values for client exposure
- **Strict validation** - Catch errors immediately at runtime

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
  DATABASE_URL: url({ devDefault: "postgresql://user:pass@localhost:5432/dev" }),
  PORT: port({ default: 3000 }),
  LOG_LEVEL: str({
    choices: ["debug", "info", "warn", "error"],
    default: "info",
    devDefault: "debug"
  }),
  NODE_ENV: str({
    choices: ["development", "production", "test"]
  })
});

// Validated with Zod and TypeScript knows the exact types
console.log(env.PORT); // number
console.log(env.LOG_LEVEL); // (enum) 'debug' | 'info' | 'warn' | 'error'
console.log(env.NODE_ENV); // (enum) 'development' | 'production' | 'test'
```

### Client/Server Separation

Protect sensitive variables from client-side exposure:

```typescript
const env = zenv(
  {
    // Server-only by default
    DATABASE_URL: url(),
    SESSION_SECRET: str(),

    // available on client (see clientSafePrefixes below)
    NEXT_PUBLIC_APP_NAME: str(),
    NEXT_PUBLIC_API_URL: url()
  },
  {
    clientSafePrefixes: ["NEXT_PUBLIC_"]
  }
);

// Client-side access
if (typeof window !== "undefined") {
  console.log(env.NEXT_PUBLIC_API_URL); // ✅ Works
  console.log(env.DATABASE_URL); // ⚠️ undefined (protected)
}
```

See [Framework Integration](#framework-integration) for more details on client/server usage.

## Core Features

### Built-in Validators

zenvalidate provides 30+ validators for common environment variable formats:

| Category        | Validators                                         | Description                         |
| --------------- | -------------------------------------------------- | ----------------------------------- |
| **Basic**       | `str`, `num`, `bool`, `json`                       | Fundamental types with full options |
| **Network**     | `url`, `email`, `host`, `port`, `ipv4`, `ipv6`     | Network-related formats             |
| **Identifiers** | `uuid`, `cuid`, `cuid2`, `ulid`, `nanoid`, `ksuid` | Various ID formats                  |
| **Temporal**    | `datetime`, `isoDate`, `isoTime`, `isoDuration`    | Date and time formats               |
| **Encoding**    | `base64`, `base64url`, `jwt`                       | Encoded data formats                |

All validators share common options:

```typescript
interface BaseOptions<T> {
  default?: T; // Default value
  devDefault?: T; // Override for NODE_ENV=development
  testDefault?: T; // Override for NODE_ENV=test
  description?: string; // Documentation
  example?: string; // Example value
  client?: {
    expose: boolean; // Allow client access
    transform?: (v: T) => T; // Transform for client
  };
}
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
// env.LOG_LEVEL type: "debug" | "info"  | "warn" | "error"

// Optional variables with undefined defaults
const env = zenv({
  OPTIONAL_API_KEY: str({ default: undefined })
});
// env.OPTIONAL_API_KEY type: string | undefined

// Typed JSON parsing
interface Config {
  timeout: number;
  retries: number;
}
const env = zenv({
  SERVICE_CONFIG: json<Config>({
    default: { timeout: 5000, retries: 3 }
  })
});
// env.SERVICE_CONFIG - type Config

// Or the same thing with validated and typed JSON parsing
const configSchema = z.object({
  timeout: z.coerce.number().default(5000),
  retries: z.coerce.number().default(3),
});

const env = zenv({
  SERVICE_CONFIG: json({ schema: configSchema })
});
// env.SERVICE_CONFIG - z.infer<typeof configSchema>
```

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

Priority: `testDefault` > `devDefault` > `default` (based on NODE_ENV)

### Client/Server Separation

Automatic security boundaries for client/server frameworks:

```typescript
const env = zenv(
  {
    // Secure by default
    DATABASE_URL: url(), // Server-only
    SECRET_KEY: str(), // Server-only

    // Explicit exposure control
    API_HOST: str({
      client: {
        expose: true,
        transform: (host) => host.replace(".internal", ".public")
      }
    }),

    // Auto-exposed by clientSafePrefixes option below
    NEXT_PUBLIC_API_URL: url(), // Next.js public
    VITE_API_URL: url(), // Vite public
    PUBLIC_VERSION: str() // Generic public
  },
  {
    clientSafePrefixes: ["NEXT_PUBLIC_", "VITE_", "PUBLIC_"]
  }
);
```

## Framework Integration

### Next.js

```tsx
// env.ts
import { zenv, str, url, num } from "zenvalidate";

export const env = zenv({
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
  }),
  {
    clientSafePrefixes: ["NEXT_PUBLIC_"]
  }
});

// app/layout.tsx - Inject client-safe env during SSR
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

The above script writes client-safe values to `window.__ZENV_CLIENT__` under the hood
and then the `env` API will get the values from there when called on the client.

### Vite

```typescript
// env.ts
import { zenv, url, str } from "zenvalidate";

export const env = zenv({
    // Auto-exposed with clientSafePrefixes below
    VITE_API_URL: url(),
    VITE_APP_VERSION: str({ default: "1.0.0" }),

    // Server-only
    DATABASE_URL: url(),
    SESSION_SECRET: str()
  },
  {
    clientSafePrefixes: ["VITE_"]
  }
});

// vite.config.ts
import { defineConfig } from "vite";
import { env } from "./env";

export default defineConfig({
  define: {
    "import.meta.env": env
  }
});
```

### Node.js / Express

```typescript
import express from "express";
import { num, port, str, url, zenv } from "zenvalidate";

const env = zenv({
  // Server configuration
  HOST: str({ default: "0.0.0.0" }),
  PORT: port({ default: 3000 }),
  DATABASE_URL: url(),
  DATABASE_POOL_SIZE: num({ default: 10 }),

  // Redis cache
  REDIS_URL: url(),
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

// Simple custom validator
const semver = makeValidator<string>({
  validator: (value) => /^\d+\.\d+\.\d+$/.test(value),
  message: "Invalid semantic version",
  description: "Semantic version (e.g., 1.2.3)"
});

// Advanced validator with Zod
const mongoUri = makeValidator<string>({
  schema: z.string().url().startsWith("mongodb://"),
  description: "MongoDB connection string"
});

// Use in your schema
const env = zenv({
  APP_VERSION: semver({ devDefault: "0.0.0" }),
  MONGO_URL: mongoUri()
});
```

### Error Handling

Configure error behavior:

```typescript
const env = zenv(specs, {
  // Error handling strategies
  onError: "throw", // Throw exception (default on client)
  onError: "exit", // Exit process (default on server)
  onError: "return", // Log warnings and return invalid value

  // Client access errors
  onClientAccessError: "throw", // Throw on access (strict)
  onClientAccessError: "warn", // Console warning (default dev)
  onClientAccessError: "ignore", // Silent (default prod)

  // Validation options
  strict: true, // Prevent access to unvalidated vars
  env: customEnvSource // Use custom env source (testing), process.env by default
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

  // String patterns
  API_KEY: str({
    regex: /^sk-[a-zA-Z0-9]{48}$/,
    description: "Stripe secret key"
  }),

  // JSON with schema validation
  FEATURE_FLAGS: json({
    schema: z.object({
      newUI: z.boolean(),
      betaFeatures: z.boolean(),
      maxUploadSize: z.number().positive()
    }),
    default: {
      newUI: false,
      betaFeatures: false,
      maxUploadSize: 10485760
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

### Main Functions

#### `zenv(specs, options?)`

Validates environment variables against the provided schema.

```typescript
function zenv<T extends ValidatorSpecs>(specs: T, options?: ZenvOptions): CleanedEnv<InferZenvType<T>>;
```

**Parameters:**

- `specs` - Object mapping variable names to validators
- `options` - Optional configuration object

**Returns:** Validated environment object with TypeScript types

#### `getClientEnvScript(env)`

Generates JavaScript for client-side environment injection (SSR).

```typescript
function getClientEnvScript(env: CleanedEnv<any>): string;
```

### Types

#### `ZenvOptions`

```typescript
interface ZenvOptions {
  env?: NodeJS.ProcessEnv; // Custom env source
  onError?: "throw" | "exit" | "return";
  onClientAccessError?: "throw" | "warn" | "ignore";
  strict?: boolean; // Block unvalidated access
  reporter?: (errors: ValidationError[]) => void;
}
```

#### `CleanedEnv<T>`

Validated environment with helper properties:

```typescript
interface CleanedEnv<T> extends T {
  readonly isDev: boolean; // NODE_ENV === 'development'
  readonly isProd: boolean; // NODE_ENV === 'production'
  readonly isTest: boolean; // NODE_ENV === 'test'
}
```

### Validator Options

#### String Options

```typescript
interface StringOptions extends BaseOptions<string> {
  choices?: readonly string[]; // Allowed values
  min?: number; // Minimum length
  max?: number; // Maximum length
  regex?: RegExp; // Pattern match
  startsWith?: string;
  endsWith?: string;
}
```

#### Number Options

```typescript
interface NumberOptions extends BaseOptions<number> {
  choices?: readonly number[]; // Allowed values
  min?: number; // Minimum value
  max?: number; // Maximum value
  int?: boolean; // Integer only
  positive?: boolean; // Positive only
  negative?: boolean; // Negative only
}
```

#### URL Options

```typescript
interface UrlOptions extends BaseOptions<string> {
  protocol?: string | string[]; // Required protocol(s)
  hostname?: string | string[]; // Required hostname(s)
  port?: number | number[]; // Required port(s)
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

// cleanEnv -> zenv
// that's it!
const env = zenv({
  PORT: port({ default: 3000 }),
  NODE_ENV: str({ choices: ["development", "production", "test"] }),
  DEBUG: bool({ default: false })
});
// Similar API, better types, more validators
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
// Types are all guaranteed, validation is automatic
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
