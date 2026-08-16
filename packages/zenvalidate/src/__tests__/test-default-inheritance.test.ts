import { makeValidator, str, zenv } from "../index";

describe("testDefault inherits devDefault", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should apply devDefault in test when testDefault is not set", () => {
    process.env = { NODE_ENV: "test" };

    const env = zenv(
      {
        API_URL: str({ devDefault: "http://localhost:3000" })
      },
      { onError: "throw" }
    );

    expect(env.API_URL).toBe("http://localhost:3000");
  });

  it("should prefer devDefault over default in test when testDefault is not set", () => {
    process.env = { NODE_ENV: "test" };

    const env = zenv(
      {
        LOG_LEVEL: str({
          default: "info",
          devDefault: "debug"
        })
      },
      { onError: "throw" }
    );

    expect(env.LOG_LEVEL).toBe("debug");
  });

  it("should prefer testDefault over devDefault in test when both are set", () => {
    process.env = { NODE_ENV: "test" };

    const env = zenv(
      {
        LOG_LEVEL: str({
          devDefault: "debug",
          testDefault: "error"
        })
      },
      { onError: "throw" }
    );

    expect(env.LOG_LEVEL).toBe("error");
  });

  it("should make variable optional in test when explicit testDefault: undefined overrides devDefault", () => {
    process.env = { NODE_ENV: "test" };

    const env = zenv(
      {
        OPTIONAL_IN_TEST: str({
          devDefault: "dev-value",
          testDefault: undefined
        })
      },
      { onError: "throw" }
    );

    expect(env.OPTIONAL_IN_TEST).toBe(undefined);
  });

  it("should make variable optional in test when only devDefault: undefined is set", () => {
    process.env = { NODE_ENV: "test" };

    const env = zenv(
      {
        OPTIONAL_VAR: str({ devDefault: undefined })
      },
      { onError: "throw" }
    );

    expect(env.OPTIONAL_VAR).toBe(undefined);
  });

  it("should prefer an actual env value over inherited devDefault in test", () => {
    process.env = { NODE_ENV: "test", API_URL: "http://actual:4000" };

    const env = zenv(
      {
        API_URL: str({ devDefault: "http://localhost:3000" })
      },
      { onError: "throw" }
    );

    expect(env.API_URL).toBe("http://actual:4000");
  });

  it("should still require variable in production when only devDefault is set", () => {
    process.env = { NODE_ENV: "production" };

    expect(() => {
      zenv(
        {
          REQUIRED_VAR: str({ devDefault: "dev-value" })
        },
        { onError: "throw" }
      );
    }).toThrow("Environment validation failed");
  });

  it("should not consult testDefault in development", () => {
    process.env = { NODE_ENV: "development" };

    const env = zenv(
      {
        LOG_LEVEL: str({
          default: "info",
          testDefault: "error"
        })
      },
      { onError: "throw" }
    );

    expect(env.LOG_LEVEL).toBe("info");
  });

  it("should apply inherited devDefault to a choices validator in test", () => {
    process.env = { NODE_ENV: "test" };

    const env = zenv(
      {
        LOG_LEVEL: str({
          choices: ["debug", "info", "warn", "error"],
          devDefault: "debug"
        })
      },
      { onError: "throw" }
    );

    expect(env.LOG_LEVEL).toBe("debug");
  });

  it("should apply inherited devDefault when the env value is an empty string in test", () => {
    process.env = { NODE_ENV: "test", API_URL: "" };

    const env = zenv(
      {
        API_URL: str({ devDefault: "http://localhost:3000" })
      },
      { onError: "throw" }
    );

    expect(env.API_URL).toBe("http://localhost:3000");
  });

  it("should apply inherited devDefault to a custom makeValidator validator in test", () => {
    process.env = { NODE_ENV: "test" };

    const semver = makeValidator({
      validator: (input) => /^\d+\.\d+\.\d+$/.test(input),
      description: "Semantic version"
    });

    const env = zenv(
      {
        APP_VERSION: semver({ devDefault: "1.2.3" })
      },
      { onError: "throw" }
    );

    expect(env.APP_VERSION).toBe("1.2.3");
  });
});
