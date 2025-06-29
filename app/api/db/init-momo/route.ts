import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  return neon(process.env.DATABASE_URL)
}

export async function POST() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "DATABASE_URL environment variable is not set",
          message: "Using mock data instead",
        },
        { status: 400 },
      )
    }

    const sql = getDb()

    // Create MoMo transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS momo_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(20) NOT NULL CHECK (type IN ('cash-in', 'cash-out', 'transfer', 'payment', 'commission')),
        amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
        fee DECIMAL(15,2) NOT NULL DEFAULT 0,
        phone_number VARCHAR(20) NOT NULL,
        reference VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
        date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        branch_id UUID NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        float_account_id UUID NOT NULL,
        processed_by VARCHAR(100) NOT NULL,
        cash_till_affected DECIMAL(15,2) NOT NULL DEFAULT 0,
        float_affected DECIMAL(15,2) NOT NULL DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_branch_id ON momo_transactions(branch_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_date ON momo_transactions(date DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_status ON momo_transactions(status)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_provider ON momo_transactions(provider)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_float_account ON momo_transactions(float_account_id)
    `

    // Create trigger to update updated_at timestamp
    await sql`
      CREATE OR REPLACE FUNCTION update_momo_transactions_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    await sql`
      DROP TRIGGER IF EXISTS trigger_update_momo_transactions_updated_at ON momo_transactions
    `

    await sql`
      CREATE TRIGGER trigger_update_momo_transactions_updated_at
        BEFORE UPDATE ON momo_transactions
        FOR EACH ROW
        EXECUTE FUNCTION update_momo_transactions_updated_at()
    `

    // Check if sample MoMo float accounts exist for the specified branch
    const branchId = "635844ab-029a-43f8-8523-d7882915266a"

    // Check if the branches table exists
    let branchesExist = true
    try {
      await sql`SELECT 1 FROM branches LIMIT 1`
    } catch (error) {
      branchesExist = false
      console.log("Branches table does not exist, skipping float account creation")
    }

    // Check if the float_accounts table exists
    let floatAccountsExist = true
    try {
      await sql`SELECT 1 FROM float_accounts LIMIT 1`
    } catch (error) {
      floatAccountsExist = false
      console.log("Float accounts table does not exist, skipping float account creation")
    }

    let momoAccountCount = 0
    let transactionCount = 0

    // Only proceed with float account creation if both tables exist
    if (branchesExist && floatAccountsExist) {
      // Check if branch exists
      const branchExists = await sql`SELECT 1 FROM branches WHERE id = ${branchId} LIMIT 1`

      if (branchExists.length === 0) {
        console.log(`Branch with ID ${branchId} does not exist, skipping float account creation`)
      } else {
        const existingMoMoAccounts = await sql`
          SELECT COUNT(*) as count 
          FROM float_accounts 
          WHERE branch_id = ${branchId} AND account_type = 'momo'
        `

        momoAccountCount = Number(existingMoMoAccounts[0]?.count || 0)

        // Create sample MoMo float accounts if none exist
        if (momoAccountCount === 0) {
          const momoProviders = [
            { provider: "MTN", account_number: "MTN001", min_threshold: 5000, max_threshold: 100000 },
            { provider: "Vodafone", account_number: "VOD001", min_threshold: 5000, max_threshold: 100000 },
            { provider: "AirtelTigo", account_number: "AT001", min_threshold: 5000, max_threshold: 100000 },
          ]

          for (const momoProvider of momoProviders) {
            await sql`
              INSERT INTO float_accounts (
                branch_id, account_type, provider, account_number, 
                current_balance, min_threshold, max_threshold, is_active
              ) VALUES (
                ${branchId}, 'momo', ${momoProvider.provider}, ${momoProvider.account_number},
                50000, ${momoProvider.min_threshold}, ${momoProvider.max_threshold}, true
              )
            `
          }
          momoAccountCount = momoProviders.length
        }

        // Check if sample transactions exist
        const existingTransactions = await sql`
          SELECT COUNT(*) as count 
          FROM momo_transactions 
          WHERE branch_id = ${branchId}
        `

        transactionCount = Number(existingTransactions[0]?.count || 0)

        // Create sample transactions if none exist
        if (transactionCount === 0) {
          // Get the created MoMo float accounts
          const momoAccounts = await sql`
            SELECT id, provider 
            FROM float_accounts 
            WHERE branch_id = ${branchId} AND account_type = 'momo'
          `

          if (momoAccounts.length > 0) {
            const sampleTransactions = [
              {
                type: "cash-in",
                amount: 100,
                fee: 2,
                phone_number: "0244123456",
                customer_name: "John Doe",
                provider: "MTN",
              },
              {
                type: "cash-out",
                amount: 50,
                fee: 1.5,
                phone_number: "0201987654",
                customer_name: "Jane Smith",
                provider: "Vodafone",
              },
              {
                type: "cash-in",
                amount: 200,
                fee: 4,
                phone_number: "0557891234",
                customer_name: "Bob Johnson",
                provider: "AirtelTigo",
              },
            ]

            for (const transaction of sampleTransactions) {
              const account = momoAccounts.find((acc) => acc.provider === transaction.provider)
              if (account) {
                const cashTillAffected = transaction.type === "cash-in" ? transaction.amount : -transaction.amount
                const floatAffected = transaction.type === "cash-in" ? -transaction.amount : transaction.amount

                await sql`
                  INSERT INTO momo_transactions (
                    type, amount, fee, phone_number, customer_name, provider,
                    branch_id, user_id, float_account_id, processed_by,
                    cash_till_affected, float_affected, status
                  ) VALUES (
                    ${transaction.type}, ${transaction.amount}, ${transaction.fee},
                    ${transaction.phone_number}, ${transaction.customer_name}, ${transaction.provider},
                    ${branchId}, 'system', ${account.id}, 'system',
                    ${cashTillAffected}, ${floatAffected}, 'completed'
                  )
                `
              }
            }
            transactionCount = sampleTransactions.length
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "MoMo database initialized successfully",
      details: {
        tablesCreated: ["momo_transactions"],
        indexesCreated: 5,
        triggersCreated: 1,
        sampleAccountsCreated: momoAccountCount,
        sampleTransactionsCreated: transactionCount,
        branchesTableExists: branchesExist,
        floatAccountsTableExists: floatAccountsExist,
      },
    })
  } catch (error) {
    console.error("Error initializing MoMo database:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize MoMo database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
