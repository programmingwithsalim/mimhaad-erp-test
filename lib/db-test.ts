import { neon } from "@neondatabase/serverless"

export async function testDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`SELECT NOW() as current_time`
    console.log("Database connection successful:", result[0])
    return { success: true }
  } catch (error) {
    console.error("Database connection failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function testUserTable(): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`SELECT COUNT(*) as count FROM users`
    console.log("User table test successful:", result[0])
    return { success: true, count: Number.parseInt(result[0].count) }
  } catch (error) {
    console.error("User table test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
