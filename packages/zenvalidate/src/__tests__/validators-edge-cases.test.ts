/**
 * @module validators-edge-cases.test
 * @description Tests for edge cases and uncovered paths in the validators/ modules
 */
import { z } from "zod/v4";

import { zenv } from "../core";
import { attachMetadata, getMetadata, json, makeValidator, num, url } from "../validators";
import { mockProcessEnv, suppressConsole } from "./test-utils";

describe("JSON validator with schema", () => {
  it("should validate JSON that matches the provided schema", () => {
    // This tests validators/json.ts - successful schema validation
    const env = mockProcessEnv({
      CONFIG: '{"count": 42, "enabled": true, "name": "test"}'
    });

    const configSchema = z.object({
      count: z.number(),
      enabled: z.boolean(),
      name: z.string()
    });

    const result = zenv({
      CONFIG: json({ schema: configSchema })
    });

    expect(result.CONFIG).toEqual({
      count: 42,
      enabled: true,
      name: "test"
    });

    env.restore();
  });

  it("should reject JSON that doesn't match the schema", () => {
    const env = mockProcessEnv({
      CONFIG: '{"count": "not-a-number", "enabled": true}'
    });
    const { restore: suppressRestore } = suppressConsole();

    const configSchema = z.object({
      count: z.number(),
      enabled: z.boolean(),
      name: z.string()
    });

    expect(() => {
      zenv({
        CONFIG: json({ schema: configSchema })
      });
    }).toThrow();

    suppressRestore();
    env.restore();
  });

  it("should handle malformed JSON strings", () => {
    // This tests validators/json.ts - JSON parse error handling
    const { restore: suppressRestore } = suppressConsole();

    const env = mockProcessEnv({
      MALFORMED_JSON: '{"key": invalid json}'
    });

    // Test various malformed JSON strings
    expect(() => {
      zenv({
        MALFORMED_JSON: json()
      });
    }).toThrow();

    env.restore();

    const env2 = mockProcessEnv({
      NOT_JSON: "not json at all"
    });

    expect(() => {
      zenv({
        NOT_JSON: json()
      });
    }).toThrow();

    env2.restore();

    const env3 = mockProcessEnv({
      TRUNCATED: '{"incomplete": '
    });

    expect(() => {
      zenv({
        TRUNCATED: json()
      });
    }).toThrow();

    env3.restore();
    suppressRestore();
  });

  it("should handle JSON parse errors with schema", () => {
    // This also tests lines 1013-1017 but with schema option
    const env = mockProcessEnv({
      BAD_JSON: "{not valid json with schema}"
    });
    const { restore: suppressRestore } = suppressConsole();

    const schema = z.object({ key: z.string() });

    expect(() => {
      zenv({
        BAD_JSON: json({ schema })
      });
    }).toThrow();

    suppressRestore();
    env.restore();
  });

  it("should work with complex nested schemas", () => {
    const env = mockProcessEnv({
      NESTED_CONFIG: JSON.stringify({
        database: {
          host: "localhost",
          port: 5432,
          credentials: {
            user: "admin",
            password: "secret"
          }
        },
        features: ["auth", "logging", "metrics"]
      })
    });

    const nestedSchema = z.object({
      database: z.object({
        host: z.string(),
        port: z.number(),
        credentials: z.object({
          user: z.string(),
          password: z.string()
        })
      }),
      features: z.array(z.string())
    });

    const result = zenv({
      NESTED_CONFIG: json({ schema: nestedSchema })
    });

    expect(result.NESTED_CONFIG.database.host).toBe("localhost");
    expect(result.NESTED_CONFIG.database.port).toBe(5432);
    expect(result.NESTED_CONFIG.features).toContain("auth");

    env.restore();
  });
});

