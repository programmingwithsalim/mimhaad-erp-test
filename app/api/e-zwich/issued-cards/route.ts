import { NextResponse } from "next/server"

// In-memory storage for issued cards
const issuedCardsCache = [
  {
    cardNumber: "1234567890123456",
    issueDate: new Date(Date.now() - 86400000).toISOString(),
    status: "active",
    customerName: "John Doe",
    branchId: "branch-001",
    branchName: "Main Branch",
    expiryDate: new Date(Date.now() + 31536000000).toISOString(), // 1 year from now
    cardType: "standard",
  },
  {
    cardNumber: "9876543210987654",
    issueDate: new Date(Date.now() - 43200000).toISOString(),
    status: "active",
    customerName: "Jane Smith",
    branchId: "branch-001",
    branchName: "Main Branch",
    expiryDate: new Date(Date.now() + 31536000000).toISOString(),
    cardType: "premium",
  },
]

export async function GET() {
  try {
    return NextResponse.json({ cards: issuedCardsCache })
  } catch (error) {
    console.error("Error reading issued cards data:", error)
    return NextResponse.json({ error: "Failed to load issued cards data" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Create new card
    const newCard = {
      cardNumber: body.cardNumber,
      issueDate: new Date().toISOString(),
      status: "active",
      customerName: body.customerName,
      branchId: body.branchId,
      branchName: body.branchName,
      expiryDate: body.expiryDate,
      cardType: body.cardType || "standard",
    }

    issuedCardsCache.push(newCard)

    return NextResponse.json({ success: true, card: newCard })
  } catch (error) {
    console.error("Error issuing card:", error)
    return NextResponse.json({ error: "Failed to issue card" }, { status: 500 })
  }
}
