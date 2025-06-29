import { NextResponse } from "next/server"
import { initializeAgencyBankingFloatAccount } from "@/lib/agency-banking-service"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const branchId = params.id
    const body = await request.json()
    const createdBy = body.created_by || "system"

    // Initialize the agency banking float account
    const account = await initializeAgencyBankingFloatAccount(branchId, createdBy)

    return NextResponse.json({ success: true, account }, { status: 201 })
  } catch (error) {
    console.error("Error initializing agency banking:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to initialize agency banking: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
