import { type NextRequest, NextResponse } from "next/server"
import { approveCommission } from "@/lib/commission-database-service"
import { getCurrentUser } from "@/lib/auth-utils"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string  }> }) {
  try {
    const body = await request.json()
    const user = getCurrentUser(request) || { id: "system", name: "System" }

    const commission = await approveCommission((await params).id, user.id, user.name, body.notes || "")

    if (!commission) {
      return NextResponse.json({ error: "Commission not found or not in pending status" }, { status: 404 })
    }

    return NextResponse.json(commission)
  } catch (error) {
    console.error("Error approving commission:", error)
    return NextResponse.json({ error: "Failed to approve commission" }, { status: 500 })
  }
}
