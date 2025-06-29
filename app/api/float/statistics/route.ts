import { NextResponse } from "next/server"
import { getFloatStatistics } from "@/lib/float-service"

export async function GET() {
  try {
    const statistics = await getFloatStatistics()

    if (!statistics) {
      return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 })
    }

    return NextResponse.json(statistics)
  } catch (error) {
    console.error("Error fetching float statistics:", error)
    return NextResponse.json({ error: "Failed to fetch float statistics" }, { status: 500 })
  }
}
