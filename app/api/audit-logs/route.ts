import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    // Check if audit_logs table exists and create it if it doesn't
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      )
    `

    if (!tableExists[0]?.exists) {
      // Create the table
      await sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255),
          username VARCHAR(255) NOT NULL,
          action_type VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          entity_id VARCHAR(255),
          description TEXT NOT NULL,
          details JSONB,
          ip_address INET,
          user_agent TEXT,
          severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          branch_id VARCHAR(255),
          branch_name VARCHAR(255),
          status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure')),
          error_message TEXT,
          related_entities JSONB,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type)`
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`

      return NextResponse.json({
        success: true,
        logs: [],
        total: 0,
        message: "Audit logs table created. No logs found yet.",
      })
    }

    // Build filters
    const filters = []
    const values = []

    if (searchParams.get("userId")) {
      filters.push(`user_id = $${filters.length + 1}`)
      values.push(searchParams.get("userId"))
    }

    if (searchParams.get("actionType")) {
      const actionTypes = searchParams.get("actionType")!.split(",")
      const placeholders = actionTypes.map((_, index) => `$${filters.length + index + 1}`).join(",")
      filters.push(`action_type IN (${placeholders})`)
      values.push(...actionTypes)
    }

    if (searchParams.get("entityType")) {
      const entityTypes = searchParams.get("entityType")!.split(",")
      const placeholders = entityTypes.map((_, index) => `$${filters.length + index + 1}`).join(",")
      filters.push(`entity_type IN (${placeholders})`)
      values.push(...entityTypes)
    }

    if (searchParams.get("severity")) {
      const severities = searchParams.get("severity")!.split(",")
      const placeholders = severities.map((_, index) => `$${filters.length + index + 1}`).join(",")
      filters.push(`severity IN (${placeholders})`)
      values.push(...severities)
    }

    if (searchParams.get("status")) {
      const statuses = searchParams.get("status")!.split(",")
      const placeholders = statuses.map((_, index) => `$${filters.length + index + 1}`).join(",")
      filters.push(`status IN (${placeholders})`)
      values.push(...statuses)
    }

    if (searchParams.get("branchId")) {
      const branchIds = searchParams.get("branchId")!.split(",")
      const placeholders = branchIds.map((_, index) => `$${filters.length + index + 1}`).join(",")
      filters.push(`branch_id IN (${placeholders})`)
      values.push(...branchIds)
    }

    if (searchParams.get("searchTerm")) {
      filters.push(`(description ILIKE $${filters.length + 1} OR username ILIKE $${filters.length + 1})`)
      values.push(`%${searchParams.get("searchTerm")}%`)
    }

    if (searchParams.get("startDate")) {
      filters.push(`created_at >= $${filters.length + 1}`)
      values.push(searchParams.get("startDate"))
    }

    if (searchParams.get("endDate")) {
      filters.push(`created_at <= $${filters.length + 1}`)
      values.push(searchParams.get("endDate"))
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""

    // Get total count
    let total = 0
    try {
      if (whereClause) {
        const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`
        const countResult = await sql.unsafe(countQuery, values)
        total = Number.parseInt(countResult[0]?.total || "0")
      } else {
        const countResult = await sql`SELECT COUNT(*) as total FROM audit_logs`
        total = Number.parseInt(countResult[0]?.total || "0")
      }
    } catch (countError) {
      console.error("Error getting count:", countError)
      total = 0
    }

    // Get paginated results
    let logs = []
    try {
      const dataQuery = `
    SELECT 
      id,
      user_id as "userId",
      username,
      action_type as "actionType",
      entity_type as "entityType",
      entity_id as "entityId",
      description,
      details,
      ip_address as "ipAddress",
      user_agent as "userAgent",
      severity,
      branch_id as "branchId",
      branch_name as "branchName",
      status,
      error_message as "errorMessage",
      related_entities as "relatedEntities",
      metadata,
      created_at as "timestamp"
    FROM audit_logs 
    ${whereClause}
    ORDER BY created_at DESC 
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `

      // Use proper neon template literal syntax instead of sql.unsafe
      if (whereClause) {
        const dataResult = await sql.unsafe(dataQuery, [...values, limit, offset])
        logs = dataResult || []
      } else {
        // When no filters, use template literal syntax
        const dataResult = await sql`
      SELECT 
        id,
        user_id as "userId",
        username,
        action_type as "actionType",
        entity_type as "entityType",
        entity_id as "entityId",
        description,
        details,
        ip_address as "ipAddress",
        user_agent as "userAgent",
        severity,
        branch_id as "branchId",
        branch_name as "branchName",
        status,
        error_message as "errorMessage",
        related_entities as "relatedEntities",
        metadata,
        created_at as "timestamp"
      FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `
        logs = dataResult || []
      }
    } catch (dataError) {
      console.error("Error getting data:", dataError)
      logs = []
    }

    return NextResponse.json({
      success: true,
      logs,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch audit logs",
        details: error instanceof Error ? error.message : "Unknown error",
        logs: [],
        total: 0,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.action === "export") {
      // Handle export functionality
      return NextResponse.json({
        success: true,
        message: "Export functionality will be implemented",
      })
    }

    // Create new audit log entry
    const {
      userId,
      username,
      actionType,
      entityType,
      entityId,
      description,
      details,
      severity = "low",
      branchId,
      branchName,
      status = "success",
      errorMessage,
      ipAddress,
      userAgent,
    } = body

    const result = await sql`
      INSERT INTO audit_logs (
        user_id, username, action_type, entity_type, entity_id, 
        description, details, severity, branch_id, branch_name, 
        status, error_message, ip_address, user_agent
      )
      VALUES (
        ${userId}, ${username}, ${actionType}, ${entityType}, ${entityId || null},
        ${description}, ${details ? JSON.stringify(details) : null}, ${severity},
        ${branchId || null}, ${branchName || null}, ${status}, ${errorMessage || null},
        ${ipAddress || null}, ${userAgent || null}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: "Audit log created successfully",
      data: result[0],
    })
  } catch (error) {
    console.error("Error creating audit log:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create audit log",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
