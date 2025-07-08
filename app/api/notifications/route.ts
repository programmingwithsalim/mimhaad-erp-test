import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-service-db";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const notifications = await sql`
      SELECT id, type, title, message,
        CASE WHEN status = 'read' OR read_at IS NOT NULL THEN true ELSE false END as "read",
        created_at as "timestamp"
      FROM notifications
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch notifications",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
