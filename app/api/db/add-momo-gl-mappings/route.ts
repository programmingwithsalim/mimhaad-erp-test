import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 Adding missing GL mappings for MoMo transactions...");

    // Get the branch ID from the request
    const { branchId } = await request.json();

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "Branch ID is required" },
        { status: 400 }
      );
    }

    // Get existing GL accounts and float accounts for the branch
    const glAccounts = await sql`
      SELECT id, account_code, account_name, account_type 
      FROM gl_accounts 
      WHERE branch_id = ${branchId}
      ORDER BY account_code
    `;

    const floatAccounts = await sql`
      SELECT id, account_type, provider, account_number 
      FROM float_accounts 
      WHERE branch_id = ${branchId} AND is_active = true
      ORDER BY account_type, provider
    `;

    console.log(
      `📊 Found ${glAccounts.length} GL accounts and ${floatAccounts.length} float accounts`
    );

    // Find appropriate GL accounts for MoMo transactions
    const cashInTillAccount = floatAccounts.find(
      (fa) => fa.account_type === "cash-in-till"
    );
    const momoAccounts = floatAccounts.filter(
      (fa) => fa.account_type === "momo"
    );

    // Find GL accounts for different mapping types
    const cashGLAccount = glAccounts.find(
      (ga) => ga.account_type === "Asset" || ga.account_code.includes("CASH")
    );
    const momoGLAccount = glAccounts.find(
      (ga) => ga.account_type === "Asset" || ga.account_code.includes("MOMO")
    );
    const revenueGLAccount = glAccounts.find(
      (ga) =>
        ga.account_type === "Revenue" || ga.account_code.includes("REVENUE")
    );
    const feeGLAccount = glAccounts.find(
      (ga) => ga.account_type === "Revenue" || ga.account_code.includes("FEE")
    );
    const liabilityGLAccount = glAccounts.find(
      (ga) =>
        ga.account_type === "Liability" || ga.account_code.includes("LIABILITY")
    );

    const mappingsToAdd = [];

    // Add mappings for MoMo cash-in transactions
    if (cashGLAccount && liabilityGLAccount) {
      mappingsToAdd.push({
        transaction_type: "cash-in",
        gl_account_id: cashGLAccount.id,
        float_account_id: cashInTillAccount?.id || null,
        mapping_type: "main",
        description: "MoMo cash-in - cash account",
      });

      mappingsToAdd.push({
        transaction_type: "cash-in",
        gl_account_id: liabilityGLAccount.id,
        float_account_id: null,
        mapping_type: "liability",
        description: "MoMo cash-in - liability account",
      });
    }

    // Add mappings for MoMo cash-out transactions
    if (cashGLAccount && liabilityGLAccount) {
      mappingsToAdd.push({
        transaction_type: "cash-out",
        gl_account_id: liabilityGLAccount.id,
        float_account_id: null,
        mapping_type: "main",
        description: "MoMo cash-out - liability account",
      });

      mappingsToAdd.push({
        transaction_type: "cash-out",
        gl_account_id: cashGLAccount.id,
        float_account_id: cashInTillAccount?.id || null,
        mapping_type: "asset",
        description: "MoMo cash-out - cash account",
      });
    }

    // Add mappings for MoMo deposit transactions (unified service)
    if (cashGLAccount && revenueGLAccount) {
      mappingsToAdd.push({
        transaction_type: "deposit",
        gl_account_id: cashGLAccount.id,
        float_account_id: cashInTillAccount?.id || null,
        mapping_type: "main",
        description: "MoMo deposit - cash account",
      });

      mappingsToAdd.push({
        transaction_type: "deposit",
        gl_account_id: revenueGLAccount.id,
        float_account_id: null,
        mapping_type: "revenue",
        description: "MoMo deposit - revenue account",
      });
    }

    // Add mappings for MoMo withdrawal transactions (unified service)
    if (cashGLAccount && revenueGLAccount) {
      mappingsToAdd.push({
        transaction_type: "withdrawal",
        gl_account_id: revenueGLAccount.id,
        float_account_id: null,
        mapping_type: "main",
        description: "MoMo withdrawal - revenue account",
      });

      mappingsToAdd.push({
        transaction_type: "withdrawal",
        gl_account_id: cashGLAccount.id,
        float_account_id: cashInTillAccount?.id || null,
        mapping_type: "asset",
        description: "MoMo withdrawal - cash account",
      });
    }

    // Add fee mappings for all transaction types
    if (feeGLAccount) {
      const feeTransactionTypes = [
        "cash-in",
        "cash-out",
        "deposit",
        "withdrawal",
      ];
      for (const transactionType of feeTransactionTypes) {
        mappingsToAdd.push({
          transaction_type: transactionType,
          gl_account_id: feeGLAccount.id,
          float_account_id: null,
          mapping_type: "fee",
          description: `MoMo ${transactionType} - fee account`,
        });
      }
    }

    console.log(`📝 Adding ${mappingsToAdd.length} GL mappings for MoMo...`);

    // Insert the mappings
    for (const mapping of mappingsToAdd) {
      const existingMapping = await sql`
        SELECT id FROM gl_mappings 
        WHERE branch_id = ${branchId} 
        AND transaction_type = ${mapping.transaction_type}
        AND mapping_type = ${mapping.mapping_type}
        AND gl_account_id = ${mapping.gl_account_id}
        ${
          mapping.float_account_id
            ? sql`AND float_account_id = ${mapping.float_account_id}`
            : sql`AND float_account_id IS NULL`
        }
      `;

      if (existingMapping.length === 0) {
        await sql`
          INSERT INTO gl_mappings (
            branch_id, transaction_type, gl_account_id, float_account_id, 
            mapping_type, is_active, created_at, updated_at
          ) VALUES (
            ${branchId}, ${mapping.transaction_type}, ${mapping.gl_account_id}, 
            ${mapping.float_account_id}, ${mapping.mapping_type}, true, 
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `;
        console.log(`✅ Added mapping: ${mapping.description}`);
      } else {
        console.log(`⏭️ Mapping already exists: ${mapping.description}`);
      }
    }

    console.log("🔧 [GL] MoMo GL mappings added successfully");

    return NextResponse.json({
      success: true,
      message: "MoMo GL mappings added successfully",
      mappingsAdded: mappingsToAdd.length,
      details: {
        transactionTypes: ["cash-in", "cash-out", "deposit", "withdrawal"],
        mappingTypes: ["main", "asset", "liability", "revenue", "fee"],
        accountsUsed: {
          cash: cashGLAccount?.account_code || "Not found",
          liability: liabilityGLAccount?.account_code || "Not found",
          revenue: revenueGLAccount?.account_code || "Not found",
          fee: feeGLAccount?.account_code || "Not found",
        },
      },
    });
  } catch (error) {
    console.error("❌ [GL] Error adding MoMo GL mappings:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
