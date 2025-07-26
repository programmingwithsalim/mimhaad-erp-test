import { NextResponse } from "next/server";
import { getFloatStatistics } from "@/lib/float-service";

export async function GET() {
  try {
    console.log("API: Fetching float account statistics");
    const statistics = await getFloatStatistics();
    return NextResponse.json(statistics);
  } catch (error) {
    console.error("API: Error fetching float account statistics:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
