import { type NextRequest, NextResponse } from "next/server"
import { rbacMiddleware } from "@/lib/rbac/api-middleware"

export async function GET(req: NextRequest) {
  // Check if user has permission to view reports
  const middlewareResponse = await rbacMiddleware(req, "view_reports")

  if (middlewareResponse) {
    return middlewareResponse
  }

  // User has permission, return data
  return NextResponse.json({
    success: true,
    data: {
      reports: [
        { id: 1, name: "Monthly Report", date: "2023-05-01" },
        { id: 2, name: "Quarterly Report", date: "2023-04-01" },
        { id: 3, name: "Annual Report", date: "2023-01-01" },
      ],
    },
  })
}

export async function POST(req: NextRequest) {
  // Check if user has permission to manage reports
  const middlewareResponse = await rbacMiddleware(req, "manage_expenses")

  if (middlewareResponse) {
    return middlewareResponse
  }

  // User has permission, process the request
  try {
    const data = await req.json()

    // Process data...

    return NextResponse.json({
      success: true,
      message: "Report created successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
}
