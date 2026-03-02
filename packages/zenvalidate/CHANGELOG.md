# zenvalidate

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
