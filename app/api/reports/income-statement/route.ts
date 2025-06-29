import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const to = searchParams.get("to") || new Date().toISOString()
    const branchId = searchParams.get("branchId")

    console.log("🔄 Generating income statement:", { from, to, branchId })

    // Helper function to safely execute queries
    const safeQuery = async (queryFn: () => Promise<any>, fallback: any, serviceName: string) => {
      try {
        return await queryFn()
      } catch (error) {
        console.error(`Error querying ${serviceName}:`, error)
        return fallback
      }
    }

    const revenues = []

    // MoMo Services revenue
    const momoRevenue = await safeQuery(
      async () => {
        if (branchId) {
          return await sql`
            SELECT 
              'MoMo Services' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM momo_transactions 
            WHERE created_at >= ${from} AND created_at <= ${to}
            AND branch_id = ${branchId}
          `
        } else {
          return await sql`
            SELECT 
              'MoMo Services' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM momo_transactions 
            WHERE created_at >= ${from} AND created_at <= ${to}
          `
        }
      },
      [{ category: "MoMo Services", amount: 0 }],
      "MoMo Services",
    )
    revenues.push(momoRevenue[0])

    // Agency Banking revenue
    const agencyRevenue = await safeQuery(
      async () => {
        if (branchId) {
          return await sql`
            SELECT 
              'Agency Banking' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM agency_banking_transactions 
            WHERE created_at >= ${from} AND created_at <= ${to}
            AND branch_id = ${branchId}
          `
        } else {
          return await sql`
            SELECT 
              'Agency Banking' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM agency_banking_transactions 
            WHERE created_at >= ${from} AND created_at <= ${to}
          `
        }
      },
      [{ category: "Agency Banking", amount: 0 }],
      "Agency Banking",
    )
    revenues.push(agencyRevenue[0])

    // E-Zwich Withdrawals revenue
    const ezwichRevenue = await safeQuery(
      async () => {
        if (branchId) {
          return await sql`
            SELECT 
              'E-Zwich Withdrawals' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM e_zwich_withdrawals 
            WHERE created_at >= ${from} AND created_at <= ${to}
            AND branch_id = ${branchId}
          `
        } else {
          return await sql`
            SELECT 
              'E-Zwich Withdrawals' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM e_zwich_withdrawals 
            WHERE created_at >= ${from} AND created_at <= ${to}
          `
        }
      },
      [{ category: "E-Zwich Withdrawals", amount: 0 }],
      "E-Zwich Withdrawals",
    )
    revenues.push(ezwichRevenue[0])

    // E-Zwich Card Issuance revenue
    const ezwichCardRevenue = await safeQuery(
      async () => {
        if (branchId) {
          return await sql`
            SELECT 
              'E-Zwich Card Issuance' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM e_zwich_card_issuances 
            WHERE created_at >= ${from} AND created_at <= ${to}
            AND branch_id = ${branchId}
          `
        } else {
          return await sql`
            SELECT 
              'E-Zwich Card Issuance' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM e_zwich_card_issuances 
            WHERE created_at >= ${from} AND created_at <= ${to}
          `
        }
      },
      [{ category: "E-Zwich Card Issuance", amount: 0 }],
      "E-Zwich Card Issuance",
    )
    revenues.push(ezwichCardRevenue[0])

    // Power Services revenue
    const powerRevenue = await safeQuery(
      async () => {
        if (branchId) {
          return await sql`
            SELECT 
              'Power Services' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM power_transactions 
            WHERE created_at >= ${from} AND created_at <= ${to}
            AND branch_id = ${branchId}
          `
        } else {
          return await sql`
            SELECT 
              'Power Services' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM power_transactions 
            WHERE created_at >= ${from} AND created_at <= ${to}
          `
        }
      },
      [{ category: "Power Services", amount: 0 }],
      "Power Services",
    )
    revenues.push(powerRevenue[0])

    // Jumia Services revenue
    const jumiaRevenue = await safeQuery(
      async () => {
        if (branchId) {
          return await sql`
            SELECT 
              'Jumia Services' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM jumia_transactions 
            WHERE created_at >= ${from} AND created_at <= ${to}
            AND branch_id = ${branchId}
          `
        } else {
          return await sql`
            SELECT 
              'Jumia Services' as category,
              COALESCE(SUM(fee), 0) as amount
            FROM jumia_transactions 
            WHERE created_at >= ${from} AND created_at <= ${to}
          `
        }
      },
      [{ category: "Jumia Services", amount: 0 }],
      "Jumia Services",
    )
    revenues.push(jumiaRevenue[0])

    // Operating expenses
    const expenses = await safeQuery(
      async () => {
        if (branchId) {
          return await sql`
            SELECT 
              eh.name as category,
              COALESCE(SUM(e.amount), 0) as amount
            FROM expenses e
            JOIN expense_heads eh ON e.expense_head_id = eh.id
            WHERE e.expense_date >= ${from} AND e.expense_date <= ${to}
              AND e.status = 'approved'
              AND e.branch_id = ${branchId}
            GROUP BY eh.id, eh.name
            ORDER BY amount DESC
          `
        } else {
          return await sql`
            SELECT 
              eh.name as category,
              COALESCE(SUM(e.amount), 0) as amount
            FROM expenses e
            JOIN expense_heads eh ON e.expense_head_id = eh.id
            WHERE e.expense_date >= ${from} AND e.expense_date <= ${to}
              AND e.status = 'approved'
            GROUP BY eh.id, eh.name
            ORDER BY amount DESC
          `
        }
      },
      [],
      "Expenses",
    )

    // Commission expenses
    const commissions = await safeQuery(
      async () => {
        if (branchId) {
          return await sql`
            SELECT 
              'Staff Commissions' as category,
              COALESCE(SUM(amount), 0) as amount
            FROM commissions 
            WHERE created_at >= ${from} AND created_at <= ${to}
              AND status = 'paid'
              AND branch_id = ${branchId}
          `
        } else {
          return await sql`
            SELECT 
              'Staff Commissions' as category,
              COALESCE(SUM(amount), 0) as amount
            FROM commissions 
            WHERE created_at >= ${from} AND created_at <= ${to}
              AND status = 'paid'
          `
        }
      },
      [{ category: "Staff Commissions", amount: 0 }],
      "Commissions",
    )

    // Calculate totals safely
    const totalRevenue = revenues.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const totalCommissions = commissions.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const totalOperatingExpenses = totalExpenses + totalCommissions
    const netIncome = totalRevenue - totalOperatingExpenses

    // Get branch info if specified
    let branchInfo = null
    if (branchId) {
      const branchResult = await safeQuery(
        async () => {
          return await sql`
            SELECT name, location FROM branches WHERE id = ${branchId}
          `
        },
        [],
        "Branch Info",
      )
      branchInfo = branchResult[0] || null
    }

    const incomeStatement = {
      period: {
        from,
        to,
        branch: branchInfo,
      },
      revenue: {
        total: totalRevenue,
        breakdown: revenues.map((item) => ({
          category: item.category,
          amount: Number(item.amount || 0),
        })),
      },
      expenses: {
        operating: {
          total: totalExpenses,
          breakdown: expenses.map((item) => ({
            category: item.category,
            amount: Number(item.amount || 0),
          })),
        },
        commissions: {
          total: totalCommissions,
          breakdown: commissions.map((item) => ({
            category: item.category,
            amount: Number(item.amount || 0),
          })),
        },
        total: totalOperatingExpenses,
      },
      net_income: netIncome,
      margins: {
        gross_margin: totalRevenue > 0 ? ((totalRevenue - totalOperatingExpenses) / totalRevenue) * 100 : 0,
        net_margin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
      },
    }

    console.log("✅ Income statement generated successfully")
    return NextResponse.json({
      success: true,
      data: incomeStatement,
    })
  } catch (error) {
    console.error("❌ Error generating income statement:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate income statement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
