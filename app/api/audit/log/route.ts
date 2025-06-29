import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Initialize database connection with fallback
let sql: any
try {
  const connectionString = process.env.DATABASE_URL || process.env.CONNECTION_STRING
  if (connectionString) {
    sql = neon(connectionString)
  } else {
    console.warn("No database connection string found")
    sql = null
  }
} catch (error) {
  console.error("Failed to initialize database connection:", error)
  sql = null
}

export async function POST(request: NextRequest) {
  try {
    // If no database connection, return success without logging
    if (!sql) {
      console.warn("No database connection available for audit logging")
      return NextResponse.json({ success: true, message: "Audit logging disabled - no database connection" })
    }

    const auditData = await request.json()

    // Add IP address from request, handle unknown IPs properly
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ip = forwarded ? forwarded.split(",")[0].trim() : realIp

    // Validate IP address format or set to null
    let validIp = null
    if (ip && ip !== "unknown") {
      // Basic IP validation (IPv4 or IPv6)
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
      if (ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === "::1" || ip === "127.0.0.1") {
        validIp = ip
      }
    }

    // Check if audit_logs table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
      )
    `

    if (!tableExists[0]?.exists) {
      console.warn("Audit logs table does not exist")
      return NextResponse.json({ success: true, message: "Audit logging disabled - table not found" })
    }

    // Log the audit entry
    await sql`
      INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        branch_id,
        details,
        severity,
        ip_address,
        user_agent,
        created_at
      ) VALUES (
        ${auditData.action || "unknown"},
        ${auditData.entity_type || "unknown"},
        ${auditData.entity_id || null},
        ${auditData.user_id || null},
        ${auditData.branch_id || null},
        ${JSON.stringify(auditData.details || {})},
        ${auditData.severity || "low"},
        ${validIp},
        ${request.headers.get("user-agent") || null},
        CURRENT_TIMESTAMP
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error logging audit:", error)
    // Don't fail the request if audit logging fails
    return NextResponse.json({ success: true, message: "Audit logging failed but request continued" })
  }
}
