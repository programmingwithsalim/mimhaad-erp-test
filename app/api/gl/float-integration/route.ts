import { type NextRequest, NextResponse } from "next/server"
import {
  getGLAccountsWithFloatBalances,
  generateReconciliationReport,
  syncFloatBalancesToGLServer,
  enhanceExistingGLWithFloatAccounts,
} from "@/lib/gl-float-integration-enhanced"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    switch (action) {
      case "accounts":
        const accounts = await getGLAccountsWithFloatBalances()
        return NextResponse.json(accounts)

      case "reconciliation":
        const reconciliation = await generateReconciliationReport()
        return NextResponse.json(reconciliation)

      default:
        return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 })
    }
  } catch (error) {
    console.error("GL Float Integration API Error:", error)
    return NextResponse.json({ error: "Failed to fetch GL float integration data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "sync":
        await syncFloatBalancesToGLServer()
        return NextResponse.json({ success: true, message: "Float balances synced successfully" })

      case "enhance":
        await enhanceExistingGLWithFloatAccounts()
        return NextResponse.json({ success: true, message: "GL enhancement completed successfully" })

      default:
        return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 })
    }
  } catch (error) {
    console.error("GL Float Integration API Error:", error)
    return NextResponse.json({ error: "Failed to process GL float integration request" }, { status: 500 })
  }
}
