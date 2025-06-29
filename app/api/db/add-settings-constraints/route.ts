import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST() {
  try {
    console.log("Adding foreign key constraints to settings tables...")

    const constraints = [
      // System config constraints
      {
        table: "system_config",
        constraint: "system_config_updated_by_fkey",
        sql: "ALTER TABLE system_config ADD CONSTRAINT system_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id)",
      },

      // Fee config constraints
      {
        table: "fee_config",
        constraint: "fee_config_created_by_fkey",
        sql: "ALTER TABLE fee_config ADD CONSTRAINT fee_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)",
      },
      {
        table: "fee_config",
        constraint: "fee_config_updated_by_fkey",
        sql: "ALTER TABLE fee_config ADD CONSTRAINT fee_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id)",
      },

      // Roles constraints
      {
        table: "roles",
        constraint: "roles_created_by_fkey",
        sql: "ALTER TABLE roles ADD CONSTRAINT roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)",
      },
      {
        table: "roles",
        constraint: "roles_updated_by_fkey",
        sql: "ALTER TABLE roles ADD CONSTRAINT roles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id)",
      },

      // User roles constraints
      {
        table: "user_roles",
        constraint: "user_roles_user_id_fkey",
        sql: "ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE",
      },
      {
        table: "user_roles",
        constraint: "user_roles_role_id_fkey",
        sql: "ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE",
      },
      {
        table: "user_roles",
        constraint: "user_roles_assigned_by_fkey",
        sql: "ALTER TABLE user_roles ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id)",
      },

      // Audit logs constraints
      {
        table: "audit_logs",
        constraint: "audit_logs_user_id_fkey",
        sql: "ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)",
      },
      {
        table: "audit_logs",
        constraint: "audit_logs_branch_id_fkey",
        sql: "ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id)",
      },
    ]

    const results = []

    for (const constraint of constraints) {
      try {
        // Check if constraint already exists
        const existsResult = await sql.query(
          `
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = $1 AND table_name = $2
        `,
          [constraint.constraint, constraint.table],
        )

        if (existsResult.rows.length === 0) {
          // Check if referenced table exists
          const referencedTable = constraint.sql.includes("REFERENCES users")
            ? "users"
            : constraint.sql.includes("REFERENCES branches")
              ? "branches"
              : constraint.sql.includes("REFERENCES roles")
                ? "roles"
                : null

          if (referencedTable) {
            const tableExistsResult = await sql.query(
              `
              SELECT 1 FROM information_schema.tables 
              WHERE table_name = $1 AND table_schema = 'public'
            `,
              [referencedTable],
            )

            if (tableExistsResult.rows.length > 0) {
              await sql.query(constraint.sql)
              results.push({ constraint: constraint.constraint, status: "added" })
            } else {
              results.push({ constraint: constraint.constraint, status: "skipped - referenced table not found" })
            }
          }
        } else {
          results.push({ constraint: constraint.constraint, status: "already exists" })
        }
      } catch (error) {
        console.error(`Error adding constraint ${constraint.constraint}:`, error)
        results.push({
          constraint: constraint.constraint,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Foreign key constraints processing completed",
      results,
    })
  } catch (error) {
    console.error("Error adding foreign key constraints:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add foreign key constraints",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
