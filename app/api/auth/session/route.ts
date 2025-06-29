import { NextResponse } from "next/server"
import { getSession, refreshSession } from "@/lib/auth-service"

// GET - Check current session
export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({
      user: session.user,
      expires: session.expires,
    })
  } catch (error) {
    console.error("Session check error:", error)
    return NextResponse.json({ error: "Session check failed" }, { status: 500 })
  }
}

// POST - Refresh session
export async function POST() {
  try {
    const session = await refreshSession()

    if (!session) {
      return NextResponse.json({ error: "Session refresh failed" }, { status: 401 })
    }

    return NextResponse.json({
      user: session.user,
      expires: session.expires,
    })
  } catch (error) {
    console.error("Session refresh error:", error)
    return NextResponse.json({ error: "Session refresh failed" }, { status: 500 })
  }
}
