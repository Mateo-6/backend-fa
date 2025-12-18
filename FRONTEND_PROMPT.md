# Prompt for Frontend Team: Recurring Expenses payDay Implementation

## Context

We need to update the Recurring Expenses form in the frontend to properly handle the `payDay` field based on the selected `frequency`. The API behavior differs significantly depending on the frequency type.

## Task

Update the Recurring Expenses creation/editing form to:

1. **Conditionally display or disable the `payDay` field** based on `frequency` selection
2. **Show appropriate helper text/validation messages** explaining how `payDay` works for each frequency
3. **Update form validation** to reflect the actual API behavior

## Behavior Details

### WEEKLY Frequency
- **payDay field**: Should be hidden OR disabled with explanation
- **Reason**: The API accepts but completely ignores the `payDay` value for weekly payments
- **Actual behavior**: Payment occurs 7 days from `startDate` (or from today if `startDate` is in the past)
- **User message**: "Weekly payments occur 7 days from the start date. Day of month is not used."

### MONTHLY Frequency
- **payDay field**: Should be shown and enabled
- **Validation**: Number between 1-31
- **Behavior**: Payment occurs on this day of each month
- **Edge case**: If month has fewer days (e.g., February), payment occurs on the last day of that month
- **User message**: "Payment will occur on this day each month (e.g., 15 = 15th of every month)"

### YEARLY Frequency
- **payDay field**: Should be shown and enabled
- **Validation**: Number between 1-31
- **Behavior**: Payment occurs on this day, but **preserves the month from `startDate`**
- **Important**: If `startDate` is January 15th and `payDay` is 1, payment is January 1st each year (not the 1st of the current month)
- **User message**: "Payment will occur on day [payDay] of [month from startDate] each year. Example: If start date is January 15th and day is 1, payment will be January 1st each year."

## Implementation Suggestions

```typescript
// Example TypeScript/React logic
const getPayDayHelperText = (frequency: string, startDate: Date | null) => {
  switch (frequency) {
    case 'WEEKLY':
      return 'Weekly payments occur 7 days from the start date. Day of month is not used.';
    case 'MONTHLY':
      return 'Payment will occur on this day each month (e.g., 15 = 15th of every month)';
    case 'YEARLY':
      if (startDate) {
        const monthName = startDate.toLocaleString('default', { month: 'long' });
        return `Payment will occur on day ${payDay} of ${monthName} each year (month preserved from start date)`;
      }
      return 'Payment will occur on this day, preserving the month from start date';
    default:
      return 'Day of the month when payment occurs (1-31)';
  }
};

const shouldShowPayDay = frequency !== 'WEEKLY';
const shouldDisablePayDay = frequency === 'WEEKLY';
```

## Validation Rules

- **All frequencies**: `payDay` must be integer between 1-31 (API requirement)
- **WEEKLY**: Value can be any valid number but will be ignored by API
- **MONTHLY/YEARLY**: Standard validation (1-31, integer)

## User Experience Recommendations

1. **Conditional Display** (Recommended):
   - Hide `payDay` field when `frequency === 'WEEKLY'`
   - Show it for `MONTHLY` and `YEARLY`

2. **Conditional Disable** (Alternative):
   - Show `payDay` for all frequencies but disable it for `WEEKLY`
   - Add a tooltip/helper text explaining why it's disabled

3. **Visual Feedback**:
   - For YEARLY, consider showing a preview: "Next payment: [calculated date]"
   - For MONTHLY, show: "Payment on day [payDay] each month"
   - For WEEKLY, emphasize the 7-day interval

## Testing Checklist

- [ ] WEEKLY: Form works correctly (payDay hidden or disabled)
- [ ] MONTHLY: payDay validation works (1-31)
- [ ] YEARLY: Helper text shows month preservation message
- [ ] YEARLY: Preview/confirmation shows correct month from startDate
- [ ] All frequencies: API request includes correct payDay value
- [ ] Form validation matches API requirements

## Reference Documentation

See `FRONTEND_RECURRING_EXPENSES_GUIDE.md` for detailed API behavior documentation and examples.

## API Endpoints

- `POST /recurring-expenses` - Create recurring expense
- `PUT /recurring-expenses/:id` - Update recurring expense
- `GET /recurring-expenses` - Get all recurring expenses (check `nextPaymentDate` to verify calculation)
