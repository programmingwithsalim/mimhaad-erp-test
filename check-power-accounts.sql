-- Check existing power float accounts
SELECT 
    id, 
    provider, 
    account_type, 
    current_balance, 
    is_active, 
    branch_id,
    created_at
FROM float_accounts 
WHERE account_type = 'power' 
   OR provider ILIKE '%power%' 
   OR provider ILIKE '%electricity%'
   OR provider ILIKE '%ecg%'
   OR provider ILIKE '%nedco%'
ORDER BY created_at DESC;

-- Check all float accounts for reference
SELECT 
    provider, 
    account_type, 
    COUNT(*) as count,
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
FROM float_accounts 
GROUP BY provider, account_type
ORDER BY provider, account_type; 