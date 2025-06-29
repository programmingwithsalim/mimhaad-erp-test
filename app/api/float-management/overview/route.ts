import { NextResponse } from "next/server"
import { readJsonFile } from "@/lib/file-utils"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    // Check if we should use mock data
    const useMockData = process.env.USE_MOCK_DATA === "true"

    if (useMockData) {
      try {
        const mockData = await readJsonFile("data/float-management-mock.json")
        return NextResponse.json(mockData)
      } catch (mockError) {
        console.error("Error reading mock data:", mockError)
        return NextResponse.json(generateFallbackData())
      }
    }

    // Try to get data from database
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is not set")
      }

      const sql = neon(process.env.DATABASE_URL)

      // Check if tables exist
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'float_accounts'
        ) as table_exists
      `

      if (!tableCheck[0]?.table_exists) {
        console.log("Float accounts table does not exist, using mock data")
        return NextResponse.json(generateFallbackData())
      }

      // Get float accounts with branch names
      const floatAccountsResult = await sql`
        SELECT 
          fa.id,
          fa.branch_id as "branchId",
          b.name as "branchName",
          fa.account_type as "accountType",
          fa.provider,
          fa.current_balance as "currentBalance",
          fa.min_threshold as "minThreshold",
          fa.max_threshold as "maxThreshold",
          fa.updated_at as "lastUpdated"
        FROM float_accounts fa
        LEFT JOIN branches b ON fa.branch_id = b.id
        WHERE fa.is_active = true
        ORDER BY fa.current_balance DESC
      `

      const floatAccounts = floatAccountsResult.map((account) => ({
        ...account,
        currentBalance: Number(account.currentBalance || 0),
        minThreshold: Number(account.minThreshold || 0),
        maxThreshold: Number(account.maxThreshold || 0),
        branchName: account.branchName || `Branch ${account.branchId}`,
      }))

      // Calculate statistics
      const totalAccounts = floatAccounts.length
      const totalBalance = floatAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0)
      const lowBalanceAccounts = floatAccounts.filter((acc) => acc.currentBalance < acc.minThreshold).length
      const excessBalanceAccounts = floatAccounts.filter((acc) => acc.currentBalance > acc.maxThreshold).length

      // Account type breakdown
      const accountTypeBreakdown = floatAccounts.reduce(
        (acc, account) => {
          const type = account.accountType || "unknown"
          acc[type] = (acc[type] || 0) + account.currentBalance
          return acc
        },
        {} as Record<string, number>,
      )

      // Branch balances
      const branchBalances = floatAccounts.reduce(
        (acc, account) => {
          const existing = acc.find((b) => b.id === account.branchId)
          if (existing) {
            existing.balance += account.currentBalance
          } else {
            acc.push({
              id: account.branchId,
              name: account.branchName,
              balance: account.currentBalance,
            })
          }
          return acc
        },
        [] as Array<{ id: string; name: string; balance: number }>,
      )

      // Mock recent activity (in a real app, this would come from a transactions table)
      const recentActivity = [
        {
          id: "activity-1",
          type: "allocation",
          accountId: floatAccounts[0]?.id || "float-acc-1",
          accountName: floatAccounts[0]
            ? `${floatAccounts[0].branchName} - ${floatAccounts[0].accountType}`
            : "Account 1",
          amount: 50000,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          performedBy: "System Admin",
          status: "completed",
        },
        {
          id: "activity-2",
          type: "transfer",
          accountId: floatAccounts[1]?.id || "float-acc-2",
          accountName: floatAccounts[1]
            ? `${floatAccounts[1].branchName} - ${floatAccounts[1].accountType}`
            : "Account 2",
          amount: -25000,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
          performedBy: "Branch Manager",
          status: "completed",
        },
      ]

      return NextResponse.json({
        floatAccounts,
        recentActivity,
        statistics: {
          totalAccounts,
          totalBalance,
          lowBalanceAccounts,
          excessBalanceAccounts,
          accountTypeBreakdown,
          branchBalances,
        },
      })
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json(generateFallbackData())
    }
  } catch (error) {
    console.error("Error in float management overview:", error)
    return NextResponse.json(generateFallbackData())
  }
}

function generateFallbackData() {
  return {
    floatAccounts: [
      {
        id: "float-acc-1",
        branchId: "branch-1",
        branchName: "Accra Main Branch",
        accountType: "momo",
        provider: "MTN",
        currentBalance: 125000,
        minThreshold: 50000,
        maxThreshold: 200000,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: "float-acc-2",
        branchId: "branch-1",
        branchName: "Accra Main Branch",
        accountType: "agency-banking",
        provider: "Ecobank",
        currentBalance: 85000,
        minThreshold: 40000,
        maxThreshold: 150000,
        lastUpdated: new Date().toISOString(),
      },
    ],
    recentActivity: [
      {
        id: "activity-1",
        type: "allocation",
        accountId: "float-acc-1",
        accountName: "Accra Main - MTN MoMo",
        amount: 50000,
        timestamp: new Date().toISOString(),
        performedBy: "System Admin",
        status: "completed",
      },
    ],
    statistics: {
      totalAccounts: 2,
      totalBalance: 210000,
      lowBalanceAccounts: 0,
      excessBalanceAccounts: 0,
      accountTypeBreakdown: {
        momo: 125000,
        "agency-banking": 85000,
      },
      branchBalances: [{ id: "branch-1", name: "Accra Main Branch", balance: 210000 }],
    },
  }
}
