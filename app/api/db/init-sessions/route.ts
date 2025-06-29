import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    console.log("Creating user_sessions table...")

    // Create user_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          session_token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ip_address INET,
          user_agent TEXT,
          is_active BOOLEAN DEFAULT true
      )
    `

    console.log("Creating indexes...")

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active)`

    console.log("Creating cleanup function...")

    // Create cleanup function for expired sessions
    await sql`
      CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
      RETURNS void AS $$
      BEGIN
          DELETE FROM user_sessions 
          WHERE expires_at < NOW() OR is_active = false;
      END;
      $$ LANGUAGE plpgsql
    `

    console.log("Adding foreign key constraint...")

    // Add foreign key constraint if users table exists
    try {
      await sql`
        ALTER TABLE user_sessions 
        ADD CONSTRAINT fk_user_sessions_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    } catch (error) {
      // Constraint might already exist, that's okay
      console.log("Foreign key constraint already exists or users table not found")
    }

    console.log("Sessions table created successfully!")

    return NextResponse.json({
      success: true,
      message: "User sessions table created successfully with indexes and cleanup function",
    })
  } catch (error) {
    console.error("Error creating sessions table:", error)
    return NextResponse.json(
      {
        error: "Failed to create sessions table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Check if sessions table exists and get some stats
    const tableInfo = await sql`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as valid_sessions
      FROM user_sessions
    `

    const recentSessions = await sql`
      SELECT 
        s.id,
        s.user_id,
        s.created_at,
        s.expires_at,
        s.is_active,
        u.email as user_email
      FROM user_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      stats: tableInfo[0],
      recentSessions: recentSessions,
    })
  } catch (error) {
    console.error("Error getting sessions info:", error)
    return NextResponse.json(
      {
        error: "Sessions table not found or error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
