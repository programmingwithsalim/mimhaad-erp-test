"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { Activity, CreditCard, DollarSign, TrendingUp } from "lucide-react"
import type { ServiceStats } from "@/lib/services/dashboard-service"

interface ManagerDashboardProps {
  serviceStats: ServiceStats[]
  totalStats: any
  recentTransactions: any[]
}

export function ManagerDashboard({
  serviceStats = [],
  totalStats = {},
  recentTransactions = [],
}: ManagerDashboardProps) {
  // Provide default values for totalStats with proper null checks
  const safeTotalStats = {
    totalRevenue: Number(totalStats?.totalRevenue || 0),
    totalTransactions: Number(totalStats?.totalTransactions || 0),
    totalBalance: Number(totalStats?.totalBalance || 0),
    totalFees: Number(totalStats?.totalFees || 0),
    ...totalStats,
  }

  // Safe formatting function
  const safeFormatCurrency = (value: any) => {
    const numValue = Number(value || 0)
    return isNaN(numValue) ? "GHS 0.00" : formatCurrency(numValue)
  }

  return (
    <div className="space-y-6">
      {/* Branch Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Branch Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeFormatCurrency(safeTotalStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Today's revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeTotalStats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Today's transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Float Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeFormatCurrency(safeTotalStats.totalBalance)}</div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fees Earned</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeFormatCurrency(safeTotalStats.totalFees)}</div>
            <p className="text-xs text-muted-foreground">Today's fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Service Performance</CardTitle>
          <CardDescription>Your branch's service breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {serviceStats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No service data available</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {serviceStats.map((service) => (
                <div key={service.service} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium capitalize">{service.service.replace("-", " ")}</h3>
                    <Badge variant={Number(service.weeklyGrowth || 0) >= 0 ? "default" : "destructive"}>
                      {Number(service.weeklyGrowth || 0) >= 0 ? "+" : ""}
                      {Number(service.weeklyGrowth || 0).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Balance: <span className="font-medium">{safeFormatCurrency(service.totalBalance)}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Transactions: <span className="font-medium">{Number(service.todayTransactions || 0)}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Volume: <span className="font-medium">{safeFormatCurrency(service.todayVolume)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest transactions in your branch</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent transactions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{transaction.customer_name || "Unknown Customer"}</p>
                      <Badge variant="outline">{transaction.service_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {transaction.type} - {transaction.provider}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{safeFormatCurrency(transaction.amount)}</p>
                    <p className="text-sm text-muted-foreground">{transaction.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
