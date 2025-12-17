# CURL Examples for Financial App API

## Base URL
```bash
BASE_URL="http://localhost:3000"
```

## Authentication

### Login
```bash
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:** Save the `token` from `data.token` for subsequent requests.

---

## Categories

### Create Category
```bash
curl -X POST "${BASE_URL}/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Food & Dining",
    "description": "Restaurants, groceries, and food expenses"
  }'
```

### Get All Categories
```bash
curl -X GET "${BASE_URL}/categories" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Category by ID
```bash
curl -X GET "${BASE_URL}/categories/CATEGORY_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Category
```bash
curl -X PUT "${BASE_URL}/categories/CATEGORY_ID_HERE" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Updated Category Name",
    "description": "Updated description"
  }'
```

### Delete Category
```bash
curl -X DELETE "${BASE_URL}/categories/CATEGORY_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Transactions

### Create Manual Transaction
```bash
curl -X POST "${BASE_URL}/transactions/manual" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "amount": 150.50,
    "description": "Grocery shopping at supermarket",
    "date": "2024-01-15T10:30:00Z",
    "type": "EXPENSE",
    "categoryId": "CATEGORY_ID_HERE"
  }'
```

**Note:** `type` can be `"INCOME"` or `"EXPENSE"`

### Process Recurring Payment
```bash
curl -X POST "${BASE_URL}/transactions/recurring/RECURRING_EXPENSE_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Transaction History (All)
```bash
curl -X GET "${BASE_URL}/transactions/history" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Transaction History (Filtered)
```bash
curl -X GET "${BASE_URL}/transactions/history?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z&type=EXPENSE&categoryId=CATEGORY_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Query Parameters (all optional):**
- `startDate`: ISO 8601 date string
- `endDate`: ISO 8601 date string
- `type`: `"INCOME"` or `"EXPENSE"`
- `categoryId`: Category ID string

### Update Transaction (INCOME only)
```bash
curl -X PUT "${BASE_URL}/transactions/TRANSACTION_ID_HERE" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "amount": 200.00,
    "description": "Updated salary payment",
    "date": "2024-01-15T10:30:00Z",
    "categoryId": "CATEGORY_ID_HERE",
    "paymentMethodId": "PAYMENT_METHOD_ID_HERE"
  }'
```

**Note:** 
- Only INCOME transactions can be updated
- All fields (`amount`, `description`, `date`, `categoryId`, `paymentMethodId`) are optional
- At least one field must be provided
- `paymentMethodId` is optional for INCOME transactions

### Delete Transaction
```bash
curl -X DELETE "${BASE_URL}/transactions/TRANSACTION_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Recurring Expenses

### Create Recurring Expense
```bash
curl -X POST "${BASE_URL}/recurring-expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Netflix Subscription",
    "amount": 15.99,
    "currency": "USD",
    "categoryId": "CATEGORY_ID_HERE",
    "paymentMethodId": "credit_card_123",
    "frequency": "MONTHLY",
    "payDay": 15,
    "startDate": "2024-01-15T00:00:00Z"
  }'
```

**Frequency options:** `"WEEKLY"`, `"MONTHLY"`, `"YEARLY"`  
**payDay:** Day of the month (1-31)

### Get All Recurring Expenses
```bash
curl -X GET "${BASE_URL}/recurring-expenses" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Recurring Expense
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

**Updateable fields:** `name`, `amount`, `currency`, `categoryId`, `paymentMethodId`, `frequency`, `payDay`, `startDate`, `nextPaymentDate`, `isActive`

### Delete Recurring Expense
```bash
curl -X DELETE "${BASE_URL}/recurring-expenses/RECURRING_EXPENSE_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Payment Methods

### Create Credit Card Payment Method
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

**Note:** For `CREDIT_CARD` type:
- `cut_off_day`: Day of the month when the statement closes (1-31)
- `payment_day`: Payment due date (1-31)
- `credit_limit`: Maximum credit available
- `current_balance`: Current outstanding balance

### Create Bank Account Payment Method
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

**Note:** For `BANK_ACCOUNT` type:
- `bank_name`: Name of the bank
- `account_number`: Last 4 digits of the account (exactly 4 digits)
- `account_type`: `"SAVINGS"` or `"CHECKING"`

### Create Cash Payment Method
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

**Note:** For `CASH` type, `details` can be an empty object or omitted.

### Get All Payment Methods
```bash
curl -X GET "${BASE_URL}/payment-methods" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Calculate Payment Due Date
```bash
curl -X GET "${BASE_URL}/payment-methods/PAYMENT_METHOD_ID_HERE/calculate-due-date?transactionDate=2024-01-20T10:00:00Z" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Query Parameters:**
- `transactionDate`: ISO 8601 date string (required)

**Response:** Returns the payment due date for credit cards, or `null` for other payment methods.

**Business Logic:**
- If transaction date is **before** `cut_off_day` → payment due on `payment_day` of **current month**
- If transaction date is **on or after** `cut_off_day` → payment due on `payment_day` of **next month**
- Handles year transitions (e.g., December → January)

### Delete Payment Method
```bash
curl -X DELETE "${BASE_URL}/payment-methods/PAYMENT_METHOD_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Complete Workflow Example

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

