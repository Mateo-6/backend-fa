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

## Architecture

Clean Architecture in 3 layers:

```
src/
├── domain/          # Interfaces + error classes (no dependencies)
├── application/     # Services (business logic) + Zod DTOs
└── infra/           # Mongoose models, repositories, JWT/bcrypt, HTTP
```

**Dependency direction**: `infra` → `application` → `domain`. Domain has zero runtime dependencies.

### Entry point

- **`src/index.ts`** — Express server: connects MongoDB, instantiates `Server`

### Dependency Injection

Manual, no IoC container. The chain is: `Repository → Service → Controller`.

### Adding a new module

1. Create domain interface in `src/domain/<module>/`
2. Create Mongoose model in `src/infra/database/models/`
3. Create repository in `src/infra/repositories/`
4. Create Zod DTOs in `src/application/dto/<module>/`
5. Create service in `src/application/services/`
6. Create controller in `src/infra/http/controllers/<module>/`
7. Create routes file in `src/infra/http/routes/`
8. Register in `server.ts`

### Error handling

Throw subclasses of `AppError` (`NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, `ConflictError`) from services. The `errorHandler` middleware catches them and returns the appropriate HTTP status. Error messages are in Spanish.

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

> `details` only in development. Error messages always in Spanish.

### Authentication

Routes use `authMiddleware(tokenService)` in Express routes. The middleware attaches `req.user.id` (MongoDB ObjectId string). All service queries must filter by `userId` — never return cross-user data.

## Key conventions

- **Shared types** come from `fa-contracts`. Do not redefine domain types locally.
- **Balance tracking**: `PaymentMethod.details.current_balance` is mutated by `TransactionService` on every credit card transaction and credit card payment. Keep this logic consistent.
- **Category snapshot**: `Transaction.category` stores a `{id, name, icon}` snapshot at creation time, not a reference. Changes to a category do not retroactively update past transactions.
- File names: `kebab-case` (e.g., `auth.service.ts`, `user.model.ts`)
