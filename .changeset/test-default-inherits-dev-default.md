---
"zenvalidate": major
---

**Breaking:** The test environment now inherits `devDefault` when `testDefault` is not set. Default resolution in `NODE_ENV=test` is now `testDefault` → `devDefault` → `default`, so working development values are available to test runs without duplicating them. Set `testDefault` only when tests need a different value; an explicit `testDefault` (including `undefined`, which makes the variable optional in test) still overrides the inherited value. Development and production resolution are unchanged.

This is breaking for setups that relied on the previous behavior: in `NODE_ENV=test`, a variable with only a `devDefault` was previously required (or fell back to `default` when one was set) — it now resolves to the `devDefault` value instead.
