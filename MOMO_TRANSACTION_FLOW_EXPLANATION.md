# MoMo Transaction Flow Explanation

## Overview

This document explains how MoMo (Mobile Money) transactions work in the system, including how fees are handled and how float accounts are updated.

## Transaction Types

### 1. Cash-In (Customer → Us)

**Scenario**: Customer wants to send money to their MoMo account using cash

**What happens**:

- Customer gives us: **Amount + Fee** (e.g., 1000 + 10 = 1010 GHS)
- We send to customer's MoMo: **Amount only** (1000 GHS)
- We keep the fee as revenue: **Fee** (10 GHS)

**Float Account Updates**:

- **MoMo Float**: Decreases by Amount only (1000 GHS)
  - Reason: We're sending money from our MoMo float to customer's account
- **Cash Till**: Increases by Amount + Fee (1010 GHS)
  - Reason: We receive cash from customer

**GL Entries**:

```
Dr. Cash in Till (1010)     ← We receive cash from customer
Cr. MoMo Float (1000)       ← We send money to customer's MoMo
Dr. Fee Revenue (10)        ← We earn fee revenue
Cr. Fee Expense (10)        ← We record fee expense (for accounting balance)
```

### 2. Cash-Out (Us → Customer)

**Scenario**: Customer wants to withdraw money from their MoMo account as cash

**What happens**:

- Customer gives us: **Amount + Fee** from their MoMo account (e.g., 1000 + 10 = 1010 GHS)
- Customer receives: **Amount only** in cash (1000 GHS)
- We keep the fee as revenue: **Fee** (10 GHS)

**Float Account Updates**:

- **MoMo Float**: Increases by Amount + Fee (1010 GHS)
  - Reason: We receive money from customer's MoMo account (including fee)
- **Cash Till**: Decreases by Amount only (1000 GHS)
  - Reason: We only pay the amount in cash to customer (not the fee)

**GL Entries**:

```
Dr. MoMo Float (1010)       ← We receive amount + fee from customer's MoMo
Cr. Cash in Till (1000)     ← We pay only the amount in cash to customer
Dr. Fee Expense (10)        ← We record fee expense
Cr. Fee Revenue (10)        ← We earn fee revenue
```

## Key Points

### 1. Fee Handling

- **Cash-In**: Customer pays the fee in cash, we keep it as revenue
- **Cash-Out**: Customer pays the fee from their MoMo balance, we keep it as revenue

### 2. Float Account Consistency

- **MoMo Float**: Always reflects the actual money movement to/from MoMo network
- **Cash Till**: Always reflects the actual cash received/paid

### 3. GL Accounting

- **Main entries**: Record the actual money movement between float accounts
- **Fee entries**: Record the fee revenue/expense for proper accounting

## Example Transactions

### Example 1: Cash-In of 1000 GHS with 10 GHS fee

```
Customer gives: 1010 GHS cash
Customer receives: 1000 GHS in MoMo account
We keep: 10 GHS as fee

Float Updates:
- MoMo Float: -1000 GHS
- Cash Till: +1010 GHS

GL Entries:
Dr. Cash in Till: 1010 GHS
Cr. MoMo Float: 1000 GHS
Dr. Fee Revenue: 10 GHS
Cr. Fee Expense: 10 GHS
```

### Example 2: Cash-Out of 1000 GHS with 10 GHS fee

```
Customer gives: 1010 GHS from MoMo account
Customer receives: 1000 GHS cash
We keep: 10 GHS as fee

Float Updates:
- MoMo Float: +1010 GHS
- Cash Till: -1000 GHS

GL Entries:
Dr. MoMo Float: 1010 GHS
Cr. Cash in Till: 1000 GHS
Dr. Fee Expense: 10 GHS
Cr. Fee Revenue: 10 GHS
```

## Why This Logic Makes Sense

1. **Customer Perspective**: Customer always pays the fee (either in cash or from their MoMo balance)
2. **Business Perspective**: We always earn the fee as revenue
3. **Float Management**: Float accounts reflect actual money movement
4. **Accounting**: GL entries properly record all financial transactions

## Common Confusion Points

### Q: Why does the fee go to the MoMo float in cash-out?

**A**: Because the customer is paying the fee from their MoMo balance, so we receive it in our MoMo float.

### Q: Why doesn't the fee go to the MoMo float in cash-in?

**A**: Because the customer is paying the fee in cash, so it goes to our cash till, not our MoMo float.

### Q: Why do we have both fee revenue and fee expense?

**A**: This is for proper accounting. The fee revenue represents our income, and the fee expense represents the cost of providing the service (they balance each other out).

### Q: In cash-out, why does the customer only receive the amount, not amount + fee?

**A**: Because the fee is our service charge. The customer pays the fee from their MoMo balance, but they only receive the amount they wanted to withdraw in cash. The fee is our revenue for providing the service.
