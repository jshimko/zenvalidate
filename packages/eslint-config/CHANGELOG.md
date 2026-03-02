# @workspace/eslint-config

## 0.0.1

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
