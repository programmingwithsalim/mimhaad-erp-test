import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "./auth-service"

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>,
) {
  const session = await getSession(request)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return handler(request, session.user)
}

export async function withRole(
  request: NextRequest,
  requiredRoles: string[],
  handler: (request: NextRequest, user: any) => Promise<NextResponse>,
) {
  const session = await getSession(request)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!requiredRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return handler(request, session.user)
}
