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

export class DashboardServiceFallback {
  static async getDashboardData(userRole: string, branchId?: string): Promise<DashboardData> {
    console.log("Using fallback dashboard data for role:", userRole, "branch:", branchId)

    // Generate mock data based on role
    const serviceStats: ServiceStats[] = [
      {
        service: "momo",
        todayTransactions: Math.floor(Math.random() * 100) + 50,
        todayVolume: Math.floor(Math.random() * 50000) + 10000,
        todayFees: Math.floor(Math.random() * 1000) + 200,
        totalBalance: Math.floor(Math.random() * 100000) + 50000,
        weeklyGrowth: Math.floor(Math.random() * 20) - 10,
        monthlyGrowth: Math.floor(Math.random() * 30) - 15,
      },
      {
        service: "agency-banking",
        todayTransactions: Math.floor(Math.random() * 80) + 30,
        todayVolume: Math.floor(Math.random() * 40000) + 8000,
        todayFees: Math.floor(Math.random() * 800) + 150,
        totalBalance: Math.floor(Math.random() * 80000) + 40000,
        weeklyGrowth: Math.floor(Math.random() * 15) - 7,
        monthlyGrowth: Math.floor(Math.random() * 25) - 12,
      },
      {
        service: "e-zwich",
        todayTransactions: Math.floor(Math.random() * 60) + 20,
        todayVolume: Math.floor(Math.random() * 30000) + 5000,
        todayFees: Math.floor(Math.random() * 600) + 100,
        totalBalance: Math.floor(Math.random() * 60000) + 30000,
        weeklyGrowth: Math.floor(Math.random() * 12) - 6,
        monthlyGrowth: Math.floor(Math.random() * 20) - 10,
      },
      {
        service: "power",
        todayTransactions: Math.floor(Math.random() * 40) + 15,
        todayVolume: Math.floor(Math.random() * 20000) + 3000,
        todayFees: Math.floor(Math.random() * 400) + 75,
        totalBalance: Math.floor(Math.random() * 40000) + 20000,
        weeklyGrowth: Math.floor(Math.random() * 10) - 5,
        monthlyGrowth: Math.floor(Math.random() * 15) - 7,
      },
      {
        service: "jumia",
        todayTransactions: Math.floor(Math.random() * 30) + 10,
        todayVolume: Math.floor(Math.random() * 15000) + 2000,
        todayFees: Math.floor(Math.random() * 300) + 50,
        totalBalance: Math.floor(Math.random() * 30000) + 15000,
        weeklyGrowth: Math.floor(Math.random() * 8) - 4,
        monthlyGrowth: Math.floor(Math.random() * 12) - 6,
      },
    ]

    const totalStats = {
      totalRevenue: serviceStats.reduce((sum, service) => sum + service.todayVolume, 0),
      totalTransactions: serviceStats.reduce((sum, service) => sum + service.todayTransactions, 0),
      totalBalance: serviceStats.reduce((sum, service) => sum + service.totalBalance, 0),
      totalFees: serviceStats.reduce((sum, service) => sum + service.todayFees, 0),
      revenueChange: Math.floor(Math.random() * 20) - 10,
      transactionChange: Math.floor(Math.random() * 15) - 7,
    }

    const recentTransactions = [
      {
        id: "1",
        customer_name: "John Doe",
        amount: 1500,
        fee: 15,
        status: "completed",
        created_at: new Date().toISOString(),
        service_type: "MoMo",
        provider: "MTN",
        type: "cash_in",
      },
      {
        id: "2",
        customer_name: "Jane Smith",
        amount: 2000,
        fee: 20,
        status: "completed",
        created_at: new Date(Date.now() - 300000).toISOString(),
        service_type: "Agency Banking",
        provider: "GCB Bank",
        type: "withdrawal",
      },
      {
        id: "3",
        customer_name: "Mike Johnson",
        amount: 500,
        fee: 5,
        status: "pending",
        created_at: new Date(Date.now() - 600000).toISOString(),
        service_type: "E-Zwich",
        provider: "E-Zwich",
        type: "card_issuance",
      },
    ]

    const branchStats =
      userRole === "admin"
        ? [
            {
              id: "1",
              name: "Main Branch",
              location: "Accra",
              user_count: 15,
              total_balance: 150000,
              account_count: 25,
            },
            {
              id: "2",
              name: "Kumasi Branch",
              location: "Kumasi",
              user_count: 12,
              total_balance: 120000,
              account_count: 20,
            },
          ]
        : undefined

    const financialOverview =
      userRole === "finance" || userRole === "admin"
        ? {
            cashFlow: 25000,
            profitMargin: 15.5,
            operatingExpenses: 18000,
            netIncome: 7000,
          }
        : undefined

    return {
      totalStats,
      serviceStats,
      recentTransactions,
      branchStats,
      financialOverview,
    }
  }
}
