import { sql } from "@/lib/db"

export interface BranchServiceStats {
  service: string
  todayTransactions: number
  todayVolume: number
  todayFees: number
  totalBalance: number
  weeklyGrowth: number
  monthlyGrowth: number
  branchId: string
  branchName: string
}

export interface BranchComparison {
  branchId: string
  branchName: string
  totalBalance: number
  todayTransactions: number
  todayVolume: number
  todayFees: number
  weeklyGrowth: number
}

export interface FinancialMetrics {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  profitMargin: number
  cashFlow: number
  outstandingCommissions: number
  pendingExpenses: number
}

export interface EnhancedDashboardData {
  userInfo: {
    role: string
    branchId?: string
    branchName?: string
  }
  totalStats: {
    totalRevenue: number
    totalTransactions: number
    totalBalance: number
    totalFees: number
    revenueChange: number
    transactionChange: number
  }
  serviceStats: BranchServiceStats[]
  recentTransactions: any[]
  branchComparisons?: BranchComparison[]
  financialMetrics?: FinancialMetrics
  alerts: Array<{
    type: "warning" | "error" | "info"
    message: string
    priority: "high" | "medium" | "low"
  }>
}

export class EnhancedDashboardService {
  static async getDashboardData(
    userRole: string,
    branchId?: string,
    branchName?: string,
  ): Promise<EnhancedDashboardData> {
    try {
      console.log("Fetching enhanced dashboard data for role:", userRole, "branch:", branchId)

      const userInfo = { role: userRole, branchId, branchName }

      // Get service statistics based on role and branch
      const serviceStats = await this.getEnhancedServiceStats(userRole, branchId, branchName)

      // Get aggregated totals
      const totalStats = await this.getEnhancedTotalStats(userRole, branchId)

      // Get recent transactions
      const recentTransactions = await this.getEnhancedRecentTransactions(userRole, branchId)

      // Get branch comparisons for admins
      const branchComparisons = userRole === "admin" ? await this.getBranchComparisons() : undefined

      // Get financial metrics for finance role and admins
      const financialMetrics =
        userRole === "finance" || userRole === "admin" ? await this.getFinancialMetrics(branchId) : undefined

      // Get alerts based on role
      const alerts = await this.getAlerts(userRole, branchId)

      return {
        userInfo,
        totalStats,
        serviceStats,
        recentTransactions,
        branchComparisons,
        financialMetrics,
        alerts,
      }
    } catch (error) {
      console.error("Error fetching enhanced dashboard data:", error)
      throw error
    }
  }

