import { sql } from "@/lib/db"

export interface ServiceStats {
  service: string
  todayTransactions: number
  todayVolume: number
  todayFees: number
  totalBalance: number
  weeklyGrowth: number
  monthlyGrowth: number
}

export interface DashboardData {
  totalStats: {
    totalRevenue: number
    totalTransactions: number
    totalBalance: number
    totalFees: number
    revenueChange: number
    transactionChange: number
  }
  serviceStats: ServiceStats[]
  recentTransactions: any[]
  branchStats?: any[]
  financialOverview?: {
    cashFlow: number
    profitMargin: number
    operatingExpenses: number
    netIncome: number
  }
}

export class DashboardService {
  static async getDashboardData(userRole: string, branchId?: string): Promise<DashboardData> {
    try {
      console.log("Fetching dashboard data for role:", userRole, "branch:", branchId)

      // Get service statistics based on role
      const serviceStats = await this.getServiceStats(userRole, branchId)

      // Get aggregated totals
      const totalStats = await this.getTotalStats(userRole, branchId)

      // Get recent transactions
      const recentTransactions = await this.getRecentTransactions(userRole, branchId)

      // Get branch stats for admins
      const branchStats = userRole === "admin" ? await this.getBranchStats() : undefined

      // Get financial overview for finance role
      const financialOverview =
        userRole === "finance" || userRole === "admin" ? await this.getFinancialOverview(branchId) : undefined

      return {
        totalStats,
        serviceStats,
        recentTransactions,
        branchStats,
        financialOverview,
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      throw error
    }
  }

  private static async checkTableColumns(tableName: string): Promise<string[]> {
    try {
      const result = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${tableName}
      `
      return result.map((row) => row.column_name)
    } catch (error) {
      console.error(`Error checking columns for ${tableName}:`, error)
      return []
    }
  }

  private static async getServiceStats(userRole: string, branchId?: string): Promise<ServiceStats[]> {
    const branchFilter = this.getBranchFilter(userRole, branchId)

    const services = [
      {
        name: "momo",
        table: "momo_transactions",
        balanceFilter: "momo",
      },
      {
        name: "agency-banking",
        table: "agency_banking_transactions",
        balanceFilter: "agency-banking",
      },
      {
        name: "e-zwich",
        table: "e_zwich_transactions",
        balanceFilter: "e-zwich",
      },
      {
        name: "power",
        table: "power_transactions",
        balanceFilter: "power",
      },
      {
        name: "jumia",
        table: "jumia_transactions",
        balanceFilter: "jumia",
      },
    ]

    const serviceStats: ServiceStats[] = []

    for (const service of services) {
      try {
        // Check if table exists first
        const tableExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = ${service.table}
          )
        `

        if (!tableExists[0]?.exists) {
          console.log(`Table ${service.table} does not exist, skipping...`)
          serviceStats.push({
            service: service.name,
            todayTransactions: 0,
            todayVolume: 0,
            todayFees: 0,
            totalBalance: 0,
            weeklyGrowth: 0,
            monthlyGrowth: 0,
          })
          continue
        }

        // Check what columns exist in this table
        const columns = await this.checkTableColumns(service.table)
        const hasFeeColumn = columns.includes("fee")
        const hasAmountColumn = columns.includes("amount")
        const hasCreatedAtColumn = columns.includes("created_at")
        const hasBranchIdColumn = columns.includes("branch_id")

        console.log(`Table ${service.table} columns:`, columns)

        // Get today's transactions with dynamic column selection
        let todayResult
        if (service.table === "momo_transactions") {
          if (branchFilter && hasBranchIdColumn) {
            todayResult = await sql`
              SELECT 
                COUNT(*) as transaction_count,
                ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
              FROM momo_transactions
              WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
                AND branch_id = ${branchFilter}
            `
          } else {
            todayResult = await sql`
              SELECT 
                COUNT(*) as transaction_count,
                ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
              FROM momo_transactions
              WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
            `
          }
        } else if (service.table === "agency_banking_transactions") {
          if (branchFilter && hasBranchIdColumn) {
            todayResult = await sql`
              SELECT 
                COUNT(*) as transaction_count,
                ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
              FROM agency_banking_transactions
              WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
                AND branch_id = ${branchFilter}
            `
          } else {
            todayResult = await sql`
              SELECT 
                COUNT(*) as transaction_count,
                ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
              FROM agency_banking_transactions
              WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
            `
          }
        } else if (service.table === "e_zwich_transactions") {
          if (branchFilter && hasBranchIdColumn) {
            todayResult = await sql`
              SELECT 
                COUNT(*) as transaction_count,
                ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
              FROM e_zwich_transactions
              WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
                AND branch_id = ${branchFilter}
            `
          } else {
            todayResult = await sql`
              SELECT 
                COUNT(*) as transaction_count,
                ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
              FROM e_zwich_transactions
              WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
            `
          }
        } else if (service.table === "power_transactions") {
          if (branchFilter && hasBranchIdColumn) {
            todayResult = await sql`
              SELECT 
                COUNT(*) as transaction_count,
                ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
              FROM power_transactions
              WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
                AND branch_id = ${branchFilter}
            `
          } else {
            todayResult = await sql`
              SELECT 
                COUNT(*) as transaction_count,
                ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
              FROM power_transactions
              WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
            `
          }
        } else if (service.table === "jumia_transactions") {
          if (branchFilter && hasBranchIdColumn) {
            todayResult = await sql`
              SELECT 
                COUNT(*) as transaction_count,
                ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
              FROM jumia_transactions
              WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
                AND branch_id = ${branchFilter}
            `
          } else {
            todayResult = await sql`
              SELECT 
                COUNT(*) as transaction_count,
                ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
              FROM jumia_transactions
              WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
            `
          }
        } else {
          // Default empty result for unknown tables
          todayResult = [{ transaction_count: 0, total_volume: 0, total_fees: 0 }]
        }

        const todayData = todayResult[0] || { transaction_count: 0, total_volume: 0, total_fees: 0 }

        // Get total balance for this service
        let balanceResult
        try {
          if (branchFilter) {
            balanceResult = await sql`
              SELECT COALESCE(SUM(current_balance), 0) as total_balance
              FROM float_accounts
              WHERE account_type = ${service.balanceFilter}
                AND branch_id = ${branchFilter}
            `
          } else {
            balanceResult = await sql`
              SELECT COALESCE(SUM(current_balance), 0) as total_balance
              FROM float_accounts
              WHERE account_type = ${service.balanceFilter}
            `
          }
        } catch (error) {
          console.error(`Error fetching balance for ${service.name}:`, error)
          balanceResult = [{ total_balance: 0 }]
        }

        const balanceData = balanceResult[0] || { total_balance: 0 }

        serviceStats.push({
          service: service.name,
          todayTransactions: Number(todayData.transaction_count),
          todayVolume: Number(todayData.total_volume),
          todayFees: Number(todayData.total_fees),
          totalBalance: Number(balanceData.total_balance),
          weeklyGrowth: 0, // Simplified for now
          monthlyGrowth: 0,
        })
      } catch (error) {
        console.error(`Error fetching stats for ${service.name}:`, error)
        // Add default stats for this service
        serviceStats.push({
          service: service.name,
          todayTransactions: 0,
          todayVolume: 0,
          todayFees: 0,
          totalBalance: 0,
          weeklyGrowth: 0,
          monthlyGrowth: 0,
        })
      }
    }

    return serviceStats
  }

