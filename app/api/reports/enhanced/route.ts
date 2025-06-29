import { type NextRequest, NextResponse } from "next/server"
import { GLFloatIntegrationService } from "@/lib/gl-float-integration-enhanced"
import { GLDatabase } from "@/lib/gl-database"

const glFloatService = new GLFloatIntegrationService()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reportType = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const branch = searchParams.get("branch")

    switch (reportType) {
      case "trial-balance-enhanced":
        const trialBalance = await GLDatabase.getTrialBalance(endDate || undefined)
        const floatData = await glFloatService.getGLAccountsWithFloatBalances()

        // Enhance trial balance with float account data
        const enhancedTrialBalance = {
          ...trialBalance,
          accounts: trialBalance.accounts.map((account) => {
            const floatAccount = floatData.find((fa) => fa.code === account.code)
            return {
              ...account,
              floatBalance: floatAccount?.float_balance,
              variance: floatAccount?.variance,
            }
          }),
        }

        return NextResponse.json({ trialBalance: enhancedTrialBalance })

      case "reconciliation-summary":
        const reconciliation = await glFloatService.generateReconciliationReport()
        return NextResponse.json({ reconciliation })

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error generating enhanced report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
