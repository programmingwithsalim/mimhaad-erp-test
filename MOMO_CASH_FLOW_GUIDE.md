# MoMo Transaction Cash Flow Guide

## Overview

This document explains the correct cash flow logic for MoMo transactions in the ERP system.

## Transaction Types

### Cash-In Transaction

**What happens:** Customer gives us cash, we give them MoMo credit

**Cash Flow:**

- **Cash in Till:** Increases (we receive cash)
- **MoMo Float:** Decreases (we give away MoMo credit)

**Accounting Entries:**

- Dr. Cash in Till (Asset) - Increase
- Cr. MoMo Float (Liability) - Increase

**Float Account Changes:**

- MoMo Float: `current_balance - (amount + fee)`
- Cash in Till: `current_balance + (amount + fee)`

### Cash-Out Transaction

**What happens:** Customer withdraws cash from their MoMo wallet

**Cash Flow:**

- **Cash in Till:** Decreases (we give away cash)
- **MoMo Float:** Increases (we receive MoMo credit back)

**Accounting Entries:**

- Dr. MoMo Float (Liability) - Decrease
- Cr. Cash in Till (Asset) - Decrease

**Float Account Changes:**

- MoMo Float: `current_balance + (amount + fee)`
- Cash in Till: `current_balance - (amount + fee)`

## Implementation Details

### API Route (`app/api/momo/transactions/route.ts`)

✅ **Correctly implemented:**

- Cash-in: Increases cash in till, decreases MoMo float
- Cash-out: Decreases cash in till, increases MoMo float

### GL Posting Service (`lib/services/unified-gl-posting-service.ts`)

✅ **Correctly implemented:**

- Cash-in: Debits cash in till, credits MoMo float
- Cash-out: Debits MoMo float, credits cash in till

### Unified Transaction Service (`lib/services/unified-transaction-service.ts`)

✅ **Correctly implemented:**

- Cash-in: MoMo float decreases, cash in till increases
- Cash-out: MoMo float increases, cash in till decreases

### Transaction Management Service (`lib/services/transaction-management-service.ts`)

✅ **Correctly implemented:**

- Float effect: Cash-in decreases float, Cash-out increases float
- Cash till effect: Cash-in increases cash till, Cash-out decreases cash till
- Float inflow: Cash-out is inflow (we receive MoMo credit back)

## Key Principles

1. **Cash-in = We receive cash, give MoMo credit**
2. **Cash-out = We give cash, receive MoMo credit back**
3. **MoMo Float represents our liability to customers**
4. **Cash in Till represents our physical cash holdings**

## Validation Rules

### Cash-In Validation

- Check if MoMo float has sufficient balance
- Error: "Insufficient MoMo float balance"

### Cash-Out Validation

- Check if cash in till has sufficient balance
- Error: "Insufficient cash in till balance"

## GL Account Mapping

- **Main Account:** MoMo Float (Liability account)
- **Fee Account:** Cash in Till (Asset account)

## Notes

- All amounts include fees in the calculations
- The system properly handles both the float account and cash till updates
- GL entries are correctly balanced (debits = credits)
- Audit logging captures all transaction details
- Transaction reversals and edits properly adjust both accounts
