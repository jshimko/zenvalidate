---
"zenvalidate": major
---

**Breaking:** `ClientConfig` now supports `testDefault`, and client-specific defaults resolve with the same environment chain and presence semantics as server-side defaults: in test, `client.testDefault` → `client.devDefault` → `client.default`; in development, `client.devDefault` → `client.default`; otherwise `client.default`. The first key _present_ wins — an explicit `undefined` now stops the chain instead of falling through.

This is breaking in three ways:

- Client-exposed variables in `NODE_ENV=test` now pick up `client.devDefault` (previously they fell straight to `client.default`).
- An explicit `client.devDefault: undefined` in development now yields `undefined` instead of falling through to `client.default`.
- An explicit `undefined` anywhere in the client chain (e.g. `client.default: undefined`) now overrides the server-resolved base default on the client — previously the client chain was skipped entirely and the server-resolved value showed through.

Additionally, the client default chain now respects `emptyStringAsMissing`: a variable supplied as an empty string (a bare `VAR=` dotenv line) counts as unset on the client too, so client-specific defaults apply — previously the empty string counted as explicitly set and silently blocked them, contradicting the documented empty-string semantics.
