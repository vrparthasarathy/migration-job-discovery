# Requirements

## Requirements

- The project is one Node stack: Node 26 running TypeScript natively through type stripping (`node file.ts`), ES modules, erasable syntax only, with imports that carry the `.ts` extension.
- No runtime or dev dependencies. Tests use `node:test` and `node:assert/strict` with hand-written injected mocks, and no mocking library.
- No test makes a real network call or sends a real email. The only notifier adapter delivered is a dry-run one; a real email transport, a scheduler and any deployment are out of scope.
- The root `craft.json` declares `test` and `coverage` as `node --test` commands over the component's `test/*.test.ts` and a `testGlob`. It declares no `install` (nothing to install), no `typecheck` (a real type check needs `tsc`, a dev dependency) and no `lint` or `boundaries` (no dependency-free tool exists). The coverage flags are unverified until the builder checks them against Node 26.
- Every behavior of a component has at least one test whose title carries its tag, for example `[B01]`.

## Must match the source

- Not applicable: this is a new example, not a recreation.

## Need not match

- Any real email provider, scheduler or deployment target.

## Acceptance

See `task.acceptance` in the component's [`craft.json`](website-availability-check/craft.json).
