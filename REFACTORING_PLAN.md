# JuryBox Backend - Codebase Refactoring Plan

## Executive Summary

**Date:** 2025-10-26
**Codebase Size:** ~48 TypeScript files, ~9,000 lines of code
**Current Status:** Functional but needs structural improvements for maintainability
**Project Type:** Fastify backend with Hedera blockchain integration, AI agents, and payment systems

---

## 1. Current Architecture Assessment

### 1.1 Current Structure
```
jurybox-backend/
├── server/           # Web server layer
│   ├── routes/       # API endpoints (7 route files)
│   ├── plugins/      # Fastify plugins (cors, helmet, multipart)
│   ├── config/       # Configuration management
│   ├── app.ts        # Application setup
│   └── index.ts      # Server entry point
├── lib/              # Business logic & services
│   ├── hedera/       # Hedera blockchain services (11 files)
│   ├── agents/       # Agent communication (2 files)
│   ├── ai/           # OpenAI integration (1 file)
│   ├── x402/         # Payment protocol (2 files)
│   ├── erc8004/      # Registry services (3 files)
│   ├── ipfs/         # IPFS integration (1 file)
│   ├── quota/        # Quota management (2 files)
│   ├── database.ts   # Database service
│   └── utils.ts      # Utilities
├── types/            # TypeScript definitions (1 file)
├── prisma/           # Database schema & migrations
└── scripts/          # Utility scripts & tests
```

### 1.2 Strengths ✅
- Clear separation between server (routes) and business logic (lib)
- Singleton pattern for services (consistent `getXService()` pattern)
- Comprehensive TypeScript typing
- Well-documented code with JSDoc comments
- Proper use of Fastify for high-performance API
- Good integration patterns (Hedera, OpenAI, IPFS, X402)

### 1.3 Issues Identified ⚠️

#### **Critical Issues**
1. **Mixed Concerns in Routes** - Routes contain business logic (orchestrator.ts:761 lines)
2. **Database Service Duplication** - Two patterns: `getDatabase()` and `DatabaseService` class
3. **Inconsistent Error Handling** - Mix of try-catch patterns and error boundaries
4. **No Middleware Layer** - Validation and auth logic embedded in routes
5. **Hardcoded Configuration** - Some config values scattered across files
6. **Missing DTOs/Validation** - Request/response types not validated with Zod
7. **No Dependency Injection** - Services created via singletons only

#### **Moderate Issues**
8. **Service Organization** - `lib/hedera/` has 11 files, some could be grouped
9. **Type Definitions** - All types in single `types/agent.ts` file (241 lines)
10. **Prisma Models vs Types** - Duplication between Prisma schema and TypeScript types
11. **No Repository Pattern** - Database access scattered across services
12. **Testing Infrastructure** - Tests in scripts folder, not proper test suite
13. **Scripts Organization** - Mix of utilities, tests, and setup scripts
14. **Missing API Documentation** - No OpenAPI/Swagger documentation

#### **Minor Issues**
15. **Inconsistent Naming** - Mix of `Service`, `service`, and utility files
16. **Large Files** - Some files exceed 500 lines (orchestrator.ts: 761 lines)
17. **Console Logging** - Production-quality logging needed
18. **No Health Checks** - Basic health check only, no detailed status
19. **Missing Constants** - Magic numbers and strings in code
20. **No Rate Limiting** - API endpoints unprotected

---

## 2. Proposed Architecture (Clean Architecture + Domain-Driven Design)

