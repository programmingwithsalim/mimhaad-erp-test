import { NextResponse } from "next/server"
import { getAgencyBankingFloatAccount, initializeAgencyBankingFloatAccount } from "@/lib/agency-banking-service"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const branchId = params.id
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get("provider") || undefined

    // Get the agency banking float account for this branch
    const account = await getAgencyBankingFloatAccount(branchId, provider)

    if (!account) {
      return NextResponse.json({ error: "Agency banking float account not found for this branch" }, { status: 404 })
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error("Error fetching agency banking float account:", error)
    return NextResponse.json(
      {
        error: `Failed to fetch agency banking float account: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const branchId = params.id
    const body = await request.json()
    const createdBy = body.created_by || "system"

    // Initialize the agency banking float account
    const account = await initializeAgencyBankingFloatAccount(branchId, createdBy)

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    console.error("Error initializing agency banking float account:", error)
    return NextResponse.json(
      {
        error: `Failed to initialize agency banking float account: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
