import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    // Check if audit_logs table already exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      )
    `;

    if (tableExists[0]?.exists) {
      return NextResponse.json({
        success: true,
        message: "Audit logs table already exists",
      });
    }

    // Create the audit_logs table with proper schema
    await sql`
      CREATE TABLE audit_logs (
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
    `;

    // Create indexes for better performance
    await sql`CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id)`;
    await sql`CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type)`;
    await sql`CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type)`;
    await sql`CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at)`;
    await sql`CREATE INDEX idx_audit_logs_severity ON audit_logs(severity)`;
    await sql`CREATE INDEX idx_audit_logs_status ON audit_logs(status)`;
    await sql`CREATE INDEX idx_audit_logs_branch_id ON audit_logs(branch_id)`;
    await sql`CREATE INDEX idx_audit_logs_username ON audit_logs(username)`;

    // Create a trigger to update the updated_at column
    await sql`
      CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    await sql`
      CREATE TRIGGER trigger_audit_logs_updated_at
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_audit_logs_updated_at()
    `;

    return NextResponse.json({
      success: true,
      message:
        "Audit logs table created successfully with all indexes and triggers",
    });
  } catch (error) {
    console.error("Error creating audit logs table:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create audit logs table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
