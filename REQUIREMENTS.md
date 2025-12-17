# Financial App API - Requirements Document

## 1. Overview

This document describes the functional and non-functional requirements for the Financial App API, a personal finance management system that allows users to track income, expenses, recurring payments, and manage their financial data.

---

## 2. Authentication & Authorization

### 2.1 User Authentication

**REQ-AUTH-001**: The system must authenticate users using email and password.

**REQ-AUTH-002**: Passwords must be hashed using bcrypt before storage.

**REQ-AUTH-003**: The system must generate JWT tokens upon successful authentication.

**REQ-AUTH-004**: JWT tokens must contain the user ID in the payload.

**REQ-AUTH-005**: Protected endpoints must validate JWT tokens via the `Authorization: Bearer <token>` header format.

**REQ-AUTH-006**: Invalid or missing tokens must return a 401 Unauthorized error.

**REQ-AUTH-007**: Login endpoint must return both the token and user data (excluding password).

**Business Rules:**
- Invalid credentials must return a generic "Invalid credentials" message (security best practice).
- Token verification must extract user ID from the decoded token payload.

---

## 3. User Management

### 3.1 User Registration

**REQ-USER-001**: The system must allow creation of new users.

**REQ-USER-002**: User creation must require the following fields:
- `username`: String, 1-100 characters, required
- `name`: String, 1-100 characters, required
- `password`: String, minimum 8 characters, required
- `phone`: String, 1-100 characters, required
- `email`: String, valid email format, required, unique

**REQ-USER-003**: Passwords must be hashed before storage.

**REQ-USER-004**: Email addresses must be unique across all users.

### 3.2 User Retrieval

**REQ-USER-005**: The system must allow retrieval of all users.

**REQ-USER-006**: The system must allow retrieval of a single user by ID.

**REQ-USER-007**: User data must never expose password fields in responses.

### 3.3 User Update

**REQ-USER-008**: The system must allow updating user information.

**REQ-USER-009**: User updates must validate that the user exists.

**REQ-USER-010**: Partial updates must be supported (only provided fields are updated).

### 3.4 User Deletion

**REQ-USER-011**: The system must allow deletion of users by ID.

**REQ-USER-012**: User deletion must validate that the user exists before deletion.

---

## 4. Category Management

### 4.1 Category Creation

**REQ-CAT-001**: The system must allow users to create categories for organizing transactions.

**REQ-CAT-002**: Category creation must require:
- `name`: String, required
- `description`: String, optional

**REQ-CAT-003**: Categories must be associated with the authenticated user (userId from JWT).

**REQ-CAT-004**: Category creation must validate that the user exists.

### 4.2 Category Retrieval

**REQ-CAT-005**: The system must allow retrieval of all categories for the authenticated user.

**REQ-CAT-006**: The system must allow retrieval of a single category by ID.

**REQ-CAT-007**: Users can only access their own categories.

### 4.3 Category Update

**REQ-CAT-008**: The system must allow updating category information.

**REQ-CAT-009**: Category updates must validate:
- The category exists
- The category belongs to the authenticated user

**REQ-CAT-010**: Partial updates must be supported.

**Business Rules:**
- Users cannot update categories that do not belong to them (403 Forbidden).

### 4.4 Category Deletion

**REQ-CAT-011**: The system must allow deletion of categories.

**REQ-CAT-012**: Category deletion must validate:
- The category exists
- The category belongs to the authenticated user

**Business Rules:**
- Users cannot delete categories that do not belong to them (403 Forbidden).

---

## 5. Payment Method Management

### 5.1 Payment Method Types

**REQ-PM-001**: The system must support three payment method types:
- `CREDIT_CARD`: Credit card with billing cycle details
- `BANK_ACCOUNT`: Bank account (checking or savings)
- `CASH`: Cash payments

### 5.2 Payment Method Creation

**REQ-PM-002**: The system must allow users to create payment methods.

**REQ-PM-003**: Payment method creation must require:
- `name`: String, required
- `type`: Enum (CREDIT_CARD, BANK_ACCOUNT, CASH), required
- `currency`: String, required

**REQ-PM-004**: Payment method details must vary by type:

**Credit Card Details:**
- `cut_off_day`: Number (1-31), day of month when statement closes
- `payment_day`: Number (1-31), payment due date
- `credit_limit`: Number, maximum credit available
- `current_balance`: Number, current outstanding balance

