---
name: mailstep-nodejs-service
description: This skill document enables recreation of a new microservice following the same architecture, patterns, and tech stack as this project. Use this as a blueprint when creating new node.js services. Triggers when user asks to create a new microservice, backend service, API, or Node.js project following Mailstep patterns.
---

# Skill: Create New TypeScript Microservice

Blueprint for creating production-ready Node.js microservices with hexagonal architecture.

## Tech Stack Overview

| Category | Technology | Version |
|----------|-----------|---------|
| **Runtime** | Node.js | ES2024 target |
| **Language** | TypeScript | ^5.9 |
| **Web Framework** | Fastify | ^5.6 |
| **Database ORM** | Prisma | ^6.16 |
| **Database** | PostgreSQL | 15+ |
| **Message Queue** | KafkaJS (Redpanda compatible) | ^2.2 |
| **Object Storage** | AWS S3 SDK | ^3.899 |
| **Validation** | TypeBox + AJV | ^0.34 / ^8.17 |
| **Testing** | Jest | ^30 |
| **Logging** | Pino | ^10 |

**Note:** Stay on Prisma 6 until this issue is resolved: https://github.com/prisma/prisma/issues/28845


---

## Directory Structure

```
/
├── .docker/postgres/init.sql      # Database initialization
├── k8s/                           # Kubernetes manifests
│   ├── api/
│   └── worker/
├── src/
│   ├── app/                       # Infrastructure layer
│   │   ├── api/
│   │   │   └── http/
│   │   │       ├── auth-middleware/
│   │   │       ├── controllers/
│   │   │       │   └── common/    # Shared schemas
│   │   │       └── fastify/       # Fastify setup
│   │   ├── kafka/                 # Kafka producer/consumer
│   │   ├── config/index.ts        # Environment config
│   │   ├── database/
│   │   │   ├── prisma/
│   │   │   │   ├── index.ts       # Prisma client init
│   │   │   │   ├── schema.prisma
│   │   │   │   ├── mappers/       # Prisma -> Domain mappers
│   │   │   │   └── migrations/
│   │   │   └── testing/
│   │   │       └── create-entities.ts
│   │   ├── entrypoints/
│   │   │   ├── server/index.ts    # HTTP server
│   │   │   └── worker/index.ts    # Background worker
│   │   └── observability/
│   │       └── health-controller.ts
│   ├── domain/                    # Business logic layer
│   │   ├── model/                 # Domain entities
│   │   │   └── helpers/relationship/  # HasOne/HasMany wrappers
│   │   └── use-cases/
│   │       └── {use-case-name}/
│   │           ├── index.ts       # Use case implementation
│   │           ├── ports.ts       # Interface definitions
│   │           ├── adapters.ts    # Port implementations
│   │           └── tests/basic.spec.ts
│   ├── lib/                       # Shared TypeScript utilities
│   │   └── typescript/errors.ts
│   └── shared/                    # Shared non-TypeScript helpers; separation of concerns over DRY.
├── .env.example
├── .env.test.example
├── docker-compose.yml
├── jest.config.ts
├── eslint.config.mjs
├── .prettierrc
├── AGENTS.md
└── package.json
```

---

## Core Files

### package.json