### 2.1 Target Structure
```
jurybox-backend/
├── src/
│   ├── domain/                    # Domain layer (business entities)
│   │   ├── entities/
│   │   │   ├── agent.entity.ts
│   │   │   ├── task.entity.ts
│   │   │   ├── payment.entity.ts
│   │   │   ├── orchestrator.entity.ts
│   │   │   └── evaluation.entity.ts
│   │   ├── value-objects/
│   │   │   ├── hedera-account.vo.ts
│   │   │   ├── payment-config.vo.ts
│   │   │   └── consensus-result.vo.ts
│   │   └── types/
│   │       ├── agent.types.ts
│   │       ├── evaluation.types.ts
│   │       ├── payment.types.ts
│   │       └── index.ts
│   │
│   ├── application/               # Application layer (use cases)
│   │   ├── use-cases/
│   │   │   ├── agents/
│   │   │   │   ├── create-agent.use-case.ts
│   │   │   │   ├── list-agents.use-case.ts
│   │   │   │   └── update-agent.use-case.ts
│   │   │   ├── orchestrator/
│   │   │   │   ├── execute-evaluation.use-case.ts
│   │   │   │   ├── create-orchestrator.use-case.ts
│   │   │   │   └── get-progress.use-case.ts
│   │   │   ├── payments/
│   │   │   │   ├── process-payment.use-case.ts
│   │   │   │   └── verify-payment.use-case.ts
│   │   │   └── tasks/
│   │   │       ├── create-task.use-case.ts
│   │   │       └── finalize-task.use-case.ts
│   │   ├── dto/
│   │   │   ├── agent.dto.ts
│   │   │   ├── evaluation.dto.ts
│   │   │   ├── payment.dto.ts
│   │   │   └── orchestrator.dto.ts
│   │   └── services/              # Application services
│   │       ├── orchestration.service.ts
│   │       └── evaluation.service.ts
│   │
│   ├── infrastructure/            # Infrastructure layer
│   │   ├── database/
│   │   │   ├── repositories/
│   │   │   │   ├── agent.repository.ts
│   │   │   │   ├── task.repository.ts
│   │   │   │   ├── payment.repository.ts
│   │   │   │   └── orchestrator.repository.ts
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma
│   │   │   │   ├── migrations/
│   │   │   │   └── seed.ts
│   │   │   └── database.service.ts
│   │   ├── blockchain/
│   │   │   ├── hedera/
│   │   │   │   ├── hcs.service.ts
│   │   │   │   ├── account.service.ts
│   │   │   │   ├── wallet.service.ts
│   │   │   │   └── transaction.service.ts
│   │   │   └── erc8004/
│   │   │       ├── registry.service.ts
│   │   │       └── viem-client.ts
│   │   ├── ai/
│   │   │   ├── openai.service.ts
│   │   │   └── ai.interface.ts
│   │   ├── payment/
│   │   │   ├── x402/
│   │   │   │   ├── payment.service.ts
│   │   │   │   └── facilitator.service.ts
│   │   │   └── payment.interface.ts
│   │   ├── storage/
│   │   │   ├── ipfs.service.ts
│   │   │   └── storage.interface.ts
│   │   ├── http/
│   │   │   └── agent-client.service.ts
│   │   └── config/
│   │       ├── environment.config.ts
│   │       ├── hedera.config.ts
│   │       └── app.config.ts
│   │
│   ├── presentation/              # Presentation layer (API)
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   │   ├── agents.controller.ts
│   │   │   │   ├── judges.controller.ts
│   │   │   │   ├── orchestrator.controller.ts
│   │   │   │   ├── payments.controller.ts
│   │   │   │   ├── tasks.controller.ts
│   │   │   │   ├── audit.controller.ts
│   │   │   │   └── upload.controller.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── validation.middleware.ts
│   │   │   │   ├── error-handler.middleware.ts
│   │   │   │   ├── rate-limit.middleware.ts
│   │   │   │   └── logging.middleware.ts
│   │   │   ├── routes/
│   │   │   │   ├── agent.routes.ts
│   │   │   │   ├── orchestrator.routes.ts
│   │   │   │   ├── payment.routes.ts
│   │   │   │   └── index.ts
│   │   │   ├── validators/
│   │   │   │   ├── agent.validator.ts
│   │   │   │   ├── evaluation.validator.ts
│   │   │   │   └── payment.validator.ts
│   │   │   └── plugins/
│   │   │       ├── cors.plugin.ts
│   │   │       ├── helmet.plugin.ts
│   │   │       └── multipart.plugin.ts
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── shared/                    # Shared utilities
│   │   ├── constants/
│   │   │   ├── consensus.constants.ts
│   │   │   ├── payment.constants.ts
│   │   │   └── status.constants.ts
│   │   ├── errors/
│   │   │   ├── app.error.ts
│   │   │   ├── validation.error.ts
│   │   │   ├── payment.error.ts
│   │   │   └── hedera.error.ts
│   │   ├── utils/
│   │   │   ├── logger.util.ts
│   │   │   ├── crypto.util.ts
│   │   │   └── format.util.ts
│   │   └── interfaces/
│   │       ├── repository.interface.ts
│   │       └── service.interface.ts
│   │
│   └── core/                      # Core algorithms & business rules
│       ├── consensus/
│       │   ├── algorithms/
│       │   │   ├── simple-average.algorithm.ts
│       │   │   ├── weighted-average.algorithm.ts
│       │   │   ├── median.algorithm.ts
│       │   │   ├── trimmed-mean.algorithm.ts
│       │   │   ├── iterative-convergence.algorithm.ts
│       │   │   └── delphi-method.algorithm.ts
│       │   ├── consensus.engine.ts
│       │   └── consensus.interface.ts
│       ├── orchestration/
│       │   ├── multi-agent.orchestrator.ts
│       │   ├── evaluation.pipeline.ts
│       │   └── discussion.manager.ts
│       └── quota/
│           ├── quota.manager.ts
│           └── monthly-quota.service.ts
│
├── tests/                         # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/                       # Utility scripts only
│   ├── deployment/
│   └── maintenance/
│
├── docs/                          # Documentation
│   ├── api/
│   ├── architecture/
│   └── guides/
│
└── config/                        # Configuration files
    ├── .env.example
    └── docker-compose.yml
```

