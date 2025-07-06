# Commission GL Reversal Guide

## Overview

When a commission is deleted from the system, we automatically create GL (General Ledger) reversal entries to maintain balanced books. This ensures that the financial records remain accurate and compliant.

## How It Works

### Original Commission GL Entry

When a commission is created, the following GL entries are posted:

```
DR Commission Receivable (Asset)     $1,000
CR Commission Revenue (Revenue)      $1,000
```

### Reversal GL Entry (When Deleted)

When a commission is deleted, the following reversal entries are posted:

```
DR Commission Revenue (Revenue)      $1,000
CR Commission Receivable (Asset)     $1,000
```

## Implementation Details

### 1. GL Accounts Used

- **Commission Receivable**: Account code `1200` (Asset)
- **Commission Revenue**: Account code `4100` (Revenue)
- **Commission Reversals**: Account code `4999` (Revenue) - for tracking purposes

### 2. When Reversals Are Created

- Automatically triggered when a commission is deleted via the DELETE API endpoint
- Works for both pending and paid commissions
- Creates balanced entries that offset the original posting

### 3. Error Handling

- If GL reversal fails, the commission deletion still proceeds
- GL errors are logged but don't prevent the delete operation
- This ensures data integrity while maintaining audit trails

### 4. Audit Trail

- All GL reversals are logged in the audit trail
- Includes the reason for deletion and user who performed the action
- GL transaction IDs are tracked for reconciliation

## Benefits

1. **Balanced Books**: Ensures financial statements remain accurate
2. **Audit Compliance**: Maintains proper audit trails
3. **Data Integrity**: Prevents orphaned GL entries
4. **Transparency**: Clear documentation of why reversals occurred

## Example Scenarios

### Scenario 1: Delete Pending Commission

- Commission: $500 pending from MTN
- GL Reversal: Reduces receivable and revenue by $500
- Result: Books remain balanced

### Scenario 2: Delete Paid Commission

- Commission: $1,000 paid from Vodafone
- GL Reversal: Reduces receivable and revenue by $1,000
- Note: Cash account is not affected (payment was already received)

## Technical Implementation

The reversal logic is implemented in:

- `UnifiedGLPostingService.createCommissionReversalGLEntries()` - Uses the unified GL posting service for consistency
- Called automatically in `/api/commissions/[id]/route.ts` DELETE endpoint
- Uses the same GL account structure and mapping as other unified transactions
- Follows the same audit trail and logging patterns as other GL operations

## Monitoring

To monitor GL reversals:

1. Check GL transaction logs for `commission_reversal` type
2. Review audit trail for deletion events
3. Verify account balances remain consistent
4. Run GL reconciliation reports

## Best Practices

1. **Always verify** the reason for deletion before proceeding
2. **Document** why the commission was deleted
3. **Review** GL reversals regularly for accuracy
4. **Reconcile** account balances after bulk deletions
5. **Train users** on proper deletion procedures