**Bank Account Details:**
- `bank_name`: String, name of the bank
- `account_number`: String, last 4 digits of account (exactly 4 digits)
- `account_type`: Enum (SAVINGS, CHECKING)

**Cash Details:**
- Empty object (no specific details required)

**REQ-PM-005**: Payment methods must be associated with the authenticated user.

**REQ-PM-006**: Payment method creation must validate that the user exists.

### 5.3 Payment Method Retrieval

**REQ-PM-007**: The system must allow retrieval of all payment methods for the authenticated user.

**REQ-PM-008**: Users can only access their own payment methods.

### 5.4 Payment Due Date Calculation

**REQ-PM-009**: The system must calculate payment due dates for credit card transactions.

**REQ-PM-010**: Payment due date calculation logic:
- If payment method is NOT a credit card → return `null` (paid immediately)
- If transaction date is BEFORE `cut_off_day` → payment due on `payment_day` of CURRENT month
- If transaction date is ON or AFTER `cut_off_day` → payment due on `payment_day` of NEXT month
- Must handle year transitions (e.g., December → January)
- Must handle months with fewer days (e.g., if payment_day is 31 but month has 30 days, use last day of month)

**REQ-PM-011**: Payment due date calculation must validate that the payment method exists.

### 5.5 Payment Method Deletion

**REQ-PM-012**: The system must allow deletion of payment methods.

**REQ-PM-013**: Payment method deletion must validate:
- The payment method exists
- The payment method belongs to the authenticated user

**Business Rules:**
- Users cannot delete payment methods that do not belong to them (403 Forbidden).

---

## 6. Transaction Management

### 6.1 Transaction Types

**REQ-TXN-001**: The system must support two transaction types:
- `INCOME`: Money received
- `EXPENSE`: Money spent

### 6.2 Manual Transaction Creation

**REQ-TXN-002**: The system must allow users to create manual transactions.

**REQ-TXN-003**: Manual transaction creation must require:
- `amount`: Number, positive, required
- `description`: String, 1-500 characters, required
- `date`: Date (ISO 8601 string or Date object), required, valid date format
- `type`: Enum (INCOME, EXPENSE), required
- `categoryId`: String, required
- `paymentMethodId`: String, required

**REQ-TXN-004**: Manual transactions must:
- Be associated with the authenticated user
- Validate that the category exists and belongs to the user
- Validate that the payment method exists and belongs to the user
- Store a snapshot of the category (id, name, icon) to avoid lookups

**REQ-TXN-005**: Manual transactions must be marked as `isRecurring: false`.

**Business Rules:**
- Category snapshots prevent data inconsistency if categories are later modified or deleted.
- Users cannot use categories or payment methods that do not belong to them (403 Forbidden).

### 6.3 Recurring Payment Processing

**REQ-TXN-006**: The system must allow processing payments from recurring expenses.

**REQ-TXN-007**: Recurring payment processing must:
- Validate that the recurring expense exists
- Validate that the recurring expense belongs to the authenticated user
- Validate that the recurring expense is active
- Create a transaction with the recurring expense details
- Update the `nextPaymentDate` of the recurring expense

**REQ-TXN-008**: Transactions created from recurring expenses must:
- Use the recurring expense amount
- Use the recurring expense name as description
- Use the current date as transaction date
- Be marked as `type: EXPENSE`
- Be marked as `isRecurring: true`
- Store the `recurringExpenseId` reference

**REQ-TXN-009**: After processing a recurring payment, the system must calculate and update the next payment date based on:
- Current date
- Recurring expense `payDay`
- Recurring expense `frequency` (WEEKLY, MONTHLY, YEARLY)

**Business Rules:**
- Only active recurring expenses can be processed.
- Next payment date calculation must handle edge cases (months with fewer days, leap years, year transitions).

### 6.4 Transaction History

**REQ-TXN-010**: The system must allow retrieval of transaction history for the authenticated user.

**REQ-TXN-011**: Transaction history must support optional filters:
- `startDate`: Date (ISO 8601), filter transactions from this date onwards
- `endDate`: Date (ISO 8601), filter transactions up to this date
- `type`: Enum (INCOME, EXPENSE), filter by transaction type
- `categoryId`: String, filter by category

**REQ-TXN-012**: Transaction history must be ordered by date (descending - most recent first).

**REQ-TXN-013**: All filters are optional and can be combined.

**REQ-TXN-014**: Transaction history must only return transactions belonging to the authenticated user.

