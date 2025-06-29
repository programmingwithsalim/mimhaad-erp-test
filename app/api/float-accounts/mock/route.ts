import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Mock endpoint disabled",
      message: "Mock endpoints have been disabled for production deployment",
    },
    { status: 404 },
  )
}
