import { NextResponse } from "next/server"
import { FloatGLMappingService } from "@/lib/float-gl-mapping-service-corrected"

export async function POST() {
  try {
    const results = await FloatGLMappingService.syncFloatBalancesToGL()

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error("Error syncing balances:", error)
    return NextResponse.json({ success: false, error: "Failed to sync balances" }, { status: 500 })
  }
}
