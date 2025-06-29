"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, CreditCard, DollarSign, Users } from "lucide-react"

interface DashboardStatistics {
  totalRevenue: number
  revenueChange: number
  totalTransactions: number
  transactionChange: number
  activeUsers: number
  totalUsers: number
  activityRate: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/dashboard/statistics")
      const result = await response.json()

      if (result.success) {
        setStats(result.data)
      } else {
        setError(result.error || "Failed to fetch statistics")
        // Use fallback data
        setStats(result.data)
      }
    } catch (err) {
      console.error("Error fetching dashboard statistics:", err)
      setError("Failed to fetch statistics")
      // Set fallback data
      setStats({
        totalRevenue: 0,
        revenueChange: 0,
        totalTransactions: 0,
        transactionChange: 0,
        activeUsers: 0,
        totalUsers: 0,
        activityRate: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "₵0.00"
    }
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "0.0%"
    }
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">{error || "No data available"}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          <p className={`text-xs ${(stats.revenueChange ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatPercentage(stats.revenueChange)} from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{(stats.totalTransactions ?? 0).toLocaleString()}</div>
          <p className={`text-xs ${(stats.transactionChange ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatPercentage(stats.transactionChange)} from last week
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{stats.activeUsers ?? 0}</div>
          <p className="text-xs text-muted-foreground">{stats.totalUsers ?? 0} total users</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Activity Rate</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(stats.activityRate)}</div>
          <p className="text-xs text-muted-foreground">
            {(stats.activityRate ?? 0) >= 0 ? "Increased" : "Decreased"} from last week
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
