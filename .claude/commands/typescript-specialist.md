---
name: typescript-specialist
description: Use this skill for TypeScript authoring, debugging, refactoring, tsconfig setup, type-system design, compiler diagnostics, and migration planning in .ts/.tsx/.mts/.cts projects.
---

# TypeScript Specialist

Comprehensive TypeScript expertise focused on practical delivery: strict typing, maintainable architecture, fast feedback loops, and reliable diagnostics.

## Trigger Keywords

Activate when user mentions:

- `.ts`, `.tsx`, `.mts`, `.cts`
- TypeScript, `tsc`, `tsconfig`, type errors, generics, inference
- `satisfies`, type guards, discriminated unions, conditional/mapped/template literal types
- Type performance, deep instantiation, module resolution, path aliases
- TypeScript migration, strict mode rollout, monorepo/project references

## Working Approach

1. Inspect project setup first:
   - Read `tsconfig*.json`, package scripts, and lint/test config.
   - Prefer existing project scripts over ad-hoc commands.
2. Classify the issue:
   - Type modeling, compiler error, performance, module resolution, or migration.
3. Implement smallest safe fix:
   - Prefer explicit types at boundaries.
   - Keep runtime behavior unchanged unless requested.
4. Validate with one-shot checks:
   - Typecheck first, then targeted tests, then build only if needed.

## Conventions (Defaults, Not Absolutes)

- Prefer `unknown` over `any` unless interoperability requires otherwise.
- Prefer `@ts-expect-error` over `@ts-ignore` when intentionally asserting an error case.
- Prefer named exports for consistency and discoverability.
- Prefer union literals or `as const` objects over `enum` unless runtime enum behavior is explicitly needed.
- Prefer null-safe control flow (`?.`, `??`, guards) over non-null assertions where practical.

## Quick Troubleshooting

```bash
# Generic fallback typecheck
npx tsc --noEmit

# Performance diagnostics
npx tsc --extendedDiagnostics --incremental false
npx tsc --generateTrace ./trace --incremental false

# Module resolution debugging
npx tsc --traceResolution > resolution.log 2>&1
```

## References

- [TypeScript Patterns](references/patterns.md)
- [TypeScript Cheatsheet](references/typescript-cheatsheet.md)
- [Strict tsconfig Baseline](references/tsconfig-strict.json)
- [Reusable Utility Types](references/utility-types.ts)
- [Type Diagnostics Script](scripts/ts_diagnostic.py)
