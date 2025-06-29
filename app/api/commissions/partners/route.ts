import { NextResponse } from "next/server"

// API endpoint to get partner information for dropdowns
export async function GET() {
  try {
    const partners = [
      {
        source: "mtn",
        name: "MTN Ghana",
        type: "Mobile Money",
        defaultGLAccount: "4101",
        defaultGLAccountName: "Commission Revenue - MTN",
      },
      {
        source: "vodafone",
        name: "Vodafone Ghana",
        type: "Mobile Money",
        defaultGLAccount: "4102",
        defaultGLAccountName: "Commission Revenue - Vodafone",
      },
      {
        source: "airtel-tigo",
        name: "AirtelTigo Ghana",
        type: "Mobile Money",
        defaultGLAccount: "4103",
        defaultGLAccountName: "Commission Revenue - AirtelTigo",
      },
      {
        source: "jumia",
        name: "Jumia Ghana",
        type: "E-commerce",
        defaultGLAccount: "4104",
        defaultGLAccountName: "Commission Revenue - Jumia",
      },
      {
        source: "vra",
        name: "Volta River Authority",
        type: "Power Service",
        defaultGLAccount: "4105",
        defaultGLAccountName: "Commission Revenue - Power Services",
      },
      {
        source: "ecg",
        name: "Electricity Company of Ghana",
        type: "Power Service",
        defaultGLAccount: "4106",
        defaultGLAccountName: "Commission Revenue - Power Services",
      },
      {
        source: "agency-banking",
        name: "Agency Banking Partners",
        type: "Banking",
        defaultGLAccount: "4107",
        defaultGLAccountName: "Commission Revenue - Agency Banking",
      },
    ]

    return NextResponse.json(partners)
  } catch (error) {
    console.error("Error fetching partners:", error)
    return NextResponse.json({ error: "Failed to fetch partners" }, { status: 500 })
  }
}
