import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { AuditLoggerService } from "@/lib/services/audit-logger-service"
import { GLPostingService } from "@/lib/services/gl-posting-service-corrected"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  let requestData: any = null

  try {
    requestData = await request.json()
    console.log("📝 [COMMISSION] Raw request data:", JSON.stringify(requestData, null, 2))

    // Extract user context from headers
    const userId = request.headers.get("x-user-id") || requestData.createdBy
    const userName = request.headers.get("x-user-name") || requestData.createdByName
    const userRole = request.headers.get("x-user-role") || requestData.userRole
    const branchId = request.headers.get("x-branch-id") || requestData.branchId
    const branchName = request.headers.get("x-branch-name") || requestData.branchName

    console.log("📝 [COMMISSION] User context:", {
      userId,
      userName,
      userRole,
      branchId,
      branchName,
    })

    // Validate required fields
    const {
      source,
      sourceName,
      reference,
      month,
      amount,
      transactionVolume,
      commissionRate,
      description,
      notes,
      status = "paid", // Default to paid
    } = requestData

    if (!source || !sourceName || !reference || !month || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate user context
    if (!userId || !branchId) {
      return NextResponse.json({ error: "User context is required" }, { status: 400 })
    }

    // Generate commission ID
    const commissionId = `comm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    console.log("📝 [COMMISSION] Creating commission with ID:", commissionId)

    // Log commission creation attempt
    await AuditLoggerService.log({
      userId,
      username: userName || "Unknown User",
      actionType: "commission_creation_attempt",
      entityType: "commission",
      entityId: commissionId,
      description: `Attempting to create commission for ${sourceName}`,
      details: {
        source,
        sourceName,
        reference,
        month,
        amount: Number(amount),
        transactionVolume: Number(transactionVolume || 0),
        commissionRate: Number(commissionRate || 0),
        status,
      },
      severity: "medium",
      branchId,
      branchName: branchName || "Unknown Branch",
      status: "success",
    })

    // Insert commission into database
    const insertResult = await sql`
      INSERT INTO commissions (
        id,
        source,
        source_name,
        reference,
        month,
        amount,
        transaction_volume,
        commission_rate,
        description,
        notes,
        status,
        created_by,
        created_by_name,
        branch_id,
        branch_name,
        created_at,
        updated_at
      ) VALUES (
        ${commissionId},
        ${source},
        ${sourceName},
        ${reference},
        ${month},
        ${Number(amount)},
        ${Number(transactionVolume || 0)},
        ${Number(commissionRate || 0)},
        ${description || ""},
        ${notes || ""},
        ${status},
        ${userId},
        ${userName || "Unknown User"},
        ${branchId},
        ${branchName || "Unknown Branch"},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const commission = insertResult[0]
    console.log("✅ [COMMISSION] Commission created in database:", commission.id)

    // Post to GL if status is paid
    if (status === "paid") {
      try {
        console.log("📊 [COMMISSION] Posting to GL...")
        await GLPostingService.postCommissionToGL({
          commissionId: commission.id,
          source: commission.source,
          sourceName: commission.source_name,
          amount: Number(commission.amount),
          reference: commission.reference,
          month: commission.month,
          branchId: commission.branch_id,
          branchName: commission.branch_name,
          userId,
          userName: userName || "Unknown User",
        })
        console.log("✅ [COMMISSION] Posted to GL successfully")
      } catch (glError) {
        console.error("❌ [COMMISSION] GL posting failed:", glError)
        // Don't fail the commission creation if GL posting fails
        await AuditLoggerService.log({
          userId,
          username: userName || "Unknown User",
          actionType: "commission_gl_posting_failure",
          entityType: "commission",
          entityId: commission.id,
          description: "Failed to post commission to GL",
          details: {
            error: glError instanceof Error ? glError.message : "Unknown GL error",
            commissionData: commission,
          },
          severity: "high",
          branchId,
          branchName: branchName || "Unknown Branch",
          status: "failure",
          errorMessage: glError instanceof Error ? glError.message : "Unknown GL error",
        })
      }
    }

    // Log successful commission creation
    await AuditLoggerService.log({
      userId,
      username: userName || "Unknown User",
      actionType: "commission_created",
      entityType: "commission",
      entityId: commission.id,
      description: `Successfully created commission for ${commission.source_name}`,
      details: {
        commissionId: commission.id,
        source: commission.source,
        sourceName: commission.source_name,
        amount: Number(commission.amount),
        reference: commission.reference,
        status: commission.status,
      },
      severity: Number(commission.amount) > 10000 ? "high" : "medium",
      branchId,
      branchName: branchName || "Unknown Branch",
      status: "success",
    })

    return NextResponse.json({
      success: true,
      message: "Commission created successfully",
      commission: {
        id: commission.id,
        source: commission.source,
        sourceName: commission.source_name,
        reference: commission.reference,
        month: commission.month,
        amount: Number(commission.amount),
        transactionVolume: Number(commission.transaction_volume),
        commissionRate: Number(commission.commission_rate),
        description: commission.description,
        notes: commission.notes,
        status: commission.status,
        createdBy: commission.created_by,
        createdByName: commission.created_by_name,
        branchId: commission.branch_id,
        branchName: commission.branch_name,
        createdAt: commission.created_at,
        updatedAt: commission.updated_at,
      },
    })
  } catch (error: any) {
    console.error("❌ [COMMISSION] Error creating commission:", error)

    // Log the error
    try {
      if (requestData) {
        await AuditLoggerService.log({
          userId: requestData.createdBy || "unknown",
          username: requestData.createdByName || "unknown",
          actionType: "commission_creation_failure",
          entityType: "commission",
          description: "Failed to create commission",
          details: {
            error: error.message,
            stack: error.stack,
            requestData,
          },
          severity: "critical",
          branchId: requestData.branchId || "unknown",
          branchName: requestData.branchName || "Unknown Branch",
          status: "failure",
          errorMessage: error.message,
        })
      }
    } catch (auditError) {
      console.error("❌ [COMMISSION] Failed to log error to audit:", auditError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create commission",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source")
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const branchId = searchParams.get("branchId")

    let query = `
      SELECT 
        id,
        source,
        source_name as "sourceName",
        reference,
        month,
        amount,
        transaction_volume as "transactionVolume",
        commission_rate as "commissionRate",
        description,
        notes,
        status,
        created_by as "createdBy",
        created_by_name as "createdByName",
        branch_id as "branchId",
        branch_name as "branchName",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM commissions
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    if (source) {
      const sources = source.split(",")
      query += ` AND source = ANY($${paramIndex})`
      params.push(sources)
      paramIndex++
    }

    if (status) {
      const statuses = status.split(",")
      query += ` AND status = ANY($${paramIndex})`
      params.push(statuses)
      paramIndex++
    }

    if (startDate) {
      query += ` AND month >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND month <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    if (branchId) {
      query += ` AND branch_id = $${paramIndex}`
      params.push(branchId)
      paramIndex++
    }

    query += ` ORDER BY created_at DESC`

    console.log("📝 [COMMISSION] Executing query:", query)
    console.log("📝 [COMMISSION] Query params:", params)

    const commissions = await sql(query, params)

    return NextResponse.json(commissions)
  } catch (error: any) {
    console.error("❌ [COMMISSION] Error fetching commissions:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch commissions",
      },
      { status: 500 },
    )
  }
}
