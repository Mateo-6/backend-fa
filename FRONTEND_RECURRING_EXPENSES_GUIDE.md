# Frontend Guide: Recurring Expenses - payDay Behavior

## Overview

This document explains how the `payDay` field works in Recurring Expenses based on the `frequency` type. The frontend needs to understand this behavior to provide the correct UX and validation.

## API Behavior

### Field: `payDay`
- **Type**: Number (integer)
- **Range**: 1-31
- **Required**: Yes (always required in API, but behavior differs by frequency)
- **Purpose**: Day of the month when payment occurs (only meaningful for MONTHLY and YEARLY)

### Field: `frequency`
- **Type**: Enum
- **Values**: `WEEKLY`, `MONTHLY`, `YEARLY`

---

## How `payDay` Works by Frequency

### 1. WEEKLY Frequency

**Behavior:**
- The `payDay` value is **accepted but completely ignored** by the API
- The API simply adds 7 days from the `startDate` (or from today if `startDate` is in the past)
- The `payDay` number has no meaning for weekly payments

**Example:**
```json
{
  "name": "Weekly Coffee",
  "frequency": "WEEKLY",
  "payDay": 1,        // ← This value is ignored!
  "startDate": "2024-01-15T00:00:00Z"
}
```
- Next payment: 2024-01-22 (7 days from startDate, regardless of payDay value)

**Frontend Recommendations:**
- ✅ **Option A (Recommended)**: Hide the `payDay` field when `frequency === "WEEKLY"`
- ✅ **Option B**: Show the field but disable it with a tooltip explaining it's not used for weekly payments
- ✅ **Option C**: Allow any value 1-31 but show a warning/note that it won't affect the payment schedule

---

### 2. MONTHLY Frequency

**Behavior:**
- The `payDay` value **defines the day of each month** when payment occurs
- Valid range: 1-31
- If the month has fewer days (e.g., February), the payment occurs on the last day of that month

**Example:**
```json
{
  "name": "Rent",
  "frequency": "MONTHLY",
  "payDay": 1,        // ← Payment on the 1st of every month
  "startDate": "2024-01-15T00:00:00Z"
}
```
- Next payment: 2024-02-01 (1st of next month)

**Example with February (fewer days):**
```json
{
  "name": "Rent",
  "frequency": "MONTHLY",
  "payDay": 31,       // ← If month has < 31 days, uses last day
  "startDate": "2024-01-15T00:00:00Z"
}
```
- February payment: 2024-02-29 (leap year) or 2024-02-28 (non-leap year)

**Frontend Recommendations:**
- ✅ Show `payDay` as a number input (1-31)
- ✅ Show validation: "Day of the month (1-31)"
- ✅ Consider showing a helper text: "Payment will occur on this day each month"

---

### 3. YEARLY Frequency

**Behavior:**
- The `payDay` value **defines the day of the month**, but **preserves the month from `startDate`**
- The payment always occurs in the **same month as the original `startDate`**, every year
- Valid range: 1-31
- If the month has fewer days (e.g., February in non-leap year), payment occurs on the last day

**Example:**
```json
{
  "name": "Annual Subscription",
  "frequency": "YEARLY",
  "payDay": 1,        // ← Payment on the 1st day
  "startDate": "2024-01-15T00:00:00Z"  // ← Month is January
}
```
- Next payment: 2025-01-01 (1st of January, preserving the month from startDate)
- Following payment: 2026-01-01 (always in January, not in current month)

**Example with different month:**
```json
{
  "name": "Annual Insurance",
  "frequency": "YEARLY",
  "payDay": 15,
  "startDate": "2024-06-10T00:00:00Z"  // ← Month is June
}
```
- Next payment: 2025-06-15 (15th of June, preserving the month from startDate)

**Frontend Recommendations:**
- ✅ Show `payDay` as a number input (1-31)
- ✅ **Important**: Show a clear message explaining that the payment will occur in the **same month as the startDate** every year
- ✅ Consider showing: "Payment will occur on day [payDay] of [startDate month] each year"
- ✅ Show validation: "Day of the month (1-31) - Payment will preserve the month from start date"

