import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import fs from "fs"
import path from "path"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Initializing dynamic settings database...")

    // Read and execute the SQL schema file
    const schemaPath = path.join(process.cwd(), "db", "schema", "dynamic-settings-complete.sql")
    const schemaSQL = fs.readFileSync(schemaPath, "utf8")

    // Split the SQL into individual statements and execute them
    const statements = schemaSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sql.unsafe(statement)
        } catch (error) {
          console.warn(`Warning executing statement: ${error}`)
          // Continue with other statements even if one fails
        }
      }
    }

    // Verify the setup
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('permissions', 'roles', 'role_permissions', 'system_settings', 'organization_profile', 'menu_items')
      ORDER BY table_name
    `

    const permissionsCount = await sql`SELECT COUNT(*) as count FROM permissions`
    const rolesCount = await sql`SELECT COUNT(*) as count FROM roles`
    const settingsCount = await sql`SELECT COUNT(*) as count FROM system_settings`

    console.log("Dynamic settings initialization completed successfully")

    return NextResponse.json({
      success: true,
      message: "Dynamic settings database initialized successfully",
      details: {
        tables_created: tablesCheck.map((t) => t.table_name),
        permissions_count: permissionsCount[0].count,
        roles_count: rolesCount[0].count,
        settings_count: settingsCount[0].count,
      },
    })
  } catch (error) {
    console.error("Error initializing dynamic settings:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize dynamic settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // Check if tables exist and return status
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('permissions', 'roles', 'role_permissions', 'system_settings', 'organization_profile', 'menu_items')
      ORDER BY table_name
    `

    const expectedTables = [
      "menu_items",
      "organization_profile",
      "permissions",
      "role_permissions",
      "roles",
      "system_settings",
    ]
    const existingTables = tablesCheck.map((t) => t.table_name)
    const missingTables = expectedTables.filter((table) => !existingTables.includes(table))

    let counts = {}
    if (missingTables.length === 0) {
      const permissionsCount = await sql`SELECT COUNT(*) as count FROM permissions`
      const rolesCount = await sql`SELECT COUNT(*) as count FROM roles`
      const settingsCount = await sql`SELECT COUNT(*) as count FROM system_settings`

      counts = {
        permissions: permissionsCount[0].count,
        roles: rolesCount[0].count,
        settings: settingsCount[0].count,
      }
    }

    return NextResponse.json({
      success: true,
      initialized: missingTables.length === 0,
      existing_tables: existingTables,
      missing_tables: missingTables,
      counts,
    })
  } catch (error) {
    console.error("Error checking dynamic settings status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check dynamic settings status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
