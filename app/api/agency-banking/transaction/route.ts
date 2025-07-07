import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth-service";
import { NotificationService } from "@/lib/services/notification-service";
import { AuditLoggerService } from "@/lib/services/audit-logger-service";
import { GLPostingService } from "@/lib/services/gl-posting-service";
import { v4 as uuidv4 } from "uuid";
import { UnifiedGLPostingService } from "@/lib/services/unified-gl-posting-service";

interface AgencyBankingTransactionData {
  type: "deposit" | "withdrawal" | "interbank" | "commission";
  amount: number;
  fee: number;
  customerName: string;
  accountNumber: string;
  partnerBankId: string;
  partnerBankName: string;
  partnerBankCode: string;
  reference?: string;
  description?: string;
  branchId: string;
  userId: string;
  branchName?: string;
  customerPhone?: string;
  notes?: string;
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
    `;

    if (!tableExists[0].exists) {
      console.log("🏗️ Agency banking table doesn't exist, creating it...");

      // Initialize the schema
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/db/init-agency-banking`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to initialize agency banking schema");
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
      `;
    } catch (tableError) {
      console.error("Error creating notifications table:", tableError);
    }
  } catch (error) {
    console.error("Error ensuring schema exists:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      amount,
      partner_bank_id,
      type,
      account_number,
      reference,
      notes,
    } = body;

    const { user } = session;
    await ensureSchemaExists();

    // 1. Fetch available partner bank (float account) for this branch
    const floatAccounts = await sql`
      SELECT * FROM float_accounts
      WHERE branch_id = ${user.branchId}
        AND account_type = 'agency-banking'
        AND is_active = true
    `;
    const partnerBank = floatAccounts.find(
      (fa: any) => fa.id === partner_bank_id
    );
    if (!partnerBank) {
      return NextResponse.json(
        { error: "Selected partner bank not found for this branch." },
        { status: 400 }
      );
    }

    // 2. Fetch fee dynamically from fee_config (via calculate-fee endpoint)
    let fee = 0;
    try {
      const feeRes = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/agency-banking/calculate-fee`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            transactionType: type,
            partnerBankId: partner_bank_id,
          }),
        }
      );
      const feeData = await feeRes.json();
      fee = Number(feeData.fee) || 0;
    } catch (err) {
      console.error("Failed to fetch fee from fee_config:", err);
      fee = 0;
    }

    // 3. Calculate cash till and float effects
    let cashTillAffected = 0;
    let floatAffected = 0;
    switch (type) {
      case "deposit":
        cashTillAffected = amount + fee;
        floatAffected = -amount;
        break;
      case "withdrawal":
        cashTillAffected = -(amount - fee);
        floatAffected = amount;
        break;
      case "interbank":
        cashTillAffected = fee;
        floatAffected = 0;
        break;
      case "commission":
        cashTillAffected = amount;
        floatAffected = 0;
        break;
    }

    // 4. Create the transaction record
    const transactionId = `${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    await sql`
        INSERT INTO agency_banking_transactions (
          id, type, amount, fee, customer_name, account_number,
          partner_bank, partner_bank_code, partner_bank_id,
          reference, status, date, branch_id, user_id,
          cash_till_affected, float_affected, created_at, updated_at
        ) VALUES (
        ${transactionId}, ${type}, ${amount}, ${fee},
          ${customer_name}, ${account_number || ""},
        ${partnerBank.account_name || partnerBank.provider || ""},
        ${partnerBank.account_number || ""},
        ${partnerBank.id},
          ${reference || `AGENCY-${Date.now()}`}, 'completed', ${now},
        ${user.id},
          ${cashTillAffected}, ${floatAffected}, ${now}, ${now}
        )
      `;

    // 5. Update float and cash till balances
      if (floatAffected !== 0) {
      await sql`
            UPDATE float_accounts 
        SET current_balance = current_balance + ${floatAffected}, updated_at = NOW()
        WHERE id = ${partnerBank.id}
      `;
    }
      if (cashTillAffected !== 0) {
      await sql`
            UPDATE float_accounts 
        SET current_balance = current_balance + ${cashTillAffected}, updated_at = NOW()
        WHERE account_type = 'cash-in-till' AND branch_id = ${user.branchId} AND is_active = true
      `;
    }

    // 6. Unified GL Posting
    const glResult = await UnifiedGLPostingService.createGLEntries({
      transactionId,
      sourceModule: "agency_banking",
      transactionType: type,
      amount,
      fee,
                customerName: customer_name,
      reference: reference || `AGENCY-${Date.now()}`,
      processedBy: user.id,
          branchId: user.branchId,
      branchName: user.branchName || "",
          metadata: {
        partnerBank: partnerBank.account_name || partnerBank.provider || "",
        partnerBankCode: partnerBank.account_number || "",
            customerName: customer_name,
            accountNumber: account_number,
        amount,
        fee,
            reference: reference || `AGENCY-${Date.now()}`,
          },
        });

    // 7. Return response
    return NextResponse.json({
      success: true,
      transactionId,
      glResult,
    });
  } catch (error) {
    console.error("Error processing agency banking transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || session.user.branchId;
    const limit = searchParams.get("limit") || "50";
    const offset = searchParams.get("offset") || "0";

    // Ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS agency_banking_transactions (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          fee DECIMAL(10,2) DEFAULT 0,
          customer_name VARCHAR(255) NOT NULL,
          account_number VARCHAR(100),
          partner_bank VARCHAR(255) NOT NULL,
          partner_bank_code VARCHAR(50),
          partner_bank_id VARCHAR(255),
          reference VARCHAR(100),
          status VARCHAR(20) DEFAULT 'completed',
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          branch_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          cash_till_affected DECIMAL(10,2) DEFAULT 0,
          float_affected DECIMAL(10,2) DEFAULT 0,
          gl_entry_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    } catch (tableError) {
        console.error(
        "Error creating agency_banking_transactions table:",
        tableError
      );
    }

    let transactions: any[] = [];
    let total = 0;
    try {
      transactions = await sql`
        SELECT 
          id,
          type,
          amount,
          fee,
          customer_name,
          account_number,
          partner_bank,
          reference,
          status,
          date,
          branch_id,
          user_id,
          cash_till_affected,
          float_affected,
          created_at
        FROM agency_banking_transactions 
        WHERE branch_id = ${branchId}
        ORDER BY created_at DESC 
        LIMIT ${Number.parseInt(limit)}
        OFFSET ${Number.parseInt(offset)}
      `;
      // Get total count for pagination
      const countResult = await sql`
        SELECT COUNT(*)::int as count FROM agency_banking_transactions WHERE branch_id = ${branchId}
      `;
      total = countResult[0]?.count || 0;
    } catch (queryError) {
      console.error("Error querying agency_banking_transactions:", queryError);
      transactions = [];
    }

    return NextResponse.json({
      success: true,
      transactions,
      total,
    });
  } catch (error) {
    console.error("Error fetching agency banking transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch agency banking transactions",
        transactions: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

// Helper function to get or create GL account
async function getOrCreateGLAccount(
  code: string,
  name: string,
  type: string
): Promise<any> {
  try {
    // Try to get existing account
    const existing = await sql`
      SELECT id, code, name, type
      FROM gl_accounts
      WHERE code = ${code} AND is_active = true
    `;

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new account
    const accountId = uuidv4();
    const result = await sql`
      INSERT INTO gl_accounts (id, code, name, type, balance, is_active)
      VALUES (${accountId}, ${code}, ${name}, ${type}, 0, true)
      RETURNING id, code, name, type
    `;

    console.log(`Created GL account: ${code} - ${name}`);
    return result[0];
  } catch (error) {
    console.error(`Failed to get or create GL account ${code}:`, error);
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, ...updateData } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }
    // Fetch the existing transaction
    const existingRows =
      await sql`SELECT * FROM agency_banking_transactions WHERE id = ${id}`;
    if (!existingRows.length) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    const existing = existingRows[0];
    // Reverse previous balances
    if (existing.float_affected) {
      await sql`UPDATE float_accounts SET current_balance = current_balance - ${existing.float_affected} WHERE id = ${existing.partner_bank_id}`;
    }
    if (existing.cash_till_affected) {
      await sql`UPDATE float_accounts SET current_balance = current_balance - ${existing.cash_till_affected} WHERE account_type = 'cash-in-till' AND branch_id = ${existing.branch_id}`;
    }
    // Remove old GL entries
    await UnifiedGLPostingService.deleteGLEntries({
      transactionId: id,
      sourceModule: "agency_banking",
    });
    // Calculate new values
    const {
      amount,
      type,
      partner_bank_id,
      account_number,
      customer_name,
      reference,
      notes,
    } = updateData;
    // Fetch partner bank
    const floatAccounts =
      await sql`SELECT * FROM float_accounts WHERE id = ${partner_bank_id} AND is_active = true`;
    const partnerBank = floatAccounts[0];
    // Fetch fee
    let fee = 0;
    try {
      const feeRes = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/agency-banking/calculate-fee`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            transactionType: type,
            partnerBankId: partner_bank_id,
          }),
        }
      );
      const feeData = await feeRes.json();
      fee = Number(feeData.fee) || 0;
    } catch (err) {
      fee = 0;
    }
    let cashTillAffected = 0;
    let floatAffected = 0;
    switch (type) {
      case "deposit":
        cashTillAffected = amount + fee;
        floatAffected = -amount;
        break;
      case "withdrawal":
        cashTillAffected = -(amount - fee);
        floatAffected = amount;
        break;
      case "interbank":
        cashTillAffected = fee;
        floatAffected = 0;
        break;
      case "commission":
        cashTillAffected = amount;
        floatAffected = 0;
        break;
    }
    // Update transaction
    await sql`
      UPDATE agency_banking_transactions SET
        type = ${type},
        amount = ${amount},
        fee = ${fee},
        customer_name = ${customer_name},
        account_number = ${account_number},
        partner_bank = ${
          partnerBank.account_name || partnerBank.provider || ""
        },
        partner_bank_code = ${partnerBank.account_number || ""},
        partner_bank_id = ${partnerBank.id},
        reference = ${reference || existing.reference},
        notes = ${notes || existing.notes},
        cash_till_affected = ${cashTillAffected},
        float_affected = ${floatAffected},
        updated_at = NOW()
      WHERE id = ${id}
    `;
    // Update balances
    if (floatAffected !== 0) {
      await sql`UPDATE float_accounts SET current_balance = current_balance + ${floatAffected} WHERE id = ${partnerBank.id}`;
    }
    if (cashTillAffected !== 0) {
      await sql`UPDATE float_accounts SET current_balance = current_balance + ${cashTillAffected} WHERE account_type = 'cash-in-till' AND branch_id = ${existing.branch_id}`;
    }
    // Re-post GL
    await UnifiedGLPostingService.createGLEntries({
      transactionId: id,
      sourceModule: "agency_banking",
      transactionType: type,
      amount,
      fee,
      customerName: customer_name,
      reference: reference || existing.reference,
      processedBy: session.user.id,
      branchId: existing.branch_id,
      branchName: session.user.branchName || "",
      metadata: {
        partnerBank: partnerBank.account_name || partnerBank.provider || "",
        partnerBankCode: partnerBank.account_number || "",
        customerName: customer_name,
        accountNumber: account_number,
        amount,
        fee,
        reference: reference || existing.reference,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error editing agency banking transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }
    // Fetch the transaction
    const existingRows =
      await sql`SELECT * FROM agency_banking_transactions WHERE id = ${id}`;
    if (!existingRows.length) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    const existing = existingRows[0];
    // Reverse balances
    if (existing.float_affected) {
      await sql`UPDATE float_accounts SET current_balance = current_balance - ${existing.float_affected} WHERE id = ${existing.partner_bank_id}`;
    }
    if (existing.cash_till_affected) {
      await sql`UPDATE float_accounts SET current_balance = current_balance - ${existing.cash_till_affected} WHERE account_type = 'cash-in-till' AND branch_id = ${existing.branch_id}`;
    }
    // Remove GL entries
    await UnifiedGLPostingService.deleteGLEntries({
      transactionId: id,
      sourceModule: "agency_banking",
    });
    // Delete transaction
    await sql`DELETE FROM agency_banking_transactions WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting agency banking transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