```json
{
  "name": "your-service-name",
  "version": "1.0.0",
  "scripts": {
    "test": "npm run migrate:latest:test && npm run _with_test_env -- jest --runInBand --logHeapUsage",
    "test:quick": "npm run _with_test_env -- jest --runInBand",
    "test:quick:watch": "npm run _with_test_env -- jest --watch --runInBand",
    "build": "rm -rf ./dist && tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json",
    "dev:api": "npm run _with_dev_env tsx watch ./src/app/entrypoints/server/index.ts",
    "dev:worker": "npm run _with_dev_env tsx watch ./src/app/entrypoints/worker/index.ts",
    "start:prod-api": "node dist/src/app/entrypoints/server/index.js",
    "start:prod-worker": "node dist/src/app/entrypoints/worker/index.js",
    "migration:generate": "prisma migrate dev",
    "migrate:latest": "prisma migrate deploy",
    "migrate:latest:dev": "npm run _with_dev_env prisma migrate dev",
    "migrate:latest:test": "npm run _with_test_env prisma migrate dev",
    "lint:ci": "tsc --noEmit && eslint && prettier --config .prettierrc --check ./src",
    "lint:fix": "tsc --noEmit && eslint --fix && prettier --config .prettierrc --write ./src",
    "prisma:generate": "prisma generate",
    "_with_test_env": "npx env-cmd -f ./.env.test --silent",
    "_with_dev_env": "npx env-cmd -f ./.env --silent"
  },
  "prisma": { "schema": "src/app/database/prisma/schema.prisma" },
  "devDependencies": {
    "@babel/preset-typescript": "^7.27.1",
    "@eslint/js": "^9.35.0",
    "@faker-js/faker": "^9.9.0",
    "@types/jest": "^30.0.0",
    "@types/ramda": "^0.31.1",
    "@types/supertest": "^6.0.3",
    "env-cmd": "^11.0.0",
    "esbuild": "^0.25.10",
    "eslint": "^9.35.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-perfectionist": "^4.15.0",
    "eslint-plugin-prettier": "^5.5.4",
    "jest": "^30.1.3",
    "prettier": "^3.6.2",
    "prisma": "^6.16.2",
    "supertest": "^7.1.4",
    "ts-jest": "^29.4.1",
    "ts-node": "^10.9.2",
    "tsc-alias": "^1.8.16",
    "tsconfig-paths": "^4.2.0",
    "tsx": "^4.20.5",
    "typescript": "^5.9.2",
    "typescript-eslint": "^8.43.0"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.899.0",
    "@fastify/helmet": "^13.0.2",
    "@fastify/swagger": "^9.5.1",
    "@fastify/swagger-ui": "^5.2.3",
    "@fastify/type-provider-typebox": "^6.0.0",
    "@prisma/client": "^6.16.2",
    "@prisma/extension-read-replicas": "^0.4.1",
    "@sinclair/typebox": "^0.34.41",
    "ajv": "^8.17.1",
    "aws-msk-iam-sasl-signer-js": "^1.0.1",
    "dotenv-cli": "^10.0.0",
    "fastify": "^5.6.0",
    "kafkajs": "^2.2.4",
    "pino": "^10.0.0",
    "ramda": "^0.31.3",
    "tslib": "^2.8.1",
    "ulid": "^3.0.1"
  }
}
```

### tsconfig.json

```jsonc
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "es2024",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "inlineSources": true,
    "sourceRoot": "/",
    "noEmitHelpers": true,
    "importHelpers": true,
    "strictPropertyInitialization": false,
    "rootDir": ".",
    "outDir": "dist",
    "paths": { "@root/*": ["./src/*"] }
  },
  "exclude": ["node_modules", "dist", "jest.config.ts"]
}
```

---

## Use-Case Architecture Pattern

Each use-case follows hexagonal architecture with 4 files:

### 1. ports.ts - Interface Definitions

```typescript
import { Entity } from '@root/domain/model/entity'

// Prefix repository interfaces with 'I'
export interface IEntityRepository {
  create(entity: Pick<Entity, 'name'>): Promise<Entity>
  findByName(name: Entity['name']): Promise<Entity | null>
  findById(id: Entity['id']): Promise<Entity | null>
}

export interface CreateEntityUseCasePorts {
  repository: IEntityRepository
}
```

### 2. adapters.ts - Port Implementations

