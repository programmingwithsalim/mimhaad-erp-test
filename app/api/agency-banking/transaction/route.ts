import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth-service"
import { NotificationService } from "@/lib/services/notification-service"
import { AuditLoggerService } from "@/lib/services/audit-logger-service"
import { GLPostingService } from "@/lib/services/gl-posting-service"
import { v4 as uuidv4 } from "uuid"

interface AgencyBankingTransactionData {
  type: "deposit" | "withdrawal" | "interbank" | "commission"
  amount: number
  fee: number
  customerName: string
  accountNumber: string
  partnerBankId: string
  partnerBankName: string
  partnerBankCode: string
  reference?: string
  description?: string
  branchId: string
  userId: string
  branchName?: string
  customerPhone?: string
  notes?: string
}

async function ensureSchemaExists() {
  try {
    // Check if the table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_banking_transactions'
      );
    `

    if (!tableExists[0].exists) {
      console.log("🏗️ Agency banking table doesn't exist, creating it...")

      // Initialize the schema
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/db/init-agency-banking`,
        {
          method: "POST",
        },
      )

      if (!response.ok) {
        throw new Error("Failed to initialize agency banking schema")
      }
    }

    // Ensure notifications table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          branch_id VARCHAR(255),
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          priority VARCHAR(20) DEFAULT 'medium',
          status VARCHAR(20) DEFAULT 'unread',
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (tableError) {
      console.error("Error creating notifications table:", tableError)
    }
  } catch (error) {
    console.error("Error ensuring schema exists:", error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { customer_name, customer_phone, amount, fee, partner_bank, type, account_number, reference, notes } = body

    console.log("🏦 Processing Agency Banking Transaction:", {
      type: type,
      amount: amount,
      customerName: customer_name,
      partnerBank: partner_bank,
      userId: session.user.id,
    })

    // Validate required fields
    if (!customer_name || !amount || !partner_bank || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { user } = session

    // Ensure schema exists
    await ensureSchemaExists()

    // Generate transaction ID
    const transactionId = `${uuidv4().substring(0, 8)}`
    const now = new Date().toISOString()

    // Calculate cash till and float effects
    let cashTillAffected = 0
    let floatAffected = 0

    switch (type) {
      case "deposit":
        // Customer deposits to bank account → We transfer from our agency account to customer's bank account
        // We lose agency float (money goes to customer's bank account)
        // We gain cash in till (customer gives us physical cash)
        // No fee charged to customer
        cashTillAffected = amount // We gain cash from customer
        floatAffected = -amount // We lose agency float (transferred to customer's bank account)
        break

      case "withdrawal":
        // Customer withdraws from bank account → We transfer from customer's bank account to our agency account
        // We gain agency float (money comes from customer's bank account to our agency account)
        // We lose cash in till (we give customer physical cash)
        // No fee charged to customer
        cashTillAffected = -amount // We lose cash (give to customer)
        floatAffected = amount // We gain agency float (from customer's bank account)
        break

      case "interbank":
        // Customer pays us cash to transfer to another bank account
        // We gain cash in till (customer pays us cash + fee)
        // We lose agency float (we transfer to destination bank)
        cashTillAffected = amount + (fee || 0) // We gain cash (amount + fee from customer)
        floatAffected = -amount // We lose agency float (transferred to destination bank)
        break

      case "commission":
        // Commission earned - we gain both cash and no float change
        cashTillAffected = amount
        floatAffected = 0
        break
    }

    console.log(`💰 Cash till affected: ${cashTillAffected}, Float affected: ${floatAffected}`)

    // Start database transaction
    await sql`BEGIN`

    let cashTillAccount = null
    let updatedCashBalance = null
    let updatedFloatBalance = null
    let glTransactionId = null
    let transaction = null

    try {
      // 1. Create the main transaction record
      transaction = await sql`
        INSERT INTO agency_banking_transactions (
          id, type, amount, fee, customer_name, account_number,
          partner_bank, partner_bank_code, partner_bank_id,
          reference, status, date, branch_id, user_id,
          cash_till_affected, float_affected, created_at, updated_at
        ) VALUES (
          ${transactionId}, ${type}, ${amount}, ${fee || 0},
          ${customer_name}, ${account_number || ""},
          ${partner_bank}, '', ${user.branchId},
          ${reference || `AGENCY-${Date.now()}`}, 'completed', ${now},
          ${user.branchId}, ${user.id},
          ${cashTillAffected}, ${floatAffected}, ${now}, ${now}
        )
        RETURNING *
      `

      // 2. Update partner bank float account balance
      if (floatAffected !== 0) {
        const updatedFloatAccount = await sql`
          UPDATE float_accounts 
          SET current_balance = current_balance + ${floatAffected},
              updated_at = NOW()
          WHERE id = ${user.branchId}
          RETURNING id, current_balance
        `

        if (updatedFloatAccount.length > 0) {
          updatedFloatBalance = updatedFloatAccount[0].current_balance
          console.log(
            `Updated partner bank float: ${floatAffected > 0 ? "+" : ""}${floatAffected}, New balance: ${updatedFloatBalance}`,
          )
        }
      }

      // 3. Update cash till balance
      if (cashTillAffected !== 0) {
        // Get the cash till account for this branch
        cashTillAccount = await sql`
          SELECT id, current_balance FROM float_accounts 
          WHERE account_type = 'cash-in-till' 
          AND branch_id = ${user.branchId}
          AND is_active = true
          LIMIT 1
        `

        if (cashTillAccount.length > 0) {
          const updatedCashAccount = await sql`
            UPDATE float_accounts 
            SET current_balance = current_balance + ${cashTillAffected},
                updated_at = NOW()
            WHERE id = ${cashTillAccount[0].id}
            RETURNING id, current_balance
          `

          if (updatedCashAccount.length > 0) {
            updatedCashBalance = updatedCashAccount[0].current_balance
            console.log(
              `Updated cash till balance: ${cashTillAffected > 0 ? "+" : ""}${cashTillAffected}, New balance: ${updatedCashBalance}`,
            )
          }
        } else {
          console.warn(`No cash till account found for branch ${user.branchId}`)
        }
      }

      // 4. Create GL entries using GLPostingService
      try {
        console.log("📊 Creating GL entries for agency banking transaction...")

        // Get GL accounts
        const cashAccount = await getOrCreateGLAccount("1001", "Cash in Till", "Asset")
        const partnerBankAccount = await getOrCreateGLAccount(
          `2100-${user.branchId.substring(0, 8)}`,
          `${partner_bank} Agency Float`,
          "Liability",
        )
        const feeRevenueAccount = await getOrCreateGLAccount("4002", "Agency Banking Fee Income", "Revenue")

        if (!cashAccount || !partnerBankAccount || !feeRevenueAccount) {
          throw new Error("Failed to get or create required GL accounts")
        }

        // Create GL entries based on transaction type with CORRECT debit/credit logic
        const entries = []

        switch (type) {
          case "deposit":
            // Customer deposits to bank account → Agency float decreases
            // DR: Cash in Till (Asset) - we receive cash from customer
            // CR: Agency Bank Float (Liability) - we owe the bank less (our liability decreases)
            console.log("📝 Creating DEPOSIT GL entries:")
            console.log(`  DR: Cash in Till (${cashAccount.code}) - ${amount}`)
            console.log(`  CR: Agency Bank Float (${partnerBankAccount.code}) - ${amount}`)

            entries.push({
              accountId: cashAccount.id,
              accountCode: cashAccount.code,
              debit: amount,
              credit: 0,
              description: `Agency Banking Deposit - ${partner_bank} - ${account_number}`,
              metadata: {
                transactionId: transactionId,
                customerName: customer_name,
                partnerBank: partner_bank,
              },
            })

            entries.push({
              accountId: partnerBankAccount.id,
              accountCode: partnerBankAccount.code,
              debit: 0,
              credit: amount,
              description: `Agency Banking Deposit - ${partner_bank} - ${account_number}`,
              metadata: {
                transactionId: transactionId,
                customerName: customer_name,
                partnerBank: partner_bank,
              },
            })
            break

          case "withdrawal":
            // Customer withdraws from bank account → Agency float increases
            // DR: Agency Bank Float (Liability) - we owe the bank more (our liability increases)
            // CR: Cash in Till (Asset) - we give out cash to customer
            console.log("📝 Creating WITHDRAWAL GL entries:")
            console.log(`  DR: Agency Bank Float (${partnerBankAccount.code}) - ${amount}`)
            console.log(`  CR: Cash in Till (${cashAccount.code}) - ${amount}`)

            entries.push({
              accountId: partnerBankAccount.id,
              accountCode: partnerBankAccount.code,
              debit: amount,
              credit: 0,
              description: `Agency Banking Withdrawal - ${partner_bank} - ${account_number}`,
              metadata: {
                transactionId: transactionId,
                customerName: customer_name,
                partnerBank: partner_bank,
              },
            })

            entries.push({
              accountId: cashAccount.id,
              accountCode: cashAccount.code,
              debit: 0,
              credit: amount,
              description: `Agency Banking Withdrawal - ${partner_bank} - ${account_number}`,
              metadata: {
                transactionId: transactionId,
                customerName: customer_name,
                partnerBank: partner_bank,
              },
            })
            break

          case "interbank":
            // Interbank transfer: Customer pays cash to transfer to another bank
            // 1. Main transfer amount
            // DR: Cash in Till (Asset) - we receive cash from customer for transfer
            // CR: Destination Bank Float (Liability) - we owe the destination bank
            console.log("📝 Creating INTERBANK TRANSFER GL entries:")
            console.log(`  DR: Cash in Till (${cashAccount.code}) - ${amount}`)
            console.log(`  CR: Destination Bank Float (${partnerBankAccount.code}) - ${amount}`)

            entries.push({
              accountId: cashAccount.id,
              accountCode: cashAccount.code,
              debit: amount,
              credit: 0,
              description: `Interbank Transfer - To ${partner_bank} - ${account_number}`,
              metadata: {
                transactionId: transactionId,
                customerName: customer_name,
                destinationBank: partner_bank,
              },
            })

            entries.push({
              accountId: partnerBankAccount.id,
              accountCode: partnerBankAccount.code,
              debit: 0,
              credit: amount,
              description: `Interbank Transfer - To ${partner_bank} - ${account_number}`,
              metadata: {
                transactionId: transactionId,
                customerName: customer_name,
                destinationBank: partner_bank,
              },
            })

            // 2. Fee collection (separate entry)
            if (fee > 0) {
              console.log("📝 Creating INTERBANK FEE GL entries:")
              console.log(`  DR: Cash in Till (${cashAccount.code}) - ${fee}`)
              console.log(`  CR: Fee Revenue (${feeRevenueAccount.code}) - ${fee}`)

              entries.push({
                accountId: cashAccount.id,
                accountCode: cashAccount.code,
                debit: fee,
                credit: 0,
                description: `Interbank Transfer Fee - ${partner_bank}`,
                metadata: {
                  transactionId: transactionId,
                  feeAmount: fee,
                  destinationBank: partner_bank,
                },
              })

              entries.push({
                accountId: feeRevenueAccount.id,
                accountCode: feeRevenueAccount.code,
                debit: 0,
                credit: fee,
                description: `Interbank Transfer Fee Revenue - ${partner_bank}`,
                metadata: {
                  transactionId: transactionId,
                  feeAmount: fee,
                  destinationBank: partner_bank,
                },
              })
            }
            break

          case "commission":
            // Commission earned
            // DR: Cash in Till (Asset) - we receive commission
            // CR: Fee Revenue (Revenue) - we earn revenue
            console.log("📝 Creating COMMISSION GL entries:")
            console.log(`  DR: Cash in Till (${cashAccount.code}) - ${amount}`)
            console.log(`  CR: Fee Revenue (${feeRevenueAccount.code}) - ${amount}`)

            entries.push({
              accountId: cashAccount.id,
              accountCode: cashAccount.code,
              debit: amount,
              credit: 0,
              description: `Agency Banking Commission - ${partner_bank}`,
              metadata: {
                transactionId: transactionId,
                partnerBank: partner_bank,
              },
            })

            entries.push({
              accountId: feeRevenueAccount.id,
              accountCode: feeRevenueAccount.code,
              debit: 0,
              credit: amount,
              description: `Agency Banking Commission - ${partner_bank}`,
              metadata: {
                transactionId: transactionId,
                partnerBank: partner_bank,
              },
            })
            break
        }

        // Fee entries for deposit and withdrawal (if applicable) - always increase cash and revenue
        if (fee > 0 && type !== "interbank") {
          console.log("📝 Creating FEE GL entries:")
          console.log(`  DR: Cash in Till (${cashAccount.code}) - ${fee}`)
          console.log(`  CR: Fee Revenue (${feeRevenueAccount.code}) - ${fee}`)

          entries.push({
            accountId: cashAccount.id,
            accountCode: cashAccount.code,
            debit: fee,
            credit: 0,
            description: `Agency Banking Fee - ${partner_bank}`,
            metadata: {
              transactionId: transactionId,
              feeAmount: fee,
              partnerBank: partner_bank,
            },
          })

          entries.push({
            accountId: feeRevenueAccount.id,
            accountCode: feeRevenueAccount.code,
            debit: 0,
            credit: fee,
            description: `Agency Banking Fee Revenue - ${partner_bank}`,
            metadata: {
              transactionId: transactionId,
              feeAmount: fee,
              partnerBank: partner_bank,
            },
          })
        }

        // Validate that debits equal credits
        const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0)
        const totalCredits = entries.reduce((sum, entry) => sum + entry.credit, 0)

        console.log(`📊 GL Entry Validation: Debits=${totalDebits}, Credits=${totalCredits}`)

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          throw new Error(`GL entries don't balance: Debits ${totalDebits}, Credits ${totalCredits}`)
        }

        // Use GLPostingService to create and post the transaction
        const glResult = await GLPostingService.createAndPostTransaction({
          date: new Date().toISOString().split("T")[0],
          sourceModule: "agency_banking",
          sourceTransactionId: transactionId,
          sourceTransactionType: type,
          description: `Agency Banking ${type} - ${partner_bank} - ${account_number}`,
          entries,
          createdBy: user.id,
          branchId: user.branchId,
          branchName: user.branchName,
          metadata: {
            partnerBank: partner_bank,
            partnerBankCode: "",
            customerName: customer_name,
            accountNumber: account_number,
            amount: amount,
            fee: fee || 0,
            reference: reference || `AGENCY-${Date.now()}`,
          },
        })

        if (glResult.success && glResult.glTransactionId) {
          glTransactionId = glResult.glTransactionId

          // Update transaction with GL transaction ID
          await sql`
            UPDATE agency_banking_transactions
            SET gl_entry_id = ${glTransactionId}
            WHERE id = ${transactionId}
          `

          console.log(`✅ GL transaction created with ID: ${glTransactionId}`)
        } else {
          console.error("❌ Failed to create GL transaction:", glResult.error)
        }
      } catch (glError) {
        console.error("❌ Error creating GL entries:", glError)
        // Don't fail the transaction if GL posting fails
      }

      // Commit the transaction
      await sql`COMMIT`

      console.log("✅ Agency banking transaction completed:", transactionId)

      // Create audit log using the AuditLoggerService
      try {
        console.log("📝 Creating audit log for user ID:", user.id)

        await AuditLoggerService.logTransaction({
          userId: user.id,
          action: "create",
          transactionType: `agency_banking_${type}`,
          transactionId: transactionId,
          amount: amount,
          branchId: user.branchId,
          branchName: user.branchName,
          details: {
            customerName: customer_name,
            accountNumber: account_number,
            partnerBank: partner_bank,
            fee: fee || 0,
            reference: reference || `AGENCY-${Date.now()}`,
            cashTillAffected,
            floatAffected,
            glTransactionId,
          },
          severity: amount > 10000 ? "high" : "medium",
          status: "success",
        })

        console.log("📝 Audit log created successfully")
      } catch (auditError) {
        console.error("Failed to create audit log:", auditError)
      }

      // Send transaction notification
      try {
        await NotificationService.sendTransactionAlert(user.id, {
          type: type,
          amount: Number(amount),
          service: "Agency Banking",
          reference: transaction.reference,
          branchId: user.branchId,
        })
      } catch (notificationError) {
        console.error("Failed to send transaction notification:", notificationError)
        // Don't fail the transaction if notification fails
      }

      // Return the transaction with proper field mapping
      const returnTransaction = {
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        fee: Number(transaction.fee),
        customer_name: transaction.customer_name,
        account_number: transaction.account_number,
        partner_bank: transaction.partner_bank,
        partner_bank_code: transaction.partner_bank_code,
        partner_bank_id: transaction.partner_bank_id,
        reference: transaction.reference,
        status: transaction.status,
        date: transaction.date,
        branch_id: transaction.branch_id,
        user_id: transaction.user_id,
        cash_till_affected: Number(transaction.cash_till_affected),
        float_affected: Number(transaction.float_affected),
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        gl_entry_id: glTransactionId,
      }

      return NextResponse.json({
        success: true,
        message: "Agency banking transaction processed successfully",
        transaction: returnTransaction,
        updatedBalances: {
          cashTillBalance: updatedCashBalance,
          floatBalance: updatedFloatBalance,
          cashTillAccountId: cashTillAccount?.[0]?.id || null,
        },
      })
    } catch (dbError) {
      // Rollback on database error
      await sql`ROLLBACK`
      console.error("Database error:", dbError)
      throw dbError
    }
  } catch (error: any) {
    console.error("❌ Error processing agency banking transaction:", error)

    // Log the error to audit using AuditLoggerService
    try {
      await AuditLoggerService.log({
        userId: error.data?.userId || "unknown",
        actionType: "agency_banking_failure",
        entityType: "agency_banking_transaction",
        description: "Failed to process agency banking transaction",
        details: {
          error: error.message,
          stack: error.stack,
          requestData: error.data || {},
        },
        severity: "critical",
        branchId: error.data?.branchId || "unknown",
        branchName: error.data?.branchName || "unknown",
        status: "failure",
        errorMessage: error.message,
      })
    } catch (auditError) {
      console.error("Failed to log error to audit:", auditError)
    }

    return NextResponse.json(
      {
        success: false,
        message: "Transaction failed",
        error: error.message || "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}

// Helper function to get or create GL account
async function getOrCreateGLAccount(code: string, name: string, type: string): Promise<any> {
  try {
    // Try to get existing account
    const existing = await sql`
      SELECT id, code, name, type
      FROM gl_accounts
      WHERE code = ${code} AND is_active = true
    `

    if (existing.length > 0) {
      return existing[0]
    }

    // Create new account
    const accountId = uuidv4()
    const result = await sql`
      INSERT INTO gl_accounts (id, code, name, type, balance, is_active)
      VALUES (${accountId}, ${code}, ${name}, ${type}, 0, true)
      RETURNING id, code, name, type
    `

    console.log(`Created GL account: ${code} - ${name}`)
    return result[0]
  } catch (error) {
    console.error(`Failed to get or create GL account ${code}:`, error)
    throw error
  }
}