### 2.2 Architecture Principles

#### **Layer Responsibilities**

1. **Domain Layer** - Pure business logic, no dependencies
   - Entities (business objects)
   - Value objects (immutable data)
   - Domain types & interfaces
   - No framework dependencies

2. **Application Layer** - Use cases & orchestration
   - Use case implementations
   - DTOs for input/output
   - Application services
   - No infrastructure details

3. **Infrastructure Layer** - External systems & frameworks
   - Database repositories
   - Blockchain services
   - AI services
   - Payment services
   - External APIs
   - Configuration

4. **Presentation Layer** - API interface
   - Controllers (thin)
   - Routes
   - Middleware
   - Validators
   - HTTP-specific logic

5. **Shared Layer** - Cross-cutting concerns
   - Utilities
   - Constants
   - Custom errors
   - Logging
   - Common interfaces

6. **Core Layer** - Critical algorithms
   - Consensus algorithms
   - Orchestration engine
   - Business rule engines

---

## 3. Refactoring Strategy

### Phase 1: Foundation (Week 1)
**Goal:** Establish new structure without breaking existing functionality

1. **Create New Directory Structure**
   - Set up `src/` folder with all subdirectories
   - Keep existing code in place initially

2. **Extract Types & Constants**
   - Move types from `types/agent.ts` → `src/domain/types/`
   - Extract magic numbers/strings → `src/shared/constants/`
   - Create error classes → `src/shared/errors/`

3. **Setup Infrastructure Layer**
   - Create repository interfaces
   - Implement database repositories
   - Move Prisma schema and keep migrations

4. **Establish Utilities & Helpers**
   - Create logger utility
   - Setup error handling utilities
   - Move crypto/format utils

**Deliverables:**
- New folder structure in place
- Type definitions organized
- Repository pattern established
- Utility functions centralized

---

### Phase 2: Service Layer Refactoring (Week 2)
**Goal:** Clean up service layer and establish boundaries

5. **Refactor Hedera Services**
   - Split large services into focused ones
   - Consolidate HCS communication
   - Extract wallet management
   - Organize consensus algorithms

6. **Refactor Payment Services**
   - Extract X402 implementation
   - Create payment interface
   - Improve error handling