```typescript
import { PrismaClient } from '@prisma/client'
import { CreateEntityUseCasePorts, IEntityRepository } from './ports'
import { Entity } from '@root/domain/model/entity'
import { toEntity } from '@root/app/database/prisma/mappers'

class EntityPrismaRepository implements IEntityRepository {
  constructor(private prisma: PrismaClient) {}

  async create(entity: Pick<Entity, 'name'>): Promise<Entity> {
    const result = await this.prisma.entity.create({ data: { name: entity.name } })
    return toEntity(result)
  }

  async findByName(name: Entity['name']): Promise<Entity | null> {
    const result = await this.prisma.entity.findUnique({ where: { name } })
    return result ? toEntity(result) : null
  }

  async findById(id: Entity['id']): Promise<Entity | null> {
    const result = await this.prisma.entity.findUnique({ where: { id } })
    return result ? toEntity(result) : null
  }
}

export const createEntityAdapters = (prisma: PrismaClient): CreateEntityUseCasePorts => ({
  repository: new EntityPrismaRepository(prisma),
})
```

### 3. index.ts - Business Logic

```typescript
import { Entity } from '@root/domain/model/entity'
import { CreateEntityUseCasePorts } from './ports'
import { InvalidInputError } from '@root/lib/typescript/errors'

export class CreateEntityUseCase {
  constructor(private deps: CreateEntityUseCasePorts) {}

  public async create(input: Pick<Entity, 'name'>): Promise<Entity> {
    const found = await this.deps.repository.findByName(input.name)
    if (found) throw new InvalidInputError('Entity with this name already exists')
    return this.deps.repository.create({ name: input.name })
  }
}
```

### 4. tests/basic.spec.ts - Integration Tests

```typescript
import { clearDatabase, disconnectPrisma, initPrisma } from '@root/app/database/prisma'
import { CreateEntityUseCase } from '..'
import { createEntityAdapters } from '../adapters'
import { PrismaClient } from '@prisma/client'
import { CreateEntityUseCasePorts } from '../ports'
import { faker } from '@faker-js/faker'
import { getConfig } from '@root/app/config'

describe('Create Entity Use Case', () => {
  let useCase: CreateEntityUseCase
  let prisma: PrismaClient
  let adapters: CreateEntityUseCasePorts

  beforeAll(async () => {
    const config = getConfig()
    prisma = await initPrisma(config.db)
    adapters = createEntityAdapters(prisma)
    useCase = new CreateEntityUseCase(adapters)
  })

  beforeEach(async () => {
    await clearDatabase(prisma)
  })

  afterAll(async () => {
    await disconnectPrisma(prisma)
  })

  it('should create a new entity', async () => {
    const name = faker.company.name()
    const created = await useCase.create({ name })
    const found = await adapters.repository.findByName(name)

    expect(found).not.toBeNull()
    expect(found).toMatchObject({
      id: expect.any(Number),
      name,
    })
  })

  it('should throw error if entity already exists', async () => {
    const name = faker.company.name()
    await adapters.repository.create({ name })
    await expect(useCase.create({ name })).rejects.toThrowErrorMatchingSnapshot()
  })
})
```

---

## Domain Model Pattern

### Entity with Relations

```typescript
import { HasMany, HasOne } from './helpers/relationship'
import { ChildEntity } from './child-entity'

export interface Entity {
  id: number
  name: string
  isActive: boolean
  children: HasMany<ChildEntity>
  parent: HasOne<ParentEntity>
}
```

### Relationship Helpers (src/domain/model/helpers/relationship/index.ts)

```typescript
import { RelationNotLoadedError } from '@root/lib/typescript/errors'

type Id = string | number
export type EntityLike = { id?: Id }

export class HasOne<T extends EntityLike> {
  private constructor(private errPath: string, private entity: T | null, private id?: T['id']) {}

  static unloaded<T extends EntityLike>(path: string, id?: Id) {
    return new HasOne<T>(path, null, id)
  }

  static loaded<T extends EntityLike>(path: string, entity: T) {
    return new HasOne<T>(path, entity, entity.id)
  }

  hasId = () => Boolean(this.id)
  isLoaded = () => Boolean(this.entity)
  getId = (): T['id'] => { if (!this.id) throw new RelationNotLoadedError(this.errPath); return this.id }
  get = (): T => { if (!this.isLoaded()) throw new RelationNotLoadedError(this.errPath); return this.entity as T }
}

export class HasMany<T extends EntityLike> {
  constructor(private path: string, private entities: T[] | null) {}

  static unloaded(path: string) { return new HasMany<never>(path, null) }
  static loaded<T extends EntityLike>(path: string, entities: T[]) { return new HasMany<T>(path, entities) }

  isLoaded = () => Boolean(this.entities)
  get = (): T[] => { if (!this.isLoaded()) throw new RelationNotLoadedError(this.path); return this.entities as T[] }
}
```

