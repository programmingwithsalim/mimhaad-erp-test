"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  CheckCircle,
  AlertTriangle,
  BarChart3,
} from "lucide-react"

interface GLStatistics {
  totalAccounts: number
  activeAccounts: number
  totalTransactions: number
  totalDebits: number
  totalCredits: number
  isBalanced: boolean
  balanceDifference: number
  netPosition: number
  financialPosition: number
  pendingTransactions: number
  postedTransactions: number
  accountsByType: {
    Asset: number
    Liability: number
    Equity: number
    Revenue: number
    Expense: number
  }
  recentActivity: {
    module: string
    count: number
    amount: number
  }[]
  lastSyncTime: string
}

export function GLStatistics() {
  const [statistics, setStatistics] = useState<GLStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatistics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/gl/statistics")

      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.statusText}`)
      }

      const data = await response.json()
      setStatistics(data)
    } catch (error) {
      console.error("Error fetching GL statistics:", error)
      setError(error instanceof Error ? error.message : "Failed to load statistics")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !statistics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GL Statistics</CardTitle>
          <CardDescription className="text-red-500">{error || "Failed to load statistics"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchStatistics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">General Ledger Statistics</h3>
        <Button onClick={fetchStatistics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Balance Status - Most Important */}
        <Card
          className={`border-2 ${statistics.isBalanced ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Status</CardTitle>
            {statistics.isBalanced ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statistics.isBalanced ? "text-green-600" : "text-red-600"}`}>
              {statistics.isBalanced ? "✓ Balanced" : "⚠ Unbalanced"}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics.isBalanced
                ? "Debits equal credits"
                : `Difference: ${formatCurrency(statistics.balanceDifference)}`}
            </p>
          </CardContent>
        </Card>

        {/* Total Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">{statistics.activeAccounts} active accounts</p>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.pendingTransactions} pending, {statistics.postedTransactions} posted
            </p>
          </CardContent>
        </Card>

        {/* Total Debits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(statistics.totalDebits)}</div>
            <p className="text-xs text-muted-foreground">All debit entries</p>
          </CardContent>
        </Card>

        {/* Total Credits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(statistics.totalCredits)}</div>
            <p className="text-xs text-muted-foreground">All credit entries</p>
          </CardContent>
        </Card>

        {/* Net Position (Profit/Loss) */}
        <Card className={statistics.netPosition >= 0 ? "border-green-200" : "border-red-200"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Position (Profit/Loss)</CardTitle>
            <DollarSign className={`h-4 w-4 ${statistics.netPosition >= 0 ? "text-green-600" : "text-red-600"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statistics.netPosition >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(statistics.netPosition)}
            </div>
            <p className="text-xs text-muted-foreground">Revenue - Expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Distribution by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account Distribution by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(statistics.accountsByType).map(([type, count]) => (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{type}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity by Module */}
      {statistics.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Activity by Module</CardTitle>
            <CardDescription>Last updated: {formatDate(statistics.lastSyncTime)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statistics.recentActivity.map((activity) => (
                <div key={activity.module} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="capitalize">
                      {activity.module}
                    </Badge>
                    <span className="text-sm font-medium">{activity.count} transactions</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(activity.amount)}</div>
                    <div className="text-xs text-muted-foreground">Total amount</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Status Details */}
      <Card className={statistics.isBalanced ? "border-green-200" : "border-red-200"}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {statistics.isBalanced ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            Balance Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">{formatCurrency(statistics.totalDebits)}</div>
              <div className="text-xs text-muted-foreground">Total Debits</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">{formatCurrency(statistics.totalCredits)}</div>
              <div className="text-xs text-muted-foreground">Total Credits</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${statistics.isBalanced ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(Math.abs(statistics.balanceDifference))}
              </div>
              <div className="text-xs text-muted-foreground">
                {statistics.isBalanced ? "Perfect Balance" : "Difference"}
              </div>
            </div>
          </div>

          {!statistics.isBalanced && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800">
                <strong>⚠ Books are not balanced!</strong>
                <br />
                There is a difference of {formatCurrency(statistics.balanceDifference)} between total debits and
                credits. This requires immediate attention to ensure data integrity.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
