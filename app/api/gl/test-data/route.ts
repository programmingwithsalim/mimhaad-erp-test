import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    console.log("=== TESTING TABLE DATA ===");

    const results = {};

    // Test each table individually with simple queries
    const tablesToTest = [
      "momo_transactions",
      "agency_banking_transactions",
      "ezwich_transactions",
      "power_transactions",
      "jumia_transactions",
      "commissions",
      "expenses",
    ];

    for (const tableName of tablesToTest) {
      try {
        console.log(`\n--- Testing ${tableName} ---`);

        // Get count using proper template literal syntax
        let countResult;
        switch (tableName) {
          case "momo_transactions":
            countResult =
              await sql`SELECT COUNT(*) as count FROM momo_transactions`;
            break;
          case "agency_banking_transactions":
            countResult =
              await sql`SELECT COUNT(*) as count FROM agency_banking_transactions`;
            break;
          case "ezwich_transactions":
            countResult =
              await sql`SELECT COUNT(*) as count FROM ezwich_transactions`;
            break;
          case "power_transactions":
            countResult =
              await sql`SELECT COUNT(*) as count FROM power_transactions`;
            break;
          case "jumia_transactions":
            countResult =
              await sql`SELECT COUNT(*) as count FROM jumia_transactions`;
            break;
          case "commissions":
            countResult = await sql`SELECT COUNT(*) as count FROM commissions`;
            break;
          case "expenses":
            countResult = await sql`SELECT COUNT(*) as count FROM expenses`;
            break;
          default:
            countResult = [{ count: 0 }];
        }

        const count = Number(countResult[0]?.count || 0);
        console.log(`${tableName} count:`, count);

        // Get columns
        const columns = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = ${tableName} 
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
        console.log(
          `${tableName} columns:`,
          columns.map((c) => `${c.column_name} (${c.data_type})`)
        );

        // Get sample data if any exists
        let sampleData = [];
        if (count > 0) {
          switch (tableName) {
            case "momo_transactions":
              sampleData = await sql`SELECT * FROM momo_transactions LIMIT 3`;
              break;
            case "agency_banking_transactions":
              sampleData =
                await sql`SELECT * FROM agency_banking_transactions LIMIT 3`;
              break;
            case "ezwich_transactions":
              sampleData = await sql`SELECT * FROM ezwich_transactions LIMIT 3`;
              break;
            case "power_transactions":
              sampleData = await sql`SELECT * FROM power_transactions LIMIT 3`;
              break;
            case "jumia_transactions":
              sampleData = await sql`SELECT * FROM jumia_transactions LIMIT 3`;
              break;
            case "commissions":
              sampleData = await sql`SELECT * FROM commissions LIMIT 3`;
              break;
            case "expenses":
              sampleData = await sql`SELECT * FROM expenses LIMIT 3`;
              break;
            default:
              sampleData = [];
          }
          console.log(`${tableName} sample data:`, sampleData);
        }

        results[tableName] = {
          count,
          columns: columns.map((c) => ({
            name: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable,
          })),
          sampleData: sampleData.slice(0, 2), // Only include 2 records to avoid too much data
        };
      } catch (error) {
        console.log(`Error testing ${tableName}:`, error.message);
        results[tableName] = {
          error: error.message,
          count: 0,
          columns: [],
          sampleData: [],
        };
      }
    }

    console.log("=== TEST RESULTS SUMMARY ===");
    Object.entries(results).forEach(([table, data]: [string, any]) => {
      console.log(
        `${table}: ${data.count || 0} records, ${
          data.columns?.length || 0
        } columns`
      );
    });

    return NextResponse.json({
      success: true,
      results,
      summary: Object.entries(results).map(([table, data]: [string, any]) => ({
        table,
        count: data.count || 0,
        hasData: (data.count || 0) > 0,
        error: data.error || null,
      })),
    });
  } catch (error) {
    console.error("Error testing table data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
