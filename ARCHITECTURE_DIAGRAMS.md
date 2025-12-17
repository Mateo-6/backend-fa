# Financial App API - Architecture Diagrams

This document contains simplified visual diagrams for presentations and reviews.

---

## 1. General Architecture - Layer View

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (HTTP)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  HTTP Layer (Express)                                     │  │
│  │  • Controllers                                            │  │
│  │  • Routes                                                 │  │
│  │  • Middleware (Auth, Validation, Error Handling)         │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Database Layer                                           │  │
│  │  • MongoDB (Mongoose) - Primary                           │  │
│  │  • MySQL (Prisma) - Alternative                          │  │
│  │  • In-Memory - Testing                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  External Services                                        │  │
│  │  • Bcrypt (Password Hashing)                             │  │
│  │  • JWT (Token Generation/Verification)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Application Services                                     │  │
│  │  • UserService                                            │  │
│  │  • AuthService                                            │  │
│  │  • CategoryService                                        │  │
│  │  • TransactionService                                      │  │
│  │  • RecurringExpenseService                                │  │
│  │  • PaymentMethodService                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DTOs (Data Transfer Objects)                             │  │
│  │  • Input Validation (Zod)                                 │  │
│  │  • Data Transformation                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Domain Entities (Types)                                  │  │
│  │  • User, Category, Transaction, PaymentMethod, etc.       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Repository Interfaces                                   │  │
│  │  • UserRepository                                         │  │
│  │  • CategoryRepository                                     │  │
│  │  • TransactionRepository                                  │  │
│  │  • PaymentMethodRepository                                │  │
│  │  • RecurringExpenseRepository                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Service Interfaces                                       │  │
│  │  • IPasswordService                                       │  │
│  │  • ITokenService                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Domain Errors                                            │  │
│  │  • NotFoundError, UnauthorizedError, etc.                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. HTTP Request Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │ HTTP Request
     ▼
┌─────────────────────────────────────┐
│   Express Server                     │
│   ┌───────────────────────────────┐  │
│   │ 1. Route Matching             │  │
│   └───────────┬───────────────────┘  │
│               ▼                       │
│   ┌───────────────────────────────┐  │
│   │ 2. Middleware Chain          │  │
│   │    • JSON Parser             │  │
│   │    • Validation (Zod)        │  │
│   │    • Authentication (JWT)    │  │
│   └───────────┬───────────────────┘  │
│               ▼                       │
│   ┌───────────────────────────────┐  │
│   │ 3. Controller                 │  │
│   │    • Extract params/body       │  │
│   │    • Call Application Service  │  │
│   └───────────┬───────────────────┘  │
│               ▼                       │
│   ┌───────────────────────────────┐  │
│   │ 4. Application Service        │  │
│   │    • Business Logic            │  │
│   │    • Call Repository           │  │
│   └───────────┬───────────────────┘  │
│               ▼                       │
│   ┌───────────────────────────────┐  │
│   │ 5. Repository                 │  │
│   │    • Database Operations      │  │
│   └───────────┬───────────────────┘  │
│               ▼                       │
│   ┌───────────────────────────────┐  │
│   │ 6. Database (MongoDB/MySQL)   │  │
│   └───────────┬───────────────────┘  │
│               │                       │
│               │ Response              │
│               ▼                       │
│   ┌───────────────────────────────┐  │
│   │ 7. Error Handler (if error)   │  │
│   └───────────┬───────────────────┘  │
│               ▼                       │
│   ┌───────────────────────────────┐  │
│   │ 8. Response Formatter         │  │
│   │    { success: true, data: ... }│  │
│   └───────────┬───────────────────┘  │
└───────────────┼───────────────────────┘
                │
                ▼
         ┌──────────┐
         │  Client  │
         └──────────┘
