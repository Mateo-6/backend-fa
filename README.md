# Financial App API

A RESTful backend service built with TypeScript and Node.js that provides a comprehensive personal finance management system. The API enables users to track income, expenses, payment methods, categories, and recurring payments through a secure, scalable architecture.

---

## Table of Contents

1. [Overview](#overview)
2. [Executive Summary](#executive-summary)
3. [Architecture](#architecture)
4. [Requirements](#requirements)
5. [Technology Stack](#technology-stack)
6. [Installation & Quick Start](#installation--quick-start)
7. [API Documentation](#api-documentation)
8. [Project Structure](#project-structure)
9. [Contracts Package (fa-contracts)](#contracts-package-fa-contracts)
10. [Troubleshooting](#troubleshooting)
11. [Migration Information](#migration-information)

---

## Overview

**Financial App API** is a personal finance management system developed with TypeScript and Node.js. It allows users to manage their income, expenses, payment methods, categories, and recurring expenses in an organized and secure manner.

### Key Features

- ✅ JWT Authentication
- ✅ User Management
- ✅ Transaction Categorization
- ✅ Multiple Payment Methods (Credit Card, Bank Account, Cash)
- ✅ Manual Transactions and Income
- ✅ Recurring Expenses with Automatic Processing
- ✅ Transaction History with Advanced Filters
- ✅ Payment Date Calculation for Credit Cards
- ✅ Multi-Database Support (MongoDB, MySQL)

---

## Executive Summary

### Project Overview

**Financial App API** is a RESTful backend service built with TypeScript and Node.js that provides a comprehensive personal finance management system. The API enables users to track income, expenses, payment methods, categories, and recurring payments through a secure, scalable architecture.

### Key Highlights

#### Architecture
- **Clean Architecture** with clear separation of concerns across three layers:
  - **Domain Layer**: Business logic and entity definitions
  - **Application Layer**: Use case orchestration and DTOs
  - **Infrastructure Layer**: HTTP controllers, database implementations, and external services

#### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.1.0
- **Databases**: MongoDB (primary) via Mongoose, MySQL (alternative) via Prisma
- **Security**: JWT authentication, Bcrypt password hashing
- **Validation**: Zod schema validation

#### Core Features
1. **User Management**: Complete CRUD operations with secure password handling
2. **Authentication**: JWT-based authentication system
3. **Categories**: User-specific transaction categorization
4. **Payment Methods**: Support for Credit Cards, Bank Accounts, and Cash with automatic payment date calculation
5. **Transactions**: Manual income/expense tracking with category snapshots for historical accuracy
6. **Recurring Expenses**: Automated recurring payment processing (weekly, monthly, yearly)
7. **Transaction History**: Advanced filtering by date range, type, and category

#### Security Features
- Password hashing with Bcrypt
- JWT token-based authentication
- User data isolation (users can only access their own resources)
- Input validation on all endpoints
- Secure error messages to prevent user enumeration

#### API Structure
- **RESTful design** with consistent response format
- **20+ endpoints** covering all financial operations
- **Protected routes** with JWT middleware
- **Health check** endpoint for monitoring

#### Design Principles
- **Dependency Inversion**: Upper layers depend on abstractions
- **Repository Pattern**: Easy database implementation swapping
- **Interface Segregation**: Focused, cohesive interfaces
- **Single Responsibility**: Each component has one clear purpose

### Business Value

- **Scalable**: Architecture supports horizontal scaling and multiple database backends
- **Maintainable**: Clear separation of concerns facilitates testing and future enhancements
- **Secure**: Multiple layers of security protection
- **Flexible**: Easy to extend with new features or swap implementations
- **Production Ready**: Complete error handling, validation, and logging structure

### Project Status

✅ **Production Ready** - Complete implementation with:
- Full CRUD operations for all entities
- Authentication and authorization
- Data validation and error handling
- Multi-database support
- Comprehensive API documentation

---

## Architecture

The project follows **Clean Architecture** with clear separation of responsibilities across three main layers:

### Layer Structure

#### 1. **Domain Layer** (`domain/`)
- **Types and Entities**: Defines business data structures
- **Repository Interfaces**: Contracts for data access
- **Domain Services**: Pure business logic
- **Domain Errors**: Custom exceptions

#### 2. **Application Layer** (`application/`)
- **Application Services**: Orchestrate use cases
- **DTOs (Data Transfer Objects)**: Input/output data validation and transformation
- **Zod Validation**: Schemas for data validation

#### 3. **Infrastructure Layer** (`infra/`)
- **HTTP Controllers**: Handle requests/responses
- **Routes**: REST endpoint definitions
- **Repositories**: Concrete implementations (MongoDB, Prisma, In-Memory)
- **Middleware**: Authentication, validation, error handling
- **Database Clients**: Mongoose, Prisma
- **Infrastructure Services**: Bcrypt, JWT

### Applied Principles
- **Dependency Inversion**: Upper layers depend on abstractions
- **Single Responsibility**: Each class has a single responsibility
- **Separation of Concerns**: Clear separation between layers
- **Interface Segregation**: Specific and cohesive interfaces

### Architecture Diagram

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

### HTTP Request Flow

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

### Entity Relationship Diagram

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

## Technology Stack

### Runtime and Language
- **Node.js** with **TypeScript 5.9.3**
- **Express.js 5.1.0** (Web framework)

### Databases
- **MongoDB** (Primary) - Mongoose 9.0.0
- **MySQL** (Alternative) - Prisma 7.0.0

### Authentication and Security
- **JWT** (jsonwebtoken 9.0.2) - Authentication tokens
- **Bcrypt 6.0.0** - Password hashing

### Validation
- **Zod 4.1.12** - Schema validation

### Development
- **ts-node-dev** - Hot reload in development
- **dotenv** - Environment variable management

---

## Requirements

### Authentication & Authorization

- User authentication using email and password
- Passwords hashed using bcrypt before storage
- JWT tokens generated upon successful authentication
- Protected endpoints validate JWT tokens via `Authorization: Bearer <token>` header
- Invalid or missing tokens return 401 Unauthorized error
- Login endpoint returns both token and user data (excluding password)

### User Management

- Complete CRUD operations for users
- User creation requires: username, name, password (min 8 chars), phone, email (unique)
- Passwords hashed before storage
- Email addresses must be unique
- User data never exposes password fields in responses

### Category Management

- Users can create, read, update, and delete categories
- Categories associated with authenticated user
- Users can only access their own categories
- Categories include: name (required), description (optional)

### Payment Method Management

- Support for three types: CREDIT_CARD, BANK_ACCOUNT, CASH
- Credit cards include: cut_off_day, payment_day, credit_limit, current_balance
- Bank accounts include: bank_name, account_number (last 4 digits), account_type
- Payment due date calculation for credit cards
- Users can only access their own payment methods

### Transaction Management

- Support for INCOME and EXPENSE transaction types
- Manual transaction creation with validation
- Recurring payment processing from recurring expenses
- Transaction history with filters (date range, type, category)
- Category snapshots embedded in transactions for historical accuracy
- Transactions ordered by date (descending)

### Recurring Expense Management

- Create recurring expenses with frequencies: WEEKLY, MONTHLY, YEARLY
- Automatic next payment date calculation
- Active/inactive status management
- Users can only access their own recurring expenses

### Security Requirements

- Passwords hashed using bcrypt
- JWT tokens for authentication
- Protected endpoints require valid JWT tokens
- Users can only access their own resources
- Password fields never exposed in API responses
- Authorization header format: `Authorization: Bearer <token>`

For complete requirements documentation, see the detailed requirements section below.

---

## Installation & Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (via Docker Compose or standalone)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the project
npm run build

# Run in development mode
npm run dev

# Run in production mode
npm start
```

### Environment Variables

Create a `.env` file with the following variables:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/financial-app
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

---

## API Documentation

### Base URL

```bash
BASE_URL="http://localhost:3000"
```

### Authentication

#### Login
```bash
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:** Save the `token` from `data.token` for subsequent requests.

### Categories

#### Create Category
```bash
curl -X POST "${BASE_URL}/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Food & Dining",
    "description": "Restaurants, groceries, and food expenses"
  }'
```

#### Get All Categories
```bash
curl -X GET "${BASE_URL}/categories" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Get Category by ID
```bash
curl -X GET "${BASE_URL}/categories/CATEGORY_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Update Category
```bash
curl -X PUT "${BASE_URL}/categories/CATEGORY_ID_HERE" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Updated Category Name",
    "description": "Updated description"
  }'
```

#### Delete Category
```bash
curl -X DELETE "${BASE_URL}/categories/CATEGORY_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Transactions

#### Create Manual Transaction
```bash
curl -X POST "${BASE_URL}/transactions/manual" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "amount": 150.50,
    "description": "Grocery shopping at supermarket",
    "date": "2024-01-15T10:30:00Z",
    "type": "EXPENSE",
    "categoryId": "CATEGORY_ID_HERE",
    "paymentMethodId": "PAYMENT_METHOD_ID_HERE"
  }'
```

#### Process Recurring Payment
```bash
curl -X POST "${BASE_URL}/transactions/recurring/RECURRING_EXPENSE_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Get Transaction History
```bash
curl -X GET "${BASE_URL}/transactions/history" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Get Transaction History (Filtered)
```bash
curl -X GET "${BASE_URL}/transactions/history?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z&type=EXPENSE&categoryId=CATEGORY_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Delete Transaction
```bash
curl -X DELETE "${BASE_URL}/transactions/TRANSACTION_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Recurring Expenses

#### Create Recurring Expense
```bash
curl -X POST "${BASE_URL}/recurring-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Netflix Subscription",
    "amount": 15.99,
    "currency": "USD",
    "categoryId": "CATEGORY_ID_HERE",
    "paymentMethodId": "PAYMENT_METHOD_ID_HERE",
    "frequency": "MONTHLY",
    "payDay": 15,
    "startDate": "2024-01-15T00:00:00Z"
  }'
```

#### Get All Recurring Expenses
```bash
curl -X GET "${BASE_URL}/recurring-expenses" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Update Recurring Expense
```bash
curl -X PUT "${BASE_URL}/recurring-expenses/RECURRING_EXPENSE_ID_HERE" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Updated Netflix Subscription",
    "amount": 19.99,
    "isActive": true
  }'
```

#### Delete Recurring Expense
```bash
curl -X DELETE "${BASE_URL}/recurring-expenses/RECURRING_EXPENSE_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Payment Methods

#### Create Credit Card Payment Method
```bash
curl -X POST "${BASE_URL}/payment-methods" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Visa Credit Card",
    "type": "CREDIT_CARD",
    "currency": "USD",
    "details": {
      "cut_off_day": 15,
      "payment_day": 5,
      "credit_limit": 5000.00,
      "current_balance": 1250.50
    }
  }'
```

#### Create Bank Account Payment Method
```bash
curl -X POST "${BASE_URL}/payment-methods" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Chase Checking Account",
    "type": "BANK_ACCOUNT",
    "currency": "USD",
    "details": {
      "bank_name": "Chase Bank",
      "account_number": "1234",
      "account_type": "CHECKING"
    }
  }'
```

#### Create Cash Payment Method
```bash
curl -X POST "${BASE_URL}/payment-methods" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Cash Wallet",
    "type": "CASH",
    "currency": "USD",
    "details": {}
  }'
```

#### Get All Payment Methods
```bash
curl -X GET "${BASE_URL}/payment-methods" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Calculate Payment Due Date
```bash
curl -X GET "${BASE_URL}/payment-methods/PAYMENT_METHOD_ID_HERE/calculate-due-date?transactionDate=2024-01-20T10:00:00Z" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Delete Payment Method
```bash
curl -X DELETE "${BASE_URL}/payment-methods/PAYMENT_METHOD_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Complete Workflow Example

```bash
# 1. Login
TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}' \
  | jq -r '.data.token')

# 2. Create a category
CATEGORY_ID=$(curl -s -X POST "${BASE_URL}/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name": "Food", "description": "Food expenses"}' \
  | jq -r '.data.id')

# 3. Create a recurring expense
RECURRING_ID=$(curl -s -X POST "${BASE_URL}/recurring-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"name\": \"Netflix\",
    \"amount\": 15.99,
    \"currency\": \"USD\",
    \"categoryId\": \"${CATEGORY_ID}\",
    \"frequency\": \"MONTHLY\",
    \"payDay\": 15,
    \"startDate\": \"2024-01-15T00:00:00Z\"
  }" \
  | jq -r '.data.id')

# 4. Process the recurring payment
curl -X POST "${BASE_URL}/transactions/recurring/${RECURRING_ID}" \
  -H "Authorization: Bearer ${TOKEN}"

# 5. Create a manual transaction
curl -X POST "${BASE_URL}/transactions/manual" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"amount\": 50.00,
    \"description\": \"Lunch\",
    \"date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"type\": \"EXPENSE\",
    \"categoryId\": \"${CATEGORY_ID}\"
  }"

# 6. Get transaction history
curl -X GET "${BASE_URL}/transactions/history" \
  -H "Authorization: Bearer ${TOKEN}"
```

### API Response Structure

#### Success Response
```json
{
  "success": true,
  "data": {
    // Entity data
  }
}
```

#### Error Response
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

## Project Structure

```
api/
├── src/
│   ├── application/              # Application Layer
│   │   ├── dto/                  # Data Transfer Objects
│   │   │   ├── auth/
│   │   │   ├── category/
│   │   │   ├── finance/
│   │   │   ├── notification/
│   │   │   ├── payment-method/
│   │   │   └── user/
│   │   ├── constants/            # Default data
│   │   └── services/             # Application services
│   │
│   ├── domain/                   # Domain Layer
│   │   ├── auth/services/        # Service interfaces
│   │   ├── category/             # Repository interfaces & types
│   │   ├── errors/               # Custom errors
│   │   ├── finance/              # Repositories & types
│   │   ├── health/               # Health service
│   │   ├── notification/         # Repositories & types
│   │   ├── payment-method/       # Repositories & types
│   │   └── user/                 # Repositories & types
│   │
│   ├── infra/                    # Infrastructure Layer
│   │   ├── config/               # Configuration
│   │   ├── database/             # Database clients & models
│   │   ├── http/                 # HTTP Layer (controllers, routes, middleware)
│   │   ├── repositories/         # Repository implementations
│   │   └── services/             # Service implementations
│   │
│   └── index.ts                  # Entry point
│
├── deploy/                       # Deployment configs, scripts & instructions
├── mockups/                      # HTML mockups
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

---

## Contracts Package (fa-contracts)

This project uses the `fa-contracts` package to share type definitions across the codebase. All domain types, interfaces, and enums are centralized in this package.

### Installation

The package is installed from GitHub:

```bash
npm install fa-contracts
```

Or if using a specific branch:

```bash
npm install github:Mateo-6/fa-contracts#main
```

### Structure

The `fa-contracts` package should have the following structure:

```
node_modules/fa-contracts/
├── package.json
├── README.md
└── dist/
    ├── index.js
    ├── index.d.ts
    ├── enums/
    │   ├── index.js
    │   ├── index.d.ts
    │   └── ...
    ├── interfaces/
    │   ├── index.js
    │   ├── index.d.ts
    │   └── ...
    └── types/
        ├── index.js
        ├── index.d.ts
        └── ...
```

### Usage

Domain types are re-exported from `fa-contracts` through the domain layer:

```typescript
// In domain types files (re-export pattern)
export type { User } from 'fa-contracts';
export type { Category, CategoryType } from 'fa-contracts';
```

Then used in the application:

```typescript
import { User } from '../../domain/user/types/user.types';
// Or directly:
import { User } from 'fa-contracts';
```

### Compilation

If the package is not compiled, you may need to compile it:

```bash
cd node_modules/fa-contracts
npm install
npm run build
cd ../..
```

### Benefits

1. **Single Source of Truth**: All domain definitions centralized
2. **Reusability**: Same package can be used by frontend, backend, and Lambdas
3. **Compatibility**: Existing imports work through re-exports
4. **Type Safety**: Full TypeScript type safety maintained

---

## Troubleshooting

### Build Issues

#### Problem: Cannot build the application

If you're having problems compiling after migrating to `fa-contracts`, follow these steps:

1. **Verify the package is installed:**
```bash
npm install
```

2. **Verify the package exists in node_modules:**
```bash
ls -la node_modules/fa-contracts
```

If the package doesn't exist, reinstall:
```bash
npm uninstall fa-contracts
npm install fa-contracts
```

3. **Verify package structure:**
The `fa-contracts` package must have:
- `package.json` with `"main"` and `"types"` fields configured
- Compiled files in `dist/` (if the package needs compilation)
- Or TypeScript source files in `src/` if imported directly

4. **Common issue: Package not compiled:**
If the `fa-contracts` package is not compiled, compile it first:
```bash
cd node_modules/fa-contracts
npm install
npm run build
cd ../..
```

5. **Verify TypeScript errors:**
Run TypeScript directly to see specific errors:
```bash
npx tsc --noEmit
```

6. **Verify package.json of fa-contracts:**
The package's `package.json` must have:
```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

7. **If package is from GitHub:**
If installed from GitHub and there are problems, verify:
- Repository is accessible
- Branch/commit exists
- Repository has necessary files

Reinstall with:
```bash
npm uninstall fa-contracts
npm install github:Mateo-6/fa-contracts#main
```

8. **Error: "Cannot find module 'fa-contracts'"**
- Verify it's in `package.json`
- Reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

9. **Verify tsconfig.json:**
Ensure your `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Complete Diagnostic Steps

1. **Clean and install:**
```bash
rm -rf node_modules package-lock.json dist
npm install
```

2. **Try to build:**
```bash
npm run build
```

3. **If it fails, see specific errors:**
```bash
npx tsc --noEmit 2>&1 | tee build-errors.log
```

4. **Review the `build-errors.log` file for specific errors**

---

## Migration Information

### Migration to fa-contracts

All interfaces, types, and enums from the domain have been migrated to use the `fa-contracts` package.

#### Migrated Files

1. **`src/domain/user/types/user.types.ts`**
   - **Before:** Defined `interface User`
   - **Now:** Re-exports `User` from `fa-contracts`
   - **Compatibility:** ✅ All existing imports still work

2. **`src/domain/category/types/category.types.ts`**
   - **Before:** Defined `enum CategoryType` and `interface Category`
   - **Now:** Re-exports both from `fa-contracts`
   - **Compatibility:** ✅ All existing imports still work

3. **`src/domain/payment-method/types/payment-method.types.ts`**
   - **Before:** Defined multiple types and interfaces
   - **Now:** Re-exports all from `fa-contracts`
   - **Compatibility:** ✅ All existing imports still work

4. **`src/domain/finance/types/transaction.types.ts`**
   - **Before:** Defined transaction-related types
   - **Now:** Re-exports all from `fa-contracts`
   - **Compatibility:** ✅ All existing imports still work

5. **`src/domain/finance/types/recurring-expense.types.ts`**
   - **Before:** Defined recurring expense types
   - **Now:** Re-exports all from `fa-contracts`
   - **Compatibility:** ✅ All existing imports still work

#### Benefits

1. **Single Source of Truth:** All domain definitions centralized in `fa-contracts`
2. **Reusability:** Same package can be used by frontend, backend, and Lambdas
3. **Compatibility:** Existing imports don't need changes thanks to re-exports
4. **POJO:** All interfaces are Plain Old JavaScript Objects without Mongoose dependencies
5. **Type Safety:** Maintains full TypeScript type safety

#### Files That Don't Require Changes

Thanks to re-exports, **no files that import from `domain/*/types` need changes**. All the following files continue to work without modifications:

- ✅ All services (`src/application/services/*`)
- ✅ All repositories (`src/infra/repositories/*`)
- ✅ All models (`src/infra/database/models/*`)
- ✅ All DTOs (`src/application/dto/*`)
- ✅ All controllers (`src/infra/http/controllers/*`)

#### Verification

To verify everything works correctly:

```bash
# Compile the project
npm run build

# Run in development mode
npm run dev
```

#### Future Steps (Optional)

If you want to simplify further in the future, you can:

1. **Update imports directly:** Change imports from `domain/*/types` to `fa-contracts` directly
2. **Remove intermediate files:** Once all imports point directly to `fa-contracts`, you can remove the re-export files

Example of future migration:

**Before:**
```typescript
import { User } from '../../domain/user/types/user.types';
```

**After:**
```typescript
import { User } from 'fa-contracts';
```

But this is **optional** - the current structure works perfectly.

---

## Data Models

### User
```typescript
{
  id: string;                    // UUID
  username: string;               // 1-100 characters
  name: string;                   // 1-100 characters
  password: string;               // Hashed with bcrypt (never exposed)
  phone: string;                  // 1-100 characters
  email: string;                  // Unique email
  createdAt: Date;
  updatedAt: Date;
}
```

### Category
```typescript
{
  id: string;
  name: string;                   // Required
  description?: string;           // Optional
  userId: string;                 // Owner
  createdAt: Date;
  updatedAt: Date;
}
```

### PaymentMethod
```typescript
{
  id: string;
  userId: string;
  name: string;
  type: 'CREDIT_CARD' | 'BANK_ACCOUNT' | 'CASH';
  currency: string;
  details: CreditCardDetails | BankAccountDetails | CashDetails;
  createdAt: Date;
  updatedAt: Date;
}

// CreditCardDetails
{
  cut_off_day: number;      // 1-31: Statement closing day
  payment_day: number;       // 1-31: Payment due date
  credit_limit: number;
  current_balance: number;
}

// BankAccountDetails
{
  bank_name: string;
  account_number: string;    // Last 4 digits
  account_type: 'SAVINGS' | 'CHECKING';
}

// CashDetails
{}  // Empty object
```

### Transaction
```typescript
{
  id: string;
  userId: string;
  amount: number;                 // Positive
  description: string;             // 1-500 characters
  date: Date;                      // ISO 8601
  type: 'INCOME' | 'EXPENSE';
  category: CategorySnapshot;      // Embedded snapshot
  paymentMethodId: string;
  isRecurring: boolean;
  recurringExpenseId?: string;     // Optional
  createdAt: Date;
  updatedAt: Date;
}

// CategorySnapshot (embedded in Transaction)
{
  id: string;
  name: string;
  icon?: string;
}
```

### RecurringExpense
```typescript
{
  id: string;
  userId: string;
  name: string;                   // 1-100 characters
  amount: number;                 // Positive
  currency: string;               // 1-10 characters
  categoryId: string;
  paymentMethodId: string;
  frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  payDay: number;                 // 1-31
  startDate: Date;
  nextPaymentDate: Date;
  isActive: boolean;              // Default: true
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Security

### Implemented Measures

1. **Password Hashing**: Bcrypt with automatic salt
2. **JWT Tokens**: Signed tokens with expiration
3. **Input Validation**: Zod schemas on all endpoints
4. **Authorization**: Users only access their own resources
5. **Generic Messages**: "Invalid credentials" to prevent enumeration
6. **Secure Headers**: `Bearer <token>` format validation
7. **Sanitization**: No password exposure in responses

### Authentication Flow

```
1. User sends email/password → POST /auth/login
2. System validates credentials
3. If valid → Generates JWT with { id: userId }
4. Returns token + user data (without password)
5. Client includes token in header: Authorization: Bearer <token>
6. Middleware validates token on every protected request
7. Extracts userId from token and attaches to request
```

---

## API Endpoints Summary

### Authentication
- `POST /auth/login` - User login

### Users
- `POST /users` - Create user
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Categories
- `POST /categories` - Create category (protected)
- `GET /categories` - Get all user categories (protected)
- `GET /categories/:id` - Get category by ID (protected)
- `PUT /categories/:id` - Update category (protected)
- `DELETE /categories/:id` - Delete category (protected)

### Payment Methods
- `POST /payment-methods` - Create payment method (protected)
- `GET /payment-methods` - Get all user payment methods (protected)
- `GET /payment-methods/:id/calculate-due-date` - Calculate payment due date (protected)
- `DELETE /payment-methods/:id` - Delete payment method (protected)

### Transactions
- `POST /transactions/manual` - Create manual transaction (protected)
- `POST /transactions/recurring/:recurringExpenseId` - Process recurring payment (protected)
- `GET /transactions/history` - Get transaction history with filters (protected)
- `DELETE /transactions/:id` - Delete transaction (protected)

### Recurring Expenses
- `POST /recurring-expenses` - Create recurring expense (protected)
- `GET /recurring-expenses` - Get all user recurring expenses (protected)
- `PUT /recurring-expenses/:id` - Update recurring expense (protected)
- `DELETE /recurring-expenses/:id` - Delete recurring expense (protected)

### Health
- `GET /health` - Health check (public)

---

## Future Enhancements

The following features are identified as potential future enhancements but are not part of the current implementation:

- Budget management and tracking
- Financial reports and analytics
- Transaction updates
- Payment method updates
- Transfer between payment methods
- Financial goals
- Data export (CSV, PDF)
- Notifications and reminders
- Advanced search and filtering
- Debt and loan tracking
- Investment tracking
- Automatic recurring payment processing (cron jobs)
- File attachments for transactions
- Multi-currency conversion
- Tags/labels for transactions

---

## License

ISC

---

## Version

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: Production Ready

