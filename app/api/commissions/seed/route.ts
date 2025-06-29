import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Seeding commission sample data...")

    // Check if data already exists
    const existingCommissions = await sql`SELECT COUNT(*) as count FROM commissions`
    if (existingCommissions[0].count > 0) {
      return NextResponse.json({
        success: true,
        message: "Commission data already exists, skipping seed",
        count: existingCommissions[0].count,
      })
    }

    // Sample commission data
    const sampleCommissions = [
      {
        source: "momo",
        sourceName: "Mobile Money",
        amount: 15750.0,
        month: "2024-01-01",
        reference: "MOMO-2024-01-001",
        description: "January 2024 Mobile Money commission - 3,150 transactions",
        status: "paid",
        glAccount: "4100",
        glAccountName: "Commission Revenue - MoMo",
      },
      {
        source: "agency_banking",
        sourceName: "Agency Banking",
        amount: 28500.0,
        month: "2024-01-01",
        reference: "AB-2024-01-001",
        description: "January 2024 Agency Banking commission - 950 transactions",
        status: "approved",
        glAccount: "4110",
        glAccountName: "Commission Revenue - Agency Banking",
      },
      {
        source: "e_zwich",
        sourceName: "E-Zwich",
        amount: 12300.0,
        month: "2024-01-01",
        reference: "EZ-2024-01-001",
        description: "January 2024 E-Zwich commission - 820 transactions",
        status: "pending",
        glAccount: "4120",
        glAccountName: "Commission Revenue - E-Zwich",
      },
      {
        source: "power",
        sourceName: "Power/Utilities",
        amount: 8750.0,
        month: "2024-01-01",
        reference: "PWR-2024-01-001",
        description: "January 2024 Power commission - 350 transactions",
        status: "rejected",
        glAccount: "4130",
        glAccountName: "Commission Revenue - Power",
      },
      {
        source: "jumia",
        sourceName: "Jumia Pay",
        amount: 5200.0,
        month: "2024-01-01",
        reference: "JUM-2024-01-001",
        description: "January 2024 Jumia commission - 260 transactions",
        status: "pending",
        glAccount: "4140",
        glAccountName: "Commission Revenue - Jumia",
      },
      // February data
      {
        source: "momo",
        sourceName: "Mobile Money",
        amount: 18200.0,
        month: "2024-02-01",
        reference: "MOMO-2024-02-001",
        description: "February 2024 Mobile Money commission - 3,640 transactions",
        status: "approved",
        glAccount: "4100",
        glAccountName: "Commission Revenue - MoMo",
      },
      {
        source: "agency_banking",
        sourceName: "Agency Banking",
        amount: 31200.0,
        month: "2024-02-01",
        reference: "AB-2024-02-001",
        description: "February 2024 Agency Banking commission - 1,040 transactions",
        status: "paid",
        glAccount: "4110",
        glAccountName: "Commission Revenue - Agency Banking",
      },
      {
        source: "e_zwich",
        sourceName: "E-Zwich",
        amount: 14100.0,
        month: "2024-02-01",
        reference: "EZ-2024-02-001",
        description: "February 2024 E-Zwich commission - 940 transactions",
        status: "pending",
        glAccount: "4120",
        glAccountName: "Commission Revenue - E-Zwich",
      },
    ]

    // Insert sample commissions
    for (const commission of sampleCommissions) {
      const result = await sql`
        INSERT INTO commissions (
          source, source_name, amount, month, reference, description, 
          status, gl_account, gl_account_name, created_by_id, created_by_name
        ) VALUES (
          ${commission.source}, ${commission.sourceName}, ${commission.amount}, 
          ${commission.month}, ${commission.reference}, ${commission.description},
          ${commission.status}, ${commission.glAccount}, ${commission.glAccountName},
          'system', 'System Administrator'
        ) RETURNING id
      `

      const commissionId = result[0].id

      // Add metadata for some commissions
      if (commission.source === "momo") {
        await sql`
          INSERT INTO commission_metadata (
            commission_id, transaction_volume, commission_rate, settlement_period
          ) VALUES (
            ${commissionId}, ${commission.description.match(/(\d+,?\d*) transactions/)?.[1]?.replace(",", "") || null}, 
            '5.00 GHS/txn', 'Monthly'
          )
        `
      }

      // Add approvals for approved/paid commissions
      if (commission.status === "approved" || commission.status === "paid") {
        await sql`
          INSERT INTO commission_approvals (
            commission_id, action, notes, approved_by_id, approved_by_name
          ) VALUES (
            ${commissionId}, 'approved', 'Commission approved for payment', 
            'admin', 'Finance Manager'
          )
        `
      }

      // Add rejections for rejected commissions
      if (commission.status === "rejected") {
        await sql`
          INSERT INTO commission_approvals (
            commission_id, action, notes, approved_by_id, approved_by_name
          ) VALUES (
            ${commissionId}, 'rejected', 'Commission rejected due to discrepancies in transaction count', 
            'admin', 'Finance Manager'
          )
        `
      }

      // Add payments for paid commissions
      if (commission.status === "paid") {
        await sql`
          INSERT INTO commission_payments (
            commission_id, status, method, received_at, bank_account, 
            reference_number, notes, processed_by_id, processed_by_name
          ) VALUES (
            ${commissionId}, 'completed', 'bank_transfer', CURRENT_TIMESTAMP,
            'ACC-${commission.source}', 'PAY-${commission.reference.slice(-8)}',
            'Payment processed successfully', 'admin', 'Finance Manager'
          )
        `
      }

      // Add sample comments
      await sql`
        INSERT INTO commission_comments (
          commission_id, text, created_by_id, created_by_name
        ) VALUES (
          ${commissionId}, 'Commission record created from ${commission.source} transaction data',
          'system', 'System Administrator'
        )
      `
    }

    console.log("Commission sample data seeded successfully")

    return NextResponse.json({
      success: true,
      message: "Commission sample data seeded successfully",
      count: sampleCommissions.length,
    })
  } catch (error) {
    console.error("Error seeding commission data:", error)
    return NextResponse.json(
      {
        error: "Failed to seed commission data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
