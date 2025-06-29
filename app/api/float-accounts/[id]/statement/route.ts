import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Get account details
    const account = await sql`
      SELECT fa.*, b.name as branch_name 
      FROM float_accounts fa
      LEFT JOIN branches b ON fa.branch_id = b.id
      WHERE fa.id = ${id}
    `

    if (account.length === 0) {
      return NextResponse.json({ error: "Float account not found" }, { status: 404 })
    }

    // Get transactions for the last 30 days
    const transactions = await sql`
      SELECT * FROM float_transactions 
      WHERE float_account_id = ${id}
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY created_at DESC
    `

    const accountData = account[0]

    // Generate CSV content
    const headers = [
      "Date",
      "Transaction Type",
      "Amount",
      "Balance Before",
      "Balance After",
      "Description",
      "Processed By",
    ]

    const csvRows = transactions.map((tx) => [
      new Date(tx.created_at).toLocaleDateString(),
      tx.transaction_type,
      Number(tx.amount).toFixed(2),
      Number(tx.balance_before).toFixed(2),
      Number(tx.balance_after).toFixed(2),
      tx.description || "",
      tx.processed_by || "",
    ])

    const csvContent = [
      [`Float Account Statement - ${accountData.provider || accountData.account_type}`],
      [`Branch: ${accountData.branch_name || "Unknown"}`],
      [`Account Type: ${accountData.account_type}`],
      [`Current Balance: GHS ${Number(accountData.current_balance).toFixed(2)}`],
      [`Statement Period: Last 30 days`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      headers,
      ...csvRows,
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n")

    // Return as downloadable file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${accountData.provider || accountData.account_type}-statement-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("Error generating statement:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
