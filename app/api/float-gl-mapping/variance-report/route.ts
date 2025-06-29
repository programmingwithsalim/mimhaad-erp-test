import { NextResponse } from "next/server"
import { FloatGLMappingService } from "@/lib/float-gl-mapping-service-corrected"

export async function GET() {
  try {
    const variances = await FloatGLMappingService.getVarianceReport()

    return NextResponse.json({
      success: true,
      data: variances,
    })
  } catch (error) {
    console.error("Error getting variance report:", error)
    return NextResponse.json({ success: false, error: "Failed to get variance report" }, { status: 500 })
  }
}
