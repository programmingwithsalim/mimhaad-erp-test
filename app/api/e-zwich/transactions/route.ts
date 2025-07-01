import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const offset = Number.parseInt(searchParams.get("offset") || "0");

    console.log("🔍 [E-ZWICH] Fetching transactions for branch:", branchId);

    // Initialize empty arrays
    let withdrawalTransactions: any[] = [];
    let cardIssuances: any[] = [];

    try {
      // Get withdrawal transactions
      if (branchId) {
        withdrawalTransactions = await sql`
          SELECT 
            id,
            'withdrawal' as type,
            amount,
            fee,
            customer_name,
            card_number,
            reference,
            status,
            created_at,
            partner_bank
          FROM e_zwich_withdrawals
          WHERE branch_id = ${branchId}
          ORDER BY created_at DESC 
          LIMIT ${limit}
        `;
      } else {
        withdrawalTransactions = await sql`
          SELECT 
            id,
            'withdrawal' as type,
            amount,
            fee,
            customer_name,
            card_number,
            reference,
            status,
            created_at,
            partner_bank
          FROM e_zwich_withdrawals
          ORDER BY created_at DESC 
          LIMIT ${limit}
        `;
      }
    } catch (error) {
      console.log("⚠️ [E-ZWICH] No withdrawal transactions table or data");
      withdrawalTransactions = [];
    }

    try {
      // Get card issuances
      if (branchId) {
        cardIssuances = await sql`
          SELECT *, fee_charged as amount, 'card_issuance' as type, 0 as fee
          FROM e_zwich_card_issuances
          WHERE branch_id = ${branchId}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      } else {
        cardIssuances = await sql`
          SELECT *, fee_charged as amount, 'card_issuance' as type, 0 as fee
          FROM e_zwich_card_issuances
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      }
    } catch (error) {
      console.log("⚠️ [E-ZWICH] No card issuances table or data");
      cardIssuances = [];
    }

    console.log(cardIssuances);

    // Combine and sort all transactions
    const allTransactions = [...withdrawalTransactions, ...cardIssuances].sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log(`✅ [E-ZWICH] Found ${allTransactions.length} transactions`);

    return NextResponse.json({
      success: true,
      transactions: allTransactions.slice(0, limit),
      total: allTransactions.length,
    });
  } catch (error) {
    console.error("❌ [E-ZWICH] Error fetching transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch E-Zwich transactions",
        transactions: [], // Return empty array instead of undefined
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      amount,
      fee,
      customer_name,
      card_number,
      reference,
      branchId,
      userId,
      partner_bank,
    } = body;
    const now = new Date().toISOString();
    let transactionId = `ezw_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    if (type === "card_issuance") {
      // Insert card issuance record
      await sql`
        INSERT INTO e_zwich_card_issuances (
          id, fee, customer_name, card_number, reference, status, created_at, branch_id, partner_bank
        ) VALUES (
          ${transactionId}, ${fee}, ${customer_name}, ${card_number}, ${
        reference || transactionId
      }, 'completed', ${now}, ${branchId}, ${partner_bank}
        )
      `;
      // Increase cash in till by fee
      await sql`
        UPDATE float_accounts
        SET current_balance = current_balance + ${fee},
            updated_at = NOW()
        WHERE branch_id = ${branchId}
          AND account_type = 'cash-in-till'
          AND is_active = true
      `;
      // Optionally decrease card stock here if tracked
    } else if (type === "withdrawal") {
      // Insert withdrawal record
      await sql`
        INSERT INTO e_zwich_transactions (
          id, amount, fee, customer_name, card_number, reference, status, created_at, branch_id, partner_bank
        ) VALUES (
          ${transactionId}, ${amount}, ${
        fee || 0
      }, ${customer_name}, ${card_number}, ${
        reference || transactionId
      }, 'completed', ${now}, ${branchId}, ${partner_bank}
        )
      `;
      // Increase ezwich settlement by amount
      await sql`
        UPDATE float_accounts
        SET current_balance = current_balance + ${amount},
            updated_at = NOW()
        WHERE branch_id = ${branchId}
          AND account_type = 'ezwich-settlement'
          AND is_active = true
      `;
      // Decrease cash in till by amount
      await sql`
        UPDATE float_accounts
        SET current_balance = current_balance - ${amount},
            updated_at = NOW()
        WHERE branch_id = ${branchId}
          AND account_type = 'cash-in-till'
          AND is_active = true
      `;
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid transaction type" },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, transactionId });
  } catch (error) {
    console.error("Error processing E-Zwich transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process E-Zwich transaction" },
      { status: 500 }
    );
  }
}
