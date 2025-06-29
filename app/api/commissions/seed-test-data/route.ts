import { NextResponse } from "next/server"
import { createCommission } from "@/lib/commission-database-service"

export async function POST() {
  try {
    console.log("Seeding test commission data...")

    const testCommissions = [
      {
        source: "mtn",
        sourceName: "MTN Mobile Money",
        amount: 1500.0,
        month: "2024-01",
        reference: "MTN-2024-001",
        description: "January 2024 MTN MoMo commission",
        glAccount: "4100",
        glAccountName: "Commission Revenue",
      },
      {
        source: "vodafone",
        sourceName: "Vodafone Cash",
        amount: 2200.5,
        month: "2024-01",
        reference: "VOD-2024-001",
        description: "January 2024 Vodafone Cash commission",
        glAccount: "4100",
        glAccountName: "Commission Revenue",
      },
      {
        source: "airtel-tigo",
        sourceName: "AirtelTigo Money",
        amount: 1800.75,
        month: "2024-01",
        reference: "AT-2024-001",
        description: "January 2024 AirtelTigo Money commission",
        glAccount: "4100",
        glAccountName: "Commission Revenue",
      },
      {
        source: "jumia",
        sourceName: "Jumia Pay",
        amount: 950.25,
        month: "2024-01",
        reference: "JUM-2024-001",
        description: "January 2024 Jumia Pay commission",
        glAccount: "4100",
        glAccountName: "Commission Revenue",
      },
      {
        source: "vra",
        sourceName: "VRA Power",
        amount: 3200.0,
        month: "2024-01",
        reference: "VRA-2024-001",
        description: "January 2024 VRA Power commission",
        glAccount: "4100",
        glAccountName: "Commission Revenue",
      },
    ]

    const createdCommissions = []

    for (const commissionData of testCommissions) {
      try {
        const commission = await createCommission(
          commissionData,
          "admin-001",
          "System Administrator",
          "branch-001",
          "Main Branch",
          "admin",
        )
        createdCommissions.push(commission)
        console.log(`Created commission: ${commission.reference}`)
      } catch (error) {
        console.error(`Failed to create commission ${commissionData.reference}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdCommissions.length} test commissions`,
      commissions: createdCommissions,
    })
  } catch (error) {
    console.error("Error seeding commission data:", error)
    return NextResponse.json({ error: "Failed to seed commission data" }, { status: 500 })
  }
}
