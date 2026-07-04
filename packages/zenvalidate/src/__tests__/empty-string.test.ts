/**
 * @module empty-string.test
 * @description Tests for empty-string handling (emptyStringAsMissing).
 * dotenv and docker compose render a bare `VAR=` line as "" — by default
 * zenv() treats that as unset so defaults apply and required variables
 * report as missing, instead of the empty string itself being validated.
 */
import { zenv } from "../core";
import { ZenvError } from "../errors";
import { bool, num, port, str, url } from "../validators";
import { suppressConsole } from "./test-utils";

describe("Empty-string handling (emptyStringAsMissing)", () => {
  let consoleMock: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    consoleMock = suppressConsole();
  });

  afterEach(() => {
    consoleMock.restore();
  });

  describe("default behavior (emptyStringAsMissing: true)", () => {
    it("applies defaults when the value is an empty string", () => {
      const env = zenv(
        {
          RETENTION: num({ min: 0, default: 30 }),
          FORMAT: str({ choices: ["json", "pretty"], default: "json" }),
          ENABLED: bool({ default: false }),
          PORT: port({ default: 3000 })
        },
        {
          env: { RETENTION: "", FORMAT: "", ENABLED: "", PORT: "" },
          onError: "throw"
        }
      );

      expect(env.RETENTION).toBe(30);
      expect(env.FORMAT).toBe("json");
      expect(env.ENABLED).toBe(false);
      expect(env.PORT).toBe(3000);
    });

    it("does NOT coerce num('') to 0", () => {
      const env = zenv({ DAYS: num({ default: 7 }) }, { env: { DAYS: "" }, onError: "throw" });
      expect(env.DAYS).toBe(7);
    });

    it("leaves optional variables undefined on empty string", () => {
      const env = zenv(
        {
          BROKER_URL: url({ default: undefined }),
          USERNAME: str({ default: undefined })
        },
        { env: { BROKER_URL: "", USERNAME: "" }, onError: "throw" }
      );

      expect(env.BROKER_URL).toBeUndefined();
      expect(env.USERNAME).toBeUndefined();
    });

    it("reports required variables as missing on empty string", () => {
      expect(() => {
        zenv({ REQUIRED_KEY: str() }, { env: { REQUIRED_KEY: "" }, onError: "throw" });
      }).toThrow(ZenvError);
    });

    it("still validates non-empty values normally", () => {
      const env = zenv(
        {
          DAYS: num({ default: 7 }),
          FORMAT: str({ choices: ["json", "pretty"], default: "json" })
        },
        { env: { DAYS: "14", FORMAT: "pretty" }, onError: "throw" }
      );

      expect(env.DAYS).toBe(14);
      expect(env.FORMAT).toBe("pretty");
    });

    it("does not treat whitespace-only values as missing", () => {
      // Only the exact empty string is the unset idiom; " " is a value (and
      // fails choices validation like any other bad value).
      expect(() => {
        zenv({ FORMAT: str({ choices: ["json", "pretty"], default: "json" }) }, { env: { FORMAT: " " }, onError: "throw" });
      }).toThrow(ZenvError);
    });
  });

  describe("opt-out (emptyStringAsMissing: false)", () => {
    it("validates the empty string itself", () => {
      const env = zenv({ PREFIX: str({ default: "dags" }) }, { env: { PREFIX: "" }, onError: "throw", emptyStringAsMissing: false });

      expect(env.PREFIX).toBe("");
    });

    it("restores the coercing legacy behavior for num('')", () => {
      const env = zenv({ DAYS: num({ default: 7 }) }, { env: { DAYS: "" }, onError: "throw", emptyStringAsMissing: false });
      expect(env.DAYS).toBe(0); // Number("") === 0
    });

    it("fails choices/url validation on empty string", () => {
      expect(() => {
        zenv(
          { FORMAT: str({ choices: ["json", "pretty"], default: "json" }) },
          { env: { FORMAT: "" }, onError: "throw", emptyStringAsMissing: false }
        );
      }).toThrow(ZenvError);

      expect(() => {
        zenv({ BROKER_URL: url({ default: undefined }) }, { env: { BROKER_URL: "" }, onError: "throw", emptyStringAsMissing: false });
      }).toThrow(ZenvError);
    });
  });
});
