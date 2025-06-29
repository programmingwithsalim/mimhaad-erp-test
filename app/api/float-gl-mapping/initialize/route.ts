import { NextResponse } from "next/server"
import { FloatGLMappingService } from "@/lib/float-gl-mapping-service-corrected"

export async function POST() {
  try {
    await FloatGLMappingService.initializeMappingTable()

    return NextResponse.json({
      success: true,
      message: "Mapping table initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing mapping table:", error)
    return NextResponse.json({ success: false, error: "Failed to initialize mapping table" }, { status: 500 })
  }
}