  private static async getServiceTransactionStats(
    serviceName: string,
    tableName: string,
    userRole: string,
    branchId?: string,
  ) {
    try {
      // Check if table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${tableName}
        )
      `

      if (!tableExists[0]?.exists) {
        return { transaction_count: 0, total_volume: 0, total_fees: 0 }
      }

      // Services without fees
      const servicesWithoutFees = ["power", "jumia"]
      const hasFees = !servicesWithoutFees.includes(serviceName)

      let todayResult
      if (branchId && userRole !== "admin") {
        if (hasFees) {
          todayResult = await sql`
            SELECT 
              COUNT(*) as transaction_count,
              COALESCE(SUM(amount), 0) as total_volume,
              COALESCE(SUM(fee), 0) as total_fees
            FROM ${sql(tableName)}
            WHERE DATE(created_at) = CURRENT_DATE
              AND branch_id = ${branchId}
          `
        } else {
          todayResult = await sql`
            SELECT 
              COUNT(*) as transaction_count,
              COALESCE(SUM(amount), 0) as total_volume,
              0 as total_fees
            FROM ${sql(tableName)}
            WHERE DATE(created_at) = CURRENT_DATE
              AND branch_id = ${branchId}
          `
        }
      } else {
        if (hasFees) {
          todayResult = await sql`
            SELECT 
              COUNT(*) as transaction_count,
              COALESCE(SUM(amount), 0) as total_volume,
              COALESCE(SUM(fee), 0) as total_fees
            FROM ${sql(tableName)}
            WHERE DATE(created_at) = CURRENT_DATE
          `
        } else {
          todayResult = await sql`
            SELECT 
              COUNT(*) as transaction_count,
              COALESCE(SUM(amount), 0) as total_volume,
              0 as total_fees
            FROM ${sql(tableName)}
            WHERE DATE(created_at) = CURRENT_DATE
          `
        }
      }

      return todayResult[0] || { transaction_count: 0, total_volume: 0, total_fees: 0 }
    } catch (error) {
      console.error(`Error fetching stats for ${serviceName}:`, error)
      return { transaction_count: 0, total_volume: 0, total_fees: 0 }
    }
  }

  private static async getEnhancedServiceStats(
    userRole: string,
    branchId?: string,
    branchName?: string,
  ): Promise<BranchServiceStats[]> {
    const services = [
      { name: "momo", table: "momo_transactions", balanceFilter: "momo" },
      { name: "agency-banking", table: "agency_banking_transactions", balanceFilter: "agency-banking" },
      { name: "e-zwich", table: "e_zwich_transactions", balanceFilter: "e-zwich" },
      { name: "power", table: "power_transactions", balanceFilter: "power" },
      { name: "jumia", table: "jumia_transactions", balanceFilter: "jumia" },
    ]

    const serviceStats: BranchServiceStats[] = []

    for (const service of services) {
      try {
        // Get today's transaction stats
        const todayData = await this.getServiceTransactionStats(service.name, service.table, userRole, branchId)

        // Get weekly growth (simplified for now)
        const weeklyData = { growth_percentage: 0 }

        // Get total balance
        let balanceResult
        if (branchId && userRole !== "admin") {
          balanceResult = await sql`
            SELECT COALESCE(SUM(current_balance), 0) as total_balance
            FROM float_accounts
            WHERE account_type = ${service.balanceFilter}
              AND branch_id = ${branchId}
          `
        } else {
          balanceResult = await sql`
            SELECT COALESCE(SUM(current_balance), 0) as total_balance
            FROM float_accounts
            WHERE account_type = ${service.balanceFilter}
          `
        }

        const balanceData = balanceResult[0] || { total_balance: 0 }

        serviceStats.push({
          service: service.name,
          todayTransactions: Number(todayData.transaction_count),
          todayVolume: Number(todayData.total_volume),
          todayFees: Number(todayData.total_fees),
          totalBalance: Number(balanceData.total_balance),
          weeklyGrowth: Number(weeklyData.growth_percentage),
          monthlyGrowth: 0,
          branchId: branchId || "all",
          branchName: branchName || "All Branches",
        })
      } catch (error) {
        console.error(`Error fetching enhanced stats for ${service.name}:`, error)
        serviceStats.push({
          service: service.name,
          todayTransactions: 0,
          todayVolume: 0,
          todayFees: 0,
          totalBalance: 0,
          weeklyGrowth: 0,
          monthlyGrowth: 0,
          branchId: branchId || "all",
          branchName: branchName || "All Branches",
        })
      }
    }

    return serviceStats
  }

  private static async getEnhancedTotalStats(userRole: string, branchId?: string) {
    try {
      // Get total balance from float accounts
      let balanceResult
      if (branchId && userRole !== "admin") {
        balanceResult = await sql`
          SELECT COALESCE(SUM(current_balance), 0) as total_balance
          FROM float_accounts
          WHERE branch_id = ${branchId}
        `
      } else {
        balanceResult = await sql`
          SELECT COALESCE(SUM(current_balance), 0) as total_balance
          FROM float_accounts
        `
      }

      const totalBalance = Number(balanceResult[0]?.total_balance || 0)

      // Get aggregated transaction stats
      let totalTransactions = 0
      let totalRevenue = 0
      let totalFees = 0

      // Define services with their fee status
      const services = [
        { name: "momo", table: "momo_transactions", hasFees: true },
        { name: "agency-banking", table: "agency_banking_transactions", hasFees: true },
        { name: "e-zwich", table: "e_zwich_transactions", hasFees: true },
        { name: "power", table: "power_transactions", hasFees: false },
        { name: "jumia", table: "jumia_transactions", hasFees: false },
      ]

      for (const service of services) {
        try {
          const tableExists = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = ${service.table}
            )
          `

          if (!tableExists[0]?.exists) continue

          let result
          if (branchId && userRole !== "admin") {
            if (service.hasFees) {
              if (service.table === "momo_transactions") {
                result = await sql`
                  SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(amount), 0) as total_volume,
                    COALESCE(SUM(fee), 0) as total_fees
                  FROM momo_transactions
                  WHERE DATE(created_at) = CURRENT_DATE
                    AND branch_id = ${branchId}
                `
              } else if (service.table === "agency_banking_transactions") {
                result = await sql`
                  SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(amount), 0) as total_volume,
                    COALESCE(SUM(fee), 0) as total_fees
                  FROM agency_banking_transactions
                  WHERE DATE(created_at) = CURRENT_DATE
                    AND branch_id = ${branchId}
                `
              } else if (service.table === "e_zwich_transactions") {
                result = await sql`
                  SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(amount), 0) as total_volume,
                    COALESCE(SUM(fee), 0) as total_fees
                  FROM e_zwich_transactions
                  WHERE DATE(created_at) = CURRENT_DATE
                    AND branch_id = ${branchId}
                `
              }
            } else {
              if (service.table === "power_transactions") {
                result = await sql`
                  SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(amount), 0) as total_volume,
                    0 as total_fees
                  FROM power_transactions
                  WHERE DATE(created_at) = CURRENT_DATE
                    AND branch_id = ${branchId}
                `
              } else if (service.table === "jumia_transactions") {
                result = await sql`
                  SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(amount), 0) as total_volume,
                    0 as total_fees
                  FROM jumia_transactions
                  WHERE DATE(created_at) = CURRENT_DATE
                    AND branch_id = ${branchId}
                `
              }
            }
          } else {
            if (service.hasFees) {
              if (service.table === "momo_transactions") {
                result = await sql`
                  SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(amount), 0) as total_volume,
                    COALESCE(SUM(fee), 0) as total_fees
                  FROM momo_transactions
                  WHERE DATE(created_at) = CURRENT_DATE
                `
              } else if (service.table === "agency_banking_transactions") {
                result = await sql`
                  SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(amount), 0) as total_volume,
                    COALESCE(SUM(fee), 0) as total_fees
                  FROM agency_banking_transactions
                  WHERE DATE(created_at) = CURRENT_DATE
                `
              } else if (service.table === "e_zwich_transactions") {
                result = await sql`
                  SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(amount), 0) as total_volume,
                    COALESCE(SUM(fee), 0) as total_fees
                  FROM e_zwich_transactions
                  WHERE DATE(created_at) = CURRENT_DATE
                `
              }
            } else {
              if (service.table === "power_transactions") {
                result = await sql`
                  SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(amount), 0) as total_volume,
                    0 as total_fees
                  FROM power_transactions
                  WHERE DATE(created_at) = CURRENT_DATE
                `
              } else if (service.table === "jumia_transactions") {
                result = await sql`
                  SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(amount), 0) as total_volume,
                    0 as total_fees
                  FROM jumia_transactions
                  WHERE DATE(created_at) = CURRENT_DATE
                `
              }
            }
          }

          if (result && result[0]) {
            const data = result[0]
            totalTransactions += Number(data.transaction_count)
            totalRevenue += Number(data.total_volume)
            totalFees += Number(data.total_fees)
          }
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
      console.error("Error fetching enhanced total stats:", error)
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

  private static async getEnhancedRecentTransactions(userRole: string, branchId?: string) {
    const transactions: any[] = []

    try {
      // Get recent MoMo transactions
      const momoExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'momo_transactions'
        )
      `

      if (momoExists[0]?.exists) {
        let momoResult
        if (branchId && userRole !== "admin") {
          momoResult = await sql`
            SELECT 
              id,
              customer_name,
              amount,
              COALESCE(fee, 0) as fee,
              status,
              created_at,
              COALESCE(provider, 'Unknown') as provider,
              COALESCE(type, 'Unknown') as type,
              'MoMo' as service_type
            FROM momo_transactions
            WHERE branch_id = ${branchId}
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
              COALESCE(type, 'Unknown') as type,
              'MoMo' as service_type
            FROM momo_transactions
            ORDER BY created_at DESC 
            LIMIT 10
          `
        }

        transactions.push(...momoResult)
      }

      // Get recent Power transactions (no fees)
      const powerExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'power_transactions'
        )
      `

      if (powerExists[0]?.exists) {
        let powerResult
        if (branchId && userRole !== "admin") {
          powerResult = await sql`
            SELECT 
              id,
              customer_name,
              amount,
              0 as fee,
              status,
              created_at,
              COALESCE(provider, 'Unknown') as provider,
              COALESCE(transaction_type, 'Unknown') as type,
              'Power' as service_type
            FROM power_transactions
            WHERE branch_id = ${branchId}
            ORDER BY created_at DESC 
            LIMIT 5
          `
        } else {
          powerResult = await sql`
            SELECT 
              id,
              customer_name,
              amount,
              0 as fee,
              status,
              created_at,
              COALESCE(provider, 'Unknown') as provider,
              COALESCE(transaction_type, 'Unknown') as type,
              'Power' as service_type
            FROM power_transactions
            ORDER BY created_at DESC 
            LIMIT 5
          `
        }

        transactions.push(...powerResult)
      }

      // Get recent Jumia transactions (no fees)
      const jumiaExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'jumia_transactions'
        )
      `

      if (jumiaExists[0]?.exists) {
        let jumiaResult
        if (branchId && userRole !== "admin") {
          jumiaResult = await sql`
            SELECT 
              id,
              customer_name,
              amount,
              0 as fee,
              status,
              created_at,
              'Jumia' as provider,
              COALESCE(transaction_type, 'Unknown') as type,
              'Jumia' as service_type
            FROM jumia_transactions
            WHERE branch_id = ${branchId}
            ORDER BY created_at DESC 
            LIMIT 5
          `
        } else {
          jumiaResult = await sql`
            SELECT 
              id,
              customer_name,
              amount,
              0 as fee,
              status,
              created_at,
              'Jumia' as provider,
              COALESCE(transaction_type, 'Unknown') as type,
              'Jumia' as service_type
            FROM jumia_transactions
            ORDER BY created_at DESC 
            LIMIT 5
          `
        }

        transactions.push(...jumiaResult)
      }
    } catch (error) {
      console.error("Error fetching enhanced recent transactions:", error)
    }

    // Sort by created_at and return top 20
    return transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20)
  }

  private static async getBranchComparisons(): Promise<BranchComparison[]> {
    try {
      const result = await sql`
        SELECT 
          b.id as branch_id,
          b.name as branch_name,
          COALESCE(SUM(fa.current_balance), 0) as total_balance,
          0 as today_transactions,
          0 as today_volume,
          0 as today_fees,
          0 as weekly_growth
        FROM branches b
        LEFT JOIN float_accounts fa ON b.id = fa.branch_id
        GROUP BY b.id, b.name
        ORDER BY total_balance DESC
      `

      return result.map((row) => ({
        branchId: row.branch_id,
        branchName: row.branch_name,
        totalBalance: Number(row.total_balance),
        todayTransactions: Number(row.today_transactions),
        todayVolume: Number(row.today_volume),
        todayFees: Number(row.today_fees),
        weeklyGrowth: Number(row.weekly_growth),
      }))
    } catch (error) {
      console.error("Error fetching branch comparisons:", error)
      return []
    }
  }

  private static async getFinancialMetrics(branchId?: string): Promise<FinancialMetrics> {
    try {
      // Check if expenses table exists
      const expensesExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'expenses'
        )
      `

      let totalExpenses = 0
      if (expensesExists[0]?.exists) {
        let expensesResult
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
        totalExpenses = Number(expensesResult[0]?.total_expenses || 0)
      }

      // Check if commissions table exists
      const commissionsExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'commissions'
        )
      `

      let outstandingCommissions = 0
      if (commissionsExists[0]?.exists) {
        let commissionsResult
        if (branchId) {
          commissionsResult = await sql`
            SELECT COALESCE(SUM(amount), 0) as outstanding_commissions
            FROM commissions
            WHERE status = 'pending'
              AND branch_id = ${branchId}
          `
        } else {
          commissionsResult = await sql`
            SELECT COALESCE(SUM(amount), 0) as outstanding_commissions
            FROM commissions
            WHERE status = 'pending'
          `
        }
        outstandingCommissions = Number(commissionsResult[0]?.outstanding_commissions || 0)
      }

      let pendingExpenses = 0
      if (expensesExists[0]?.exists) {
        let pendingExpensesResult
        if (branchId) {
          pendingExpensesResult = await sql`
            SELECT COALESCE(SUM(amount), 0) as pending_expenses
            FROM expenses
            WHERE status = 'pending'
              AND branch_id = ${branchId}
          `
        } else {
          pendingExpensesResult = await sql`
            SELECT COALESCE(SUM(amount), 0) as pending_expenses
            FROM expenses
            WHERE status = 'pending'
          `
        }
        pendingExpenses = Number(pendingExpensesResult[0]?.pending_expenses || 0)
      }

      // Calculate other metrics (simplified)
      const totalRevenue = 50000 // This should come from actual revenue calculation
      const netIncome = totalRevenue - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
      const cashFlow = netIncome - pendingExpenses

      return {
        totalRevenue,
        totalExpenses,
        netIncome,
        profitMargin,
        cashFlow,
        outstandingCommissions,
        pendingExpenses,
      }
    } catch (error) {
      console.error("Error fetching financial metrics:", error)
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        profitMargin: 0,
        cashFlow: 0,
        outstandingCommissions: 0,
        pendingExpenses: 0,
      }
    }
  }

  private static async getAlerts(userRole: string, branchId?: string) {
    const alerts: Array<{
      type: "warning" | "error" | "info"
      message: string
      priority: "high" | "medium" | "low"
    }> = []

    try {
      // Check for low float balances
      let lowBalanceResult
      if (branchId && userRole !== "admin") {
        lowBalanceResult = await sql`
          SELECT account_name, current_balance, account_type
          FROM float_accounts
          WHERE current_balance < 5000
            AND branch_id = ${branchId}
        `
      } else {
        lowBalanceResult = await sql`
          SELECT account_name, current_balance, account_type, branch_id
          FROM float_accounts
          WHERE current_balance < 5000
        `
      }

      for (const account of lowBalanceResult) {
        alerts.push({
          type: "warning",
          message: `Low balance alert: ${account.account_name} (${account.account_type}) has only ${account.current_balance} remaining`,
          priority: "high",
        })
      }

      // Check for pending approvals (finance role)
      if (userRole === "finance" || userRole === "admin") {
        const expensesExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'expenses'
          )
        `

        if (expensesExists[0]?.exists) {
          let pendingExpensesResult
          if (branchId && userRole !== "admin") {
            pendingExpensesResult = await sql`
              SELECT COUNT(*) as pending_count
              FROM expenses
              WHERE status = 'pending'
                AND branch_id = ${branchId}
            `
          } else {
            pendingExpensesResult = await sql`
              SELECT COUNT(*) as pending_count
              FROM expenses
              WHERE status = 'pending'
            `
          }

          const pendingCount = Number(pendingExpensesResult[0]?.pending_count || 0)
          if (pendingCount > 0) {
            alerts.push({
              type: "info",
              message: `${pendingCount} expense(s) pending approval`,
              priority: "medium",
            })
          }
        }
      }
    } catch (error) {
      console.error("Error fetching alerts:", error)
    }

    return alerts
  }
}