7. **Refactor AI Services**
   - Create AI interface
   - Implement OpenAI adapter
   - Allow future providers

8. **Database Layer Cleanup**
   - Consolidate database access patterns
   - Remove duplicate patterns
   - Implement repository pattern fully

**Deliverables:**
- Clean service boundaries
- Repository pattern implemented
- Services follow single responsibility
- Proper dependency injection setup

---

### Phase 3: Use Cases & Application Logic (Week 2-3)
**Goal:** Extract business logic from routes into use cases

9. **Create Use Cases**
   - Extract orchestrator logic → `execute-evaluation.use-case.ts`
   - Extract agent operations → agent use cases
   - Extract payment flows → payment use cases
   - Extract task management → task use cases

10. **Implement DTOs**
    - Create request DTOs with Zod validation
    - Create response DTOs
    - Ensure type safety throughout

11. **Application Services**
    - Orchestration service for complex workflows
    - Evaluation service for scoring logic

**Deliverables:**
- All business logic in use cases
- Routes are thin (< 50 lines each)
- DTOs with validation
- Clear separation of concerns

---

### Phase 4: API Layer Refactoring (Week 3)
**Goal:** Clean up presentation layer

12. **Create Controllers**
    - Extract logic from routes to controllers
    - Keep routes as simple routing
    - Implement proper error handling

13. **Implement Middleware**
    - Request validation middleware
    - Error handling middleware
    - Rate limiting
    - Authentication/authorization
    - Logging middleware

14. **API Validation**
    - Implement Zod schemas for all endpoints
    - Add request validation
    - Add response validation

**Deliverables:**
- Clean controller layer
- Comprehensive middleware
- All endpoints validated
- Proper error responses

---

### Phase 5: Core Business Logic (Week 4)
**Goal:** Isolate critical algorithms and business rules

15. **Extract Consensus Engine**
    - Move algorithms to `src/core/consensus/algorithms/`
    - Create consensus engine
    - Implement algorithm factory pattern

16. **Refactor Orchestration**
    - Clean up multi-agent orchestrator
    - Separate evaluation pipeline
    - Extract discussion manager

17. **Quota Management**
    - Move quota logic to core
    - Implement quota strategies

**Deliverables:**
- Clean consensus engine
- Modular orchestration system
- Testable business rules

---

### Phase 6: Testing & Documentation (Week 4-5)
**Goal:** Ensure quality and maintainability

18. **Testing Infrastructure**
    - Setup Jest/Vitest
    - Unit tests for use cases
    - Integration tests for repositories
    - E2E tests for critical flows

19. **API Documentation**
    - Generate OpenAPI spec
    - Setup Swagger UI
    - Document all endpoints

20. **Code Documentation**
    - Update JSDoc comments
    - Create architecture diagrams
    - Write migration guide

**Deliverables:**
- Comprehensive test suite (>70% coverage)
- OpenAPI documentation
- Architecture documentation
- Developer guide

---

### Phase 7: Migration & Cleanup (Week 5)
**Goal:** Complete the migration and remove old code

21. **Update Imports**
    - Update all imports to new structure
    - Ensure no breaking changes

22. **Remove Old Code**
    - Delete old `lib/` folder
    - Delete old `server/routes/` folder
    - Clean up unused files

23. **Performance Testing**
    - Load testing
    - Performance profiling
    - Optimize bottlenecks

**Deliverables:**
- Complete migration
- Old code removed
- Performance validated
- Production-ready codebase

---

## 4. Detailed Refactoring Tasks

### 4.1 Type System Improvements

**Current Issue:** Single large `types/agent.ts` file

**Solution:**
```typescript
// src/domain/types/agent.types.ts
export interface Agent { ... }
export interface AgentCapabilities { ... }

// src/domain/types/evaluation.types.ts
export interface EvaluationProgress { ... }
export interface ConsensusResult { ... }

// src/domain/types/payment.types.ts
export interface PaymentRequest { ... }
export interface X402PaymentConfig { ... }

// src/domain/types/index.ts
export * from './agent.types'
export * from './evaluation.types'
export * from './payment.types'
```

