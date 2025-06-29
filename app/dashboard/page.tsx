"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import {
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  RefreshCw,
  AlertTriangle,
  Smartphone,
  Zap,
  CreditCard,
  Building2,
  Package,
} from "lucide-react"
import { format } from "date-fns"

interface DashboardStats {
  totalTransactions: number
  totalVolume: number
  totalCommission: number
  activeUsers: number
  todayTransactions: number
  todayVolume: number
  todayCommission: number
  serviceBreakdown: Array<{
    service: string
    transactions: number
    volume: number
    commission: number
  }>
  recentActivity: Array<{
    id: string
    type: string
    service: string
    amount: number
    timestamp: string
    user: string
  }>
  floatAlerts: Array<{
    id: string
    provider: string
    service: string
    current_balance: number
    threshold: number
    severity: "warning" | "critical"
  }>
  chartData: Array<{
    date: string
    transactions: number
    volume: number
    commission: number
  }>
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

const defaultStats: DashboardStats = {
  totalTransactions: 0,
  totalVolume: 0,
  totalCommission: 0,
  activeUsers: 0,
  todayTransactions: 0,
  todayVolume: 0,
  todayCommission: 0,
  serviceBreakdown: [],
  recentActivity: [],
  floatAlerts: [],
  chartData: [],
}

export default function DashboardPage() {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [stats, setStats] = useState<DashboardStats>(defaultStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount || 0)
  }

  const loadDashboardData = async () => {
    if (!user?.branchId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/dashboard/enhanced?branchId=${user.branchId}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setStats({
            ...defaultStats,
            ...data.data,
            serviceBreakdown: Array.isArray(data.data.serviceBreakdown) ? data.data.serviceBreakdown : [],
            recentActivity: Array.isArray(data.data.recentActivity) ? data.data.recentActivity : [],
            floatAlerts: Array.isArray(data.data.floatAlerts) ? data.data.floatAlerts : [],
            chartData: Array.isArray(data.data.chartData) ? data.data.chartData : [],
          })
        } else {
          console.error("Dashboard API error:", data.error)
          setError(data.error || "Failed to load dashboard data")
          setStats(defaultStats)
        }
      } else {
        console.error("Dashboard API response not ok:", response.status)
        setError(`Server error: ${response.status}`)
        setStats(defaultStats)
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
      setStats(defaultStats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.branchId) {
      loadDashboardData()
    } else {
      setLoading(false)
    }
  }, [user?.branchId])

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "momo":
        return <Smartphone className="h-4 w-4" />
      case "power":
        return <Zap className="h-4 w-4" />
      case "e-zwich":
        return <CreditCard className="h-4 w-4" />
      case "agency-banking":
        return <Building2 className="h-4 w-4" />
      case "jumia":
        return <Package className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your branch operations</p>
          </div>
        </div>
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName} {user?.lastName}! Overview of {user?.branchName || "your branch"} operations
          </p>
        </div>
        <Button variant="outline" onClick={loadDashboardData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            {error} - Showing available data with fallback values.
          </AlertDescription>
        </Alert>
      )}

      {/* Float Alerts */}
      {stats.floatAlerts && stats.floatAlerts.length > 0 && (
        <div className="space-y-2">
          {stats.floatAlerts.map((alert) => (
            <Alert
              key={alert.id}
              className={`border-l-4 ${
                alert.severity === "critical" ? "border-l-red-500 bg-red-50" : "border-l-yellow-500 bg-yellow-50"
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 ${alert.severity === "critical" ? "text-red-600" : "text-yellow-600"}`}
              />
              <AlertDescription>
                <span className="font-medium">
                  {alert.service} - {alert.provider}
                </span>{" "}
                float balance is {alert.severity}: {formatCurrency(alert.current_balance)}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayTransactions}</div>
            <p className="text-xs text-muted-foreground">Total: {stats.totalTransactions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayVolume)}</div>
            <p className="text-xs text-muted-foreground">Total: {formatCurrency(stats.totalVolume)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayCommission)}</div>
            <p className="text-xs text-muted-foreground">Total: {formatCurrency(stats.totalCommission)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Branch staff</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Service Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Transaction Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Volume (Last 7 Days)</CardTitle>
            <CardDescription>Daily transaction volume and commission</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.chartData && stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "volume" || name === "commission" ? formatCurrency(Number(value)) : value,
                      name === "volume" ? "Volume" : name === "commission" ? "Commission" : "Transactions",
                    ]}
                  />
                  <Area type="monotone" dataKey="volume" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="commission" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No chart data available</div>
            )}
          </CardContent>
        </Card>

        {/* Service Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Service Breakdown</CardTitle>
            <CardDescription>Transaction distribution by service</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.serviceBreakdown && stats.serviceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.serviceBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ service, transactions }) => `${service}: ${transactions}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="transactions"
                  >
                    {stats.serviceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, "Transactions"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No service data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Performance and Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Service Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
            <CardDescription>Today's performance by service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.serviceBreakdown && stats.serviceBreakdown.length > 0 ? (
                stats.serviceBreakdown.map((service) => (
                  <div key={service.service} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getServiceIcon(service.service)}
                      <div>
                        <p className="font-medium capitalize">{service.service.replace("-", " ")}</p>
                        <p className="text-sm text-muted-foreground">{service.transactions} transactions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(service.volume)}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(service.commission)} commission</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No service data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions across all services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getServiceIcon(activity.service)}
                      <div>
                        <p className="font-medium capitalize">{activity.type.replace("_", " ")}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.service} • {activity.user}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(activity.amount)}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(activity.timestamp), "HH:mm")}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
