import { NextResponse } from "next/server"
import { getUserPermissions } from "@/lib/rbac-enhanced"
import { getSession } from "@/lib/auth-service-db"

export async function GET(request: Request) {
  try {
    const session = await getSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized", permissions: [] }, { status: 401 })
    }

    const permissions = await getUserPermissions(session.user.id)

    return NextResponse.json({
      permissions,
      role: session.user.role,
    })
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return NextResponse.json({ error: "Failed to fetch permissions", permissions: [] }, { status: 500 })
  }
}
