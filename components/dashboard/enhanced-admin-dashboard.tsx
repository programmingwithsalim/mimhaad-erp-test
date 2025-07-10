"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Shield,
  BarChart3,
  FileText,
  CreditCard,
  Smartphone,
  Zap,
  ShoppingCart,
  Wallet,
  Target,
  PieChart,
  LineChart,
} from "lucide-react";

interface ServiceStats {
  service: string;
  todayTransactions: number;
  todayVolume: number;
  todayFees: number;
  totalBalance: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

interface DashboardStats {
  totalTransactions: number;
  totalVolume: number;
  totalCommission: number;
  activeUsers: number;
  todayTransactions: number;
  todayVolume: number;
  todayCommission: number;
  serviceBreakdown: Array<{
    service: string;
    transactions: number;
    volume: number;
    commission: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    service: string;
    amount: number;
    timestamp: string;
    user: string;
  }>;
  floatAlerts: Array<{
    id: string;
    provider: string;
    service: string;
    current_balance: number;
    threshold: number;
    severity: "warning" | "critical";
  }>;
  chartData: Array<{
    date: string;
    transactions: number;
    volume: number;
    commission: number;
  }>;
  financialMetrics: any;
  revenueAnalysis: any[];
  teamPerformance: any[];
  dailyOperations: any[];
  serviceMetrics: any[];
  systemAlerts: number;
  pendingApprovals: number;
  users: any;
  branches: any[];
  branchMetrics: any[];
  expenses: any;
  commissions: any;
  float: any;
}

interface EnhancedAdminDashboardProps {
  serviceStats: ServiceStats[];
  branchStats: any[];
  totalStats: DashboardStats;
  systemAlerts: number;
  pendingApprovals: number;
  userStats: any;
}

export function EnhancedAdminDashboard({
  serviceStats,
  branchStats,
  totalStats,
  systemAlerts,
  pendingApprovals,
  userStats,
}: EnhancedAdminDashboardProps) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);

  // Debug logging
  console.log("EnhancedAdminDashboard props:", {
    serviceStats,
    branchStats,
    totalStats,
    systemAlerts,
    pendingApprovals,
    userStats,
  });

  const formatCurrency = (amount: number | null | undefined) => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(safeAmount);
  };

  const formatNumber = (value: any): string => {
    const num = Number(value);
    return isNaN(num) ? "0" : num.toLocaleString();
  };

  const getGrowthIcon = (growth: number | null | undefined) => {
    const safeGrowth = Number(growth) || 0;
    if (safeGrowth > 0)
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (safeGrowth < 0)
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  const getServiceIcon = (service: string | undefined | null) => {
    if (!service || typeof service !== "string") return <Activity className="h-4 w-4" />;
    switch (service.toLowerCase()) {
      case "momo":
        return <Smartphone className="h-4 w-4" />;
      case "power":
        return <Zap className="h-4 w-4" />;
      case "e-zwich":
      case "ezwich":
        return <CreditCard className="h-4 w-4" />;
      case "agency-banking":
      case "agency banking":
        return <Building2 className="h-4 w-4" />;
      case "jumia":
        return <ShoppingCart className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    // Trigger a page refresh to get new data
    setTimeout(() => {
      setLoading(false);
      window.location.reload();
    }, 1000);
  };

  // Use real chart data from API instead of mock data
  const chartData = totalStats.chartData && totalStats.chartData.length > 0 
    ? totalStats.chartData.slice(-7).map((day: any) => ({
        date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        transactions: day.transactions,
        volume: day.volume,
        commission: day.commission,
      }))
    : [
        { date: "Mon", transactions: 0, volume: 0, commission: 0 },
        { date: "Tue", transactions: 0, volume: 0, commission: 0 },
        { date: "Wed", transactions: 0, volume: 0, commission: 0 },
        { date: "Thu", transactions: 0, volume: 0, commission: 0 },
        { date: "Fri", transactions: 0, volume: 0, commission: 0 },
        { date: "Sat", transactions: 0, volume: 0, commission: 0 },
        { date: "Sun", transactions: 0, volume: 0, commission: 0 },
      ];

  // Use real service breakdown from API
  const serviceBreakdown = totalStats.serviceBreakdown && totalStats.serviceBreakdown.length > 0
    ? totalStats.serviceBreakdown
    : [
        { service: "MoMo", transactions: 0, volume: 0, commission: 0 },
        { service: "Agency Banking", transactions: 0, volume: 0, commission: 0 },
        { service: "E-Zwich", transactions: 0, volume: 0, commission: 0 },
        { service: "Power", transactions: 0, volume: 0, commission: 0 },
        { service: "Jumia", transactions: 0, volume: 0, commission: 0 },
      ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || "Admin"}! Here's your
            comprehensive system overview.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* System Alerts */}
      {(systemAlerts > 0 || pendingApprovals > 0) && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">System Alerts</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {systemAlerts > 0 && (
              <Alert className="border-l-4 border-l-red-500 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <span className="font-medium">
                    {systemAlerts} system alerts
                  </span>{" "}
                  require attention
                </AlertDescription>
              </Alert>
            )}
            {pendingApprovals > 0 && (
              <Alert className="border-l-4 border-l-yellow-500 bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <span className="font-medium">
                    {pendingApprovals} pending approvals
                  </span>{" "}
                  awaiting review
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Float Alerts */}
      {totalStats.floatAlerts && totalStats.floatAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Float Alerts</h3>
          {totalStats.floatAlerts.map((alert) => (
            <Alert
              key={alert.id}
              className={`border-l-4 ${
                alert.severity === "critical"
                  ? "border-l-red-500 bg-red-50"
                  : "border-l-yellow-500 bg-yellow-50"
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 ${
                  alert.severity === "critical"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              />
              <AlertDescription>
                <span className="font-medium">
                  {alert.service} - {alert.provider}
                </span>{" "}
                float balance is {alert.severity}:{" "}
                {formatCurrency(alert.current_balance)}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(userStats?.totalUsers || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(userStats?.activeUsers || 0)} active users
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="text-primary">Total Branches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(
                (Array.isArray(branchStats) ? branchStats : []).length || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(
                (Array.isArray(branchStats) ? branchStats : []).filter(
                  (b: any) => b.status === "active"
                )?.length || 0
              )}{" "}
              active branches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalStats?.totalVolume || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalStats?.todayVolume || 0)} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totalStats?.totalTransactions || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(totalStats?.todayTransactions || 0)} today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* System Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Service Performance */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Service Performance
                </CardTitle>
                <CardDescription>
                  Today's performance across all services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceBreakdown.map((service) => (
                    <div
                      key={service.service}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getServiceIcon(service.service)}
                        <span className="font-medium">{service.service}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatNumber(service.transactions)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(service.volume)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="mr-2 h-4 w-4" />
                  Manage Branches
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  System Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Revenue Overview */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenue Overview
                </CardTitle>
                <CardDescription>
                  Financial performance this week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chartData.map((day) => (
                    <div
                      key={day.date}
                      className="flex items-center justify-between"
                    >
                      <span className="font-medium">{day.date}</span>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatNumber(day.transactions)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(day.volume)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
                <CardDescription>Key financial metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Revenue</span>
                  <span className="font-medium">
                    {formatCurrency(totalStats?.totalVolume || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Commission</span>
                  <span className="font-medium">
                    {formatCurrency(totalStats?.totalCommission || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Today's Revenue</span>
                  <span className="font-medium">
                    {formatCurrency(totalStats?.todayVolume || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Today's Commission</span>
                  <span className="font-medium">
                    {formatCurrency(totalStats?.todayCommission || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Recent Activity */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent System Activity
                </CardTitle>
                <CardDescription>
                  Latest transactions and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {totalStats.recentActivity?.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getServiceIcon(activity.service)}
                        <div>
                          <div className="font-medium">{activity.service}</div>
                          <div className="text-sm text-muted-foreground">
                            {activity.user} • {activity.timestamp}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(activity.amount)}
                        </div>
                        <Badge variant="outline">{activity.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  System Status
                </CardTitle>
                <CardDescription>Current system health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Database</span>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Online
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>API Services</span>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Online
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>File Storage</span>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Online
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Backup System</span>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Online
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Weekly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Weekly Transaction Trend
                </CardTitle>
                <CardDescription>
                  Transaction volume over the past week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2">
                  {chartData.map((day, index) => (
                    <div key={day.date} className="flex flex-col items-center">
                      <div
                        className="w-8 bg-primary rounded-t"
                        style={{
                          height: `${(day.transactions / 70) * 200}px`,
                          minHeight: "20px",
                        }}
                      ></div>
                      <span className="text-xs mt-2">{day.date}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Service Distribution
                </CardTitle>
                <CardDescription>Revenue breakdown by service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceBreakdown.map((service) => (
                    <div
                      key={service.service}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getServiceIcon(service.service)}
                        <span className="font-medium">{service.service}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(service.volume)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(
                            (service.volume /
                              serviceBreakdown.reduce(
                                (sum, s) => sum + s.volume,
                                0
                              )) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