### 6.5 Transaction Deletion

**REQ-TXN-015**: The system must allow deletion of transactions.

**REQ-TXN-016**: Transaction deletion must validate:
- The transaction exists
- The transaction belongs to the authenticated user

**Business Rules:**
- Users cannot delete transactions that do not belong to them (403 Forbidden).

---

## 7. Recurring Expense Management

### 7.1 Recurring Expense Creation

**REQ-REC-001**: The system must allow users to create recurring expenses (subscriptions, fixed payments).

**REQ-REC-002**: Recurring expense creation must require:
- `name`: String, 1-100 characters, required
- `amount`: Number, positive, required
- `currency`: String, 1-10 characters, required
- `categoryId`: String, required
- `paymentMethodId`: String, required
- `frequency`: Enum (WEEKLY, MONTHLY, YEARLY), required
- `payDay`: Number (1-31), integer, required (used for MONTHLY and YEARLY frequencies)
- `startDate`: Date (ISO 8601 string or Date object), required, valid date format

**REQ-REC-003**: Recurring expense creation must:
- Validate that the user exists
- Validate that the payment method exists and belongs to the user
- Calculate the initial `nextPaymentDate` based on startDate, payDay, and frequency
- Set `isActive: true` by default

**REQ-REC-004**: Next payment date calculation logic:
- **WEEKLY**: Add 7 days from start date (or from now if start date is in the past)
- **MONTHLY**: Use the payDay of the month (next month if start date is in the past)
- **YEARLY**: Use the payDay of the month in the next year
- Must handle months with fewer days (e.g., Feb 31 → Feb 28/29)
- Must handle leap years

**Business Rules:**
- Recurring expenses represent configurations, not payment history.
- The actual payments are created as transactions when processed.

### 7.2 Recurring Expense Retrieval

**REQ-REC-005**: The system must allow retrieval of all recurring expenses for the authenticated user.

**REQ-REC-006**: Users can only access their own recurring expenses.

### 7.3 Recurring Expense Update

**REQ-REC-007**: The system must allow updating recurring expense information.

**REQ-REC-008**: Recurring expense updates must validate:
- The recurring expense exists
- The recurring expense belongs to the authenticated user

**REQ-REC-009**: Updatable fields include:
- `name`
- `amount`
- `currency`
- `categoryId`
- `paymentMethodId`
- `frequency`
- `payDay`
- `startDate`
- `nextPaymentDate`
- `isActive`

**REQ-REC-010**: Partial updates must be supported.

**Business Rules:**
- Users cannot update recurring expenses that do not belong to them (403 Forbidden).

### 7.4 Recurring Expense Deletion

**REQ-REC-011**: The system must allow deletion of recurring expenses.

**REQ-REC-012**: Recurring expense deletion must validate:
- The recurring expense exists
- The recurring expense belongs to the authenticated user

**Business Rules:**
- Users cannot delete recurring expenses that do not belong to them (403 Forbidden).

---

## 8. Health Check

**REQ-HEALTH-001**: The system must provide a health check endpoint.

**REQ-HEALTH-002**: The health check endpoint must be publicly accessible (no authentication required).

**REQ-HEALTH-003**: The health check endpoint must return system status information.

---

## 9. Data Validation & Error Handling

### 9.1 Input Validation

**REQ-VAL-001**: All input data must be validated using Zod schemas.

**REQ-VAL-002**: Validation errors must return appropriate error messages indicating which fields are invalid.

**REQ-VAL-003**: Date fields must accept both ISO 8601 strings and Date objects, and be transformed to Date objects.

**REQ-VAL-004**: Numeric fields must validate:
- Positive numbers for amounts
- Integer ranges for day fields (1-31)
- String length constraints for text fields

### 9.2 Error Responses

**REQ-ERR-001**: The system must return appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `204`: No Content (successful deletion)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication errors)
- `403`: Forbidden (authorization errors)
- `404`: Not Found (resource not found)
- `500`: Internal Server Error

**REQ-ERR-002**: Error responses must include descriptive error messages.

**REQ-ERR-003**: The system must use a centralized error handler middleware.

**REQ-ERR-004**: Authentication errors must be generic ("Invalid credentials") to prevent user enumeration.

---

## 10. Security Requirements

**REQ-SEC-001**: Passwords must be hashed using bcrypt before storage.

**REQ-SEC-002**: JWT tokens must be used for authentication.

