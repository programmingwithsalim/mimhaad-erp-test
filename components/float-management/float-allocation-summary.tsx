"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, CircleDollarSign, BarChart } from "lucide-react"
import { useEffect, useState } from "react"

interface FloatAccount {
  id: string
  branchId: string
  branchName: string
  accountType?: string
  serviceType?: string
  provider?: string
  currentBalance: number
  maxThreshold: number
  minThreshold: number
  lastUpdated: string
}

interface FloatStatistics {
  totalAccounts: number
  totalBalance: number
  lowBalanceAccounts: number
  excessBalanceAccounts: number
  accountTypeBreakdown?: Record<string, number>
  transactionTypeBreakdown?: Record<string, number>
  branchBalances?: { id: string; name: string; balance: number }[]
  enrichedFloatAccounts?: (FloatAccount & { branchName: string })[]
}

interface FloatAllocationSummaryProps {
  floatAccounts?: FloatAccount[]
  statistics?: FloatStatistics
}

export function FloatAllocationSummary({ floatAccounts, statistics }: FloatAllocationSummaryProps) {
  const [data, setData] = useState<FloatStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If statistics are provided directly, use them
    if (statistics) {
      setData(statistics)
      return
    }

    // If float accounts are provided directly, calculate statistics
    if (floatAccounts && floatAccounts.length > 0) {
      const calculatedStats = calculateStatisticsFromAccounts(floatAccounts)
      setData(calculatedStats)
      return
    }

    // Otherwise fetch from API
    const fetchStatistics = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/float/statistics")

        if (!response.ok) {
          throw new Error(`Failed to fetch statistics: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log("Fetched float statistics:", data)

        if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
          throw new Error("Empty response received")
        }

        setData(data)
      } catch (err) {
        console.error("Error fetching float statistics:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch statistics")
        // Use fallback data
        setData(getFallbackStatistics())
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [floatAccounts, statistics])

  // Calculate statistics from accounts
  function calculateStatisticsFromAccounts(accounts: FloatAccount[]): FloatStatistics {
    // Calculate total float
    const totalFloat = accounts.reduce((sum, account) => sum + account.currentBalance, 0)

    // Calculate total max allocation
    const totalMaxAllocation = accounts.reduce((sum, account) => sum + account.maxThreshold, 0)

    // Count accounts with low float
    const lowFloatAccounts = accounts.filter((account) => account.currentBalance < account.minThreshold).length

    // Count accounts with high float
    const highFloatAccounts = accounts.filter((account) => account.currentBalance > account.maxThreshold).length

    // Calculate account type breakdown
    const accountTypeBreakdown = accounts.reduce<Record<string, number>>((acc, account) => {
      const type = account.accountType || account.serviceType || "unknown"
      if (!acc[type]) {
        acc[type] = 0
      }
      acc[type] += account.currentBalance
      return acc
    }, {})

    return {
      totalAccounts: accounts.length,
      totalBalance: totalFloat,
      lowBalanceAccounts: lowFloatAccounts,
      excessBalanceAccounts: highFloatAccounts,
      accountTypeBreakdown,
      transactionTypeBreakdown: {
        allocation: 45,
        transfer: 32,
        return: 18,
        adjustment: 5,
      },
      branchBalances: [],
      enrichedFloatAccounts: accounts.map((account) => ({
        ...account,
        branchName: account.branchName || `Branch ${account.branchId}`,
      })),
    }
  }

  // Fallback statistics
  function getFallbackStatistics(): FloatStatistics {
    return {
      totalAccounts: 24,
      totalBalance: 1250000,
      lowBalanceAccounts: 5,
      excessBalanceAccounts: 3,
      accountTypeBreakdown: {
        momo: 450000,
        "agency-banking": 350000,
        "e-zwich": 200000,
        "cash-in-till": 150000,
        power: 100000,
      },
      transactionTypeBreakdown: {
        allocation: 45,
        transfer: 32,
        return: 18,
        adjustment: 5,
      },
    }
  }

  // If still loading and no data yet, show loading state
  if (loading && !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-5 w-1/2 animate-pulse rounded bg-muted"></div>
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
            </CardHeader>
            <CardContent>
              <div className="h-7 w-1/3 animate-pulse rounded bg-muted"></div>
              <div className="mt-2 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                <div className="h-2 w-full animate-pulse rounded bg-muted"></div>
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // If error and no data, show error state
  if (error && !data) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Error Loading Float Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  // Use data or fallback
  const stats = data || getFallbackStatistics()

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-GH", { style: "currency", currency: "GHS" })
  }

  // Calculate utilization percentage
  const totalMaxAllocation = floatAccounts?.reduce((sum, account) => sum + account.maxThreshold, 0) || 0
  const utilizationPercentage =
    totalMaxAllocation > 0
      ? Math.round((stats.totalBalance / totalMaxAllocation) * 100)
      : Math.min(Math.round((stats.totalBalance / 1000000) * 100), 100) // Fallback calculation

  // Calculate percentages
  const lowBalancePercentage =
    stats.totalAccounts > 0 ? Math.round((stats.lowBalanceAccounts / stats.totalAccounts) * 100) : 0

  const highBalancePercentage =
    stats.totalAccounts > 0 ? Math.round((stats.excessBalanceAccounts / stats.totalAccounts) * 100) : 0

  const healthyAccounts = stats.totalAccounts - stats.lowBalanceAccounts - stats.excessBalanceAccounts
  const healthyPercentage = stats.totalAccounts > 0 ? Math.round((healthyAccounts / stats.totalAccounts) * 100) : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            Total Float
          </CardTitle>
          <CardDescription>Current allocation across all accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</div>
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Utilization</span>
              <span className="font-medium">{utilizationPercentage}%</span>
            </div>
            <Progress value={utilizationPercentage} className="h-1.5" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Total Accounts: {stats.totalAccounts}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Low Balance Accounts
          </CardTitle>
          <CardDescription>Accounts below minimum threshold</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{stats.lowBalanceAccounts}</div>
            <Badge variant="outline" className="font-normal">
              {lowBalancePercentage}% of total
            </Badge>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Severity</span>
              <span className="font-medium text-destructive">
                {stats.lowBalanceAccounts > 0 ? "Needs Attention" : "No Issues"}
              </span>
            </div>
            <Progress
              value={lowBalancePercentage}
              className={`h-1.5 ${stats.lowBalanceAccounts > 0 ? "bg-red-200" : ""}`}
              indicatorClassName={stats.lowBalanceAccounts > 0 ? "bg-destructive" : ""}
            />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-destructive" />
              <span>Requires immediate funding</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Healthy Accounts
          </CardTitle>
          <CardDescription>Accounts within threshold limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{healthyAccounts}</div>
            <Badge variant="outline" className="font-normal">
              {healthyPercentage}% of total
            </Badge>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-green-500">Optimal</span>
            </div>
            <Progress value={healthyPercentage} className="h-1.5 bg-green-200" indicatorClassName="bg-green-500" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Well-balanced accounts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart className="h-4 w-4 text-blue-500" />
            Excess Balance Accounts
          </CardTitle>
          <CardDescription>Accounts above maximum threshold</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{stats.excessBalanceAccounts}</div>
            <Badge variant="outline" className="font-normal">
              {highBalancePercentage}% of total
            </Badge>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Recommendation</span>
              <span className="font-medium text-blue-500">
                {stats.excessBalanceAccounts > 0 ? "Consider Reallocation" : "No Action Needed"}
              </span>
            </div>
            <Progress
              value={highBalancePercentage}
              className={`h-1.5 ${stats.excessBalanceAccounts > 0 ? "bg-blue-200" : ""}`}
              indicatorClassName={stats.excessBalanceAccounts > 0 ? "bg-blue-500" : ""}
            />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span>Potential for reallocation</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