```

---

## 3. Entity Relationship Diagram

```
┌──────────────┐
│     User     │
│──────────────│
│ id           │◄────┐
│ username     │     │
│ name         │     │
│ email        │     │
│ password     │     │
│ phone        │     │
└──────────────┘     │
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Category   │ │ PaymentMethod│ │ Transaction  │
│──────────────│ │──────────────│ │──────────────│
│ id           │ │ id           │ │ id           │
│ name         │ │ name         │ │ amount       │
│ description  │ │ type         │ │ description  │
│ userId ──────┼─┤ userId ──────┼─┤ userId ──────┼─┐
└──────────────┘ │ currency     │ │ date         │ │
                 │ details      │ │ type         │ │
                 └──────────────┘ │ category     │ │
                                  │ (snapshot)   │ │
                 ┌──────────────┐ │ paymentMethodId│ │
                 │RecurringExpense│ │ isRecurring  │ │
                 │──────────────│ │ recurringExpenseId│
                 │ id           │ │              │ │
                 │ name         │ └──────────────┘ │
                 │ amount       │                  │
                 │ frequency    │                  │
                 │ payDay       │                  │
                 │ startDate    │                  │
                 │ nextPaymentDate                 │
                 │ isActive     │                  │
                 │ userId ──────┼──────────────────┘
                 │ categoryId ──┼──┐
                 │ paymentMethodId─┼─┐
                 └──────────────┘  │ │
                                   │ │
                                   ▼ ▼
                            ┌──────────────┐
                            │   Category   │
                            │ PaymentMethod│
                            └──────────────┘
```

**Relationship Legend:**
- `userId` → Ownership relationship (User is owner)
- `categoryId` → Reference to Category
- `paymentMethodId` → Reference to PaymentMethod
- `recurringExpenseId` → Optional reference to RecurringExpense
- `category` (snapshot) → Embedded data in Transaction

---

## 4. Authentication Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ POST /auth/login
     │ { email, password }
     ▼
┌─────────────────────────────────┐
│   AuthController                │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   AuthService                    │
│   1. findByEmail(email)          │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   UserRepository                 │
│   • Find user by email           │
└───────────┬─────────────────────┘
            │
            │ User found
            ▼
┌─────────────────────────────────┐
│   PasswordService                │
│   • compare(password, hash)      │
└───────────┬─────────────────────┘
            │
            │ Password valid
            ▼
┌─────────────────────────────────┐
│   TokenService                   │
│   • generate({ id: userId })     │
└───────────┬─────────────────────┘
            │
            │ JWT Token generated
            ▼
┌─────────────────────────────────┐
│   Response                       │
│   {                              │
│     token: "jwt_token...",       │
│     user: { ... } (no password)  │
│   }                              │
└───────────┬─────────────────────┘
            │
            ▼
┌──────────┐
│  Client  │
│  Stores token for future requests
└──────────┘
```

**Protected Request:**
```
Client → Request with Header: Authorization: Bearer <token>
       ↓
AuthMiddleware → Verifies token → Extracts userId → Attaches to req.user
       ↓
Controller → Uses req.user.id for operations
```

---

## 5. Manual Transaction Creation Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ POST /transactions/manual
     │ {
     │   amount, description, date,
     │   type, categoryId, paymentMethodId
     │ }
     ▼
┌─────────────────────────────────┐
│   TransactionController          │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   ValidationMiddleware           │
│   • Validate with Zod schema     │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   AuthMiddleware                 │
│   • Verify JWT                   │
│   • Extract userId               │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   TransactionService             │
│   1. Validate category exists    │
│      and belongs to user         │
│   2. Validate paymentMethod      │
│      exists and belongs to user  │
│   3. Get category snapshot       │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   CategoryRepository             │
│   • findById(categoryId)        │
│   • Verify userId                │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   PaymentMethodRepository        │
│   • findById(paymentMethodId)    │
│   • Verify userId                │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   TransactionRepository          │
│   • create({                     │
│       ...transactionData,        │
│       category: snapshot,         │
│       isRecurring: false          │
│     })                           │
└───────────┬─────────────────────┘
            │
            │ Transaction created
            ▼
┌─────────────────────────────────┐
│   Response 201 Created           │
│   { success: true, data: {...} } │
└───────────┬─────────────────────┘
            │
            ▼
┌──────────┐
│  Client  │
└──────────┘
```

---

## 6. Recurring Expense Processing Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ POST /transactions/recurring/:recurringExpenseId
     ▼
┌─────────────────────────────────┐
│   TransactionController          │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   TransactionService             │
│   processRecurring()             │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   RecurringExpenseRepository     │
│   • findById(id)                 │
│   • Verify userId                 │
│   • Verify isActive = true       │
└───────────┬─────────────────────┘
            │
            │ RecurringExpense valid
            ▼
┌─────────────────────────────────┐
│   CategoryRepository             │
│   • findById(categoryId)        │
│   • Get snapshot                 │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   TransactionRepository          │
│   • create({                     │
│       amount: recurring.amount,  │
│       description: recurring.name,│
│       date: new Date(),           │
│       type: EXPENSE,              │
│       category: snapshot,         │
│       paymentMethodId: ...,       │
│       isRecurring: true,          │
│       recurringExpenseId: id      │
│     })                           │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   Calculate nextPaymentDate      │
│   • Based on frequency           │
│   • Based on payDay              │
│   • Handle edge cases            │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   RecurringExpenseRepository     │
│   • update(id, {                 │
│       nextPaymentDate: calculated │
│     })                           │
└───────────┬─────────────────────┘
            │
            │ Transaction created and
            │ RecurringExpense updated
            ▼
┌─────────────────────────────────┐
│   Response 201 Created           │
│   { success: true, data: {...} } │
└───────────┬─────────────────────┘
            │
            ▼
┌──────────┐
│  Client  │
└──────────┘
```

