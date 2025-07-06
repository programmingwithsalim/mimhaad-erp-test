import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log("🔷 [GL] Initializing expense GL accounts and mappings...");

    // Get the main branch ID
    const branchResult = await sql`SELECT id FROM branches LIMIT 1`;
    if (branchResult.length === 0) {
      throw new Error("No branches found. Please create a branch first.");
    }
    const branchId = branchResult[0].id;

    // Create expense GL accounts (these are new expense category accounts)
    const expenseAccounts = [
      {
        id: "expense-account-001",
        code: "EXP-635844-GEN",
        name: "General Business Expenses",
        type: "Expense",
      },
      {
        id: "expense-account-002",
        code: "EXP-635844-ADMIN",
        name: "Administrative Expenses",
        type: "Expense",
      },
      {
        id: "expense-account-003",
        code: "EXP-635844-OPER",
        name: "Operational Expenses",
        type: "Expense",
      },
      {
        id: "expense-account-004",
        code: "EXP-635844-FIN",
        name: "Financial Expenses",
        type: "Expense",
      },
      {
        id: "expense-account-005",
        code: "EXP-635844-CAP",
        name: "Capital Expenses",
        type: "Expense",
      },
    ];

    // Insert expense GL accounts
    for (const account of expenseAccounts) {
      await sql`
        INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, branch_id, created_at, updated_at)
        VALUES (
          ${account.id},
          ${account.code},
          ${account.name},
          ${account.type},
          NULL,
          0.00,
          true,
          ${branchId},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    // Create expense GL mappings using existing float accounts as payment sources
    const expenseMappings = [
      // Expense category mappings
      {
        id: "expense-mapping-001",
        transaction_type: "expense_operational",
        gl_account_id: "expense-account-003",
        mapping_type: "expense",
      },
      {
        id: "expense-mapping-002",
        transaction_type: "expense_administrative",
        gl_account_id: "expense-account-002",
        mapping_type: "expense",
      },
      {
        id: "expense-mapping-003",
        transaction_type: "expense_financial",
        gl_account_id: "expense-account-004",
        mapping_type: "expense",
      },
      {
        id: "expense-mapping-004",
        transaction_type: "expense_capital",
        gl_account_id: "expense-account-005",
        mapping_type: "expense",
      },
      {
        id: "expense-mapping-005",
        transaction_type: "expense_other",
        gl_account_id: "expense-account-001",
        mapping_type: "expense",
      },
      // Payment source mappings using existing float accounts
      {
        id: "expense-mapping-006",
        transaction_type: "expense_cash",
        gl_account_id: "514767d8-e8ba-4ac2-8604-1885c67694c4", // Cash in Till GL account
        mapping_type: "payment",
      },
      {
        id: "expense-mapping-007",
        transaction_type: "expense_bank",
        gl_account_id: "613b5cee-71a0-4b81-8711-f1062292ed08", // Agency Banking Float - Cal Bank GL account
        mapping_type: "payment",
      },
      {
        id: "expense-mapping-008",
        transaction_type: "expense_momo",
        gl_account_id: "367b415b-950b-458f-9ec0-e369c6ef6a1a", // MoMo Float - Z-Pay GL account
        mapping_type: "payment",
      },
      {
        id: "expense-mapping-009",
        transaction_type: "expense_card",
        gl_account_id: "613b5cee-71a0-4b81-8711-f1062292ed08", // Agency Banking Float - Cal Bank GL account
        mapping_type: "payment",
      },
      // Additional payment methods using other existing float accounts
      {
        id: "expense-mapping-010",
        transaction_type: "expense_momo_mtn",
        gl_account_id: "93620bba-2d00-4178-8a7f-395c1170e81f", // MoMo Float - MTN GL account
        mapping_type: "payment",
      },
      {
        id: "expense-mapping-011",
        transaction_type: "expense_momo_telecel",
        gl_account_id: "10334c13-1e4a-4143-831b-2d7527c90230", // MoMo Float - Telecel GL account
        mapping_type: "payment",
      },
      {
        id: "expense-mapping-012",
        transaction_type: "expense_agency_gcb",
        gl_account_id: "a17161c8-0592-4a1c-822e-9a3ee1031fa4", // Agency Banking Float - GCB GL account
        mapping_type: "payment",
      },
      {
        id: "expense-mapping-013",
        transaction_type: "expense_agency_fidelity",
        gl_account_id: "64838f8a-b1ba-461f-8778-6a8e6646282a", // Agency Banking Float - Fidelity GL account
        mapping_type: "payment",
      },
    ];

    // Insert GL mappings
    for (const mapping of expenseMappings) {
      await sql`
        INSERT INTO gl_mappings (id, branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active, created_at, updated_at)
        VALUES (
          ${mapping.id},
          ${branchId},
          ${mapping.transaction_type},
          ${mapping.gl_account_id},
          NULL,
          ${mapping.mapping_type},
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          transaction_type = EXCLUDED.transaction_type,
          gl_account_id = EXCLUDED.gl_account_id,
          mapping_type = EXCLUDED.mapping_type,
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    console.log(
      "🔷 [GL] Expense GL accounts and mappings initialized successfully"
    );

    return NextResponse.json({
      success: true,
      message: "Expense GL accounts and mappings initialized successfully",
      accountsCreated: expenseAccounts.length,
      mappingsCreated: expenseMappings.length,
      details: {
        expenseAccounts: expenseAccounts.map((acc) => ({
          code: acc.code,
          name: acc.name,
        })),
        paymentMethods: [
          "expense_cash - Cash in Till",
          "expense_bank - Agency Banking (Cal Bank)",
          "expense_momo - MoMo (Z-Pay)",
          "expense_card - Agency Banking (Cal Bank)",
          "expense_momo_mtn - MoMo (MTN)",
          "expense_momo_telecel - MoMo (Telecel)",
          "expense_agency_gcb - Agency Banking (GCB)",
          "expense_agency_fidelity - Agency Banking (Fidelity)",
        ],
      },
    });
  } catch (error) {
    console.error("🔷 [GL] Error initializing expense GL:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize expense GL accounts and mappings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
