import { NextResponse } from "next/server"

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: "Float-GL mapping API is working",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Test endpoint error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