---

## Error Classes (src/lib/typescript/errors.ts)

```typescript
export class BaseError extends Error {
  public readonly name: string
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class InvalidInputError extends BaseError {}
export class InputNotFoundError extends BaseError {}
export class UnauthorizedError extends BaseError {}
export class UnexpectedError extends BaseError {}
export class RelationNotLoadedError extends BaseError {
  constructor(path: string) { super(`Trying to access unloaded relation! The relation at: ${path} was not loaded!`) }
}

export class BulkError extends BaseError {
  readonly errors: BaseError[]
  constructor(args: { message: string; errors: BaseError[] }) {
    super(args.message)
    this.errors = args.errors
  }
}

export const makeError = (error: unknown): BaseError => 
  error instanceof BaseError ? error : new BaseError(`${error}`)
```

---

## HTTP Controller Pattern

```typescript
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { FastifyInstance } from 'fastify'
import { Type, Static } from '@sinclair/typebox'
import { ApplicationConfig } from '@root/app/config'
import { makeStaticTokenAuthMiddleware } from '../../auth-middleware'

export const entityResponseSchema = Type.Object({
  id: Type.Number({ description: 'Entity ID', examples: [42] }),
  name: Type.String({ examples: ['Example Name'] }),
})

const createEntityBodySchema = Type.Object({
  name: Type.String({ minLength: 1, description: 'Entity name' }),
})

export const entityController = async (deps: {
  config: ApplicationConfig['authentication']
  fastify: FastifyInstance
  useCase: YourUseCase
}) => {
  const authMiddleware = makeStaticTokenAuthMiddleware(deps.config)

  deps.fastify.withTypeProvider<TypeBoxTypeProvider>().route({
    method: 'POST',
    url: '/entities',
    handler: async (request) => {
      const body = request.body as Static<typeof createEntityBodySchema>
      const result = await deps.useCase.create(body)
      return toEntityResponse(result)
    },
    schema: {
      description: 'Create a new entity.',
      body: createEntityBodySchema,
      response: { 200: entityResponseSchema },
    },
    preHandler: authMiddleware,
  })
}

const toEntityResponse = (entity: Entity): Static<typeof entityResponseSchema> => ({
  id: entity.id,
  name: entity.name,
})
```

---

## Prisma Database Mapper Pattern

```typescript
import { Entity as PrismaEntity } from '@prisma/client'
import { HasMany, HasOne } from '@root/domain/model/helpers/relationship'
import { Entity } from '@root/domain/model/entity'

type EntityWithRelations = PrismaEntity & {
  children?: PrismaChildEntity[]
  parent?: PrismaParentEntity
}

export const toEntity = (prisma: EntityWithRelations): Entity => ({
  id: prisma.id,
  name: prisma.name,
  isActive: prisma.isActive,
  children: prisma.children
    ? HasMany.loaded('Entity.children', prisma.children.map(toChildEntity))
    : HasMany.unloaded('Entity.children'),
  parent: prisma.parent
    ? HasOne.loaded('Entity.parent', toParentEntity(prisma.parent))
    : HasOne.unloaded('Entity.parent', prisma.parentId),
})
```

---

## Testing Utilities

### Test Data Factories (src/app/database/testing/create-entities.ts)

