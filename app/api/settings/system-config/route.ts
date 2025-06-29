import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Ensure system_config table exists
    await sql`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(255) UNIQUE NOT NULL,
        config_value TEXT,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        data_type VARCHAR(20) DEFAULT 'string',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER
      )
    `

    const configs = await sql`
      SELECT * FROM system_config 
      ORDER BY category, config_key
    `

    return NextResponse.json({
      success: true,
      data: configs,
    })
  } catch (error) {
    console.error("Error fetching system config:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch system configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
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
        INSERT INTO system_config (config_key, config_value, category, updated_by, updated_at)
        VALUES (${config_key}, ${config_value}, 'system', ${userId || 1}, NOW())
        ON CONFLICT (config_key) 
        DO UPDATE SET 
          config_value = EXCLUDED.config_value,
          updated_by = EXCLUDED.updated_by,
          updated_at = EXCLUDED.updated_at
      `
    }

    return NextResponse.json({
      success: true,
      message: "System configuration updated successfully",
    })
  } catch (error) {
    console.error("Error updating system config:", error)
    return NextResponse.json({ success: false, error: "Failed to update system configuration" }, { status: 500 })
  }
}
