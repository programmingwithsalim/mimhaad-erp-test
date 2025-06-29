import { NextResponse } from "next/server"
import { getFloatAccountStatistics } from "@/lib/float-account-service"

export async function GET() {
  try {
    console.log("API: Fetching float account statistics")
    const statistics = await getFloatAccountStatistics()
    return NextResponse.json(statistics)
  } catch (error) {
    console.error("API: Error fetching float account statistics:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
