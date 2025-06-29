import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST() {
  try {
    console.log("Starting comprehensive cleanup...")

    // Run the TypeScript cleanup script
    const { stdout, stderr } = await execAsync("npx tsx scripts/comprehensive-cleanup.ts")

    if (stderr) {
      console.warn("Cleanup warnings:", stderr)
    }

    console.log("Cleanup output:", stdout)

    return NextResponse.json({
      success: true,
      message: "Comprehensive cleanup completed successfully",
      output: stdout,
      warnings: stderr || null,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error during comprehensive cleanup:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run comprehensive cleanup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
