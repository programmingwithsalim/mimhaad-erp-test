# GL Account Structure for Float Accounts

## Overview
Each float account (MoMo, Agency Banking, E-Zwich, Power, Jumia) automatically creates 5 GL accounts for proper accounting treatment.

## GL Account Types Created

### 1. **Main Account** (`main`)
- **Type**: Asset
- **Purpose**: The actual float balance account
- **Example**: "MoMo Float Account - MTN"
- **Usage**: Tracks the current balance of the float account

### 2. **Fee Account** (`fee`)
- **Type**: Revenue  
- **Purpose**: Tracks transaction fees collected
- **Example**: "MoMo Transaction Fees - MTN"
- **Usage**: Records fees charged to customers for transactions

### 3. **Revenue Account** (`revenue`)
- **Type**: Revenue
- **Purpose**: Tracks fee income from transactions
- **Example**: "MoMo Fee Revenue - MTN"  
- **Usage**: Records the revenue side of fee transactions

### 4. **Expense Account** (`expense`)
- **Type**: Expense
- **Purpose**: Tracks fee expenses (net effect with revenue)
- **Example**: "MoMo Fee Expense - MTN"
- **Usage**: Records the expense side of fee transactions (creates balanced entries)

### 5. **Commission Account** (`commission`)
- **Type**: Revenue
- **Purpose**: Tracks commission income from partners
- **Example**: "MoMo Commission Revenue - MTN"
- **Usage**: Records commission payments received from service providers

## Why We Need All 5 Accounts

### **For MoMo Transactions:**

#### Cash-In Transaction:
```
Dr. Cash in Till (fee)         300 + 3 = 303
Cr. MoMo Float (main)          300
Dr. Fee Revenue (revenue)      3
Cr. Fee Expense (expense)      3
```

#### Cash-Out Transaction:
```
Dr. MoMo Float (main)          300 + 3 = 303  
Cr. Cash in Till (fee)         300
Dr. Fee Expense (expense)      3
Cr. Fee Revenue (revenue)      3
```

### **Benefits:**
1. **Proper Accounting**: Each account has a specific purpose
2. **Audit Trail**: Clear tracking of all financial movements
3. **Reporting**: Can generate detailed financial reports
4. **Compliance**: Meets accounting standards
5. **Analysis**: Can analyze fee income, expenses, and commissions separately

## Account Naming Convention

### **Format**: `{Account Type} {Purpose} - {Provider}`

**Examples:**
- `MoMo Float Account - MTN`
- `MoMo Transaction Fees - MTN`
- `MoMo Fee Revenue - MTN`
- `MoMo Fee Expense - MTN`
- `MoMo Commission Revenue - MTN`

## Recent Fixes Applied

### ✅ **Fixed Issues:**
1. **Commission Account Type**: Changed from Expense to Revenue
2. **Main Account Naming**: Fixed "undefined GL account" issue
3. **Clear Purpose**: Each account now has a clear, descriptive name
4. **Proper Classification**: All accounts correctly classified as Asset/Revenue/Expense

### 🔧 **Account Codes:**
- **Main**: `{TYPE}-{BRANCH}` (e.g., `MOMO-123456-MTN`)
- **Revenue**: `{TYPE}-{BRANCH}-REV` (e.g., `MOMO-123456-MTN-REV`)
- **Expense**: `{TYPE}-{BRANCH}-EXP` (e.g., `MOMO-123456-MTN-EXP`)
- **Commission**: `{TYPE}-{BRANCH}-COM` (e.g., `MOMO-123456-MTN-COM`)
- **Fee**: `{TYPE}-{BRANCH}-FEE` (e.g., `MOMO-123456-MTN-FEE`)

## Usage in Transactions

### **When creating a float account:**
1. All 5 GL accounts are automatically created
2. GL mappings are set up for the float account type
3. Accounts are ready for transaction posting

### **When processing transactions:**
1. Float account balances are updated
2. GL entries are posted to the appropriate accounts
3. All movements are properly tracked

This structure ensures complete financial transparency and proper accounting treatment for all float account transactions. 