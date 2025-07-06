import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Get all branches
    const branches =
      await sql`SELECT id, name FROM branches WHERE is_active = true`;

    if (branches.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No active branches found. Please create branches first.",
      });
    }

    let totalAccountsCreated = 0;

    for (const branch of branches) {
      const branchId = branch.id;

      // Check if float accounts already exist for this branch
      const existingAccounts = await sql`
        SELECT COUNT(*) as count FROM float_accounts WHERE branch_id = ${branchId}
      `;

      if (Number(existingAccounts[0]?.count || 0) > 0) {
        console.log(`Float accounts already exist for branch ${branch.name}`);
        continue;
      }

      // Create float accounts for this branch
      const floatAccounts = [
        {
          account_type: "cash-in-till",
          provider: "Internal Cash",
          account_number: `CASH-${branchId.slice(-8)}`,
          current_balance: 10000,
          min_threshold: 1000,
          max_threshold: 50000,
        },
        {
          account_type: "momo",
          provider: "MTN",
          account_number: `233${
            Math.floor(Math.random() * 900000000) + 100000000
          }`,
          current_balance: 15000,
          min_threshold: 2000,
          max_threshold: 100000,
        },
        {
          account_type: "momo",
          provider: "Vodafone",
          account_number: `233${
            Math.floor(Math.random() * 900000000) + 100000000
          }`,
          current_balance: 12000,
          min_threshold: 1500,
          max_threshold: 80000,
        },
        {
          account_type: "momo",
          provider: "AirtelTigo",
          account_number: `233${
            Math.floor(Math.random() * 900000000) + 100000000
          }`,
          current_balance: 10000,
          min_threshold: 1200,
          max_threshold: 60000,
        },
        {
          account_type: "e-zwich",
          provider: "E-Zwich",
          account_number: `GH${Math.floor(Math.random() * 9000000) + 1000000}`,
          current_balance: 20000,
          min_threshold: 3000,
          max_threshold: 150000,
        },
        {
          account_type: "agency-banking",
          provider: "Ghana Commercial Bank",
          account_number: `GCB${Math.floor(Math.random() * 9000000) + 1000000}`,
          current_balance: 25000,
          min_threshold: 5000,
          max_threshold: 200000,
        },
        {
          account_type: "power",
          provider: "ECG",
          account_number: `ECG${Math.floor(Math.random() * 9000000) + 1000000}`,
          current_balance: 5000,
          min_threshold: 1000,
          max_threshold: 50000,
        },
        {
          account_type: "jumia",
          provider: "Jumia",
          account_number: `JUM${Math.floor(Math.random() * 9000000) + 1000000}`,
          current_balance: 8000,
          min_threshold: 1000,
          max_threshold: 40000,
        },
      ];

      for (const account of floatAccounts) {
        await sql`
          INSERT INTO float_accounts (
            branch_id, account_type, provider, account_number,
            current_balance, min_threshold, max_threshold, is_active,
            created_by, created_at, updated_at
          ) VALUES (
            ${branchId}, ${account.account_type}, ${account.provider}, ${account.account_number},
            ${account.current_balance}, ${account.min_threshold}, ${account.max_threshold}, true,
            'system', NOW(), NOW()
          )
        `;
        totalAccountsCreated++;
      }

      console.log(
        `Created ${floatAccounts.length} float accounts for branch ${branch.name}`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${totalAccountsCreated} float accounts across ${branches.length} branches`,
      details: {
        branchesProcessed: branches.length,
        accountsCreated: totalAccountsCreated,
      },
    });
  } catch (error) {
    console.error("Error seeding float accounts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed float accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
