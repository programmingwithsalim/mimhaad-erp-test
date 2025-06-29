"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  RefreshCw,
  Settings,
  BarChart3,
  FileText,
} from "lucide-react"
import { format } from "date-fns"

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalBranches: number
  activeBranches: number
  totalTransactions: number
  totalRevenue: number
  pendingApprovals: number
  systemAlerts: number
  floatBalance: number
  monthlyGrowth: number
}

interface RecentActivity {
  id: string
  type: string
  description: string
  user: string
  timestamp: string
  status: "success" | "warning" | "error"
}

// Safe formatting functions
const formatNumber = (value: any): string => {
  const num = Number(value)
  return isNaN(num) ? "0" : num.toLocaleString()
}

const formatCurrency = (value: any): string => {
  const num = Number(value)
  return isNaN(num) ? "GHS 0.00" : `GHS ${num.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`
}

const formatPercentage = (value: any): string => {
  const num = Number(value)
  return isNaN(num) ? "0%" : `${num.toFixed(1)}%`
}

const formatTimestamp = (timestamp: string): string => {
  try {
    return format(new Date(timestamp), "MMM dd, HH:mm")
  } catch {
    return "Invalid date"
  }
}

export function EnhancedAdminDashboard() {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalBranches: 0,
    activeBranches: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    systemAlerts: 0,
    floatBalance: 0,
    monthlyGrowth: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true)
      else setLoading(true)

      // Fetch dashboard statistics
      const [statsResponse, activityResponse] = await Promise.all([
        fetch("/api/dashboard/statistics").catch(() => ({ ok: false })),
        fetch("/api/dashboard/recent-activity").catch(() => ({ ok: false })),
      ])

      // Handle statistics
      if (statsResponse.ok) {
        try {
          const statsData = await statsResponse.json()
          if (statsData.success) {
            setStats({
              totalUsers: Number(statsData.data.totalUsers) || 0,
              activeUsers: Number(statsData.data.activeUsers) || 0,
              totalBranches: Number(statsData.data.totalBranches) || 0,
              activeBranches: Number(statsData.data.activeBranches) || 0,
              totalTransactions: Number(statsData.data.totalTransactions) || 0,
              totalRevenue: Number(statsData.data.totalRevenue) || 0,
              pendingApprovals: Number(statsData.data.pendingApprovals) || 0,
              systemAlerts: Number(statsData.data.systemAlerts) || 0,
              floatBalance: Number(statsData.data.floatBalance) || 0,
              monthlyGrowth: Number(statsData.data.monthlyGrowth) || 0,
            })
          }
        } catch (error) {
          console.error("Error parsing stats data:", error)
        }
      }

      // Handle recent activity
      if (activityResponse.ok) {
        try {
          const activityData = await activityResponse.json()
          if (activityData.success && Array.isArray(activityData.data)) {
            setRecentActivity(activityData.data)
          }
        } catch (error) {
          console.error("Error parsing activity data:", error)
        }
      }

      if (showRefreshToast) {
        toast({
          title: "Dashboard Refreshed",
          description: "Latest data has been loaded successfully.",
        })
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_login":
        return <Users className="h-4 w-4" />
      case "transaction":
        return <DollarSign className="h-4 w-4" />
      case "system":
        return <Settings className="h-4 w-4" />
      case "approval":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="text-green-600">
            Success
          </Badge>
        )
      case "warning":
        return (
          <Badge variant="secondary" className="text-yellow-600">
            Warning
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || "Admin"}! Here's what's happening with your business.
          </p>
        </div>
        <Button onClick={() => fetchDashboardData(true)} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">{formatNumber(stats.activeUsers)} active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalBranches)}</div>
            <p className="text-xs text-muted-foreground">{formatNumber(stats.activeBranches)} active branches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{formatPercentage(stats.monthlyGrowth)} from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalTransactions)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatNumber(stats.pendingApprovals)}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatNumber(stats.systemAlerts)}</div>
            <p className="text-xs text-muted-foreground">Active alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Float Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.floatBalance)}</div>
            <p className="text-xs text-muted-foreground">Total across all accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system activities and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4">
                      <div className="flex-shrink-0">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-sm text-gray-500">by {activity.user}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(activity.status)}
                        <span className="text-xs text-gray-500">{formatTimestamp(activity.timestamp)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent activity to display</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics Overview
              </CardTitle>
              <CardDescription>Business performance metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Analytics charts will be displayed here</p>
                <p className="text-sm">Connect your data sources to see detailed analytics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                System Reports
              </CardTitle>
              <CardDescription>Generate and download system reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Report generation tools will be available here</p>
                <p className="text-sm">Create custom reports for your business needs</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
