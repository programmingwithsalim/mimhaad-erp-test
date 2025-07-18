import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 Adding missing GL mappings for MoMo transaction types...");

    // Get the branch ID from the request
    const { branchId } = await request.json();

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "Branch ID is required" },
        { status: 400 }
      );
    }

    // Get existing GL accounts for the branch
    const glAccounts = await sql`
      SELECT id, code, name, type 
      FROM gl_accounts 
      WHERE branch_id = ${branchId}
      ORDER BY code
    `;

    console.log(
      `📋 Found ${glAccounts.length} GL accounts for branch ${branchId}`
    );

    // Find the MoMo float account and related accounts
    const momoFloatAccount = glAccounts.find(
      (acc) => acc.code.includes("MOMO") && acc.type === "Asset"
    );
    const momoRevenueAccount = glAccounts.find(
      (acc) => acc.code.includes("MOMO") && acc.code.includes("REV")
    );
    const momoFeeAccount = glAccounts.find(
      (acc) => acc.code.includes("MOMO") && acc.code.includes("FEE")
    );
    const momoExpenseAccount = glAccounts.find(
      (acc) => acc.code.includes("MOMO") && acc.code.includes("EXP")
    );
    const momoCommissionAccount = glAccounts.find(
      (acc) => acc.code.includes("MOMO") && acc.code.includes("COM")
    );

    // Find cash in till account for liability mapping
    const cashInTillAccount = glAccounts.find(
      (acc) => acc.code.includes("CASH-IN-TILL") && acc.type === "Asset"
    );

    console.log("📋 Found accounts:", {
      momoFloat: momoFloatAccount?.code,
      momoRevenue: momoRevenueAccount?.code,
      momoFee: momoFeeAccount?.code,
      momoExpense: momoExpenseAccount?.code,
      momoCommission: momoCommissionAccount?.code,
      cashInTill: cashInTillAccount?.code,
    });

    // Define the mappings we need to create
    const mappingsToAdd = [];

    // Cash-in mappings (MoMo deposit)
    if (momoFloatAccount && cashInTillAccount) {
      mappingsToAdd.push({
        transaction_type: "cash-in",
        mapping_type: "main",
        gl_account_id: momoFloatAccount.id,
        description: "MoMo cash-in main account",
      });
      mappingsToAdd.push({
        transaction_type: "cash-in",
        mapping_type: "liability",
        gl_account_id: cashInTillAccount.id,
        description: "MoMo cash-in liability account",
      });
    }

    // Cash-out mappings (MoMo withdrawal)
    if (momoFloatAccount && cashInTillAccount) {
      mappingsToAdd.push({
        transaction_type: "cash-out",
        mapping_type: "main",
        gl_account_id: momoFloatAccount.id,
        description: "MoMo cash-out main account",
      });
      mappingsToAdd.push({
        transaction_type: "cash-out",
        mapping_type: "asset",
        gl_account_id: cashInTillAccount.id,
        description: "MoMo cash-out asset account",
      });
    }

    // Deposit mappings (alternative transaction type)
    if (momoFloatAccount && momoRevenueAccount) {
      mappingsToAdd.push({
        transaction_type: "deposit",
        mapping_type: "main",
        gl_account_id: momoFloatAccount.id,
        description: "MoMo deposit main account",
      });
      mappingsToAdd.push({
        transaction_type: "deposit",
        mapping_type: "revenue",
        gl_account_id: momoRevenueAccount.id,
        description: "MoMo deposit revenue account",
      });
    }

    // Withdrawal mappings (alternative transaction type)
    if (momoFloatAccount && momoRevenueAccount) {
      mappingsToAdd.push({
        transaction_type: "withdrawal",
        mapping_type: "main",
        gl_account_id: momoFloatAccount.id,
        description: "MoMo withdrawal main account",
      });
      mappingsToAdd.push({
        transaction_type: "withdrawal",
        mapping_type: "revenue",
        gl_account_id: momoRevenueAccount.id,
        description: "MoMo withdrawal revenue account",
      });
    }

    // Fee mappings for all transaction types
    if (momoFeeAccount) {
      const feeTransactionTypes = [
        "cash-in",
        "cash-out",
        "deposit",
        "withdrawal",
      ];
      for (const transactionType of feeTransactionTypes) {
        mappingsToAdd.push({
          transaction_type: transactionType,
          mapping_type: "fee",
          gl_account_id: momoFeeAccount.id,
          description: `MoMo ${transactionType} fee account`,
        });
      }
    }

    console.log(
      `📝 Adding ${mappingsToAdd.length} GL mappings for MoMo transactions...`
    );

    // Insert the mappings
    for (const mapping of mappingsToAdd) {
      const existingMapping = await sql`
        SELECT id FROM gl_mappings 
        WHERE branch_id = ${branchId} 
        AND transaction_type = ${mapping.transaction_type}
        AND mapping_type = ${mapping.mapping_type}
        AND gl_account_id = ${mapping.gl_account_id}
      `;

      if (existingMapping.length === 0) {
        await sql`
          INSERT INTO gl_mappings (
            branch_id, transaction_type, gl_account_id, float_account_id, 
            mapping_type, is_active, created_at, updated_at
          ) VALUES (
            ${branchId}, ${mapping.transaction_type}, ${mapping.gl_account_id}, 
            NULL, ${mapping.mapping_type}, true, 
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `;
        console.log(`✅ Added mapping: ${mapping.description}`);
      } else {
        console.log(`⏭️ Mapping already exists: ${mapping.description}`);
      }
    }

    console.log("🔧 [GL] MoMo transaction GL mappings added successfully");

    return NextResponse.json({
      success: true,
      message: "MoMo transaction GL mappings added successfully",
      mappingsAdded: mappingsToAdd.length,
      details: {
        transactionTypes: ["cash-in", "cash-out", "deposit", "withdrawal"],
        mappingTypes: ["main", "liability", "asset", "revenue", "fee"],
        accountsUsed: {
          main: momoFloatAccount?.code || "Not found",
          liability: cashInTillAccount?.code || "Not found",
          asset: cashInTillAccount?.code || "Not found",
          revenue: momoRevenueAccount?.code || "Not found",
          fee: momoFeeAccount?.code || "Not found",
        },
      },
    });
  } catch (error) {
    console.error("❌ Error adding MoMo transaction GL mappings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add MoMo transaction GL mappings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
