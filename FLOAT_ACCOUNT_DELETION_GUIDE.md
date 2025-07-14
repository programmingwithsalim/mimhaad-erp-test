# Float Account Deletion Guide

## Overview

Float account deletion now requires password confirmation for administrators and includes comprehensive cleanup of related GL mappings and GL accounts.

## Deletion Process

### 🔐 **Password Confirmation Required**

- **Admin Only**: Only administrators can permanently delete float accounts
- **Password Verification**: Must enter and confirm password before deletion
- **Security**: Prevents accidental deletions and unauthorized access

### 🧹 **Comprehensive Cleanup**

When a float account is deleted, the system automatically:

1. **Checks for Dependencies**

   - Verifies no related transactions exist
   - Prevents deletion if transactions are found
   - Suggests deactivation instead

2. **Deletes GL Mappings**

   - Removes all GL mappings associated with the float account
   - Ensures no orphaned mappings remain

3. **Deletes GL Accounts**

   - Removes GL accounts created specifically for this float account
   - Preserves GL accounts used by other float accounts
   - Maintains data integrity

4. **Deletes Float Account**
   - Permanently removes the float account record
   - Cannot be undone

## User Interface

### **For Administrators:**

1. **Deactivate Option**: Hide account while preserving data
2. **Delete Option**: Permanently remove account and all related data
3. **Password Form**: Required confirmation before permanent deletion

### **For Other Users:**

- **Deactivate Only**: Can only hide accounts, not delete them
- **Data Preservation**: All data remains intact for audit purposes

## API Endpoints

### **DELETE `/api/float-accounts/[id]`**

```json
{
  "password": "admin_password",
  "confirmPassword": "admin_password"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Float account and all related GL mappings and accounts deleted successfully",
  "deletedAccount": { ... },
  "cleanupDetails": {
    "glMappingsDeleted": 5,
    "glAccountsDeleted": 5
  }
}
```

## Error Handling

### **Common Error Scenarios:**

1. **Insufficient Permissions**

   ```json
   {
     "success": false,
     "error": "Insufficient permissions. Only administrators can permanently delete accounts."
   }
   ```

2. **Password Mismatch**

   ```json
   {
     "success": false,
     "error": "Passwords do not match. Please confirm your password correctly."
   }
   ```

3. **Missing Password**

   ```json
   {
     "success": false,
     "error": "Password confirmation is required for account deletion."
   }
   ```

4. **Related Transactions Exist**
   ```json
   {
     "success": false,
     "error": "Cannot delete float account: 15 related transactions exist. Please deactivate the account instead."
   }
   ```

## Safety Measures

### **Transaction Check**

- System checks for related transactions in all modules:
  - MoMo transactions
  - Agency banking transactions
  - E-Zwich withdrawals
  - Power transactions
  - Jumia transactions

### **GL Account Preservation**

- Only deletes GL accounts that are exclusively used by the deleted float account
- Preserves GL accounts shared by multiple float accounts
- Maintains accounting integrity

### **Rollback Protection**

- Uses database transactions for atomic operations
- Rolls back all changes if any step fails
- Prevents partial deletions

## Best Practices

### **Before Deletion:**

1. **Check Balance**: Ensure account has zero or negative balance
2. **Review Transactions**: Verify no pending transactions exist
3. **Backup Data**: Consider exporting transaction history
4. **Notify Team**: Inform relevant team members

### **After Deletion:**

1. **Verify Cleanup**: Check that GL mappings and accounts are removed
2. **Update Documentation**: Remove references to deleted account
3. **Monitor System**: Ensure no errors in related processes

## Deactivation vs Deletion

### **Deactivation (Soft Delete):**

- ✅ Account hidden from interface
- ✅ All data preserved
- ✅ Can be reactivated later
- ✅ Safe for accounts with transaction history

### **Deletion (Hard Delete):**

- ❌ Account permanently removed
- ❌ All related data deleted
- ❌ Cannot be undone
- ❌ Only for unused accounts

## Audit Trail

### **Deletion Logging:**

- User who performed deletion
- Timestamp of deletion
- Account details before deletion
- Cleanup summary (GL mappings/accounts removed)
- Reason for deletion (if provided)

### **Compliance:**

- Maintains audit trail for regulatory requirements
- Preserves transaction history for deleted accounts
- Supports financial reporting and reconciliation

## Troubleshooting

### **Common Issues:**

1. **"Cannot delete account" error**

   - Check for related transactions
   - Use deactivation instead
   - Contact system administrator

2. **Password not accepted**

   - Verify password is correct
   - Check for caps lock
   - Ensure both fields match

3. **GL accounts not deleted**
   - Check if accounts are shared with other float accounts
   - Manual cleanup may be required
   - Contact technical support

## Security Considerations

### **Access Control:**

- Role-based permissions enforced
- Password confirmation required
- Audit logging of all deletions
- Session validation

### **Data Protection:**

- Secure password transmission
- Encrypted storage of sensitive data
- Regular security audits
- Compliance with data protection regulations
