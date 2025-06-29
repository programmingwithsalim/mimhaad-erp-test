import { type NextRequest, NextResponse } from "next/server"
import { markCommissionPaid } from "@/lib/commission-database-service"
import { AuditLoggerService } from "@/lib/services/audit-logger-service"
import { GLPostingService } from "@/lib/services/gl-posting-service"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      return NextResponse.json({ error: "Invalid commission ID format" }, { status: 400 })
    }

    const body = await request.json()
    const { paymentInfo = {}, userId = "system", userName = "System User" } = body

    console.log("Marking commission as paid:", params.id)

    const updatedCommission = await markCommissionPaid(params.id, userId, userName, paymentInfo)

    if (!updatedCommission) {
      return NextResponse.json({ error: "Commission not found or already paid" }, { status: 404 })
    }

    console.log("Commission marked as paid successfully:", updatedCommission.reference)

    await AuditLoggerService.logTransaction({
      userId: userId,
      username: userName,
      action: "complete",
      transactionType: "commission_payment",
      transactionId: params.id,
      amount: updatedCommission.amount,
      details: {
        source: updatedCommission.source,
        reference: updatedCommission.reference,
        paymentInfo: paymentInfo,
      },
      severity: updatedCommission.amount > 10000 ? "high" : "medium",
    })

    if (updatedCommission.amount > 0) {
      await GLPostingService.createCommissionPaymentGLEntries({
        commissionId: updatedCommission.id,
        source: updatedCommission.source,
        reference: updatedCommission.reference,
        amount: updatedCommission.amount,
        paymentMethod: paymentInfo.method || "bank_transfer",
        createdBy: userId,
      })
    }

    return NextResponse.json(updatedCommission)
  } catch (error) {
    console.error("Error marking commission as paid:", error)
    return NextResponse.json({ error: "Failed to mark commission as paid" }, { status: 500 })
  }
}