---

## 7. Repository Pattern - Implementations

```
┌─────────────────────────────────────┐
│      Repository Interface            │
│      (Domain Layer)                  │
│  ┌───────────────────────────────┐   │
│  │ UserRepository               │   │
│  │ • create()                   │   │
│  │ • findAll()                  │   │
│  │ • findById()                 │   │
│  │ • findByEmail()              │   │
│  │ • update()                   │   │
│  │ • delete()                   │   │
│  └───────────────────────────────┘   │
└──────────────────┬───────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ UserMongoose│ │UserPrisma   │ │UserInMemory │
│ Repository  │ │ Repository  │ │ Repository  │
│             │ │             │ │             │
│ MongoDB     │ │ MySQL       │ │ Testing     │
└─────────────┘ └─────────────┘ └─────────────┘
```

**Advantages:**
- Easy implementation swapping
- Testing with in-memory repository
- Application Service doesn't know DB details
- Follows Dependency Inversion Principle

---

## 8. Middleware Chain

```
Request
  │
  ▼
┌─────────────────────┐
│ 1. express.json()   │  Parse JSON body
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. Route Matching   │  Find route
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. Validation       │  Validate with Zod
│    Middleware       │  (if applicable)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. Auth Middleware  │  Verify JWT
│    (if protected)    │  Extract userId
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. Async Handler    │  Handle async/await
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. Controller       │  Execute logic
└──────────┬──────────┘
           │
           │ If error
           ▼
┌─────────────────────┐
│ 7. Error Handler    │  Handle errors
│    Middleware       │  Format response
└──────────┬──────────┘
           │
           ▼
      Response
```

---

## 9. Payment Date Calculation (Credit Card)

```
┌─────────────────────────────────────┐
│ PaymentMethodService                 │
│ calculateDueDate()                   │
└───────────┬─────────────────────────┘
            │
            │ Input: paymentMethodId, transactionDate
            ▼
┌─────────────────────────────────────┐
│ Verify PaymentMethod type            │
└───────────┬─────────────────────────┘
            │
            │ Is it CREDIT_CARD?
            ▼
        ┌───┴───┐
        │  NO   │
        └───┬───┘
            │
            ▼
    return null (immediate payment)
            │
        ┌───┴───┐
        │  YES  │
        └───┬───┘
            │
            ▼
┌─────────────────────────────────────┐
│ Get cut_off_day and payment_day      │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Compare transactionDate with         │
│ cut_off_day                          │
└───────────┬─────────────────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────┐    ┌─────────┐
│ BEFORE  │    │ AFTER   │
│ cut_off │    │ cut_off │
└────┬────┘    └────┬────┘
     │              │
     │              │
     ▼              ▼
┌─────────┐    ┌─────────┐
│ Payment │    │ Payment │
│ on      │    │ on      │
│ payment_│    │ payment_│
│ day of  │    │ day of  │
│ current │    │ next    │
│ month   │    │ month   │
└─────────┘    └─────────┘
     │              │
     └──────┬───────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Handle edge cases:                   │
│ • Months with fewer days             │
│ • Year transitions                   │
│ • Day 31 in months with 30 days      │
└───────────┬─────────────────────────┘
            │
            ▼
    return Date (calculated date)
```

---

## 10. API Response Structure

### Success Response
```json
{
  "success": true,
  "data": {
    // Entity data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

### HTTP Status Codes
- `200 OK` - Successful operation
- `201 Created` - Resource created
- `204 No Content` - Successful deletion
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Presentation Notes

1. **Clean Architecture**: Shows clear separation of responsibilities
2. **Scalability**: Easy to add new features
3. **Maintainability**: Organized and testable code
4. **Security**: Multiple layers of protection
5. **Flexibility**: Multi-DB support without changing business logic
