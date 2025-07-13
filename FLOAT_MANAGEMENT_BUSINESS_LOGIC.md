# Float Management Business Logic Guide

## Account Type Operations

### 1. Power Accounts

- **Can**: Be recharged (from cash or other float accounts)
- **Cannot**: Accept deposits or be used as source for transfers
- **Purpose**: Fund power sales transactions
- **Recharge Methods**: Cash, bank transfer, transfer from other accounts

### 2. E-Zwich Accounts

- **Cannot**: Be recharged, accept deposits, or be used as source for transfers
- **Purpose**: Settlement accounts for E-Zwich transactions only
- **Operations**: Only settlement-related transactions

### 3. MoMo Accounts

- **Can**: Accept deposits (from cash or other float accounts)
- **Can**: Be used as source for transfers to other accounts
- **Purpose**: Fund MoMo cash-in/cash-out operations
- **Deposit Methods**: Cash, bank transfer, transfer from other accounts

### 4. Agency Banking Accounts

- **Can**: Accept deposits (from cash or other float accounts)
- **Can**: Be used as source for transfers to other accounts
- **Purpose**: Fund agency banking deposit/withdrawal operations
- **Deposit Methods**: Cash, bank transfer, transfer from other accounts

### 5. Cash-in-Till Accounts

- **Can**: Be used as source for transfers to other accounts
- **Can**: Accept deposits from other float accounts
- **Purpose**: Hold cash for daily operations
- **Operations**: Primary source for funding other accounts

### 6. Jumia Accounts

- **Can**: Be used as source for transfers to other accounts
- **Can**: Accept deposits from other float accounts
- **Purpose**: Fund Jumia sales operations
- **Operations**: Similar to other service accounts

## Business Rules

### Recharge Operations (Power Only)

```
Power Account ← Cash-in-Till
Power Account ← MoMo Account
Power Account ← Agency Banking Account
Power Account ← Jumia Account
Power Account ← Cash (direct)
```

### Deposit Operations (MoMo, Agency Banking)

```
MoMo Account ← Cash-in-Till
MoMo Account ← Agency Banking Account
MoMo Account ← Jumia Account
MoMo Account ← Cash (direct)

Agency Banking Account ← Cash-in-Till
Agency Banking Account ← MoMo Account
Agency Banking Account ← Jumia Account
Agency Banking Account ← Cash (direct)
```

### Cash Exchange Operations

When cash-in-till runs low:

```
Cash-in-Till ← MoMo Account
Cash-in-Till ← Agency Banking Account
Cash-in-Till ← Jumia Account
```

### Restricted Operations

- **E-Zwich**: No recharge, no deposits, no source transfers
- **Power**: Can only be recharged, cannot be used as source

## User Interface Logic

### Action Buttons Display

- **Power Accounts**: Show "Recharge" button only
- **MoMo/Agency Banking**: Show "Deposit" button only
- **E-Zwich**: No action buttons (view only)
- **Cash-in-Till/Jumia**: No action buttons (used as sources only)

### Source Account Selection

When recharging/depositing, available source accounts:

- **Cash-in-Till**: Always available (if has balance)
- **MoMo Accounts**: Available (if has balance)
- **Agency Banking**: Available (if has balance)
- **Jumia Accounts**: Available (if has balance)
- **Power Accounts**: Not available as source
- **E-Zwich Accounts**: Not available as source

### Deposit Methods

1. **Cash**: Direct cash deposit (no source account needed)
2. **Bank Transfer**: External bank transfer (no source account needed)
3. **Transfer**: From another float account (source account required)

## Transaction Flow Examples

### Example 1: Power Recharge

1. User selects Power account
2. Clicks "Recharge" button
3. Dialog shows: "Recharge Float Account"
4. User can select:
   - Cash (direct)
   - Bank Transfer (external)
   - Transfer from: Cash-in-Till, MoMo, Agency Banking, Jumia
5. System validates source account balance
6. Creates transaction: Source Account → Power Account

### Example 2: MoMo Deposit

1. User selects MoMo account
2. Clicks "Deposit" button
3. Dialog shows: "Deposit Float Account"
4. User can select:
   - Cash (direct)
   - Bank Transfer (external)
   - Transfer from: Cash-in-Till, Agency Banking, Jumia
5. System validates source account balance
6. Creates transaction: Source Account → MoMo Account

### Example 3: Cash Exchange

1. Cash-in-Till runs low
2. User needs to exchange from MoMo to Cash
3. User selects Cash-in-Till account
4. Uses "Transfer" method to move funds from MoMo to Cash-in-Till
5. Creates transaction: MoMo Account → Cash-in-Till Account

## Implementation Details

### Database Schema

```sql
-- Float transactions table
CREATE TABLE float_transactions (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES float_accounts(id),
  type VARCHAR(50), -- 'recharge', 'deposit', 'transfer_out', 'transfer_in'
  amount DECIMAL(15,2),
  balance_before DECIMAL(15,2),
  balance_after DECIMAL(15,2),
  description TEXT,
  created_by UUID REFERENCES users(id),
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMP DEFAULT NOW(),
  reference VARCHAR(100),
  recharge_method VARCHAR(50)
);
```

### API Endpoints

```
POST /api/float-accounts/{id}/recharge
- Used for both recharge and deposit operations
- Validates account type and permissions
- Creates appropriate transaction records
```

### Validation Rules

1. **Account Type Validation**: Ensure correct operation for account type
2. **Balance Validation**: Source account must have sufficient balance
3. **Permission Validation**: User must have access to both accounts
4. **Business Rule Validation**: E-Zwich cannot be used for transfers

## Error Handling

### Common Error Scenarios

1. **Insufficient Balance**: Source account doesn't have enough funds
2. **Invalid Account Type**: Trying to recharge E-Zwich or deposit to Power
3. **Permission Denied**: User doesn't have access to accounts
4. **Account Inactive**: Source or target account is inactive

### Error Messages

- "Insufficient balance in source account. Available: GHS X, Required: GHS Y"
- "E-Zwich accounts cannot be recharged or used for deposits"
- "Power accounts can only be recharged, not deposited to"
- "Account not found or inactive"

## Audit Trail

### Transaction Recording

Every operation creates:

1. **Source Transaction**: Debit from source account (if applicable)
2. **Target Transaction**: Credit to target account
3. **Audit Information**: User, timestamp, reference, description

### Statement Generation

- **Opening Balance**: Balance before first transaction in period
- **Total Credits**: Sum of all positive transactions
- **Total Debits**: Sum of all negative transactions
- **Net Change**: Credits minus debits
- **Closing Balance**: Current account balance

## Best Practices

### For Users

1. **Regular Monitoring**: Check account balances daily
2. **Proactive Recharging**: Recharge power accounts before they run low
3. **Cash Management**: Maintain adequate cash-in-till balance
4. **Transaction Documentation**: Always include reference numbers

### For Administrators

1. **Balance Thresholds**: Set appropriate min/max thresholds
2. **Regular Audits**: Review transaction history regularly
3. **User Training**: Ensure users understand business rules
4. **System Monitoring**: Monitor for unusual transaction patterns

---

_This guide ensures proper implementation of float account business logic according to the specified requirements._