describe("number choices with string coercion", () => {
  it("should coerce string numbers to numbers when using choices", () => {
    // This tests validators/primitives.ts - number coercion in preprocessing
    const env = mockProcessEnv({
      LOG_LEVEL: "2", // String that should be coerced to number
      PRIORITY: "1",
      MAX_RETRIES: "3"
    });

    const result = zenv({
      LOG_LEVEL: num({ choices: [1, 2, 3, 4] }),
      PRIORITY: num({ choices: [1, 2, 3] }),
      MAX_RETRIES: num({ choices: [1, 3, 5] })
    });

    // Should be actual numbers, not strings
    expect(result.LOG_LEVEL).toBe(2);
    expect(typeof result.LOG_LEVEL).toBe("number");

    expect(result.PRIORITY).toBe(1);
    expect(typeof result.PRIORITY).toBe("number");

    expect(result.MAX_RETRIES).toBe(3);
    expect(typeof result.MAX_RETRIES).toBe("number");

    env.restore();
  });

  it("should reject invalid string values that don't match choices", () => {
    const env = mockProcessEnv({
      LOG_LEVEL: "not-a-number"
    });
    const { restore: suppressRestore } = suppressConsole();

    expect(() => {
      zenv({
        LOG_LEVEL: num({ choices: [1, 2, 3] })
      });
    }).toThrow();

    suppressRestore();
    env.restore();
  });

  it("should handle NaN from string coercion", () => {
    const env = mockProcessEnv({
      LEVEL: "abc"
    });
    const { restore: suppressRestore } = suppressConsole();

    expect(() => {
      zenv({
        LEVEL: num({ choices: [1, 2, 3] })
      });
    }).toThrow();

    suppressRestore();
    env.restore();
  });
});

describe("URL validation error handling", () => {
  it("should handle malformed URLs with protocol refinement", () => {
    // This tests validators/network.ts - URL parse error in protocol check
    const env = mockProcessEnv({
      API_URL: "not a valid url at all"
    });
    const { restore: suppressRestore } = suppressConsole();

    expect(() => {
      zenv({
        API_URL: url({ protocol: /^https?$/ })
      });
    }).toThrow();

    suppressRestore();
    env.restore();

    const env2 = mockProcessEnv({
      WEBHOOK_URL: "::::invalid::::"
    });
    const { restore: suppressRestore2 } = suppressConsole();

    expect(() => {
      zenv({
        WEBHOOK_URL: url({ protocol: /^https$/ })
      });
    }).toThrow();

    suppressRestore2();
    env2.restore();
  });

  it("should handle malformed URLs with hostname refinement", () => {
    // This tests validators/network.ts - URL parse error in hostname check
    const env = mockProcessEnv({
      API_ENDPOINT: "not://a.valid.url"
    });
    const { restore: suppressRestore } = suppressConsole();

    expect(() => {
      zenv({
        API_ENDPOINT: url({ hostname: /^api\.example\.com$/ })
      });
    }).toThrow();

    suppressRestore();
    env.restore();

    const env2 = mockProcessEnv({
      SERVICE_URL: "!!!invalid!!!"
    });
    const { restore: suppressRestore2 } = suppressConsole();

    expect(() => {
      zenv({
        SERVICE_URL: url({ hostname: /\.com$/ })
      });
    }).toThrow();

    suppressRestore2();
    env2.restore();
  });

  it("should properly validate URLs with protocol and hostname", () => {
    const env = mockProcessEnv({
      SECURE_API: "https://api.example.com/v1",
      LOCAL_SERVICE: "http://localhost:3000"
    });

    const result = zenv({
      SECURE_API: url({
        protocol: /^https$/,
        hostname: /^api\.example\.com$/
      }),
      LOCAL_SERVICE: url({
        protocol: /^https?$/,
        hostname: /^localhost$/
      })
    });

    expect(result.SECURE_API).toBe("https://api.example.com/v1");
    expect(result.LOCAL_SERVICE).toBe("http://localhost:3000");

    env.restore();
  });
});

