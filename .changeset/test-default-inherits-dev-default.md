---
"zenvalidate": minor
---

Test environment now inherits `devDefault` when `testDefault` is not set. Default resolution in `NODE_ENV=test` is now `testDefault` → `devDefault` → `default`, so working development values are available to test runs without duplicating them. Set `testDefault` only when tests need a different value; an explicit `testDefault` (including `undefined`, which makes the variable optional in test) still overrides the inherited value. Development and production resolution are unchanged.