### 4.2 Repository Pattern Implementation

**Current Issue:** Direct Prisma calls in services

**Solution:**
```typescript
// src/infrastructure/database/repositories/agent.repository.ts
export interface IAgentRepository {
  create(data: CreateAgentDto): Promise<AgentEntity>
  findById(id: string): Promise<AgentEntity | null>
  findByAccountId(accountId: string): Promise<AgentEntity | null>
  findAll(filters?: AgentFilters): Promise<AgentEntity[]>
  update(id: string, data: UpdateAgentDto): Promise<AgentEntity>
  delete(id: string): Promise<void>
}

export class AgentRepository implements IAgentRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateAgentDto): Promise<AgentEntity> {
    const agent = await this.prisma.agent.create({ data })
    return this.mapToEntity(agent)
  }

  // ... other methods

  private mapToEntity(prismaAgent: Agent): AgentEntity {
    // Map Prisma model to domain entity
  }
}
```

### 4.3 Use Case Pattern

**Current Issue:** Business logic in routes (orchestrator.ts:54-147)

**Solution:**
```typescript
// src/application/use-cases/orchestrator/execute-evaluation.use-case.ts
export class ExecuteEvaluationUseCase {
  constructor(
    private orchestratorService: OrchestratorService,
    private hcsService: HCSService,
    private evaluationRepo: EvaluationRepository
  ) {}

  async execute(input: ExecuteEvaluationInput): Promise<ExecuteEvaluationOutput> {
    // Validate input
    const validatedInput = ExecuteEvaluationInputSchema.parse(input)

    // Create HCS topic
    const topicId = await this.hcsService.createTopic(...)

    // Execute evaluation
    const result = await this.orchestratorService.execute(...)

    // Save to database
    await this.evaluationRepo.save(result)

    return {
      evaluationId: result.id,
      topicId,
      status: 'started'
    }
  }
}
```

### 4.4 Controller Pattern

**Current Issue:** Routes handle everything (business logic, validation, error handling)

**Solution:**
```typescript
// src/presentation/http/controllers/orchestrator.controller.ts
export class OrchestratorController {
  constructor(
    private executeEvaluationUseCase: ExecuteEvaluationUseCase,
    private getProgressUseCase: GetProgressUseCase
  ) {}

  async executeEvaluation(
    request: FastifyRequest<{ Body: ExecuteEvaluationDto }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.executeEvaluationUseCase.execute(request.body)
      return reply.status(202).send(result)
    } catch (error) {
      throw new EvaluationError('Failed to execute evaluation', error)
    }
  }
}

// src/presentation/http/routes/orchestrator.routes.ts
export default async function orchestratorRoutes(fastify: FastifyInstance) {
  const controller = new OrchestratorController(...)

  fastify.post('/evaluate', {
    schema: {
      body: ExecuteEvaluationSchema,
      response: {
        202: ExecuteEvaluationResponseSchema
      }
    },
    handler: controller.executeEvaluation.bind(controller)
  })
}
```

### 4.5 Error Handling

**Current Issue:** Inconsistent error handling, generic catch blocks

**Solution:**
```typescript
// src/shared/errors/app.error.ts
export abstract class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class PaymentError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 402, 'PAYMENT_REQUIRED', details)
  }
}

// src/presentation/http/middleware/error-handler.middleware.ts
export const errorHandler = (
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
      details: error.details
    })
  }

  // Log unexpected errors
  logger.error('Unexpected error', { error, request })

  return reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  })
}
```

### 4.6 Dependency Injection

**Current Issue:** Singleton pattern everywhere, hard to test

**Solution:**
```typescript
// src/infrastructure/di/container.ts
import { Container } from 'inversify'

const container = new Container()

// Repositories
container.bind<IAgentRepository>('AgentRepository').to(AgentRepository)
container.bind<ITaskRepository>('TaskRepository').to(TaskRepository)

// Services
container.bind<HCSService>('HCSService').to(HCSService)
container.bind<PaymentService>('PaymentService').to(PaymentService)

// Use Cases
container.bind<ExecuteEvaluationUseCase>('ExecuteEvaluationUseCase').to(ExecuteEvaluationUseCase)

export { container }

// Usage in controller
const controller = container.get<OrchestratorController>('OrchestratorController')
```

