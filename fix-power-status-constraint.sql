-- Fix power_transactions status constraint to include 'reversed' and 'deleted' status
ALTER TABLE power_transactions 
DROP CONSTRAINT IF EXISTS power_transactions_status_check;

ALTER TABLE power_transactions 
ADD CONSTRAINT power_transactions_status_check 
CHECK (status::text = ANY (ARRAY['pending', 'completed', 'failed', 'cancelled', 'reversed', 'deleted']));

-- Add missing power_float GL mappings with mapping_type 'float'
INSERT INTO gl_mappings (
    id,
    branch_id,
    transaction_type,
    gl_account_id,
    float_account_id,
    mapping_type,
    is_active,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    '635844ab-029a-43f8-8523-d7882915266a',
    'power_float',
    fa.id,
    fa.id,
    'float',
    true,
    NOW(),
    NOW()
FROM float_accounts fa
WHERE fa.account_type = 'power' 
    AND fa.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM gl_mappings gm 
        WHERE gm.transaction_type = 'power_float' 
        AND gm.mapping_type = 'float'
        AND gm.float_account_id = fa.id
    ); 