  private static async getTotalStats(userRole: string, branchId?: string) {
    const branchFilter = this.getBranchFilter(userRole, branchId)

    try {
      // Get total balance from all float accounts
      let balanceResult
      try {
        if (branchFilter) {
          balanceResult = await sql`
            SELECT COALESCE(SUM(current_balance), 0) as total_balance
            FROM float_accounts
            WHERE branch_id = ${branchFilter}
          `
        } else {
          balanceResult = await sql`
            SELECT COALESCE(SUM(current_balance), 0) as total_balance
            FROM float_accounts
          `
        }
      } catch (error) {
        console.error("Error fetching total balance:", error)
        balanceResult = [{ total_balance: 0 }]
      }

      const totalBalance = Number(balanceResult[0]?.total_balance || 0)

      // Get today's aggregated stats from all services
      let totalTransactions = 0
      let totalRevenue = 0
      let totalFees = 0

      // Check each service table individually with hardcoded table names
      const services = [
        { table: "momo_transactions", name: "momo" },
        { table: "agency_banking_transactions", name: "agency" },
        { table: "e_zwich_transactions", name: "ezwich" },
        { table: "power_transactions", name: "power" },
        { table: "jumia_transactions", name: "jumia" },
      ]

      for (const service of services) {
        try {
          // Check if table exists
          const tableExists = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = ${service.table}
            )
          `

          if (!tableExists[0]?.exists) {
            console.log(`Table ${service.table} does not exist, skipping...`)
            continue
          }

          // Check what columns exist in this table
          const columns = await this.checkTableColumns(service.table)
          const hasFeeColumn = columns.includes("fee")
          const hasAmountColumn = columns.includes("amount")
          const hasCreatedAtColumn = columns.includes("created_at")
          const hasBranchIdColumn = columns.includes("branch_id")

          let result
          // Use hardcoded table names for each service
          if (service.table === "momo_transactions") {
            if (branchFilter && hasBranchIdColumn) {
              result = await sql`
                SELECT 
                  COUNT(*) as transaction_count,
                  ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                  ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
                FROM momo_transactions
                WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
                  AND branch_id = ${branchFilter}
              `
            } else {
              result = await sql`
                SELECT 
                  COUNT(*) as transaction_count,
                  ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                  ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
                FROM momo_transactions
                WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
              `
            }
          } else if (service.table === "agency_banking_transactions") {
            if (branchFilter && hasBranchIdColumn) {
              result = await sql`
                SELECT 
                  COUNT(*) as transaction_count,
                  ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                  ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
                FROM agency_banking_transactions
                WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
                  AND branch_id = ${branchFilter}
              `
            } else {
              result = await sql`
                SELECT 
                  COUNT(*) as transaction_count,
                  ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                  ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
                FROM agency_banking_transactions
                WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
              `
            }
          } else if (service.table === "e_zwich_transactions") {
            if (branchFilter && hasBranchIdColumn) {
              result = await sql`
                SELECT 
                  COUNT(*) as transaction_count,
                  ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                  ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
                FROM e_zwich_transactions
                WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
                  AND branch_id = ${branchFilter}
              `
            } else {
              result = await sql`
                SELECT 
                  COUNT(*) as transaction_count,
                  ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                  ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
                FROM e_zwich_transactions
                WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
              `
            }
          } else if (service.table === "power_transactions") {
            if (branchFilter && hasBranchIdColumn) {
              result = await sql`
                SELECT 
                  COUNT(*) as transaction_count,
                  ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                  ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
                FROM power_transactions
                WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
                  AND branch_id = ${branchFilter}
              `
            } else {
              result = await sql`
                SELECT 
                  COUNT(*) as transaction_count,
                  ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                  ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
                FROM power_transactions
                WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
              `
            }
          } else if (service.table === "jumia_transactions") {
            if (branchFilter && hasBranchIdColumn) {
              result = await sql`
                SELECT 
                  COUNT(*) as transaction_count,
                  ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                  ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
                FROM jumia_transactions
                WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
                  AND branch_id = ${branchFilter}
              `
            } else {
              result = await sql`
                SELECT 
                  COUNT(*) as transaction_count,
                  ${hasAmountColumn ? sql`COALESCE(SUM(amount), 0)` : sql`0`} as total_volume,
                  ${hasFeeColumn ? sql`COALESCE(SUM(fee), 0)` : sql`0`} as total_fees
                FROM jumia_transactions
                WHERE ${hasCreatedAtColumn ? sql`DATE(created_at) = CURRENT_DATE` : sql`true`}
              `
            }
          } else {
            continue
          }

          const data = result[0] || { transaction_count: 0, total_volume: 0, total_fees: 0 }

          totalTransactions += Number(data.transaction_count)
          totalRevenue += Number(data.total_volume)
          totalFees += Number(data.total_fees)
        } catch (error) {
          console.error(`Error querying ${service.table}:`, error)
        }
      }

      return {
        totalRevenue,
        totalTransactions,
        totalBalance,
        totalFees,
        revenueChange: 0,
        transactionChange: 0,
      }
    } catch (error) {
      console.error("Error fetching total stats:", error)
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        totalBalance: 0,
        totalFees: 0,
        revenueChange: 0,
        transactionChange: 0,
      }
    }
  }

  private static async getRecentTransactions(userRole: string, branchId?: string) {
    const branchFilter = this.getBranchFilter(userRole, branchId)
    const transactions: any[] = []

    // Only get transactions from tables we know work
    try {
      // Try to get MoMo transactions
      const momoExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'momo_transactions'
        )
      `

      if (momoExists[0]?.exists) {
        const momoColumns = await this.checkTableColumns("momo_transactions")
        const hasRequiredColumns = ["id", "customer_name", "amount", "status", "created_at"].every((col) =>
          momoColumns.includes(col),
        )

        if (hasRequiredColumns) {
          let momoResult
          if (branchFilter && momoColumns.includes("branch_id")) {
            momoResult = await sql`
              SELECT 
                id,
                customer_name,
                amount,
                COALESCE(fee, 0) as fee,
                status,
                created_at,
                COALESCE(provider, 'Unknown') as provider,
                COALESCE(type, 'Unknown') as type
              FROM momo_transactions
              WHERE branch_id = ${branchFilter}
              ORDER BY created_at DESC 
              LIMIT 10
            `
          } else {
            momoResult = await sql`
              SELECT 
                id,
                customer_name,
                amount,
                COALESCE(fee, 0) as fee,
                status,
                created_at,
                COALESCE(provider, 'Unknown') as provider,
                COALESCE(type, 'Unknown') as type
              FROM momo_transactions
              ORDER BY created_at DESC 
              LIMIT 10
            `
          }

          const momoTransactions = momoResult.map((tx) => ({
            ...tx,
            service_type: "MoMo",
          }))

          transactions.push(...momoTransactions)
        }
      }
    } catch (error) {
      console.error("Error fetching MoMo transactions:", error)
    }

    return transactions.slice(0, 20)
  }

  private static async getBranchStats() {
    try {
      const result = await sql`
        SELECT 
          b.id,
          b.name,
          b.location,
          COUNT(DISTINCT u.id) as user_count,
          COALESCE(SUM(fa.current_balance), 0) as total_balance,
          COUNT(DISTINCT fa.id) as account_count
        FROM branches b
        LEFT JOIN users u ON b.id = u.primary_branch_id
        LEFT JOIN float_accounts fa ON b.id = fa.branch_id
        GROUP BY b.id, b.name, b.location
        ORDER BY total_balance DESC
      `

      return result
    } catch (error) {
      console.error("Error fetching branch stats:", error)
      return []
    }
  }

  private static async getFinancialOverview(branchId?: string) {
    try {
      // Get total expenses
      let expensesResult
      try {
        if (branchId) {
          expensesResult = await sql`
            SELECT COALESCE(SUM(amount), 0) as total_expenses
            FROM expenses
            WHERE DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
              AND branch_id = ${branchId}
          `
        } else {
          expensesResult = await sql`
            SELECT COALESCE(SUM(amount), 0) as total_expenses
            FROM expenses
            WHERE DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
          `
        }
      } catch (error) {
        console.error("Error fetching expenses:", error)
        expensesResult = [{ total_expenses: 0 }]
      }

      const totalExpenses = Number(expensesResult[0]?.total_expenses || 0)

      return {
        cashFlow: 0,
        profitMargin: 0,
        operatingExpenses: totalExpenses,
        netIncome: 0,
      }
    } catch (error) {
      console.error("Error fetching financial overview:", error)
      return {
        cashFlow: 0,
        profitMargin: 0,
        operatingExpenses: 0,
        netIncome: 0,
      }
    }
  }

  private static getBranchFilter(userRole: string, branchId?: string): string | null {
    if (userRole === "admin" || userRole === "finance") {
      return null // No filter for admin and finance
    }
    return branchId || null
  }
}
