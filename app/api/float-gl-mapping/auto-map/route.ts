import { NextResponse } from "next/server"
import { FloatGLMappingService } from "@/lib/float-gl-mapping-service-corrected"

export async function POST() {
  try {
    const results = await FloatGLMappingService.autoMapFloatAccounts()

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error("Error auto-mapping accounts:", error)
    return NextResponse.json({ success: false, error: "Failed to auto-map accounts" }, { status: 500 })
  }
}