```typescript
import { faker } from '@faker-js/faker'
import { PrismaClient } from '@prisma/client'
import { Entity } from '@root/domain/model/entity'
import { toEntity } from '../prisma/mappers'

export const createEntity = async (
  prisma: PrismaClient,
  overrides?: Partial<Pick<Entity, 'name' | 'isActive'>>,
): Promise<Entity> => {
  const name = overrides?.name ?? faker.company.name()
  const isActive = overrides?.isActive ?? false

  const prismaEntity = await prisma.entity.create({ data: { name, isActive } })
  return toEntity(prismaEntity)
}
```

---

## Docker Setup

### docker-compose.yml

```yaml
services:
  postgres:
    restart: always
    image: postgres:15.8-alpine
    environment:
      - POSTGRES_USER=root
      - POSTGRES_PASSWORD=root
      - POSTGRES_DB=postgres
    ports:
      - '5432:5432'
    volumes:
      - ./.docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
      - ./.volumes/postgres/data:/var/lib/postgresql/data

  kafka:
    restart: always
    image: docker.redpanda.com/redpandadata/redpanda:v23.3.19
    command:
      - redpanda start
      - --smp 1
      - --overprovisioned
      - --node-id 0
      - --kafka-addr PLAINTEXT://0.0.0.0:29092,OUTSIDE://0.0.0.0:9092
      - --advertise-kafka-addr PLAINTEXT://kafka:29092,OUTSIDE://localhost:9092
    ports:
      - 9092:9092
      - 29092:29092
```

### .docker/postgres/init.sql

```sql
CREATE DATABASE testdb;
CREATE DATABASE "your-service-name";
```

---

## Environment Files

### .env.example

```dotenv
DATABASE_URL=postgres://root:root@localhost:5432/your-service-name
AUTH_STATIC_TOKEN=your-static-token
AUTH_CUSTOMER_SUPPORT_STATIC_TOKEN=customer-support-token
KAFKA_ADDRESS=localhost:9092
KAFKA_SSL=0
KAFKA_AWS_REGION=eu-central-1
KAFKA_TOPIC_VERDICT_UPDATES=verdict-updates
SERVICE_NAME=your-service-name
```

### .env.test.example

```dotenv
DATABASE_URL=postgres://root:root@localhost:5432/testdb
AUTH_STATIC_TOKEN=test-token
AUTH_CUSTOMER_SUPPORT_STATIC_TOKEN=test-customer-support-token
KAFKA_ADDRESS=localhost:9092
KAFKA_SSL=0
KAFKA_AWS_REGION=eu-central-1
KAFKA_TOPIC_VERDICT_UPDATES=verdict-updates-test
SERVICE_NAME=your-service-name-test
```

---

## Quick Start

```bash
# 1. Initialize
npm install && npm run prisma:generate

# 2. Start infrastructure
docker compose up -d

# 3. Setup environment
cp .env.example .env && cp .env.test.example .env.test

# 4. Run migrations
npm run migrate:latest:dev && npm run migrate:latest:test

# 5. Development
npm run dev:api              # HTTP server on port 3000

# 6. Testing
npm run test                 # Full suite with migrations
npm run test:quick           # Quick tests
npm run lint:ci              # Lint check
```

---

## Key Conventions Checklist

- [ ] TypeScript strict mode enabled
- [ ] Use `async/await` (not callbacks)
- [ ] Type references: `type EntityId = Entity['id']`
- [ ] Prefix repository interfaces with `I`: `IEntityRepository`
- [ ] Args object pattern for 3+ function arguments
- [ ] Prefer ternary for simple conditionals: `return found ? toEntity(found) : null`
- [ ] `toMatchObject` with `satisfies Partial<T>` for assertions
- [ ] Use `satisfies` typing for test inputs/fixtures (e.g., in `it.each`) to keep tests aligned with schema changes
- [ ] Snapshot testing for error messages
- [ ] Integration tests in `tests/` folder within use-case
- [ ] Prisma in `beforeAll`, clear DB in `beforeEach`, disconnect in `afterAll`
- [ ] Use real adapters (not mocks) in integration tests
- [ ] Document TypeBox schemas well (generates Swagger)
