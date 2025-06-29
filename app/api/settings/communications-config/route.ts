import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.CONNECTION_STRING!)

export async function GET() {
  try {
    const configs = await sql`
      SELECT config_key, config_value, updated_at
      FROM system_config 
      WHERE config_key LIKE 'email_%' OR config_key LIKE 'resend_%' OR config_key LIKE 'smtp_%' OR config_key LIKE 'sms_%'
      ORDER BY config_key
    `

    return NextResponse.json({
      success: true,
      data: configs,
    })
  } catch (error) {
    console.error("Error fetching communications config:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch communications configuration" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { configs, userId } = await request.json()

    if (!Array.isArray(configs)) {
      return NextResponse.json({ success: false, error: "Invalid configuration data" }, { status: 400 })
    }

    // Update or insert each configuration
    for (const config of configs) {
      const { config_key, config_value } = config

      await sql`
        INSERT INTO system_config (config_key, config_value, updated_by, updated_at)
        VALUES (${config_key}, ${config_value}, ${userId || 1}, NOW())
        ON CONFLICT (config_key) 
        DO UPDATE SET 
          config_value = EXCLUDED.config_value,
          updated_by = EXCLUDED.updated_by,
          updated_at = EXCLUDED.updated_at
      `
    }

    return NextResponse.json({
      success: true,
      message: "Communications configuration updated successfully",
    })
  } catch (error) {
    console.error("Error updating communications config:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update communications configuration" },
      { status: 500 },
    )
  }
}
