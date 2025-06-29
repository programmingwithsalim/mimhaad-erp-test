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
  PiggyBank,
  Receipt,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react"
import type { EnhancedDashboardData } from "@/lib/services/enhanced-dashboard-service"

interface EnhancedFinanceDashboardProps {
  data: EnhancedDashboardData
}

export function EnhancedFinanceDashboard({ data }: EnhancedFinanceDashboardProps) {
  // Safe defaults to prevent null/undefined errors
  const safeData = {
    totalStats: {
      totalRevenue: 0,
      totalFees: 0,
      totalBalance: 0,
      revenueChange: 0,
      ...data?.totalStats,
    },
    serviceStats: data?.serviceStats || [],
    financialMetrics: {
      netIncome: 0,
      profitMargin: 0,
      cashFlow: 0,
      pendingExpenses: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      outstandingCommissions: 0,
      ...data?.financialMetrics,
    },
    alerts: data?.alerts || [],
    userInfo: {
      branchName: "Unknown Branch",
      ...data?.userInfo,
    },
  }

  const { totalStats, serviceStats, financialMetrics, alerts, userInfo } = safeData

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

  return (
    <div className="space-y-6">
      {/* Branch Info */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Financial Overview - {userInfo.branchName}</CardTitle>
          <CardDescription className="text-green-600">
            Financial metrics and performance for your branch
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Financial Alerts</h3>
          {alerts.map((alert, index) => (
            <Alert key={index} className="border-l-4 border-l-blue-500">
              <div className="flex items-center gap-2">
                {getAlertIcon(alert?.type || "info")}
                <AlertDescription>{alert?.message || "No message"}</AlertDescription>
                <Badge variant={alert?.priority === "high" ? "destructive" : "secondary"}>
                  {alert?.priority || "low"}
                </Badge>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Financial Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(financialMetrics.netIncome)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{(financialMetrics.profitMargin || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Current margin</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
            <PiggyBank className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(financialMetrics.cashFlow)}</div>
            <p className="text-xs text-muted-foreground">Available cash</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(financialMetrics.pendingExpenses)}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalStats.totalFees)}</div>
            <p className="text-xs text-muted-foreground">Today's fee income</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Float Balance</CardTitle>
            <PiggyBank className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalStats.totalBalance)}</div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Service Performance</TabsTrigger>
          <TabsTrigger value="financial">Financial Details</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {serviceStats.map((service, index) => (
              <Card key={service?.service || index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base capitalize flex items-center justify-between">
                    {(service?.service || "unknown").replace("-", " ")}
                    <Badge variant={(service?.weeklyGrowth || 0) > 0 ? "default" : "secondary"}>
                      {(service?.weeklyGrowth || 0) > 0 ? "+" : ""}
                      {(service?.weeklyGrowth || 0).toFixed(1)}%
                    </Badge>
                  </CardTitle>
                  <CardDescription>Branch performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Today's Revenue</span>
                    <span className="font-semibold">{formatCurrency(service?.todayVolume || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Fees Earned</span>
                    <span className="font-semibold">{formatCurrency(service?.todayFees || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Float Balance</span>
                    <span className="font-semibold">{formatCurrency(service?.totalBalance || 0)}</span>
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

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
                <CardDescription>Monthly financial breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="font-semibold text-green-600">{formatCurrency(financialMetrics.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Expenses</span>
                  <span className="font-semibold text-red-600">{formatCurrency(financialMetrics.totalExpenses)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Net Income</span>
                  <span className={`font-bold ${financialMetrics.netIncome > 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(financialMetrics.netIncome)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outstanding Items</CardTitle>
                <CardDescription>Items requiring attention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Outstanding Commissions</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(financialMetrics.outstandingCommissions)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending Expenses</span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(financialMetrics.pendingExpenses)}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Outstanding</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(
                      (financialMetrics.outstandingCommissions || 0) + (financialMetrics.pendingExpenses || 0),
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Export both named and default exports
export default EnhancedFinanceDashboard
