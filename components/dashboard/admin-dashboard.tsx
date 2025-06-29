"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { Building2, Users, TrendingUp, DollarSign, AlertTriangle } from "lucide-react"
import type { ServiceStats } from "@/lib/services/dashboard-service"

interface AdminDashboardProps {
  serviceStats: ServiceStats[]
  branchStats: any[]
  totalStats: any
}

export function AdminDashboard({ serviceStats = [], branchStats = [], totalStats = {} }: AdminDashboardProps) {
  // Safely extract values with defaults
  const safeStats = {
    totalRevenue: totalStats?.totalRevenue || 0,
    totalTransactions: totalStats?.totalTransactions || 0,
    totalBalance: totalStats?.totalBalance || 0,
    totalFees: totalStats?.totalFees || 0,
    revenueChange: totalStats?.revenueChange || 0,
    transactionChange: totalStats?.transactionChange || 0,
  }

  const safeBranchStats = Array.isArray(branchStats) ? branchStats : []
  const safeServiceStats = Array.isArray(serviceStats) ? serviceStats : []

  // Check if we have any data issues
  const hasDataIssues =
    safeStats.totalRevenue === 0 && safeStats.totalTransactions === 0 && safeServiceStats.length === 0

  return (
    <div className="space-y-6">
      {/* Data Issues Warning */}
      {hasDataIssues && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Data Loading Issues
            </CardTitle>
            <CardDescription className="text-yellow-700">
              Some dashboard data may not be available due to database schema differences or missing tables. The system
              is still functional, but some metrics may show as zero.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(safeStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {safeStats.revenueChange >= 0 ? "+" : ""}
              {safeStats.revenueChange.toFixed(1)}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {safeStats.transactionChange >= 0 ? "+" : ""}
              {safeStats.transactionChange.toFixed(1)}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Float</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(safeStats.totalBalance)}</div>
            <p className="text-xs text-muted-foreground">All service balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Branches</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeBranchStats.length}</div>
            <p className="text-xs text-muted-foreground">Operating branches</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Service Performance</CardTitle>
          <CardDescription>Performance metrics across all services</CardDescription>
        </CardHeader>
        <CardContent>
          {safeServiceStats.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Service Data Available</h3>
              <p className="text-muted-foreground">
                Service statistics are not available. This may be due to missing database tables or schema differences.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {safeServiceStats.map((service) => (
                <div key={service.service} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium capitalize">{service.service.replace("-", " ")}</h3>
                    <Badge variant={service.weeklyGrowth >= 0 ? "default" : "destructive"}>
                      {service.weeklyGrowth >= 0 ? "+" : ""}
                      {service.weeklyGrowth.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Balance: <span className="font-medium">{formatCurrency(service.totalBalance)}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Today: <span className="font-medium">{service.todayTransactions} transactions</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Volume: <span className="font-medium">{formatCurrency(service.todayVolume)}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fees: <span className="font-medium">{formatCurrency(service.todayFees)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Overview</CardTitle>
          <CardDescription>Performance by branch</CardDescription>
        </CardHeader>
        <CardContent>
          {safeBranchStats.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Branch Data Available</h3>
              <p className="text-muted-foreground">Branch statistics are not available at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {safeBranchStats.map((branch) => (
                <div key={branch.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{branch.name || "Unknown Branch"}</h3>
                    <p className="text-sm text-muted-foreground">{branch.location || "Unknown Location"}</p>
                    <p className="text-sm text-muted-foreground">{branch.user_count || 0} users</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(branch.total_balance || 0)}</p>
                    <p className="text-sm text-muted-foreground">{branch.account_count || 0} accounts</p>
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
