import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth-service";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔧 Adding missing GL mappings for power_float...");

    // Check if the mappings already exist
    const existingMappings = await sql`
      SELECT * FROM gl_mappings 
      WHERE source_module = 'power' 
      AND transaction_type = 'power_float' 
      AND mapping_type = 'float'
    `;

    if (existingMappings.length > 0) {
      console.log("✅ Power float GL mappings already exist");
      return NextResponse.json({
        success: true,
        message: "Power float GL mappings already exist",
        mappings: existingMappings,
      });
    }

    // Get the branch ID from the session
    const branchId = session.user.branchId;

    // Get default GL accounts for the branch
    const glAccounts = await sql`
      SELECT * FROM gl_accounts 
      WHERE branch_id = ${branchId}
      AND account_type IN ('cash', 'float', 'revenue', 'expense')
      ORDER BY account_type, account_name
    `;

    // Find appropriate accounts for power float mappings
    const cashAccount = glAccounts.find(
      (acc) =>
        acc.account_type === "cash" &&
        acc.account_name.toLowerCase().includes("cash")
    );
    const floatAccount = glAccounts.find(
      (acc) =>
        acc.account_type === "float" &&
        acc.account_name.toLowerCase().includes("power")
    );
    const revenueAccount = glAccounts.find(
      (acc) =>
        acc.account_type === "revenue" &&
        acc.account_name.toLowerCase().includes("power")
    );
    const expenseAccount = glAccounts.find(
      (acc) =>
        acc.account_type === "expense" &&
        acc.account_name.toLowerCase().includes("power")
    );

    if (!cashAccount || !floatAccount || !revenueAccount || !expenseAccount) {
      throw new Error(
        "Required GL accounts not found for power float mappings"
      );
    }

    // Create the GL mappings for power_float
    const mappings = [
      {
        source_module: "power",
        transaction_type: "power_float",
        mapping_type: "float",
        debit_account_id: cashAccount.id,
        credit_account_id: floatAccount.id,
        description: "Power float transaction - Cash to Float",
        is_active: true,
      },
      {
        source_module: "power",
        transaction_type: "power_float",
        mapping_type: "revenue",
        debit_account_id: floatAccount.id,
        credit_account_id: revenueAccount.id,
        description: "Power float transaction - Float to Revenue",
        is_active: true,
      },
      {
        source_module: "power",
        transaction_type: "power_float",
        mapping_type: "reversal",
        debit_account_id: floatAccount.id,
        credit_account_id: cashAccount.id,
        description: "Power float reversal - Float to Cash",
        is_active: true,
      },
    ];

    // Insert the mappings
    for (const mapping of mappings) {
      await sql`
        INSERT INTO gl_mappings (
          source_module, transaction_type, mapping_type, 
          debit_account_id, credit_account_id, description, is_active,
          created_at, updated_at
        ) VALUES (
          ${mapping.source_module}, ${mapping.transaction_type}, ${mapping.mapping_type},
          ${mapping.debit_account_id}, ${mapping.credit_account_id}, ${mapping.description}, ${mapping.is_active},
          NOW(), NOW()
        )
      `;
    }

    console.log("✅ Power float GL mappings created successfully");

    return NextResponse.json({
      success: true,
      message: "Power float GL mappings created successfully",
      mappings: mappings,
    });
  } catch (error) {
    console.error("❌ Error adding power float GL mappings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add power float GL mappings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