**REQ-SEC-003**: Protected endpoints must require valid JWT tokens.

**REQ-SEC-004**: Users can only access and modify their own resources (categories, payment methods, transactions, recurring expenses).

**REQ-SEC-005**: Password fields must never be exposed in API responses.

**REQ-SEC-006**: Authorization header must follow the format: `Authorization: Bearer <token>`.

---

## 11. Data Persistence

**REQ-DATA-001**: The system must support multiple database backends:
- MongoDB (via Mongoose) - primary implementation
- MySQL (via Prisma) - alternative implementation

**REQ-DATA-002**: User data can be stored in:
- MongoDB
- MySQL (Prisma)
- In-memory (for testing)

**REQ-DATA-003**: All entities must include:
- `id`: Unique identifier (UUID or MongoDB ObjectId)
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**REQ-DATA-004**: Category snapshots must be embedded in transactions to avoid data inconsistency.

---

## 12. API Structure

**REQ-API-001**: The API must follow RESTful conventions.

**REQ-API-002**: All endpoints must return consistent response formats:
- Success responses: `{ success: true, data: <response_data> }`
- Error responses: `{ success: false, error: <error_message> }`

**REQ-API-003**: The API must use JSON for request and response bodies.

**REQ-API-004**: The API must support CORS if needed for frontend integration.

---

## 13. Business Logic Rules

**REQ-BIZ-001**: Category snapshots in transactions prevent data inconsistency when categories are modified or deleted.

**REQ-BIZ-002**: Recurring expenses are configurations, not payment history. Actual payments are created as transactions.

**REQ-BIZ-003**: Payment due dates for credit cards are calculated based on cut-off day and payment day logic.

**REQ-BIZ-004**: Next payment dates for recurring expenses must handle edge cases:
- Months with fewer days than payDay
- Leap years
- Year transitions
- Past start dates

**REQ-BIZ-005**: Only active recurring expenses can be processed into transactions.

**REQ-BIZ-006**: Transaction history must be ordered by date (descending) by default.

---

## 14. Non-Functional Requirements

**REQ-NFR-001**: The API must be built with TypeScript.

**REQ-NFR-002**: The API must use Express.js as the web framework.

**REQ-NFR-003**: The API must follow a clean architecture pattern:
- Domain layer (types, repositories interfaces, business logic)
- Application layer (services, DTOs)
- Infrastructure layer (HTTP controllers, routes, database implementations)

**REQ-NFR-004**: The API must use dependency injection for service composition.

**REQ-NFR-005**: The API must use async/await for asynchronous operations.

**REQ-NFR-006**: The API must use middleware for:
- Authentication
- Request validation
- Error handling
- Async request handling

---

## 15. Endpoints Summary

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

## 16. Data Models

### User
```typescript
{
  id: string;
  username: string;
  name: string;
  password: string; // hashed, never exposed
  phone: string;
  email: string; // unique
  createdAt: Date;
  updatedAt: Date;
}
```

### Category
```typescript
{
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Payment Method
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
```

### Transaction
```typescript
{
  id: string;
  userId: string;
  amount: number;
  description: string;
  date: Date;
  type: 'INCOME' | 'EXPENSE';
  category: CategorySnapshot; // embedded snapshot
  paymentMethodId: string;
  isRecurring: boolean;
  recurringExpenseId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Recurring Expense
```typescript
{
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  categoryId: string;
  paymentMethodId: string;
  frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  payDay: number; // 1-31
  startDate: Date;
  nextPaymentDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 17. Assumptions & Constraints

**ASSUMPTION-001**: Users manage their own financial data (single-user system, not multi-tenant).

**ASSUMPTION-002**: Categories can be modified or deleted, but transaction history preserves category snapshots.

**ASSUMPTION-003**: Recurring expenses are manually processed (no automatic cron jobs for payment processing).

**ASSUMPTION-004**: Payment methods are not automatically updated with balances (current_balance for credit cards is manual).

**ASSUMPTION-005**: The system supports multiple currencies but does not perform currency conversion.

**CONSTRAINT-001**: Transaction updates are not supported (only creation and deletion).

**CONSTRAINT-002**: Payment method updates are not supported (only creation and deletion).

---

## 18. Future Enhancements (Out of Scope)

The following features are identified as potential future enhancements but are not part of the current requirements:

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

## Document Version

**Version**: 1.0  
**Last Updated**: Based on current implementation  
**Status**: Current Requirements




