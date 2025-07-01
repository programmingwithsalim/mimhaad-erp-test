import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth-service";

const sql = neon(process.env.DATABASE_URL!);

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

    console.log("Fetching power transactions for branch:", branchId);

    // Ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS power_transactions (
          id VARCHAR(255) PRIMARY KEY,
          meter_number VARCHAR(100) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(20),
          provider VARCHAR(100) NOT NULL,
          reference VARCHAR(100),
          status VARCHAR(20) DEFAULT 'completed',
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          branch_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          gl_entry_id VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    } catch (tableError) {
      console.error("Error creating power_transactions table:", tableError);
    }

    let transactions = [];

    try {
      transactions = await sql`
        SELECT 
          id,
          meter_number,
          amount,
          customer_name,
          customer_phone,
          provider,
          reference,
          status,
          date,
          branch_id,
          user_id,
          gl_entry_id,
          notes,
          created_at,
          updated_at
        FROM power_transactions 
        WHERE branch_id = ${branchId}
        ORDER BY created_at DESC 
        LIMIT ${Number.parseInt(limit)}
        OFFSET ${Number.parseInt(offset)}
      `;
    } catch (queryError) {
      console.error("Error querying power_transactions:", queryError);
      transactions = [];
    }

    console.log(`Found ${transactions.length} power transactions`);

    return NextResponse.json({
      success: true,
      transactions,
      total: transactions.length,
    });
  } catch (error) {
    console.error("Error fetching power transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch power transactions",
        transactions: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Creating power transaction:", body);

    // Generate a proper UUID-like transaction ID
    const transactionId = `pwr_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create the transaction record
    await sql`
      INSERT INTO power_transactions (
        meter_number, amount, customer_name, customer_phone,
        provider, reference, status, date, branch_id, user_id, notes
      ) VALUES (
        ${body.meter_number}, ${body.amount}, ${body.customer_name},
        ${body.customer_phone || null}, ${body.provider}, ${
      body.reference || transactionId
    },
        'completed', NOW(), ${body.branchId}, ${body.userId}, ${
      body.notes || null
    }
      )
    `;

    // Create GL entries for power transaction (non-blocking)
    try {
      const { GLPostingServiceEnhanced } = await import(
        "@/lib/services/gl-posting-service-enhanced"
      );

      // Create simple GL entries for power transactions
      const glResult = await GLPostingServiceEnhanced.createAndPostTransaction({
        date: new Date().toISOString().split("T")[0],
        sourceModule: "power",
        sourceTransactionId: transactionId,
        sourceTransactionType: "bill_payment",
        description: `Power bill payment - ${body.provider} - ${body.meter_number}`,
        entries: [
          {
            accountId: "cash-account-id",
            accountCode: "1001",
            debit: 0,
            credit: body.amount,
            description: `Power payment - ${body.provider}`,
            metadata: {
              transactionId,
              provider: body.provider,
              meterNumber: body.meter_number,
            },
          },
          {
            accountId: "power-payable-account-id",
            accountCode: "2300",
            debit: body.amount,
            credit: 0,
            description: `Power bill payable - ${body.provider}`,
            metadata: {
              transactionId,
              provider: body.provider,
              meterNumber: body.meter_number,
            },
          },
        ],
        createdBy: body.userId,
        branchId: body.branchId,
        metadata: {
          provider: body.provider,
          meterNumber: body.meter_number,
          customerName: body.customer_name,
          amount: body.amount,
        },
      });

      if (glResult.success && glResult.glTransactionId) {
        // Update transaction with GL entry ID
        await sql`
          UPDATE power_transactions 
          SET gl_entry_id = ${glResult.glTransactionId}
          WHERE id = ${transactionId}
        `;
        console.log("GL entries created successfully for power transaction");
      }
    } catch (glError) {
      console.error("GL posting error (non-critical):", glError);
    }

    // Update float and cash in till balances
    // 1. Decrease power float
    await sql`
      UPDATE float_accounts
      SET current_balance = current_balance - ${body.amount},
          updated_at = NOW()
      WHERE branch_id = ${body.branchId}
        AND account_type = 'power-float'
        AND is_active = true
    `;

    // 2. Increase cash in till
    await sql`
      UPDATE float_accounts
      SET current_balance = current_balance + ${body.amount},
          updated_at = NOW()
      WHERE branch_id = ${body.branchId}
        AND account_type = 'cash-in-till'
        AND is_active = true
    `;

    return NextResponse.json({
      success: true,
      message: "Power transaction created successfully",
      transactionId,
    });
  } catch (error) {
    console.error("Error creating power transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create power transaction",
      },
      { status: 500 }
    );
  }
}