---

## UI/UX Recommendations Summary

### Form Field Display Logic

```javascript
// Recommended approach:
const showPayDayField = frequency !== 'WEEKLY';

// Or if showing for all:
const payDayFieldDisabled = frequency === 'WEEKLY';
const payDayFieldHelperText = 
  frequency === 'WEEKLY' 
    ? 'Not used for weekly payments - payment occurs 7 days after start date'
    : frequency === 'MONTHLY'
    ? 'Day of the month when payment occurs (1-31)'
    : 'Day of the month, preserving the month from start date (1-31)';
```

### Validation Rules

1. **All frequencies**: `payDay` must be between 1-31 (integer)
2. **WEEKLY**: Value is accepted but ignored - no special validation needed
3. **MONTHLY/YEARLY**: Standard validation (1-31, integer)

### User Communication Examples

**For WEEKLY:**
- "Weekly payments occur 7 days from the start date. The day of month field is not used."

**For MONTHLY:**
- "Payment will occur on day [payDay] of each month."
- "If a month has fewer days (e.g., February), payment will occur on the last day of that month."

**For YEARLY:**
- "Payment will occur on day [payDay] of [month from startDate] each year."
- "Example: If start date is January 15th and day is 1, payment will be January 1st each year."

---

## API Request Examples

### WEEKLY
```json
POST /recurring-expenses
{
  "name": "Weekly Groceries",
  "amount": 100.00,
  "currency": "USD",
  "categoryId": "cat123",
  "paymentMethodId": "pm123",
  "frequency": "WEEKLY",
  "payDay": 1,  // ← Accepted but ignored
  "startDate": "2024-01-15T00:00:00Z"
}
```

### MONTHLY
```json
POST /recurring-expenses
{
  "name": "Rent",
  "amount": 1200.00,
  "currency": "USD",
  "categoryId": "cat123",
  "paymentMethodId": "pm123",
  "frequency": "MONTHLY",
  "payDay": 1,  // ← Used: 1st of each month
  "startDate": "2024-01-15T00:00:00Z"
}
```

### YEARLY
```json
POST /recurring-expenses
{
  "name": "Annual Subscription",
  "amount": 99.99,
  "currency": "USD",
  "categoryId": "cat123",
  "paymentMethodId": "pm123",
  "frequency": "YEARLY",
  "payDay": 1,  // ← Used: 1st day of startDate's month each year
  "startDate": "2024-01-15T00:00:00Z"  // ← Month preserved: January
}
```

---

## Testing Scenarios for Frontend

### Scenario 1: WEEKLY with payDay = 1
- User selects: `frequency = WEEKLY`, `payDay = 1`, `startDate = 2024-01-15`
- Expected behavior: Next payment calculated as 2024-01-22 (7 days later)
- UI should: Show that payDay doesn't affect the schedule

### Scenario 2: MONTHLY with payDay = 1
- User selects: `frequency = MONTHLY`, `payDay = 1`, `startDate = 2024-01-15`
- Expected behavior: Next payment on 2024-02-01 (1st of next month)
- UI should: Show clear indication of monthly pattern

### Scenario 3: YEARLY with payDay = 1, startDate in January
- User selects: `frequency = YEARLY`, `payDay = 1`, `startDate = 2024-01-15`
- Expected behavior: Next payment on 2025-01-01 (1st of January, preserving month)
- UI should: Emphasize that month from startDate is preserved

### Scenario 4: YEARLY with payDay = 1, startDate in June
- User selects: `frequency = YEARLY`, `payDay = 1`, `startDate = 2024-06-15`
- Expected behavior: Next payment on 2025-06-01 (1st of June, preserving month)
- UI should: Show "June 1st each year" in preview/confirmation

---

## Questions?

If you need clarification on any behavior, please refer to:
- API endpoint: `POST /recurring-expenses`
- API endpoint: `GET /recurring-expenses` (to see calculated `nextPaymentDate`)
- Source code: `src/application/services/recurring-expense.service.ts` (method: `calculateNextPaymentDate`)