### 4.7 Configuration Management

**Current Issue:** Config scattered, mix of process.env and config object

**Solution:**
```typescript
// src/infrastructure/config/environment.config.ts
import { z } from 'zod'

const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  FASTIFY_HOST: z.string().default('0.0.0.0'),
  FASTIFY_PORT: z.coerce.number().default(10000),
  DATABASE_URL: z.string(),
  HEDERA_ACCOUNT_ID: z.string(),
  HEDERA_PRIVATE_KEY: z.string(),
  HEDERA_NETWORK: z.enum(['testnet', 'mainnet']),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type Environment = z.infer<typeof EnvironmentSchema>

export const env = EnvironmentSchema.parse(process.env)

// src/infrastructure/config/app.config.ts
export const appConfig = {
  server: {
    host: env.FASTIFY_HOST,
    port: env.FASTIFY_PORT,
  },
  logging: {
    level: env.LOG_LEVEL,
    prettyPrint: env.NODE_ENV !== 'production',
  },
  // ... other config
}
```

---

## 5. Key Design Patterns to Apply

### 5.1 Repository Pattern
- Abstracts data access
- Allows easy testing
- Separates domain from infrastructure

### 5.2 Use Case Pattern
- Single responsibility per use case
- Clear input/output boundaries
- Easy to test

### 5.3 Factory Pattern
- For consensus algorithm selection
- For service creation
- For entity creation

### 5.4 Strategy Pattern
- For consensus algorithms
- For payment methods
- For quota strategies

### 5.5 Dependency Injection
- Constructor injection
- Interface-based dependencies
- Testability

### 5.6 DTO Pattern
- Validated input/output
- Clear API contracts
- Type safety

---

## 6. Code Quality Improvements

### 6.1 Linting & Formatting
```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "max-lines": ["error", 300],
    "max-lines-per-function": ["error", 50],
    "complexity": ["error", 10]
  }
}
```

### 6.2 Testing Standards
- Unit tests: >80% coverage
- Integration tests: Critical paths
- E2E tests: Main user flows
- Test naming: `describe/it` pattern

### 6.3 Documentation Standards
- JSDoc for all public APIs
- README in each major folder
- Architecture Decision Records (ADRs)

---

## 7. Performance Optimizations

### 7.1 Database
- Add proper indexes
- Use connection pooling
- Implement caching layer

### 7.2 API
- Response compression
- Request caching
- Rate limiting

### 7.3 Async Operations
- Proper promise handling
- Background job queue
- Timeout management

---

## 8. Security Improvements

### 8.1 Input Validation
- Zod schemas for all inputs
- Sanitize user inputs
- Prevent injection attacks

### 8.2 Authentication & Authorization
- JWT tokens
- Role-based access control
- API key management

### 8.3 Secrets Management
- Environment variables only
- Encrypted sensitive data
- No hardcoded credentials

---

## 9. Migration Checklist

- [ ] Phase 1: Foundation (Week 1)
  - [ ] Create new directory structure
  - [ ] Extract types & constants
  - [ ] Setup infrastructure layer
  - [ ] Establish utilities

- [ ] Phase 2: Service Layer (Week 2)
  - [ ] Refactor Hedera services
  - [ ] Refactor payment services
  - [ ] Refactor AI services
  - [ ] Database layer cleanup

- [ ] Phase 3: Use Cases (Week 2-3)
  - [ ] Create use cases
  - [ ] Implement DTOs
  - [ ] Application services

- [ ] Phase 4: API Layer (Week 3)
  - [ ] Create controllers
  - [ ] Implement middleware
  - [ ] API validation

- [ ] Phase 5: Core Logic (Week 4)
  - [ ] Extract consensus engine
  - [ ] Refactor orchestration
  - [ ] Quota management

