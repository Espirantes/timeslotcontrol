# TypeScript Patterns

## Exhaustiveness Checking

```ts
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`)
}

type Status = 'pending' | 'active' | 'disabled'

export function labelForStatus(status: Status): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'active':
      return 'Active'
    case 'disabled':
      return 'Disabled'
    default:
      return assertNever(status)
  }
}
```

## Runtime-Safe Type Guards

```ts
type User = { id: string; email: string }

export function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string' && typeof candidate.email === 'string'
}
```

## `satisfies` for Config Safety

```ts
type EnvConfig = {
  apiBaseUrl: string
  timeoutMs: number
}

export const config = {
  apiBaseUrl: 'https://api.example.com',
  timeoutMs: 5000,
} satisfies EnvConfig
```

## Branded Types at Domain Boundaries

```ts
type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand }

type UserId = Brand<string, 'UserId'>
type OrderId = Brand<string, 'OrderId'>

export function processOrder(orderId: OrderId, userId: UserId) {
  return { orderId, userId }
}
```

## Type Performance Guardrails

- Prefer interfaces for large object shapes that are widely composed.
- Split deeply recursive utility types into smaller aliases.
- Avoid very wide unions when narrower domain modeling is possible.
- Use diagnostics (`--extendedDiagnostics`, `--generateTrace`) before refactoring types.
