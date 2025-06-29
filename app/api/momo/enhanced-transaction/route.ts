import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { EnhancedMoMoService } from "@/lib/momo-database-service-enhanced"
import { AuditService } from "@/lib/audit-service"
import { GLDatabase } from "@/lib/gl-database"
import { FloatGLIntegration } from "@/lib/float-gl-integration"

const sql = neon(process.env.CONNECTION_STRING!)

async function ensureGLSchema() {
  try {
    console.log("Ensuring GL schema exists...")

    // Check if GL tables exist
    const glAccountsTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'gl_accounts'
      ) as exists
    `

    if (!glAccountsTable[0].exists) {
      console.log("Creating GL tables...")

      // Create gl_accounts table
      await sql`
        CREATE TABLE IF NOT EXISTS gl_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
          parent_id UUID,
          balance DECIMAL(15,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Create gl_transactions table
      await sql`
        CREATE TABLE IF NOT EXISTS gl_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          date TIMESTAMP WITH TIME ZONE NOT NULL,
          source_module VARCHAR(50) NOT NULL,
          source_transaction_id UUID NOT NULL,
          source_transaction_type VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'reversed')),
          created_by VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          posted_by VARCHAR(50),
          posted_at TIMESTAMP WITH TIME ZONE,
          reversed_by VARCHAR(50),
          reversed_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB
        )
      `

      // Create gl_journal_entries table
      await sql`
        CREATE TABLE IF NOT EXISTS gl_journal_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          transaction_id UUID NOT NULL,
          account_id UUID NOT NULL,
          account_code VARCHAR(20) NOT NULL,
          debit DECIMAL(15,2) DEFAULT 0,
          credit DECIMAL(15,2) DEFAULT 0,
          description TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Create float_account_gl_mapping table
      await sql`
        CREATE TABLE IF NOT EXISTS float_account_gl_mapping (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          float_account_id UUID NOT NULL,
          gl_account_id UUID NOT NULL,
          mapping_type VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(float_account_id, mapping_type)
        )
      `

      // Add foreign key constraints
      try {
        await sql`
          ALTER TABLE gl_accounts 
          ADD CONSTRAINT gl_accounts_parent_id_fkey 
          FOREIGN KEY (parent_id) REFERENCES gl_accounts(id)
        `
      } catch (error) {
        console.log("Parent ID foreign key constraint already exists or failed:", error)
      }

      try {
        await sql`
          ALTER TABLE gl_journal_entries 
          ADD CONSTRAINT gl_journal_entries_transaction_id_fkey 
          FOREIGN KEY (transaction_id) REFERENCES gl_transactions(id)
        `
      } catch (error) {
        console.log("Transaction ID foreign key constraint already exists or failed:", error)
      }

      try {
        await sql`
          ALTER TABLE gl_journal_entries 
          ADD CONSTRAINT gl_journal_entries_account_id_fkey 
          FOREIGN KEY (account_id) REFERENCES gl_accounts(id)
        `
      } catch (error) {
        console.log("Account ID foreign key constraint already exists or failed:", error)
      }

      console.log("GL tables created successfully")
    }

    // Ensure required GL accounts exist
    await GLDatabase.ensureGLAccountsExist()
    console.log("GL schema setup completed")
  } catch (error) {
    console.error("Error setting up GL schema:", error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { transactionData, userContext } = await request.json()

    // Validate required fields
    if (!transactionData || !userContext) {
      return NextResponse.json({ error: "Missing transaction data or user context" }, { status: 400 })
    }

    // Validate required transaction fields
    const requiredFields = [
      "type",
      "amount",
      "phone_number",
      "customer_name",
      "float_account_id",
      "user_id",
      "processed_by",
    ]
    for (const field of requiredFields) {
      if (!transactionData[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Ensure GL schema is ready (direct call instead of fetch)
    try {
      await ensureGLSchema()
    } catch (glError) {
      console.error("Error ensuring GL schema:", glError)
      // Continue with transaction even if GL setup fails
    }

    // Process the transaction
    console.log("Processing MoMo transaction...")
    const transaction = await EnhancedMoMoService.createEnhancedTransaction(transactionData, userContext)

    // Try to create GL mapping for the float account if it doesn't exist
    try {
      // Check if float account has GL mapping
      const glMapping = await FloatGLIntegration.getGLAccountForFloat(transactionData.float_account_id)
      if (!glMapping) {
        // Get float account details
        const floatAccount = await sql`
          SELECT * FROM float_accounts WHERE id = ${transactionData.float_account_id}
        `

        if (floatAccount.length > 0) {
          // Create default GL mappings
          await FloatGLIntegration.createDefaultGLMappingsForFloat(floatAccount[0])
        }
      }
    } catch (mappingError) {
      console.error("Error creating GL mapping:", mappingError)
      // Continue with transaction even if mapping fails
    }

    // Try to create GL entries (non-blocking)
    try {
      const { createGLEntriesForMoMoTransaction } = await import("@/lib/gl-integration")

      // Create GL entries
      await createGLEntriesForMoMoTransaction({
        id: transaction.id,
        type: transactionData.type,
        amount: transactionData.amount,
        fee: transactionData.fee || 0,
        phoneNumber: transactionData.phone_number,
        customerName: transactionData.customer_name,
        reference: transactionData.reference || "",
        provider: transactionData.provider,
        date: transaction.created_at,
        processedBy: transactionData.processed_by,
      })
    } catch (glError) {
      console.error("Error creating GL entries:", glError)
      // Log the error but don't fail the transaction
      await AuditService.log({
        userId: userContext.userId,
        username: userContext.username,
        actionType: "gl_entry_failure",
        entityType: "transaction",
        entityId: transaction.id,
        description: "Failed to create GL entries for MoMo transaction",
        details: { error: glError instanceof Error ? glError.message : String(glError), transactionData },
        severity: "high",
        branchId: userContext.branchId,
        branchName: userContext.branchName,
        status: "failure",
        errorMessage: glError instanceof Error ? glError.message : String(glError),
      })
    }

    return NextResponse.json({
      success: true,
      transaction,
      message: "Transaction processed successfully",
    })
  } catch (error) {
    console.error("Error processing transaction:", error)
    return NextResponse.json(
      {
        error: "Failed to create transaction",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
