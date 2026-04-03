# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (hot reload)
npm run dev

# Build TypeScript to dist/
npm run build

# Clean build (removes dist/ first)
npm run build:clean

# Run compiled output
npm start
```

No test runner is configured (`npm test` exits with error).

### Local MongoDB (from deploy/)

```bash
cd deploy && docker compose up -d
# MongoDB at mongodb://root:rootpassword@localhost:27017/financial-app?authSource=admin
```

### Deploy to AWS Lambda (from deploy/)

```bash
npm run build                                # build first
node deploy/scripts/update-lambda-code.js   # fast code-only update
node deploy/scripts/deploy-lambda-infra.js  # full infrastructure update
```

## Architecture

Clean Architecture in 3 layers:

```
src/
├── domain/          # Interfaces + error classes (no dependencies)
├── application/     # Services (business logic) + Zod DTOs
└── infra/           # Mongoose models, repositories, JWT/bcrypt, HTTP
```

**Dependency direction**: `infra` → `application` → `domain`. Domain has zero runtime dependencies.

### Two entry points

- **`src/index.ts`** — local Express server (dev/production EC2/EB): connects MongoDB, instantiates `Server`
- **`src/infra/http/lambda-handler.ts`** — AWS Lambda: implements its own request router (does NOT use Express), wires all DI manually at module load for warm-start optimization

When adding a new route, you must update **both** `server.ts` (Express routes) **and** `lambda-handler.ts` (the `routes` array and controller instantiation at the top).

### Dependency Injection

Manual, no IoC container. All dependencies instantiated at module level in `lambda-handler.ts`. The chain is: `Repository → Service → Controller`.

### Adding a new module

1. Create domain interface in `src/domain/<module>/`
2. Create Mongoose model in `src/infra/database/models/`
3. Create repository in `src/infra/repositories/`
4. Create Zod DTOs in `src/application/dto/<module>/`
5. Create service in `src/application/services/`
6. Create controller in `src/infra/http/controllers/<module>/`
7. Create routes file in `src/infra/http/routes/`
8. Register in `server.ts` and `lambda-handler.ts`

### Error handling

Throw subclasses of `AppError` (`NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, `ConflictError`) from services. The `errorHandler` middleware and lambda handler catch them and return the appropriate HTTP status. Error messages are in Spanish.

### Response format

All responses via `sendSuccess()` / `sendError()` from `src/infra/http/utils/response.util.ts`:

**Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Operación exitosa",
  "data": { ... }
}
```

**Error:**
```json
{
  "status": false,
  "code": 400,
  "error": "Human-readable message in Spanish",
  "data": null,
  "details": { "stack": "...", "path": "...", "method": "..." }
}
```

> `details` only in development. Error messages always in Spanish.```

### Authentication

Routes that require auth set `authRequired: true` in `lambda-handler.ts` and use the `authMiddleware(tokenService)` in Express routes. The middleware attaches `req.user.id` (MongoDB ObjectId string). All service queries must filter by `userId` — never return cross-user data.

## Key conventions

- **Shared types** come from `fa-contracts` (GitHub package `github:Mateo-6/fa-contracts#main`). Do not redefine domain types locally.
- **Balance tracking**: `PaymentMethod.details.current_balance` is mutated by `TransactionService` on every credit card transaction and credit card payment. Keep this logic consistent.
- **Category snapshot**: `Transaction.category` stores a `{id, name, icon}` snapshot at creation time, not a reference. Changes to a category do not retroactively update past transactions.
- **Static routes before dynamic**: in `lambda-handler.ts`, routes like `/budgets/summary` must be listed before `/budgets/:id` to avoid wrong parameter matching.
- File names: `kebab-case` (e.g., `auth.service.ts`, `user.model.ts`)
