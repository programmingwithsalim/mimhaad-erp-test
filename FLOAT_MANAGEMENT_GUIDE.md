# Float Management System Guide

## Overview

The enhanced Float Management System now supports comprehensive float account operations including deposits, recharges, and detailed statement generation. All transactions are properly tracked for financial reporting and audit purposes.

## Key Features

### 1. Enhanced Recharge/Deposit Functionality

#### What's New:

- **Source Account Selection**: Choose which float account to debit from when recharging another account
- **Multiple Recharge Methods**: Manual entry, bank transfer, cash deposit, or transfer from other accounts
- **Balance Validation**: Automatic validation of source account balances
- **Transaction Tracking**: All transfers are recorded with proper audit trails

#### Supported Account Types:

- **All Account Types**: Power, MoMo, Agency Banking, E-Zwich, Cash-in-Till, Jumia
- **Cross-Account Transfers**: Transfer funds between any float accounts
- **Branch-Specific**: Users can only access accounts within their branch (unless admin)

### 2. Transaction Tracking

#### Database Schema:

```sql
-- Float transactions table tracks all movements
CREATE TABLE float_transactions (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES float_accounts(id),
  type VARCHAR(50), -- 'recharge', 'transfer_out', 'transfer_in', etc.
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

#### Transaction Types:

- **recharge**: Adding funds to an account
- **transfer_out**: Deducting funds from source account
- **transfer_in**: Receiving funds from another account
- **sale**: Transaction-related deductions
- **withdrawal**: Customer withdrawal operations

### 3. Statement Generation

#### Features:

- **Date Range Selection**: Choose custom date ranges for statements
- **Summary View**: Quick overview with opening/closing balances
- **Detailed View**: Complete transaction history with all details
- **PDF Export**: Professional PDF statements with proper formatting
- **CSV Export**: Raw transaction data for further analysis

#### Statement Components:

- Account information and period
- Opening and closing balances
- Total credits and debits
- Net change calculation
- Transaction count
- Detailed transaction list (optional)

## API Endpoints

### 1. Recharge Float Account

```
POST /api/float-accounts/{id}/recharge
```

**Request Body:**

```json
{
  "amount": 1000.0,
  "sourceAccountId": "uuid-of-source-account", // Optional
  "rechargeMethod": "transfer", // manual, bank_transfer, cash_deposit, transfer
  "reference": "RECHARGE-001",
  "notes": "Monthly recharge",
  "description": "Transfer from cash till to power float"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Account recharged successfully",
  "transaction": {
    "id": "transaction-uuid",
    "amount": 1000.0,
    "newBalance": 5000.0,
    "description": "Float recharge of 1000",
    "date": "2024-01-15T10:30:00Z",
    "reference": "RECHARGE-001"
  }
}
```

### 2. Get Float Transactions

```
GET /api/float-transactions?accountId={id}&startDate={date}&endDate={date}&type={type}
```

**Query Parameters:**

- `accountId`: Filter by specific account
- `startDate`: Start date for period (ISO format)
- `endDate`: End date for period (ISO format)
- `type`: Transaction type filter
- `limit`: Number of records (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "account_id": "uuid",
        "type": "recharge",
        "amount": 1000.0,
        "balance_before": 4000.0,
        "balance_after": 5000.0,
        "description": "Float recharge",
        "created_at": "2024-01-15T10:30:00Z",
        "reference": "RECHARGE-001",
        "recharge_method": "transfer",
        "provider": "ECG",
        "account_type": "power",
        "created_by_name": "John Doe"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

## User Interface Components

### 1. Enhanced Recharge Dialog

- **Source Account Selection**: Dropdown with available accounts and balances
- **Recharge Method**: Choose between manual entry or transfer from other accounts
- **Balance Validation**: Real-time validation of source account balances
- **Transaction Details**: Reference numbers and notes for audit trails

### 2. Statement Generator

- **Date Range Picker**: Select custom periods for statements
- **Summary Cards**: Visual overview of account activity
- **Transaction Table**: Detailed list of all transactions
- **Export Options**: PDF and CSV download capabilities

### 3. Float Management Dashboard

- **Account Overview**: All float accounts with current balances
- **Quick Actions**: Recharge, deposit, edit, and statement generation
- **Balance Indicators**: Visual status indicators for low/high balances
- **Transaction History**: Recent activity for each account

## Business Logic

### 1. Cash Flow Management

#### Power Float Recharge:

1. **Source Account**: Select cash-in-till or other float account
2. **Validation**: Check source account has sufficient balance
3. **Transfer**: Debit source account, credit power float
4. **Recording**: Create transaction records for both accounts
5. **Notification**: Alert if balance thresholds are met

#### MoMo/Agency Banking Deposit:

1. **Source Account**: Choose funding source (cash-in-till, bank, etc.)
2. **Validation**: Ensure source account has required funds
3. **Transfer**: Move funds to MoMo/agency banking float
4. **Tracking**: Record transaction with proper categorization

### 2. Transaction Recording

#### For Each Transfer:

1. **Source Transaction**: Record debit from source account
2. **Target Transaction**: Record credit to target account
3. **Audit Trail**: Include user, timestamp, reference, and description
4. **Balance Updates**: Update both account balances atomically

#### Transaction Types:

- **Internal Transfers**: Between float accounts within the same branch
- **External Deposits**: From external sources (bank transfers, cash)
- **Service Transactions**: Related to customer service operations

### 3. Statement Generation Logic

#### Summary Calculation:

- **Opening Balance**: Balance before first transaction in period
- **Total Credits**: Sum of all positive transactions
- **Total Debits**: Sum of all negative transactions
- **Net Change**: Credits minus debits
- **Closing Balance**: Balance after last transaction in period

#### Transaction Categorization:

- **Recharges**: Manual additions to float accounts
- **Transfers**: Internal movements between accounts
- **Sales**: Customer transaction deductions
- **Withdrawals**: Customer cash-out operations

## Security and Validation

### 1. Access Control

- **Branch-Level Access**: Users can only access accounts in their branch
- **Admin Override**: Administrators can access all accounts
- **Session Validation**: All operations require valid user sessions

### 2. Data Validation

- **Amount Validation**: Positive amounts only, proper decimal handling
- **Balance Validation**: Source accounts must have sufficient funds
- **Account Status**: Only active accounts can participate in transfers
- **Reference Uniqueness**: Transaction references should be unique

### 3. Error Handling

- **Insufficient Funds**: Clear error messages with available balance
- **Invalid Accounts**: Proper error handling for non-existent accounts
- **Transaction Failures**: Rollback mechanisms for failed operations
- **Network Issues**: Graceful handling of API failures

## Best Practices

### 1. Float Management

- **Regular Recharges**: Monitor and recharge accounts before they run low
- **Balance Monitoring**: Set appropriate thresholds for alerts
- **Transaction Reviews**: Regularly review transaction history for anomalies
- **Documentation**: Maintain proper documentation for all transfers

### 2. Statement Generation

- **Regular Statements**: Generate monthly statements for all accounts
- **Audit Trails**: Keep detailed records for financial audits
- **Data Export**: Export data regularly for backup and analysis
- **Periodic Reviews**: Review statements for accuracy and completeness

### 3. System Maintenance

- **Database Optimization**: Regular maintenance of transaction tables
- **Performance Monitoring**: Monitor API response times
- **Backup Procedures**: Regular backups of transaction data
- **Update Procedures**: Keep system components updated

## Troubleshooting

### Common Issues:

1. **"Insufficient Balance" Error**

   - Check source account balance
   - Verify account is active
   - Ensure no pending transactions

2. **"Account Not Found" Error**

   - Verify account ID is correct
   - Check user has access to account
   - Ensure account is not deleted

3. **"Transaction Failed" Error**

   - Check network connectivity
   - Verify database connection
   - Review server logs for details

4. **"PDF Generation Failed" Error**
   - Check browser compatibility
   - Verify sufficient memory
   - Try smaller date ranges

### Support Contacts:

- **Technical Issues**: Contact system administrator
- **Business Logic**: Contact finance team
- **Access Issues**: Contact IT support

## Future Enhancements

### Planned Features:

1. **Automated Recharges**: Scheduled automatic recharges
2. **Advanced Analytics**: Detailed financial analysis and reporting
3. **Mobile Support**: Mobile-optimized interface
4. **Integration**: Integration with external banking systems
5. **Real-time Alerts**: Instant notifications for balance changes

### API Enhancements:

1. **Bulk Operations**: Support for bulk transfers
2. **Webhook Support**: Real-time transaction notifications
3. **Advanced Filtering**: More sophisticated transaction filtering
4. **Rate Limiting**: Improved API rate limiting and throttling

---

_This guide covers the enhanced Float Management System. For additional support or questions, please contact the development team._
