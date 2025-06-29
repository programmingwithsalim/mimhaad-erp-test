import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Fetch commission with receipt URL
    const commission = await sql`
      SELECT receipt_url, reference, source_name
      FROM commissions
      WHERE id = ${id}
    `

    if (commission.length === 0) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 })
    }

    const { receipt_url, reference, source_name } = commission[0]

    if (!receipt_url) {
      return NextResponse.json({ error: "No receipt found for this commission" }, { status: 404 })
    }

    // In a real implementation, you would:
    // 1. Fetch the file from your storage service (AWS S3, Google Cloud Storage, etc.)
    // 2. Return the file content with appropriate headers

    // For now, we'll return the receipt URL for download
    return NextResponse.json({
      success: true,
      receiptUrl: receipt_url,
      filename: `${reference}-${source_name}-receipt`,
    })
  } catch (error) {
    console.error("Error fetching commission receipt:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch receipt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
