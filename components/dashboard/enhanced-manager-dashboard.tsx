"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
} from "lucide-react"
import type { EnhancedDashboardData } from "@/lib/services/enhanced-dashboard-service"

interface EnhancedManagerDashboardProps {
  data: EnhancedDashboardData
}

export function EnhancedManagerDashboard({ data }: EnhancedManagerDashboardProps) {
  // Create safe defaults for all data
  const safeData = {
    totalStats: {
      totalRevenue: data?.totalStats?.totalRevenue ?? 0,
      totalTransactions: data?.totalStats?.totalTransactions ?? 0,
      totalBalance: data?.totalStats?.totalBalance ?? 0,
      totalFees: data?.totalStats?.totalFees ?? 0,
      revenueChange: data?.totalStats?.revenueChange ?? 0,
      transactionChange: data?.totalStats?.transactionChange ?? 0,
    },
    serviceStats: data?.serviceStats ?? [],
    recentTransactions: data?.recentTransactions ?? [],
    alerts: data?.alerts ?? [],
    userInfo: {
      branchName: data?.userInfo?.branchName ?? "Unknown Branch",
      ...data?.userInfo,
    },
  }

  const { totalStats, serviceStats, recentTransactions, alerts, userInfo } = safeData

  const formatCurrency = (amount: number | null | undefined) => {
    const safeAmount = Number(amount) || 0
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(safeAmount)
  }

  const getGrowthIcon = (growth: number | null | undefined) => {
    const safeGrowth = Number(growth) || 0
    if (safeGrowth > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (safeGrowth < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <div className="h-4 w-4" />
  }

  const getGrowthColor = (growth: number | null | undefined) => {
    const safeGrowth = Number(growth) || 0
    if (safeGrowth > 0) return "text-green-600"
    if (safeGrowth < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "info":
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "success":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "failed":
      case "error":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Branch Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Branch Operations - {userInfo.branchName}</CardTitle>
          <CardDescription className="text-blue-600">
            Real-time operations and performance metrics for your branch
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Branch Alerts</h3>
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              className={`border-l-4 ${
                alert.type === "error"
                  ? "border-l-red-500"
                  : alert.type === "warning"
                    ? "border-l-yellow-500"
                    : "border-l-blue-500"
              }`}
            >
              <div className="flex items-center gap-2">
                {getAlertIcon(alert.type)}
                <AlertDescription>{alert.message}</AlertDescription>
                <Badge variant={alert.priority === "high" ? "destructive" : "secondary"}>{alert.priority}</Badge>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalStats.totalRevenue)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getGrowthIcon(totalStats.revenueChange)}
              <span className={getGrowthColor(totalStats.revenueChange)}>
                {totalStats.revenueChange > 0 ? "+" : ""}
                {(totalStats.revenueChange || 0).toFixed(1)}%
              </span>
              <span>from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(totalStats.totalTransactions || 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getGrowthIcon(totalStats.transactionChange)}
              <span className={getGrowthColor(totalStats.transactionChange)}>
                {totalStats.transactionChange > 0 ? "+" : ""}
                {(totalStats.transactionChange || 0).toFixed(1)}%
              </span>
              <span>from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Float Balance</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalStats.totalBalance)}</div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Fees</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalStats.totalFees)}</div>
            <p className="text-xs text-muted-foreground">Fee earnings</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Service Performance</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {serviceStats.map((service, index) => (
              <Card key={service?.service || index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base capitalize flex items-center justify-between">
                    {(service?.service || "Unknown").replace("-", " ")}
                    <Badge variant={(service?.weeklyGrowth || 0) > 0 ? "default" : "secondary"}>
                      {(service?.weeklyGrowth || 0) > 0 ? "+" : ""}
                      {(service?.weeklyGrowth || 0).toFixed(1)}%
                    </Badge>
                  </CardTitle>
                  <CardDescription>Branch performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Today's Transactions</span>
                    <span className="font-semibold">{service?.todayTransactions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Volume</span>
                    <span className="font-semibold">{formatCurrency(service?.todayVolume)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Fees</span>
                    <span className="font-semibold">{formatCurrency(service?.todayFees)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Float Balance</span>
                    <span className="font-semibold">{formatCurrency(service?.totalBalance)}</span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Balance Health</span>
                      <span>{(service?.totalBalance || 0) > 10000 ? "Good" : "Low"}</span>
                    </div>
                    <Progress value={Math.min(((service?.totalBalance || 0) / 50000) * 100, 100)} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Latest transaction activity in your branch</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.length > 0 ? (
                  recentTransactions.slice(0, 10).map((transaction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{transaction?.customer_name || "Unknown Customer"}</span>
                          <Badge variant="outline" className="text-xs">
                            {transaction?.service_type || "Unknown"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction?.provider || "Unknown"} • {transaction?.type || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transaction?.created_at ? new Date(transaction.created_at).toLocaleString() : "Unknown time"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(transaction?.amount)}</div>
                        <div className="text-sm text-muted-foreground">Fee: {formatCurrency(transaction?.fee)}</div>
                        <div className="mt-1">{getStatusBadge(transaction?.status)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent transactions found</p>
                    <p className="text-sm">Transactions will appear here as they are processed</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Export as both named and default export
export default EnhancedManagerDashboard