- [ ] Phase 6: Testing & Docs (Week 4-5)
  - [ ] Testing infrastructure
  - [ ] API documentation
  - [ ] Code documentation

- [ ] Phase 7: Migration & Cleanup (Week 5)
  - [ ] Update imports
  - [ ] Remove old code
  - [ ] Performance testing

---

## 10. Success Metrics

### Code Quality
- **Lines per file:** < 300 lines (currently: some files > 700)
- **Cyclomatic complexity:** < 10 per function
- **Test coverage:** > 80% (currently: 0%)
- **Type coverage:** 100% (already good)

### Maintainability
- **Time to add new feature:** Reduce by 50%
- **Time to fix bug:** Reduce by 40%
- **Onboarding time:** Reduce by 60%
- **Code review time:** Reduce by 30%

### Performance
- **API response time:** < 100ms (p95)
- **Database queries:** < 50ms (p95)
- **Memory usage:** Stable (no leaks)
- **Concurrent requests:** Handle 1000 req/s

---

## 11. Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation:**
- Incremental refactoring
- Keep old code until fully migrated
- Comprehensive testing

### Risk 2: Performance Regression
**Mitigation:**
- Benchmark before/after
- Performance testing
- Monitoring in production

### Risk 3: Developer Confusion
**Mitigation:**
- Clear documentation
- Migration guide
- Team training sessions

### Risk 4: Extended Timeline
**Mitigation:**
- Phased approach
- Minimum viable changes first
- Parallel old/new code temporarily

---

## 12. Next Steps

### Immediate Actions (This Week)
1. Review and approve this refactoring plan
2. Create feature branch: `refactor/architecture-v2`
3. Setup new directory structure
4. Begin Phase 1: Foundation

### Short-term (Next 2 Weeks)
1. Complete Phases 1-3
2. Migrate critical services
3. Establish use case patterns

### Medium-term (Week 3-5)
1. Complete Phases 4-6
2. Full test coverage
3. Complete documentation

### Long-term (Post-refactoring)
1. Monitor performance
2. Collect developer feedback
3. Continuous improvements

---

## 13. Progress Update

### Phase 1: Foundation ✅ COMPLETE
- Created Clean Architecture structure
- Organized type definitions (3 files)
- Centralized errors (5 error classes)
- Extracted constants (3 constant files)
- Implemented repositories (3 repositories)
- Setup configuration with Zod validation
- Created shared utilities (logger, format, crypto)

### Phase 2: Service Layer - IN PROGRESS 🔄
- ✅ Moved HCS service to `src/infrastructure/blockchain/hedera/`
- ✅ Moved address utilities
- ✅ Moved consensus algorithms to `src/core/consensus/`
- ✅ Split consensus into 4 individual algorithm files
- ✅ Created ConsensusEngine factory
- 🔜 Move payment (X402) services
- 🔜 Move AI services
- 🔜 Move orchestrator to core layer

**Files Created So Far:** 44 TypeScript files
**Status:** Phase 1 complete, Phase 2 ~60% complete

---

## 13. Conclusion

This refactoring plan transforms the JuryBox backend from a functional but monolithic structure into a clean, maintainable, and scalable architecture following industry best practices:

✅ **Clean Architecture** - Clear separation of concerns
✅ **Domain-Driven Design** - Business logic at the center
✅ **SOLID Principles** - Maintainable and extensible code
✅ **Testability** - High test coverage with proper mocking
✅ **Type Safety** - Full TypeScript leverage
✅ **Performance** - Optimized database and API layers
✅ **Security** - Proper validation and error handling
✅ **Documentation** - Comprehensive API and code docs

The phased approach ensures minimal disruption while maximizing value delivery. Each phase delivers tangible improvements and can be validated independently.

**Estimated Timeline:** 5 weeks
**Estimated Effort:** 200-250 hours
**Risk Level:** Medium (mitigated by phased approach)
**Expected ROI:** High (50% reduction in maintenance time)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Author:** Senior Backend Engineer
**Status:** Ready for Review
