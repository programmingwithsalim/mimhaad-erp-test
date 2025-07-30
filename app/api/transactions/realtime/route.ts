import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { logger, LogCategory } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")
    const serviceType = searchParams.get("serviceType")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!branchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })
    }

    await logger.info(LogCategory.API, "Real-time transactions request", {
      branchId,
      serviceType,
      status,
      limit,
    })

    // Build the query dynamically
    let query = `
      SELECT 
        t.id,
        t.type,
        t.service_type,
        t.amount,
        t.fee,
        t.status,
        t.customer_name,
        t.phone_number,
        t.reference,
        t.created_at,
        t.updated_at,
        t.branch_id,
        t.processed_by,
        u.name as processor_name
      FROM transactions t
      LEFT JOIN users u ON t.processed_by = u.id
      WHERE t.branch_id = $1
    `

    const params: any[] = [branchId]
    let paramIndex = 1

    if (serviceType) {
      paramIndex++
      query += ` AND t.service_type = $${paramIndex}`
      params.push(serviceType)
    }

    if (status) {
      paramIndex++
      query += ` AND t.status = $${paramIndex}`
      params.push(status)
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex + 1}`
    params.push(limit)

    const transactions = await sql.query(query, params)

    await logger.info(LogCategory.API, "Real-time transactions fetched successfully", {
      branchId,
      count: transactions.length,
    })

    return NextResponse.json({
      success: true,
      transactions,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    await logger.error(LogCategory.API, "Real-time transactions fetch failed", error as Error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
} 