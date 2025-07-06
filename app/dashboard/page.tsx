"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
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
  BarChart3,
  LineChart,
  PieChart,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import { EnhancedAdminDashboard } from "@/components/dashboard/enhanced-admin-dashboard";
import { EnhancedFinanceDashboard } from "@/components/dashboard/enhanced-finance-dashboard";
import { EnhancedManagerDashboard } from "@/components/dashboard/enhanced-manager-dashboard";

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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

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
  financialMetrics: {},
  revenueAnalysis: [],
  teamPerformance: [],
  dailyOperations: [],
  serviceMetrics: [],
  systemAlerts: 0,
  pendingApprovals: 0,
  users: {},
  branches: [],
  branchMetrics: [],
  expenses: {},
  commissions: {},
  float: {},
};

export default function DashboardPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount || 0);
  };

  const loadDashboardData = async () => {
    if (!user?.branchId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        branchId: user.branchId,
        userRole: user.role || "",
        userBranchId: user.branchId,
      });

      const response = await fetch(`/api/dashboard/statistics?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Transform the API response to match our expected format
          const transformedData = transformApiData(data.data);
          setStats(transformedData);
        } else {
          console.error("Dashboard API error:", data.error);
          setError(data.error || "Failed to load dashboard data");
          setStats(defaultStats);
        }
      } else {
        console.error("Dashboard API response not ok:", response.status);
        setError(`Server error: ${response.status}`);
        setStats(defaultStats);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  };

  // Transform API data to match our expected format
  const transformApiData = (apiData: any): DashboardStats => {
    const services = apiData.services || {};
    const overview = apiData.overview || {};

    // Calculate totals from services
    const totalTransactions = Object.values(services).reduce(
      (sum: number, service: any) => sum + (service.count || 0),
      0
    );
    const totalVolume = Object.values(services).reduce(
      (sum: number, service: any) => sum + (service.volume || 0),
      0
    );
    const totalCommission = Object.values(services).reduce(
      (sum: number, service: any) => sum + (service.fees || 0),
      0
    );

    // Transform service breakdown
    const serviceBreakdown = Object.entries(services).map(
      ([key, service]: [string, any]) => ({
        service: key.replace(/([A-Z])/g, " $1").trim(), // Convert camelCase to readable
        transactions: service.count || 0,
        volume: service.volume || 0,
        commission: service.fees || 0,
      })
    );

    return {
      totalTransactions,
      totalVolume,
      totalCommission,
      activeUsers: apiData.users?.activeUsers || 0,
      todayTransactions: totalTransactions, // For now, use total as today's
      todayVolume: totalVolume,
      todayCommission: totalCommission,
      serviceBreakdown,
      recentActivity: apiData.recentActivity || [],
      floatAlerts: apiData.float?.alerts || [],
      chartData: apiData.chartData || [],
      financialMetrics: apiData.financialMetrics || {},
      revenueAnalysis: apiData.revenueAnalysis || [],
      teamPerformance: apiData.teamPerformance || [],
      dailyOperations: apiData.dailyOperations || [],
      serviceMetrics: apiData.serviceMetrics || [],
      systemAlerts: apiData.systemAlerts || 0,
      pendingApprovals: apiData.pendingApprovals || 0,
      users: apiData.users || {},
      branches: apiData.branches || [],
      branchMetrics: apiData.branchMetrics || [],
      expenses: apiData.expenses || {},
      commissions: apiData.commissions || {},
      float: apiData.float || {},
    };
  };

  useEffect(() => {
    if (user?.branchId) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [user?.branchId]);

  const getServiceIcon = (service: string) => {
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
        return <Package className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Helper to map serviceBreakdown to ServiceStats[]
  const mappedServiceStats = Array.isArray(stats.serviceBreakdown)
    ? stats.serviceBreakdown.map((s) => ({
        service: s.service,
        todayTransactions: s.transactions,
        todayVolume: s.volume,
        todayFees: s.commission,
        totalBalance: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0,
      }))
    : [];

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your branch operations
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Role-based dashboard rendering with proper role detection
  const userRole = user?.role;

  if (userRole === "Admin") {
    return (
      <EnhancedAdminDashboard
        serviceStats={mappedServiceStats}
        branchStats={stats.branches || []}
        totalStats={stats}
        systemAlerts={stats.systemAlerts || 0}
        pendingApprovals={stats.pendingApprovals || 0}
        userStats={stats.users || {}}
      />
    );
  }

  if (userRole === "Finance") {
    return (
      <EnhancedFinanceDashboard
        serviceStats={mappedServiceStats}
        totalStats={stats}
        financialOverview={stats.financialMetrics || {}}
      />
    );
  }

  if (userRole === "Manager") {
    return (
      <EnhancedManagerDashboard
        serviceStats={mappedServiceStats}
        totalStats={stats}
        recentTransactions={
          Array.isArray(stats.recentActivity) ? stats.recentActivity : []
        }
      />
    );
  }

  if (userRole === "Operations" || userRole === "Cashier") {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Operations Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName} {user?.lastName}! Daily operations
              overview for {user?.branchName || "your branch"}
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
            <h3 className="text-lg font-semibold">Float Alerts</h3>
            {stats.floatAlerts.map((alert) => (
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

        {/* Daily Operations Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Transactions
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.todayTransactions}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {stats.totalTransactions}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Volume
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.todayVolume)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {formatCurrency(stats.totalVolume)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Commission
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.todayCommission)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {formatCurrency(stats.totalCommission)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">Currently online</p>
            </CardContent>
          </Card>
        </div>

        {/* Service Performance */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Service Performance Today
              </CardTitle>
              <CardDescription>
                How each service is performing today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.serviceBreakdown?.map((service) => (
                  <div
                    key={service.service}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {getServiceIcon(service.service)}
                      <span className="font-medium">{service.service}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{service.transactions}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(service.volume)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Latest transactions processed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity?.slice(0, 5).map((activity) => (
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
        </div>

        {/* Simple Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                This Week's Performance
              </CardTitle>
              <CardDescription>Daily transaction count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-2">
                {stats.chartData?.slice(-7).map((day, index) => (
                  <div key={day.date} className="flex flex-col items-center">
                    <div
                      className="w-8 bg-primary rounded-t"
                      style={{
                        height: `${
                          (day.transactions /
                            Math.max(
                              ...stats.chartData.map((d) => d.transactions)
                            )) *
                          160
                        }px`,
                        minHeight: "20px",
                      }}
                    ></div>
                    <span className="text-xs mt-2">{day.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Service Distribution
              </CardTitle>
              <CardDescription>Revenue by service type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.serviceBreakdown?.map((service) => (
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
                        {service.transactions} transactions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks for your role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="h-20 flex-col">
                <Smartphone className="h-6 w-6 mb-2" />
                <span>Process MoMo</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <CreditCard className="h-6 w-6 mb-2" />
                <span>E-Zwich Transaction</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Zap className="h-6 w-6 mb-2" />
                <span>Power Sale</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default dashboard for unknown roles
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName} {user?.lastName}! Overview of{" "}
            {user?.branchName || "your branch"} operations
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

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Transactions
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Total: {stats.totalTransactions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Volume
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.todayVolume)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(stats.totalVolume)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Commission
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.todayCommission)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(stats.totalCommission)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Breakdown */}
      {stats.serviceBreakdown && stats.serviceBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
            <CardDescription>
              Today's performance by service type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.serviceBreakdown.map((service, index) => (
                <div
                  key={service.service}
                  className="flex items-center space-x-4 rounded-lg border p-4"
                >
                  <div className="flex-shrink-0">
                    {getServiceIcon(service.service)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {service.service.charAt(0).toUpperCase() +
                        service.service.slice(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {service.transactions} transactions
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(service.volume)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {stats.recentActivity && stats.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest transactions and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center space-x-4 rounded-lg border p-4"
                >
                  <div className="flex-shrink-0">
                    {getServiceIcon(activity.service)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.type} - {activity.service}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(activity.amount)} by {activity.user}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.timestamp), "MMM dd, HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!stats.serviceBreakdown.length &&
        !stats.recentActivity.length &&
        !error && (
          <Card>
            <CardContent className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Data Available</h3>
              <p className="text-muted-foreground mb-4">
                No transactions or activities found for the current period.
              </p>
              <Button onClick={loadDashboardData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
