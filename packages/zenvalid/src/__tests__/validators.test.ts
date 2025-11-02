/**
 * @module validators.test
 * @description Comprehensive tests for all 26 validators in `zenvalid`
 */
import { z } from "zod/v4";

import {
  base64,
  base64url,
  bool,
  cuid,
  cuid2,
  datetime,
  email,
  getMetadata,
  guid,
  host,
  ipv4,
  ipv6,
  isoDate,
  isoDuration,
  isoTime,
  json,
  jwt,
  ksuid,
  makeValidator,
  nanoid,
  num,
  port,
  str,
  ulid,
  url,
  uuid,
  xid
} from "../validators";
import { createMockEnv, expectValidationError, mockProcessEnv, suppressConsole, testData } from "./test-utils";

describe("Validators Module", () => {
  let envMock: ReturnType<typeof mockProcessEnv>;
  let consoleMock: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    envMock = mockProcessEnv(createMockEnv());
    consoleMock = suppressConsole();
  });

  afterEach(() => {
    envMock.restore();
    consoleMock.restore();
  });

  describe("str() - String Validator", () => {
    it("should validate string inputs", () => {
      const schema = str();
      expect(schema.parse("hello")).toBe("hello");
      expect(schema.parse("")).toBe("");
      expect(schema.parse("with spaces")).toBe("with spaces");
      expect(schema.parse("123")).toBe("123");
    });

    it("should reject non-string inputs", () => {
      const schema = str();
      expectValidationError(() => schema.parse(123));
      expectValidationError(() => schema.parse(true));
      expectValidationError(() => schema.parse(null));
      expectValidationError(() => schema.parse(undefined));
      expectValidationError(() => schema.parse({}));
    });

    it("should enforce min length constraint", () => {
      const schema = str({ min: 3 });
      expect(schema.parse("abc")).toBe("abc");
      expect(schema.parse("abcd")).toBe("abcd");
      expectValidationError(() => schema.parse("ab"));
      expectValidationError(() => schema.parse(""));
    });

    it("should enforce max length constraint", () => {
      const schema = str({ max: 5 });
      expect(schema.parse("hello")).toBe("hello");
      expect(schema.parse("hi")).toBe("hi");
      expectValidationError(() => schema.parse("toolong"));
    });

    it("should validate against regex", () => {
      const schema = str({ regex: /^[A-Z]+$/ });
      expect(schema.parse("HELLO")).toBe("HELLO");
      expectValidationError(() => schema.parse("hello"));
      expectValidationError(() => schema.parse("Hello"));
    });

    it("should validate enum choices", () => {
      const schema = str({ choices: ["dev", "prod", "test"] });
      expect(schema.parse("dev")).toBe("dev");
      expect(schema.parse("prod")).toBe("prod");
      expect(schema.parse("test")).toBe("test");
      expectValidationError(() => schema.parse("staging"));
    });

    it("should apply default value when input is undefined", () => {
      const schema = str({ default: "default-value" });
      expect(schema.parse(undefined)).toBe("default-value");
      expect(schema.parse("custom")).toBe("custom");
    });

    it("should apply environment-specific defaults", () => {
      // Test environment (current)
      const schema1 = str({
        default: "prod-default",
        devDefault: "dev-default",
        testDefault: "test-default"
      });
      expect(schema1.parse(undefined)).toBe("test-default");

      // Mock development environment
      envMock.restore();
      envMock = mockProcessEnv({ NODE_ENV: "development" });
      const schema2 = str({
        default: "prod-default",
        devDefault: "dev-default",
        testDefault: "test-default"
      });
      expect(schema2.parse(undefined)).toBe("dev-default");

      // Mock production environment
      envMock.restore();
      envMock = mockProcessEnv({ NODE_ENV: "production" });
      const schema3 = str({
        default: "prod-default",
        devDefault: "dev-default",
        testDefault: "test-default"
      });
      expect(schema3.parse(undefined)).toBe("prod-default");
    });

    it("should attach metadata via WeakMap", () => {
      const schema = str({
        client: {
          expose: true,
          transform: (val: string) => val.toUpperCase(),
          default: "client-default"
        }
      });

      const metadata = getMetadata(schema);
      expect(metadata).toBeDefined();
      expect(metadata?.client?.expose).toBe(true);
      expect(metadata?.client?.transform).toBeDefined();
      expect(metadata?.client?.default).toBe("client-default");
    });
  });

  describe("num() - Number Validator", () => {
    it("should validate number inputs", () => {
      const schema = num();
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(42)).toBe(42);
      expect(schema.parse(-42)).toBe(-42);
      expect(schema.parse(3.14)).toBe(3.14);
    });

    it("should coerce string numbers", () => {
      const schema = num();
      expect(schema.parse("42")).toBe(42);
      expect(schema.parse("3.14")).toBe(3.14);
      expect(schema.parse("-42")).toBe(-42);
    });

    it("should reject invalid string numbers", () => {
      const schema = num();
      expectValidationError(() => schema.parse("not a number"));
      expectValidationError(() => schema.parse("123abc"));
      expectValidationError(() => schema.parse(""));
    });

    it("should reject non-numeric types", () => {
      const schema = num();
      expectValidationError(() => schema.parse(true));
      expectValidationError(() => schema.parse(null));
      expectValidationError(() => schema.parse(undefined));
      expectValidationError(() => schema.parse({}));
    });

    it("should enforce min constraint", () => {
      const schema = num({ min: 10 });
      expect(schema.parse(10)).toBe(10);
      expect(schema.parse(20)).toBe(20);
      expectValidationError(() => schema.parse(9));
      expectValidationError(() => schema.parse(0));
    });

    it("should enforce max constraint", () => {
      const schema = num({ max: 100 });
      expect(schema.parse(100)).toBe(100);
      expect(schema.parse(50)).toBe(50);
      expectValidationError(() => schema.parse(101));
      expectValidationError(() => schema.parse(200));
    });

    it("should enforce int constraint", () => {
      const schema = num({ int: true });
      expect(schema.parse(42)).toBe(42);
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(-10)).toBe(-10);
      expectValidationError(() => schema.parse(3.14));
      expectValidationError(() => schema.parse(0.5));
    });

    it("should enforce positive constraint", () => {
      const schema = num({ positive: true });
      expect(schema.parse(1)).toBe(1);
      expect(schema.parse(100)).toBe(100);
      expectValidationError(() => schema.parse(0));
      expectValidationError(() => schema.parse(-1));
    });

    it("should enforce negative constraint", () => {
      const schema = num({ negative: true });
      expect(schema.parse(-1)).toBe(-1);
      expect(schema.parse(-100)).toBe(-100);
      expectValidationError(() => schema.parse(0));
      expectValidationError(() => schema.parse(1));
    });

    it("should apply defaults and attach metadata", () => {
      const schema = num({
        default: 42,
        client: { expose: true }
      });

      expect(schema.parse(undefined)).toBe(42);
      const metadata = getMetadata(schema);
      expect(metadata?.client?.expose).toBe(true);
    });
  });

  describe("bool() - Boolean Validator (Union-based)", () => {
    it("should validate native boolean values", () => {
      const schema = bool();
      expect(schema.parse(true)).toBe(true);
      expect(schema.parse(false)).toBe(false);
    });

    it("should parse boolean string literals precisely", () => {
      const schema = bool();
      // True values
      expect(schema.parse("true")).toBe(true);
      expect(schema.parse("1")).toBe(true);
      expect(schema.parse("yes")).toBe(true);
      expect(schema.parse("on")).toBe(true);

      // False values
      expect(schema.parse("false")).toBe(false);
      expect(schema.parse("0")).toBe(false);
      expect(schema.parse("no")).toBe(false);
      expect(schema.parse("off")).toBe(false);
    });

    it("should handle case-insensitive boolean strings", () => {
      const schema = bool();
      expect(schema.parse("TRUE")).toBe(true);
      expect(schema.parse("True")).toBe(true);
      expect(schema.parse("FALSE")).toBe(false);
      expect(schema.parse("False")).toBe(false);
      expect(schema.parse("YES")).toBe(true);
      expect(schema.parse("NO")).toBe(false);
    });

    it("should reject invalid boolean strings", () => {
      const schema = bool();
      expectValidationError(() => schema.parse("maybe"));
      expectValidationError(() => schema.parse("2"));
      expectValidationError(() => schema.parse(""));
      expectValidationError(() => schema.parse("yep"));
      expectValidationError(() => schema.parse("nope"));
    });

    it("should reject non-boolean/string types", () => {
      const schema = bool();
      expectValidationError(() => schema.parse(1));
      expectValidationError(() => schema.parse(0));
      expectValidationError(() => schema.parse(null));
      expectValidationError(() => schema.parse(undefined));
      expectValidationError(() => schema.parse({}));
    });

    it("should apply defaults and metadata", () => {
      const schema = bool({
        default: true,
        client: { expose: false }
      });

      expect(schema.parse(undefined)).toBe(true);
      const metadata = getMetadata(schema);
      expect(metadata?.client?.expose).toBe(false);
    });
  });

  describe("email() - Email Validator (Zod v4 built-in)", () => {
    it("should validate valid email addresses", () => {
      const schema = email();
      testData.valid.emails.forEach((emailAddr) => {
        expect(schema.parse(emailAddr)).toBe(emailAddr);
      });
    });

    it("should reject invalid email addresses", () => {
      const schema = email();
      testData.invalid.emails.forEach((emailAddr) => {
        expectValidationError(() => schema.parse(emailAddr));
      });
    });

    it("should accept custom regex override", () => {
      const schema = email({ regex: /^[a-z]+@example\.com$/ });
      expect(schema.parse("test@example.com")).toBe("test@example.com");
      expectValidationError(() => schema.parse("Test@example.com")); // Capital letter
      expectValidationError(() => schema.parse("test@other.com")); // Wrong domain
    });

    it("should apply defaults and metadata", () => {
      const schema = email({
        default: "default@example.com",
        client: { expose: true }
      });

      expect(schema.parse(undefined)).toBe("default@example.com");
      const metadata = getMetadata(schema);
      expect(metadata?.client?.expose).toBe(true);
    });
  });

  describe("url() - URL Validator (Zod v4 built-in)", () => {
    it("should validate valid URLs", () => {
      const schema = url();
      testData.valid.urls.forEach((urlStr) => {
        expect(schema.parse(urlStr)).toBe(urlStr);
      });
    });

    it("should reject invalid URLs", () => {
      const schema = url();
      testData.invalid.urls.forEach((urlStr) => {
        expectValidationError(() => schema.parse(urlStr));
      });
    });

    it("should filter by protocol with string", () => {
      const schema = url({ protocol: "https" });
      expect(schema.parse("https://example.com")).toBe("https://example.com");
      expectValidationError(() => schema.parse("http://example.com"));
      expectValidationError(() => schema.parse("example.com"));
      expectValidationError(() => schema.parse("wss://example.com"));
      expectValidationError(() => schema.parse("ws://example.com"));
    });

    it("should filter by protocol with regex", () => {
      const schema = url({ protocol: /^https$/ });
      expect(schema.parse("https://example.com")).toBe("https://example.com");
      expectValidationError(() => schema.parse("http://example.com"));
      expectValidationError(() => schema.parse("example.com"));
      expectValidationError(() => schema.parse("wss://example.com"));
      expectValidationError(() => schema.parse("ws://example.com"));
    });

    it("should filter by hostname with regex", () => {
      const schema = url({ hostname: /^api\./ });
      expect(schema.parse("https://api.example.com")).toBe("https://api.example.com");
      expectValidationError(() => schema.parse("https://www.example.com"));
    });
  });

  describe("host() - Host Validator", () => {
    it("should validate valid hostnames", () => {
      const schema = host();
      testData.valid.hosts.forEach((hostname) => {
        expect(schema.parse(hostname)).toBe(hostname);
      });
    });

    it("should reject invalid hostnames", () => {
      const schema = host();
      testData.invalid.hosts.forEach((hostname) => {
        expectValidationError(() => schema.parse(hostname));
      });
    });

    it("should handle IP address options", () => {
      const noIpSchema = host({ allowIP: false });
      expectValidationError(() => noIpSchema.parse("192.168.1.1"));
      expectValidationError(() => noIpSchema.parse("::1"));

      const ipv4OnlySchema = host({ ipv4Only: true });
      expect(ipv4OnlySchema.parse("192.168.1.1")).toBe("192.168.1.1");
      expectValidationError(() => ipv4OnlySchema.parse("::1"));

      const ipv6OnlySchema = host({ ipv6Only: true });
      expect(ipv6OnlySchema.parse("::1")).toBe("::1");
      expectValidationError(() => ipv6OnlySchema.parse("192.168.1.1"));
    });
  });

  describe("port() - Port Validator", () => {
    it("should validate valid port numbers", () => {
      const schema = port();
      testData.valid.ports.forEach((portNum) => {
        expect(schema.parse(portNum)).toBe(portNum);
      });
    });

    it("should coerce string ports", () => {
      const schema = port();
      expect(schema.parse("80")).toBe(80);
      expect(schema.parse("3000")).toBe(3000);
    });

    it("should reject invalid ports", () => {
      const schema = port();
      testData.invalid.ports.forEach((portNum) => {
        expectValidationError(() => schema.parse(portNum));
      });
    });

    it("should respect custom min/max", () => {
      const schema = port({ min: 8000, max: 9000 });
      expect(schema.parse(8080)).toBe(8080);
      expectValidationError(() => schema.parse(80));
      expectValidationError(() => schema.parse(10000));
    });
  });

  describe("json() - JSON Validator", () => {
    it("should parse valid JSON strings", () => {
      const schema = json();
      expect(schema.parse('{"key":"value"}')).toEqual({ key: "value" });
      expect(schema.parse("[1,2,3]")).toEqual([1, 2, 3]);
      expect(schema.parse("null")).toBe(null);
      expect(schema.parse("true")).toBe(true);
      expect(schema.parse("42")).toBe(42);
      expect(schema.parse('"string"')).toBe("string");
    });

    it("should reject invalid JSON", () => {
      const schema = json();
      expectValidationError(() => schema.parse("{invalid}"));
      expectValidationError(() => schema.parse("undefined"));
      expectValidationError(() => schema.parse("{'single':'quotes'}"));
    });

    it("should validate against Zod schema", () => {
      const innerSchema = str();
      const schema = json({ schema: innerSchema });
      expect(schema.parse('"hello"')).toBe("hello");
      expectValidationError(() => schema.parse("123"));
      expectValidationError(() => schema.parse("true"));
    });
  });

  describe("makeValidator() - Custom Validator Factory", () => {
    it("should create custom validator with simple function", () => {
      const hexColor = makeValidator({
        validator: (val: unknown) => {
          if (typeof val !== "string") return false;
          return /^#[0-9A-Fa-f]{6}$/.test(val);
        }
      });

      const schema = hexColor();
      expect(schema.parse("#FF0000")).toBe("#FF0000");
      expectValidationError(() => schema.parse("red"));
      expectValidationError(() => schema.parse("#GG0000"));
    });

    it("should support transform functions", () => {
      const upperCase = makeValidator({
        transform: (val: unknown) => {
          if (typeof val !== "string") throw new Error("Not a string");
          return val.toUpperCase();
        }
      });

      const schema = upperCase();
      expect(schema.parse("hello")).toBe("HELLO");
    });

    it("should support schema factory", () => {
      const semver = makeValidator({
        schemaFactory: () => z.string().regex(/^\d+\.\d+\.\d+$/)
      });

      const schema = semver();
      expect(schema.parse("1.2.3")).toBe("1.2.3");
      expectValidationError(() => schema.parse("1.2"));
    });
  });

  describe("uuid() - UUID Validator", () => {
    it("should validate valid UUIDs", () => {
      const schema = uuid();
      testData.valid.uuids.forEach((uuidStr) => {
        expect(schema.parse(uuidStr)).toBe(uuidStr);
      });
    });

    it("should reject invalid UUIDs", () => {
      const schema = uuid();
      testData.invalid.uuids.forEach((uuidStr) => {
        expectValidationError(() => schema.parse(uuidStr));
      });
    });

    it("should validate specific UUID versions", () => {
      const v4Schema = uuid({ version: "v4" });
      expect(v4Schema.parse("123e4567-e89b-42d3-a456-426614174000")).toBeTruthy();

      // Note: Zod's uuid validation doesn't strictly validate version format
      // so we can't test rejection of other versions
    });
  });

  describe("ipv4() - IPv4 Validator", () => {
    it("should validate valid IPv4 addresses", () => {
      const schema = ipv4();
      testData.valid.ipv4s.forEach((ip) => {
        expect(schema.parse(ip)).toBe(ip);
      });
    });

    it("should reject invalid IPv4 addresses", () => {
      const schema = ipv4();
      testData.invalid.ipv4s.forEach((ip) => {
        expectValidationError(() => schema.parse(ip));
      });
    });
  });

  describe("ipv6() - IPv6 Validator", () => {
    it("should validate valid IPv6 addresses", () => {
      const schema = ipv6();
      testData.valid.ipv6s.forEach((ip) => {
        expect(schema.parse(ip)).toBe(ip);
      });
    });

    it("should reject invalid IPv6 addresses", () => {
      const schema = ipv6();
      testData.invalid.ipv6s.forEach((ip) => {
        expectValidationError(() => schema.parse(ip));
      });
    });
  });

  describe("datetime() - ISO DateTime Validator", () => {
    it("should validate ISO datetime strings", () => {
      const schema = datetime();
      const validDates = ["2024-01-01T00:00:00Z", "2024-12-31T23:59:59.999Z"];
      validDates.forEach((dateStr) => {
        expect(schema.parse(dateStr)).toBe(dateStr);
      });

      // With offset requires offset: true option
      const offsetSchema = datetime({ offset: true });
      expect(offsetSchema.parse("2024-06-15T14:30:00+02:00")).toBe("2024-06-15T14:30:00+02:00");
      expect(offsetSchema.parse("2024-06-15T14:30:00-05:00")).toBe("2024-06-15T14:30:00-05:00");
    });

    it("should handle offset and precision options", () => {
      const offsetSchema = datetime({ offset: true });
      expect(offsetSchema.parse("2024-01-01T00:00:00+00:00")).toBeTruthy();

      const localSchema = datetime({ local: true });
      expect(localSchema.parse("2024-01-01T00:00:00")).toBeTruthy();

      const precisionSchema = datetime({ precision: 3 });
      expect(precisionSchema.parse("2024-01-01T00:00:00.123Z")).toBeTruthy();
    });
  });

  describe("isoDate() - ISO Date Validator", () => {
    it("should validate ISO date strings", () => {
      const schema = isoDate();
      expect(schema.parse("2024-01-01")).toBe("2024-01-01");
      expect(schema.parse("2024-12-31")).toBe("2024-12-31");
      expectValidationError(() => schema.parse("01-01-2024"));
      expectValidationError(() => schema.parse("2024-1-1"));
    });
  });

  describe("isoTime() - ISO Time Validator", () => {
    it("should validate ISO time strings", () => {
      const schema = isoTime();
      expect(schema.parse("00:00:00")).toBe("00:00:00");
      expect(schema.parse("23:59:59")).toBe("23:59:59");
      expect(schema.parse("14:30:00.123")).toBe("14:30:00.123");
    });

    it("should handle precision option", () => {
      const schema = isoTime({ precision: 3 });
      expect(schema.parse("14:30:00.123")).toBe("14:30:00.123");
    });
  });

  describe("isoDuration() - ISO Duration Validator", () => {
    it("should validate ISO duration strings", () => {
      const schema = isoDuration();
      expect(schema.parse("P1Y")).toBe("P1Y");
      expect(schema.parse("P1M")).toBe("P1M");
      expect(schema.parse("P1D")).toBe("P1D");
      expect(schema.parse("PT1H")).toBe("PT1H");
      expect(schema.parse("PT1M")).toBe("PT1M");
      expect(schema.parse("PT1S")).toBe("PT1S");
      expect(schema.parse("P1Y2M3DT4H5M6S")).toBe("P1Y2M3DT4H5M6S");
    });
  });

  describe("base64() - Base64 Validator", () => {
    it("should validate valid base64 strings", () => {
      const schema = base64();
      testData.valid.base64.forEach((b64) => {
        expect(schema.parse(b64)).toBe(b64);
      });
    });

    it("should reject invalid base64 strings", () => {
      const schema = base64();
      testData.invalid.base64.forEach((b64) => {
        expectValidationError(() => schema.parse(b64));
      });
    });
  });

  describe("base64url() - Base64URL Validator", () => {
    it("should validate URL-safe base64 strings", () => {
      const schema = base64url();
      const validBase64Url = ["SGVsbG8gV29ybGQ", "VGVzdA", "Zm9vYmFy"];
      validBase64Url.forEach((b64) => {
        expect(schema.parse(b64)).toBe(b64);
      });
    });
  });

  describe("jwt() - JWT Validator", () => {
    it("should validate valid JWT tokens", () => {
      const schema = jwt();
      testData.valid.jwts.forEach((token) => {
        expect(schema.parse(token)).toBe(token);
      });
    });

    it("should reject invalid JWT tokens", () => {
      const schema = jwt();
      testData.invalid.jwts.forEach((token) => {
        expectValidationError(() => schema.parse(token));
      });
    });

    it("should accept algorithm option", () => {
      const schema = jwt({ alg: "HS256" });
      // Note: Zod's jwt validator doesn't actually validate the algorithm
      // It's more for documentation purposes
      expect(schema.parse(testData.valid.jwts[0])).toBe(testData.valid.jwts[0]);
    });
  });

  describe("ID Format Validators", () => {
    it("should validate CUID", () => {
      const schema = cuid();
      expect(schema.parse("clh3sa0iq0000qm0g7kqg5d9w")).toBeTruthy();
    });

    it("should validate CUID2", () => {
      const schema = cuid2();
      expect(schema.parse("tz4a98xxat96iws9zxvlmxz")).toBeTruthy();
    });

    it("should validate ULID", () => {
      const schema = ulid();
      expect(schema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBeTruthy();
    });

    it("should validate Nano ID", () => {
      const schema = nanoid();
      expect(schema.parse("V1StGXR8_Z5jdHi6B-myT")).toBeTruthy();
    });

    it("should validate GUID", () => {
      const schema = guid();
      expect(schema.parse("550e8400-e29b-41d4-a716-446655440000")).toBeTruthy();
    });

    it("should validate XID", () => {
      const schema = xid();
      expect(schema.parse("b50vl5e54p1000fo3gh0")).toBeTruthy();
    });

    it("should validate KSUID", () => {
      const schema = ksuid();
      expect(schema.parse("0ujsswThIGTUYm2K8FjOOfXtY1K")).toBeTruthy();
    });
  });
});
