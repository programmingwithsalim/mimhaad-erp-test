import { NextResponse } from "next/server"

// Fallback API for development when database is not available
export async function GET() {
  try {
    // Return mock commission data
    const mockCommissions = [
      {
        id: "1",
        source: "momo",
        sourceName: "Mobile Money",
        amount: 1500.0,
        month: "2024-01-01",
        reference: "COMM-2024-001",
        description: "January Mobile Money Commission",
        status: "paid",
        branchId: "branch-001",
        branchName: "Main Branch",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: {
          id: "user-1",
          name: "John Doe",
        },
        payment: {
          status: "completed",
          method: "auto_approved",
          receivedAt: new Date().toISOString(),
          notes: "Automatically approved - created by manager",
        },
        metadata: {
          transactionVolume: 150,
          commissionRate: "1%",
          settlementPeriod: "monthly",
        },
        comments: [],
        attachments: [],
      },
      {
        id: "2",
        source: "agency-banking",
        sourceName: "Agency Banking",
        amount: 2300.0,
        month: "2024-01-01",
        reference: "COMM-2024-002",
        description: "January Agency Banking Commission",
        status: "pending",
        branchId: "branch-001",
        branchName: "Main Branch",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: {
          id: "user-2",
          name: "Jane Smith",
        },
        metadata: {
          transactionVolume: 230,
          commissionRate: "1%",
          settlementPeriod: "monthly",
        },
        comments: [],
        attachments: [],
      },
    ]

    return NextResponse.json(mockCommissions)
  } catch (error) {
    console.error("Error in fallback API:", error)
    return NextResponse.json({ error: "Fallback API error" }, { status: 500 })
  }
}
