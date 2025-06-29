import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from =
      searchParams.get("from") ||
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0]
    const branch = searchParams.get("branch") || "all"

    // Get float account balances vs GL account balances
    let floatAccountsQuery
    let glAccountsQuery

    if (branch !== "all") {
      floatAccountsQuery = sql`
        SELECT 
          fa.id,
          COALESCE(fa.provider, fa.account_type, 'Unknown') as account_name,
          fa.account_type,
          fa.current_balance as float_balance,
          fa.branch_id
        FROM float_accounts fa
        WHERE fa.is_active = true 
        AND fa.branch_id = ${branch}
        ORDER BY fa.provider, fa.account_type
      `

      glAccountsQuery = sql`
        SELECT 
          ga.id,
          ga.name as account_name,
          ga.code as account_code,
          COALESCE(ga.balance, 0) as gl_balance
        FROM gl_accounts ga
        WHERE ga.is_active = true
        AND (ga.name ILIKE '%float%' OR ga.name ILIKE '%cash%' OR ga.name ILIKE '%bank%' OR ga.code LIKE '10%')
        ORDER BY ga.code
      `
    } else {
      floatAccountsQuery = sql`
        SELECT 
          fa.id,
          COALESCE(fa.provider, fa.account_type, 'Unknown') as account_name,
          fa.account_type,
          fa.current_balance as float_balance,
          fa.branch_id
        FROM float_accounts fa
        WHERE fa.is_active = true 
        ORDER BY fa.provider, fa.account_type
      `

      glAccountsQuery = sql`
        SELECT 
          ga.id,
          ga.name as account_name,
          ga.code as account_code,
          COALESCE(ga.balance, 0) as gl_balance
        FROM gl_accounts ga
        WHERE ga.is_active = true
        AND (ga.name ILIKE '%float%' OR ga.name ILIKE '%cash%' OR ga.name ILIKE '%bank%' OR ga.code LIKE '10%')
        ORDER BY ga.code
      `
    }

    const [floatAccounts, glAccounts] = await Promise.all([floatAccountsQuery, glAccountsQuery])

    // Calculate reconciliation differences
    const reconciliationItems = []
    let totalFloatBalance = 0
    let totalGLBalance = 0
    let totalVariance = 0

    // Process float accounts
    for (const floatAccount of floatAccounts) {
      const floatBalance = Number.parseFloat(floatAccount.float_balance?.toString() || "0")
      totalFloatBalance += floatBalance

      // Try to find matching GL account
      const matchingGLAccount = glAccounts.find(
        (gl) =>
          gl.account_name.toLowerCase().includes(floatAccount.account_type?.toLowerCase() || "") ||
          gl.account_name.toLowerCase().includes(floatAccount.account_name?.toLowerCase().split(" ")[0] || ""),
      )

      const glBalance = matchingGLAccount ? Number.parseFloat(matchingGLAccount.gl_balance?.toString() || "0") : 0
      const variance = floatBalance - glBalance

      reconciliationItems.push({
        account_name: floatAccount.account_name || "Unknown Account",
        account_type: floatAccount.account_type || "unknown",
        float_balance: floatBalance,
        gl_balance: glBalance,
        variance: variance,
        status: Math.abs(variance) < 0.01 ? "matched" : "variance",
        branch_id: floatAccount.branch_id,
      })

      totalVariance += Math.abs(variance)
    }

    // Process GL accounts that don't have matching float accounts
    for (const glAccount of glAccounts) {
      const hasMatchingFloat = floatAccounts.some(
        (fa) =>
          fa.account_name?.toLowerCase().includes(glAccount.account_name?.toLowerCase().split(" ")[0] || "") ||
          glAccount.account_name?.toLowerCase().includes(fa.account_type?.toLowerCase() || ""),
      )

      if (!hasMatchingFloat) {
        const glBalance = Number.parseFloat(glAccount.gl_balance?.toString() || "0")
        totalGLBalance += glBalance

        reconciliationItems.push({
          account_name: glAccount.account_name || "Unknown GL Account",
          account_type: "GL Only",
          float_balance: 0,
          gl_balance: glBalance,
          variance: -glBalance,
          status: "gl_only",
          branch_id: null,
        })

        totalVariance += Math.abs(glBalance)
      }
    }

    // Calculate GL total from all matched accounts
    totalGLBalance = glAccounts.reduce((sum, acc) => sum + Number.parseFloat(acc.gl_balance?.toString() || "0"), 0)

    // Get transaction counts for the period (with error handling)
    let transactionStats = { total_transactions: 0, posted_transactions: 0, pending_transactions: 0 }
    try {
      const statsResult = await sql`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'posted' THEN 1 END) as posted_transactions,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions
        FROM gl_entries
        WHERE transaction_date BETWEEN ${from} AND ${to}
        ${branch !== "all" ? sql`AND branch_id::text = ${branch}` : sql``}
      `
      transactionStats = statsResult[0] || transactionStats
    } catch (error) {
      console.log("Could not fetch transaction stats, using defaults")
    }

    const reconciliationData = {
      summary: {
        total_float_balance: totalFloatBalance,
        total_gl_balance: totalGLBalance,
        total_variance: totalVariance,
        variance_percentage: totalFloatBalance > 0 ? (totalVariance / totalFloatBalance) * 100 : 0,
        matched_accounts: reconciliationItems.filter((item) => item.status === "matched").length,
        variance_accounts: reconciliationItems.filter((item) => item.status === "variance").length,
        gl_only_accounts: reconciliationItems.filter((item) => item.status === "gl_only").length,
      },
      items: reconciliationItems,
      transaction_stats: transactionStats,
      period: { from, to },
      branch: branch,
    }

    return NextResponse.json({
      success: true,
      data: reconciliationData,
    })
  } catch (error) {
    console.error("Error generating reconciliation report:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate reconciliation report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
