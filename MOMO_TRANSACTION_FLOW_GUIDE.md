# MoMo Transaction Flow Guide

## Business Logic Overview

### Cash-In Transaction (Customer deposits cash)

- **Customer gives us**: Cash amount + fee
- **We give customer**: MoMo credit (amount only)
- **Our cash till**: Increases by (amount + fee)
- **Our MoMo float**: Decreases by (amount only)
- **Net effect**: We keep the fee as profit

**Example**: ₵300 cash-in with ₵5 fee

- Customer gives: ₵305 (₵300 + ₵5 fee)
- Customer receives: ₵300 MoMo credit
- Our cash till: +₵305
- Our MoMo float: -₵300
- Our profit: +₵5

### Cash-Out Transaction (Customer withdraws cash)

- **Customer gives us**: MoMo credit (amount only)
- **We give customer**: Cash amount + fee
- **Our cash till**: Decreases by (amount + fee)
- **Our MoMo float**: Increases by (amount only)
- **Net effect**: We keep the fee as profit

**Example**: ₵300 cash-out with ₵5 fee

- Customer gives: ₵300 MoMo credit
- Customer receives: ₵305 (₵300 + ₵5 fee)
- Our cash till: -₵305
- Our MoMo float: +₵300
- Our profit: +₵5

## Implementation Details

### Float Account Updates

#### Cash-In Transaction

```typescript
// Cash till: + (amount + fee)
cashTillChange = amount + fee;

// MoMo float: - amount (only)
momoFloatChange = -amount;

// Validation: Check MoMo float has enough (amount only)
if (momoFloat.balance < amount) {
  throw new Error("Insufficient MoMo float balance");
}
```

#### Cash-Out Transaction

```typescript
// Cash till: - (amount + fee)
cashTillChange = -(amount + fee);

// MoMo float: + amount (only)
momoFloatChange = amount;

// Validation: Check cash till has enough (amount + fee)
if (cashTill.balance < amount + fee) {
  throw new Error("Insufficient cash in till balance");
}
```

### GL Entries

#### Cash-In Transaction

```sql
-- Dr. Cash in Till (Asset) - amount + fee
INSERT INTO gl_entries (account_id, debit, credit, description)
VALUES (cash_till_account_id, amount + fee, 0, 'MoMo Cash-in');

-- Cr. MoMo Float (Liability) - amount only
INSERT INTO gl_entries (account_id, debit, credit, description)
VALUES (momo_float_account_id, 0, amount, 'MoMo Cash-in');
```

#### Cash-Out Transaction

```sql
-- Dr. MoMo Float (Liability) - amount only
INSERT INTO gl_entries (account_id, debit, credit, description)
VALUES (momo_float_account_id, amount, 0, 'MoMo Cash-out');

-- Cr. Cash in Till (Asset) - amount + fee
INSERT INTO gl_entries (account_id, debit, credit, description)
VALUES (cash_till_account_id, 0, amount + fee, 'MoMo Cash-out');
```

## Key Points

1. **Fee is always kept by the business** - it never affects the customer's MoMo balance
2. **Cash till always handles amount + fee** - this is where we receive/pay the total
3. **MoMo float only handles the amount** - this is what the customer actually deposits/withdraws
4. **Validation checks the appropriate balance**:
   - Cash-in: Check MoMo float has enough (amount only)
   - Cash-out: Check cash till has enough (amount + fee)

## Transaction Examples

### Example 1: ₵500 Cash-In with ₵10 Fee

```
Customer Transaction:
- Gives: ₵510 cash
- Receives: ₵500 MoMo credit

Business Impact:
- Cash till: +₵510
- MoMo float: -₵500
- Profit: +₵10
```

### Example 2: ₵1000 Cash-Out with ₵20 Fee

```
Customer Transaction:
- Gives: ₵1000 MoMo credit
- Receives: ₵1020 cash

Business Impact:
- Cash till: -₵1020
- MoMo float: +₵1000
- Profit: +₵20
```

## Validation Rules

1. **Cash-In**: MoMo float balance ≥ transaction amount
2. **Cash-Out**: Cash till balance ≥ (transaction amount + fee)
3. **Amount**: Must be positive
4. **Fee**: Must be non-negative
5. **Provider**: Must be valid MoMo provider
6. **Customer details**: Name and phone required

## Error Handling

- **Insufficient MoMo float**: For cash-in transactions
- **Insufficient cash till**: For cash-out transactions
- **Invalid amount**: Amount must be positive
- **Invalid fee**: Fee must be non-negative
- **Missing customer info**: Name and phone required
- **Invalid provider**: Provider must be configured

## Audit Trail

All transactions should record:

- Transaction type (cash-in/cash-out)
- Amount and fee
- Customer details
- Provider information
- Float account changes
- Cash till changes
- User who processed the transaction
- Timestamp
- Reference number
