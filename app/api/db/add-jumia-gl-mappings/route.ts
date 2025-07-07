import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 Adding missing GL mappings for Jumia transactions...");

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

    // Find appropriate GL accounts for Jumia transactions
    const cashInTillAccount = floatAccounts.find(
      (fa) => fa.account_type === "cash-in-till"
    );
    const momoAccount = floatAccounts.find((fa) => fa.account_type === "momo");
    const agencyBankingAccount = floatAccounts.find(
      (fa) => fa.account_type === "agency-banking"
    );

    // Find GL accounts for different mapping types
    const cashGLAccount = glAccounts.find(
      (ga) => ga.account_type === "cash" || ga.account_code.includes("CASH")
    );
    const momoGLAccount = glAccounts.find(
      (ga) => ga.account_type === "momo" || ga.account_code.includes("MOMO")
    );
    const agencyGLAccount = glAccounts.find(
      (ga) =>
        ga.account_type === "agency-banking" ||
        ga.account_code.includes("AGENCY")
    );
    const revenueGLAccount = glAccounts.find(
      (ga) =>
        ga.account_type === "revenue" || ga.account_code.includes("REVENUE")
    );
    const liabilityGLAccount = glAccounts.find(
      (ga) =>
        ga.account_type === "liability" || ga.account_code.includes("LIABILITY")
    );

    const mappingsToAdd = [];

    // Add mappings for Jumia POD collections (cash)
    if (cashInTillAccount && cashGLAccount) {
      mappingsToAdd.push({
        transaction_type: "jumia_float",
        gl_account_id: cashGLAccount.id,
        float_account_id: cashInTillAccount.id,
        mapping_type: "main",
        description: "Jumia POD collection - cash payment",
      });
    }

    // Add mappings for Jumia POD collections (momo)
    if (momoAccount && momoGLAccount) {
      mappingsToAdd.push({
        transaction_type: "jumia_float",
        gl_account_id: momoGLAccount.id,
        float_account_id: momoAccount.id,
        mapping_type: "main",
        description: "Jumia POD collection - momo payment",
      });
    }

    // Add mappings for Jumia POD collections (agency banking)
    if (agencyBankingAccount && agencyGLAccount) {
      mappingsToAdd.push({
        transaction_type: "jumia_float",
        gl_account_id: agencyGLAccount.id,
        float_account_id: agencyBankingAccount.id,
        mapping_type: "main",
        description: "Jumia POD collection - agency banking payment",
      });
    }

    // Add liability mapping for Jumia
    if (liabilityGLAccount) {
      mappingsToAdd.push({
        transaction_type: "jumia_float",
        gl_account_id: liabilityGLAccount.id,
        float_account_id: null,
        mapping_type: "liability",
        description: "Jumia liability account",
      });
    }

    // Add revenue mapping for Jumia settlements
    if (revenueGLAccount) {
      mappingsToAdd.push({
        transaction_type: "jumia_float",
        gl_account_id: revenueGLAccount.id,
        float_account_id: null,
        mapping_type: "revenue",
        description: "Jumia settlement revenue",
      });
    }

    console.log(`📝 Adding ${mappingsToAdd.length} GL mappings for Jumia...`);

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

    // Verify the mappings were added
    const jumiaMappings = await sql`
      SELECT gm.*, ga.account_code, ga.account_name, fa.provider, fa.account_number
      FROM gl_mappings gm
      LEFT JOIN gl_accounts ga ON gm.gl_account_id = ga.id
      LEFT JOIN float_accounts fa ON gm.float_account_id = fa.id
      WHERE gm.branch_id = ${branchId} 
      AND gm.transaction_type = 'jumia_float'
      ORDER BY gm.mapping_type, ga.account_code
    `;

    console.log(
      `✅ Jumia GL mappings verification: Found ${jumiaMappings.length} mappings`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully added ${mappingsToAdd.length} GL mappings for Jumia transactions`,
      mappings: jumiaMappings,
      added: mappingsToAdd.length,
    });
  } catch (error) {
    console.error("❌ Error adding Jumia GL mappings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add Jumia GL mappings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
