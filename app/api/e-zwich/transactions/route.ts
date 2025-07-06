import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { UnifiedGLPostingService } from "@/lib/services/unified-gl-posting-service";

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
          SELECT 
            *,
            fee_charged as amount,
            'card_issuance' as type,
            fee_charged as fee,
            'completed' as status
          FROM ezwich_card_issuance
          WHERE branch_id = ${branchId}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      } else {
        cardIssuances = await sql`
          SELECT 
            *,
            fee_charged as amount,
            'card_issuance' as type,
            fee_charged as fee,
            'completed' as status
          FROM ezwich_card_issuance
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      }
    } catch (error) {
      console.log("⚠️ [E-ZWICH] No card issuances table or data");
      cardIssuances = [];
    }

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
      settlement_account_id, // for withdrawal
    } = body;
    const now = new Date().toISOString();
    // Validate required fields
    if (
      !type ||
      !card_number ||
      !customer_name ||
      !branchId ||
      !userId ||
      !amount
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
    // Generate UUID for transaction ID
    const transactionIdResult = await sql`SELECT gen_random_uuid() as id`;
    const transactionId = transactionIdResult[0].id;
    const txnReference = reference || `EZW-${type.toUpperCase()}-${Date.now()}`;
    if (type === "card_issuance") {
      // Insert card issuance record
      await sql`
        INSERT INTO ezwich_card_issuance (
          id, fee, customer_name, card_number, reference, status, created_at, branch_id, partner_bank
        ) VALUES (
          ${transactionId}, ${fee}, ${customer_name}, ${card_number}, ${txnReference}, 'completed', ${now}, ${branchId}, ${partner_bank}
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
      // Unified GL Posting
      try {
        await UnifiedGLPostingService.createGLEntries({
          transactionId,
          sourceModule: "e_zwich",
          transactionType: "card_issuance",
          amount: Number(fee),
          fee: 0,
          customerName: customer_name,
          reference: txnReference,
          processedBy: userId,
          branchId,
          metadata: { card_number },
        });
      } catch (glError) {
        console.error(
          "[GL] Failed to post E-Zwich card issuance to GL:",
          glError
        );
      }
    } else if (type === "withdrawal") {
      // Validate settlement account
      if (!settlement_account_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing settlement account ID for withdrawal",
          },
          { status: 400 }
        );
      }
      // Check settlement account balance
      const settlementAccount = await sql`
        SELECT current_balance FROM float_accounts 
        WHERE id = ${settlement_account_id} AND is_active = true
      `;
      if (settlementAccount.length === 0) {
        return NextResponse.json(
          { success: false, error: "Settlement account not found or inactive" },
          { status: 400 }
        );
      }
      const currentBalance = Number(settlementAccount[0].current_balance);
      if (currentBalance < amount) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient balance. Available: GHS ${currentBalance.toFixed(
              2
            )}, Required: GHS ${Number(amount).toFixed(2)}`,
          },
          { status: 400 }
        );
      }
      // Insert withdrawal record
      await sql`
        INSERT INTO e_zwich_withdrawals (
          id, card_number, settlement_account_id, customer_name, 
          amount, fee, status, reference, branch_id, partner_bank, created_at
        ) VALUES (
          ${transactionId}, ${card_number}, ${settlement_account_id}, ${customer_name},
          ${amount}, ${
        fee || 0
      }, 'completed', ${txnReference}, ${branchId}, ${partner_bank}, ${now}
        )
      `;
      // Decrease settlement account by amount
      await sql`
        UPDATE float_accounts
        SET current_balance = current_balance - ${amount},
            updated_at = NOW()
        WHERE id = ${settlement_account_id}
      `;
      // Increase cash in till by fee (if any)
      if (fee && Number(fee) > 0) {
        await sql`
          UPDATE float_accounts
          SET current_balance = current_balance + ${fee},
              updated_at = NOW()
          WHERE branch_id = ${branchId}
            AND account_type = 'cash-in-till'
            AND is_active = true
        `;
      }
      // Unified GL Posting
      try {
        await UnifiedGLPostingService.createGLEntries({
          transactionId,
          sourceModule: "e_zwich",
          transactionType: "withdrawal",
          amount: Number(amount),
          fee: Number(fee || 0),
          customerName: customer_name,
          reference: txnReference,
          processedBy: userId,
          branchId,
          metadata: { card_number },
        });
      } catch (glError) {
        console.error("[GL] Failed to post E-Zwich withdrawal to GL:", glError);
      }
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
