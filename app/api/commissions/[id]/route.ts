import { type NextRequest, NextResponse } from "next/server"
import { updateCommission, getCommissionById, deleteCommission } from "@/lib/commission-database-service"
import { getCurrentUser } from "@/lib/auth-utils"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("PUT request for commission ID:", params.id)

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      console.log("Invalid commission ID format:", params.id)
      return NextResponse.json({ error: "Invalid commission ID format" }, { status: 400 })
    }

    const body = await request.json()
    console.log("Received commission update request:", body)

    // Get user info with better error handling
    let user
    try {
      user = getCurrentUser(request)
      console.log("Successfully got current user for update:", user)
    } catch (error) {
      console.log("Could not get current user from request, trying alternative methods...")

      // Try to get from request body if provided
      if (body.updatedBy && body.branchId) {
        user = {
          id: body.updatedBy,
          name: body.updatedByName || "Unknown User",
          username: body.updatedByName || "Unknown User",
          role: body.userRole || "manager",
          branchId: body.branchId,
          branchName: body.branchName || "Unknown Branch",
        }
        console.log("Got user from request body:", user)
      } else {
        console.log("Using development fallback user for update")
        user = {
          id: "dev-admin-001",
          name: "Development Admin",
          username: "dev-admin",
          role: "admin",
          branchId: "main-branch",
          branchName: "Main Branch",
        }
      }
    }

    // Check if commission exists
    const existingCommission = await getCommissionById(params.id)
    if (!existingCommission) {
      console.log("Commission not found for update:", params.id)
      return NextResponse.json({ error: "Commission not found" }, { status: 404 })
    }

    console.log("Found commission for update:", existingCommission.reference)

    // Update the commission
    const updatedCommission = await updateCommission(params.id, body, user.id, user.name)

    if (!updatedCommission) {
      console.log("Commission update failed")
      return NextResponse.json({ error: "Failed to update commission" }, { status: 500 })
    }

    console.log("Commission updated successfully:", updatedCommission.reference)

    // Log audit trail for commission update
    try {
      const { AuditLogger } = await import("@/lib/audit-logger")

      AuditLogger.log({
        userId: user.id,
        username: user.name,
        actionType: "update",
        entityType: "commission",
        entityId: updatedCommission.id,
        description: `Commission updated - ${updatedCommission.source} - ${updatedCommission.reference}`,
        details: {
          source: updatedCommission.source,
          reference: updatedCommission.reference,
          month: updatedCommission.month,
          amount: updatedCommission.amount,
          status: updatedCommission.status,
          branchId: updatedCommission.branchId,
          branchName: updatedCommission.branchName,
          changes: body,
        },
        severity: "medium",
        branchId: updatedCommission.branchId,
        branchName: updatedCommission.branchName,
        status: "success",
      })
    } catch (auditError) {
      console.error("Failed to log audit trail:", auditError)
    }

    return NextResponse.json(updatedCommission)
  } catch (error) {
    console.error("Error in PUT /api/commissions/[id]:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update commission" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("DELETE request for commission ID:", params.id)

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      console.log("Invalid commission ID format:", params.id)
      return NextResponse.json({ error: "Invalid commission ID format" }, { status: 400 })
    }

    // Get user info
    let user
    try {
      user = getCurrentUser(request)
    } catch (error) {
      console.log("Using development fallback user for delete")
      user = {
        id: "dev-admin-001",
        name: "Development Admin",
        username: "dev-admin",
        role: "admin",
        branchId: "main-branch",
        branchName: "Main Branch",
      }
    }

    // Check if commission exists
    const existingCommission = await getCommissionById(params.id)
    if (!existingCommission) {
      console.log("Commission not found for delete:", params.id)
      return NextResponse.json({ error: "Commission not found" }, { status: 404 })
    }

    console.log("Found commission for delete:", existingCommission.reference)

    // Delete the commission
    const success = await deleteCommission(params.id)

    if (!success) {
      console.log("Commission delete failed")
      return NextResponse.json({ error: "Failed to delete commission" }, { status: 500 })
    }

    console.log("Commission deleted successfully:", existingCommission.reference)

    // Log audit trail for commission deletion
    try {
      const { AuditLogger } = await import("@/lib/audit-logger")

      AuditLogger.log({
        userId: user.id,
        username: user.name,
        actionType: "delete",
        entityType: "commission",
        entityId: existingCommission.id,
        description: `Commission deleted - ${existingCommission.source} - ${existingCommission.reference}`,
        details: {
          source: existingCommission.source,
          reference: existingCommission.reference,
          month: existingCommission.month,
          amount: existingCommission.amount,
          status: existingCommission.status,
          branchId: existingCommission.branchId,
          branchName: existingCommission.branchName,
        },
        severity: "high",
        branchId: existingCommission.branchId,
        branchName: existingCommission.branchName,
        status: "success",
      })
    } catch (auditError) {
      console.error("Failed to log audit trail:", auditError)
    }

    return NextResponse.json({ success: true, message: "Commission deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/commissions/[id]:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete commission" },
      { status: 500 },
    )
  }
}
