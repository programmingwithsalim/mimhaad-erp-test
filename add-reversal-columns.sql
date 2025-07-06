-- Add reversal columns to momo_transactions table
ALTER TABLE momo_transactions ADD COLUMN IF NOT EXISTS original_transaction_id UUID;
ALTER TABLE momo_transactions ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE;

-- Add reversal columns to agency_banking_transactions table
ALTER TABLE agency_banking_transactions ADD COLUMN IF NOT EXISTS original_transaction_id UUID;
ALTER TABLE agency_banking_transactions ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE;

-- Add reversal columns to e_zwich_transactions table
ALTER TABLE e_zwich_transactions ADD COLUMN IF NOT EXISTS original_transaction_id UUID;
ALTER TABLE e_zwich_transactions ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE;

-- Add reversal columns to power_transactions table
ALTER TABLE power_transactions ADD COLUMN IF NOT EXISTS original_transaction_id UUID;
ALTER TABLE power_transactions ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE;

-- Add reversal columns to jumia_transactions table
ALTER TABLE jumia_transactions ADD COLUMN IF NOT EXISTS original_transaction_id UUID;
ALTER TABLE jumia_transactions ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_momo_transactions_original_id ON momo_transactions(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_momo_transactions_is_reversal ON momo_transactions(is_reversal);

CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_original_id ON agency_banking_transactions(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_is_reversal ON agency_banking_transactions(is_reversal);

CREATE INDEX IF NOT EXISTS idx_e_zwich_transactions_original_id ON e_zwich_transactions(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_e_zwich_transactions_is_reversal ON e_zwich_transactions(is_reversal);

CREATE INDEX IF NOT EXISTS idx_power_transactions_original_id ON power_transactions(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_power_transactions_is_reversal ON power_transactions(is_reversal);

CREATE INDEX IF NOT EXISTS idx_jumia_transactions_original_id ON jumia_transactions(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_jumia_transactions_is_reversal ON jumia_transactions(is_reversal); 