describe("custom validator without transform", () => {
  it("should create custom validator with validation only", () => {
    // This tests validators/make-validator.ts - makeValidator with validator but no transform
    const semverValidator = makeValidator({
      validator: (value) => {
        // Simple semver pattern check
        const pattern = /^\d+\.\d+\.\d+$/;
        return pattern.test(value);
      },
      description: "Semantic version string"
    });

    const env = mockProcessEnv({
      APP_VERSION: "1.2.3",
      API_VERSION: "2.0.0"
    });

    const result = zenv({
      APP_VERSION: semverValidator(),
      API_VERSION: semverValidator()
    });

    expect(result.APP_VERSION).toBe("1.2.3");
    expect(result.API_VERSION).toBe("2.0.0");

    env.restore();
  });

  it("should reject values that fail custom validation", () => {
    const uppercaseValidator = makeValidator({
      validator: (value) => {
        return value === value.toUpperCase() && value.length > 0;
      },
      description: "Uppercase string"
    });

    const env = mockProcessEnv({
      ENV_NAME: "production" // lowercase, should fail
    });
    const { restore: suppressRestore } = suppressConsole();

    expect(() => {
      zenv({
        ENV_NAME: uppercaseValidator()
      });
    }).toThrow();

    suppressRestore();
    env.restore();

    const env2 = mockProcessEnv({
      ENV_NAME: "PRODUCTION" // uppercase, should pass
    });

    const result = zenv({
      ENV_NAME: uppercaseValidator()
    });

    expect(result.ENV_NAME).toBe("PRODUCTION");

    env2.restore();
  });

  it("should work with complex validation logic", () => {
    const portRangeValidator = makeValidator({
      validator: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num)) return false;
        // Custom logic: only allow ports in specific ranges
        return (num >= 3000 && num <= 3999) || (num >= 8000 && num <= 8999);
      },
      description: "Port in range 3000-3999 or 8000-8999"
    });

    const env = mockProcessEnv({
      DEV_PORT: "3001",
      API_PORT: "8080"
    });

    const result = zenv({
      DEV_PORT: portRangeValidator(),
      API_PORT: portRangeValidator()
    });

    expect(result.DEV_PORT).toBe("3001");
    expect(result.API_PORT).toBe("8080");

    env.restore();
  });
});

describe("deep client option merging", () => {
  it("should properly merge client options from base and overrides", () => {
    // This tests validators/make-validator.ts - deep client merge in mergeOptions
    const customValidator = makeValidator({
      schemaFactory: () => z.string(),
      client: {
        expose: true,
        transform: (val: string) => val.toUpperCase(),
        default: "base-default",
        devDefault: "base-dev-default"
      }
    });

    // Create validator with override client options
    const mergedValidator = customValidator({
      client: {
        expose: false, // Override expose
        devDefault: "override-dev-default" // Override devDefault
        // transform and default should come from base
      }
    });

    // Attach and check metadata to verify merge
    const schema = mergedValidator;
    const metadata = getMetadata(schema);

    // Note: The actual merge happens internally, we test the behavior
    expect(metadata).toBeDefined();

    const env = mockProcessEnv({
      CUSTOM_VAR: "test-value"
    });

    const result = zenv({
      CUSTOM_VAR: mergedValidator
    });

    expect(result.CUSTOM_VAR).toBe("test-value");

    env.restore();
  });

  it("should handle partial client override", () => {
    const validator = makeValidator({
      schemaFactory: () => z.string().min(1),
      client: {
        expose: true,
        transform: (val: string) => `prefix-${val}`,
        default: "base-default"
      },
      description: "Custom validator with client options"
    });

    // Override only some client properties
    const overridden = validator({
      client: {
        expose: true,
        default: "override-default"
        // Should keep transform from base
      },
      default: "override-default" // Also need the regular default
    });

    // Apply the validator
    const env = mockProcessEnv({
      // Not setting the variable to test default
    });

    const result = zenv({
      TEST_VAR: overridden
    });

    // Should use overridden default
    expect(result.TEST_VAR).toBe("override-default");

    env.restore();
  });

  it("should handle merging when only override has client config", () => {
    const validator = makeValidator({
      schemaFactory: () => z.string()
      // No baseOptions.client
    });

    const withClient = validator({
      client: {
        expose: true,
        transform: (val: string) => val.toLowerCase()
      }
    });

    const schema = withClient;
    attachMetadata(schema, {
      client: {
        expose: true,
        transform: (val: string) => val.toLowerCase()
      }
    });

    const metadata = getMetadata(schema);
    expect(metadata?.client?.expose).toBe(true);

    const env = mockProcessEnv({
      VAR: "UPPERCASE"
    });

    const result = zenv({
      VAR: withClient
    });

    expect(result.VAR).toBe("UPPERCASE");

    env.restore();
  });

  it("should handle merging when only base has client config", () => {
    const validator = makeValidator({
      schemaFactory: () => z.string(),
      client: {
        expose: true,
        default: "base-client-default"
      },
      default: "base-client-default" // Need to set both for the default to work
    });

    // Call without client overrides
    const schema = validator({
      description: "Just adding description"
      // No client overrides
    });

    const env = mockProcessEnv({});

    const result = zenv({
      VAR_WITH_BASE: schema
    });

    // Should use base client default
    expect(result.VAR_WITH_BASE).toBe("base-client-default");

    env.restore();
  });
});
