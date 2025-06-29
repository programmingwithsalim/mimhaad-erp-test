import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { neon } from "@neondatabase/serverless"

// Define types
interface PartnerBank {
  id: string
  name: string
  code: string
  transferFee: number
  minFee: number
  maxFee: number
  status: string
  floatAccountId?: string
  currentBalance?: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")

    // First try to get from database
    if (process.env.DATABASE_URL && !process.env.USE_MOCK_DATA) {
      try {
        const sql = neon(process.env.DATABASE_URL)

        // Check if table exists
        const tableExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'partner_banks'
          ) as exists
        `

        if (tableExists[0]?.exists) {
          const result = await sql`SELECT * FROM partner_banks WHERE status = 'active'`

          if (result.length > 0) {
            // Format the results
            const banks = result.map((bank: any) => ({
              id: bank.id,
              name: bank.name,
              code: bank.code || bank.name.substring(0, 3).toUpperCase(),
              transferFee: bank.transfer_fee || 0.01,
              minFee: bank.min_fee || 5,
              maxFee: bank.max_fee || 50,
              status: bank.status || "active",
              floatAccountId: bank.float_account_id,
              currentBalance: bank.current_balance || 0,
            }))

            return NextResponse.json({ banks })
          }
        }
      } catch (dbError) {
        console.warn("Error fetching partner banks from database:", dbError)
        // Continue to fallback
      }
    }

    // Fallback to JSON file
    try {
      const filePath = path.join(process.cwd(), "data/partner-banks.json")
      const fileExists = fs.existsSync(filePath)

      if (fileExists) {
        const fileData = fs.readFileSync(filePath, "utf8")
        const data = JSON.parse(fileData)
        return NextResponse.json(data)
      }

      // If file doesn't exist, use fallback data
      const fallbackPath = path.join(process.cwd(), "data/partner-banks-fallback.json")
      const fallbackExists = fs.existsSync(fallbackPath)

      if (fallbackExists) {
        const fileData = fs.readFileSync(fallbackPath, "utf8")
        const data = JSON.parse(fileData)
        return NextResponse.json(data)
      }

      // If no files exist, return hardcoded data
      const banks: PartnerBank[] = [
        {
          id: "cal-001",
          name: "Cal Bank",
          code: "CAL",
          transferFee: 0.01,
          minFee: 5,
          maxFee: 50,
          status: "active",
          currentBalance: 10000,
        },
        {
          id: "eco-001",
          name: "Ecobank Ghana",
          code: "ECO",
          transferFee: 0.01,
          minFee: 5,
          maxFee: 50,
          status: "active",
          currentBalance: 15000,
        },
        {
          id: "gcb-001",
          name: "Ghana Commercial Bank",
          code: "GCB",
          transferFee: 0.01,
          minFee: 5,
          maxFee: 50,
          status: "active",
          currentBalance: 20000,
        },
        {
          id: "stb-001",
          name: "Stanbic Bank",
          code: "STB",
          transferFee: 0.01,
          minFee: 5,
          maxFee: 50,
          status: "active",
          currentBalance: 12000,
        },
        {
          id: "zen-001",
          name: "Zenith Bank",
          code: "ZEN",
          transferFee: 0.01,
          minFee: 5,
          maxFee: 50,
          status: "active",
          currentBalance: 18000,
        },
      ]

      return NextResponse.json({ banks })
    } catch (error) {
      console.error("Error reading partner banks file:", error)
      throw error
    }
  } catch (error) {
    console.error("Error fetching partner banks:", error)
    return NextResponse.json(
      { error: "Failed to fetch partner banks", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
