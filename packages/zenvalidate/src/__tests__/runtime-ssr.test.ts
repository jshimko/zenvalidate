/**
 * @module runtime-ssr.test
 * @description Tests for SSR injection and runtime environment detection
 */
import { runtime } from "../runtime";

describe("SSR injection and environment detection", () => {
  it("should read from window.__ZENV_CLIENT__ when available in browser", () => {
    // This tests lines 201-202 in runtime.ts

    // Mock browser environment
    const originalWindow = global.window;
    const originalProcess = global.process;

    // Create mock window with __ZENV_CLIENT__ injected (as would happen in SSR)
    global.window = {
      __ZENV_CLIENT__: {
        NEXT_PUBLIC_API_URL: "https://api.example.com",
        NEXT_PUBLIC_APP_NAME: "TestApp",
        PUBLIC_VERSION: "1.2.3"
      }
    } as unknown as Window & typeof globalThis;

    // Remove process to simulate browser
    // @ts-expect-error - Testing browser environment
    delete global.process;

    // env getter should return the injected client env
    const env = runtime.env;

    expect(env).toEqual({
      NEXT_PUBLIC_API_URL: "https://api.example.com",
      NEXT_PUBLIC_APP_NAME: "TestApp",
      PUBLIC_VERSION: "1.2.3"
    });

    // Verify it's reading from window.__ZENV_CLIENT__ not process.env
    expect(env).toBe(global.window.__ZENV_CLIENT__);

    // Restore
    global.window = originalWindow;
    global.process = originalProcess;
  });

  it("should return empty object when in browser without SSR injection", () => {
    // This tests line 211 in runtime.ts

    const originalWindow = global.window;
    const originalProcess = global.process;

    // Mock browser environment WITHOUT __ZENV_CLIENT__
    global.window = {} as unknown as Window & typeof globalThis;

    // Remove process to simulate browser
    // @ts-expect-error - Testing browser environment
    delete global.process;

    // Should return empty object as fallback
    const env = runtime.env;

    expect(env).toEqual({});
    expect(typeof env).toBe("object");
    expect(Object.keys(env).length).toBe(0);

    // Restore
    global.window = originalWindow;
    global.process = originalProcess;
  });

  it("should return process.env when on server", () => {
    // Ensure we're in Node environment
    const testEnv = {
      NODE_ENV: "test",
      DATABASE_URL: "postgres://localhost:5432/test",
      SECRET_KEY: "test-secret"
    };

    const originalEnv = process.env;
    process.env = testEnv;

    const env = runtime.env;

    expect(env).toBe(process.env);
    expect(env.NODE_ENV).toBe("test");
    expect(env.DATABASE_URL).toBe("postgres://localhost:5432/test");

    process.env = originalEnv;
  });

  it("should handle transition from SSR to client hydration", () => {
    const originalWindow = global.window;
    const originalProcess = global.process;
    const originalEnv = process.env;

    // Stage 1: Server-side rendering
    process.env = {
      NEXT_PUBLIC_API: "https://api.server.com",
      SECRET_KEY: "server-secret"
    };

    let env = runtime.env;
    expect(env.NEXT_PUBLIC_API).toBe("https://api.server.com");
    expect(env.SECRET_KEY).toBe("server-secret");

    // Stage 2: Client hydration with injected env
    global.window = {
      __ZENV_CLIENT__: {
        NEXT_PUBLIC_API: "https://api.server.com"
        // Note: SECRET_KEY is not included (server-only)
      }
    } as unknown as Window & typeof globalThis;

    // Remove process for client
    // @ts-expect-error - Testing browser environment
    delete global.process;

    env = runtime.env;
    expect(env.NEXT_PUBLIC_API).toBe("https://api.server.com");
    expect(env.SECRET_KEY).toBeUndefined(); // Server-only, not in client

    // Restore
    global.window = originalWindow;
    global.process = originalProcess;
    process.env = originalEnv;
  });

  it("should handle various __ZENV_CLIENT__ data types", () => {
    const originalWindow = global.window;
    const originalProcess = global.process;

    // Test with different value types that might be injected
    global.window = {
      __ZENV_CLIENT__: {
        STRING_VAR: "text",
        NUMBER_VAR: "123", // Numbers are usually stringified in env
        BOOL_VAR: "true", // Booleans too
        JSON_VAR: '{"key":"value"}', // JSON as string
        EMPTY_VAR: "",
        // undefined values shouldn't be included, but test gracefully handles if present
        UNDEFINED_VAR: undefined
      }
    } as unknown as Window & typeof globalThis;

    // @ts-expect-error - Testing browser environment
    delete global.process;

    const env = runtime.env;

    expect(env.STRING_VAR).toBe("text");
    expect(env.NUMBER_VAR).toBe("123");
    expect(env.BOOL_VAR).toBe("true");
    expect(env.JSON_VAR).toBe('{"key":"value"}');
    expect(env.EMPTY_VAR).toBe("");
    expect(env.UNDEFINED_VAR).toBeUndefined();

    // Restore
    global.window = originalWindow;
    global.process = originalProcess;
  });

  it("should handle missing window object gracefully", () => {
    const originalWindow = global.window;
    const originalProcess = global.process;

    // Remove both window and process (edge case environment)
    // @ts-expect-error - Testing edge case
    delete global.window;
    // @ts-expect-error - Testing edge case
    delete global.process;

    // Should return empty object without throwing
    const env = runtime.env;

    expect(env).toEqual({});

    // Restore
    global.window = originalWindow;
    global.process = originalProcess;
  });

  it("should prioritize window.__ZENV_CLIENT__ over process.env if both exist", () => {
    const originalWindow = global.window;

    // Scenario: Node environment with jsdom or similar that has both
    global.window = {
      __ZENV_CLIENT__: {
        NEXT_PUBLIC_VAR: "from-window"
      }
    } as unknown as Window & typeof globalThis;

    process.env.NEXT_PUBLIC_VAR = "from-process";

    const env = runtime.env;

    // Should use window.__ZENV_CLIENT__ when it exists
    expect(env.NEXT_PUBLIC_VAR).toBe("from-window");

    // Restore
    global.window = originalWindow;
    delete process.env.NEXT_PUBLIC_VAR;
  });
});
