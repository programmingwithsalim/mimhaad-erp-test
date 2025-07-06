# Expense GL Posting System Guide

## Overview

The expense GL posting system integrates with your existing unified GL posting service to automatically create GL entries when expenses are approved. It uses your existing float accounts as payment sources and creates new expense category accounts.

## System Architecture

### 1. GL Accounts Structure

#### **New Expense Category Accounts:**

- `EXP-635844-GEN` - General Business Expenses
- `EXP-635844-ADMIN` - Administrative Expenses
- `EXP-635844-OPER` - Operational Expenses
- `EXP-635844-FIN` - Financial Expenses
- `EXP-635844-CAP` - Capital Expenses

#### **Payment Source Accounts (Using Existing Float Accounts):**

- `CASH-635844` - Cash in Till (for cash payments)
- `AGB-635844` - Agency Banking Float - Cal Bank (for bank transfers/cards)
- `MOMO-635844-ZPAY` - MoMo Float - Z-Pay (for Z-Pay payments)
- `MOMO-635844-MTN` - MoMo Float - MTN (for MTN MoMo payments)
- `MOMO-635844-TEL` - MoMo Float - Telecel (for Telecel MoMo payments)
- `AGB-635844-GCB` - Agency Banking Float - GCB (for GCB agency payments)
- `AGB-635844-FID` - Agency Banking Float - Fidelity (for Fidelity agency payments)

### 2. GL Mappings

#### **Expense Category Mappings:**

```
expense_operational → EXP-635844-OPER (Operational Expenses)
expense_administrative → EXP-635844-ADMIN (Administrative Expenses)
expense_financial → EXP-635844-FIN (Financial Expenses)
expense_capital → EXP-635844-CAP (Capital Expenses)
expense_other → EXP-635844-GEN (General Business Expenses)
```

#### **Payment Method Mappings:**

```
expense_cash → CASH-635844 (Cash in Till)
expense_bank → AGB-635844 (Agency Banking - Cal Bank)
expense_momo → MOMO-635844-ZPAY (MoMo - Z-Pay)
expense_momo_mtn → MOMO-635844-MTN (MoMo - MTN)
expense_momo_telecel → MOMO-635844-TEL (MoMo - Telecel)
expense_agency_gcb → AGB-635844-GCB (Agency Banking - GCB)
expense_agency_fidelity → AGB-635844-FID (Agency Banking - Fidelity)
expense_card → AGB-635844 (Agency Banking - Cal Bank)
```

## How It Works

### 1. Expense Creation

When an expense is created, users select:

- **Expense Head** (determines expense category)
- **Payment Source** (determines payment account)

### 2. Expense Approval

When an expense is approved:

1. Status changes to "approved"
2. GL entries are automatically created using unified GL posting service
3. **Debit:** Appropriate expense account (based on expense head category)
4. **Credit:** Payment account (based on payment method)

### 3. GL Entry Logic

```
DR: [Expense Category Account] - Amount
CR: [Payment Source Account] - Amount
```

## Payment Method Options

### Available Payment Methods:

1. **Cash** → Uses Cash in Till account
2. **Bank Transfer (Cal Bank)** → Uses Cal Bank agency account
3. **Mobile Money (Z-Pay)** → Uses Z-Pay MoMo account
4. **Mobile Money (MTN)** → Uses MTN MoMo account
5. **Mobile Money (Telecel)** → Uses Telecel MoMo account
6. **Agency Banking (GCB)** → Uses GCB agency account
7. **Agency Banking (Fidelity)** → Uses Fidelity agency account
8. **Card Payment (Cal Bank)** → Uses Cal Bank agency account

## Expense Head Categories

### Mapping Expense Heads to GL Categories:

- **Operational** expenses → `expense_operational`
- **Administrative** expenses → `expense_administrative`
- **Financial** expenses → `expense_financial`
- **Capital** expenses → `expense_capital`
- **Other** expenses → `expense_other`

## Setup Instructions

### 1. Initialize GL Accounts and Mappings

```bash
# Start your development server
npm run dev

# Run the migration to create expense GL accounts and mappings
curl -X POST http://localhost:3000/api/db/init-expense-gl
```

### 2. Test the Workflow

1. Create an expense with any payment method
2. Approve the expense
3. Check that GL entries are created automatically
4. Verify the GL entries in your GL accounting module

## API Endpoints

### Expense Approval with GL Posting

```
POST /api/expenses/[id]/approve
{
  "approver_id": "user-uuid",
  "comments": "Optional approval comments"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Expense approved successfully",
  "expense": { ... },
  "glPosted": true,
  "glTransactionId": "gl-transaction-uuid"
}
```

## Database Tables

### GL Accounts Table

- Stores expense category accounts
- Links to existing float accounts for payments

### GL Mappings Table

- Maps expense transaction types to GL accounts
- Supports both expense categories and payment methods

### GL Transactions Table

- Records all expense GL transactions
- Links to original expense records

### GL Journal Entries Table

- Stores individual debit/credit entries
- Balances for each expense transaction

## Benefits

1. **Automatic GL Posting** - No manual GL entry creation needed
2. **Consistent with Existing System** - Uses your current float accounts and GL structure
3. **Flexible Payment Methods** - Supports all your existing payment channels
4. **Proper Categorization** - Expenses are properly categorized for reporting
5. **Audit Trail** - Complete audit trail from expense to GL entries
6. **Real-time Balances** - GL account balances are updated immediately

## Troubleshooting

### Common Issues:

1. **GL Posting Fails** - Check that GL accounts and mappings are initialized
2. **Missing Payment Method** - Verify payment method is mapped in GL mappings
3. **Balance Mismatch** - Ensure debit and credit entries balance
4. **Wrong Expense Category** - Check expense head category mapping

### Debug Steps:

1. Check server logs for GL posting errors
2. Verify GL accounts exist in database
3. Confirm GL mappings are active
4. Test with simple cash expense first

## Future Enhancements

1. **Expense Head Categories** - Add category field to expense heads for better GL mapping
2. **Custom GL Accounts** - Allow custom GL accounts per expense head
3. **Batch Approvals** - Support approving multiple expenses at once
4. **GL Reversals** - Support reversing GL entries for rejected expenses
5. **Reporting** - Enhanced expense reporting with GL integration
