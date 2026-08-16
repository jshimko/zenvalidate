# zenvalidate

## 2.0.0

### Major Changes

- e9116fe: **Breaking:** `ClientConfig` now supports `testDefault`, and client-specific defaults resolve with the same environment chain and presence semantics as server-side defaults: in test, `client.testDefault` → `client.devDefault` → `client.default`; in development, `client.devDefault` → `client.default`; otherwise `client.default`. The first key _present_ wins — an explicit `undefined` now stops the chain instead of falling through.

  This is breaking in three ways:

  - Client-exposed variables in `NODE_ENV=test` now pick up `client.devDefault` (previously they fell straight to `client.default`).
  - An explicit `client.devDefault: undefined` in development now yields `undefined` instead of falling through to `client.default`.
  - An explicit `undefined` anywhere in the client chain (e.g. `client.default: undefined`) now overrides the server-resolved base default on the client — previously the client chain was skipped entirely and the server-resolved value showed through.

  Additionally, the client default chain now respects `emptyStringAsMissing`: a variable supplied as an empty string (a bare `VAR=` dotenv line) counts as unset on the client too, so client-specific defaults apply — previously the empty string counted as explicitly set and silently blocked them, contradicting the documented empty-string semantics.

- fa6e985: **Breaking:** The test environment now inherits `devDefault` when `testDefault` is not set. Default resolution in `NODE_ENV=test` is now `testDefault` → `devDefault` → `default`, so working development values are available to test runs without duplicating them. Set `testDefault` only when tests need a different value; an explicit `testDefault` (including `undefined`, which makes the variable optional in test) still overrides the inherited value. Development and production resolution are unchanged.

  This is breaking for setups that relied on the previous behavior: in `NODE_ENV=test`, a variable with only a `devDefault` was previously required (or fell back to `default` when one was set) — it now resolves to the `devDefault` value instead.

## 1.7.0

### Minor Changes

- Treat empty-string env values as missing by default (new `emptyStringAsMissing` option, default `true`).

  dotenv and docker compose render a bare `VAR=` line as `""`, which previously validated the empty string itself — `num()` silently coerced it to `0`, and `url()`/choices validation rejected it at startup. Now such values fall back to their defaults (or report as missing for required variables). Set `emptyStringAsMissing: false` for the previous behavior.

  Also fixes the README error-handling example to reference the exported `ZenvError`/`zodErrors` (there is no `ValidationError` export).

## 1.6.0

### Minor Changes

- 9608859: bump latest minor deps

## 1.5.0

### Minor Changes

- 4a9577c: minor deps updates

## 1.4.1

### Patch Changes

- - Upgrade ESLint v9 → v10 with ecosystem packages (@eslint/js, typescript-eslint, eslint-plugin-jsdoc, globals)
  - Remove @workspace/prettier-config package and inline config in
    root package.json (simplifies monorepo structure)
  - Remove broken prettier-config reference from zenvalidate package.json
  - Update CI matrix from Node [22, 24] to [24, 25]
  - Bump minimum Node engine to >=24
  - Bump Turbo 2.7.5 → 2.8.12, Prettier 3.8.0 → 3.8.1
  - Bump Vitest 4.0.17 → 4.0.18, Zod 4.3.5 → 4.3.6
  - Bump pnpm 10.28.1 → 10.30.3

## 1.4.0

### Minor Changes

- minor deps updates and lint fixes in tests

## 1.3.0

### Minor Changes

- Improve core type guards/validators and get test coverage up to 98%

## 1.2.0

### Minor Changes

- Documentation improvements and author/repo info in package.json

## 1.1.0

### Minor Changes

- Big refactor/rewrite of the README documentation

## 1.0.2

### Patch Changes

- Updated to Vitest made a variety of few linting and type check configuration changes to make checks a bit more strict.

## 1.0.1

### Patch Changes

- Add license to package.json

## 1.0.0

### Major Changes

- Initial public release! I’ve been developing this package for about six months in a private mono‑repo for another project. I now use it in all of my current projects that have a Node.js backend and I can't imagine handling environment variables any other way at this point. That said, I've decided to open‑source the library for anyone who may find it useful. More docs and examples to come soon!
