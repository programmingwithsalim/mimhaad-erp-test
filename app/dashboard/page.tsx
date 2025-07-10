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
import { useRBAC } from "@/components/rbac/rbac-provider";
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
  CheckCircle,
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
  const {
    userRole,
    isAdmin,
    isManager,
    isFinance,
    isOperations,
    isSupervisor,
    isCashier,
  } = useRBAC();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount || 0);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-GH").format(num || 0);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Loading dashboard data for user:", {
        role: user?.role,
        branchId: user?.branchId,
        branchName: user?.branchName,
      });

      const response = await fetch(
        `/api/dashboard/statistics?userRole=${encodeURIComponent(
          userRole || ""
        )}&userBranchId=${encodeURIComponent(user?.branchId || "")}`,
        {
          credentials: "include",
        }
      );

      console.log("Dashboard API response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiData = await response.json();
      console.log("Dashboard API result:", apiData);

      const transformedData = transformApiData(apiData);
      setStats(transformedData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load dashboard data"
      );
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const transformApiData = (apiData: any): DashboardStats => {
    // Map serviceStats to serviceBreakdown format with today's data
    const serviceBreakdown = Array.isArray(apiData.serviceStats)
      ? apiData.serviceStats.map((s: any) => ({
          service: s.service,
          transactions: s.todayTransactions || 0,
          volume: s.todayVolume || 0,
          commission: s.todayFees || 0,
        }))
      : [];

    return {
      totalTransactions: apiData.totalTransactions || 0,
      totalVolume: apiData.totalVolume || 0,
      totalCommission: apiData.totalCommissions || 0,
      activeUsers: apiData.activeUsers || 0,
      todayTransactions: apiData.todayTransactions || 0,
      todayVolume: apiData.todayVolume || 0,
      todayCommission: apiData.todayCommission || 0,
      serviceBreakdown,
      recentActivity: apiData.recentActivity || [],
      floatAlerts: apiData.floatAlerts || [],
      chartData: apiData.dailyBreakdown || [],
      financialMetrics: apiData.financialMetrics || {},
      revenueAnalysis: [],
      teamPerformance: [],
      dailyOperations: [],
      serviceMetrics: [],
      systemAlerts: apiData.systemAlerts || 0,
      pendingApprovals: apiData.pendingApprovals || 0,
      users: apiData.users || { totalUsers: 0, activeUsers: 0 },
      branches: apiData.branchStats || [],
      branchMetrics: [],
      expenses: {},
      commissions: {},
      float: {},
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

  // Role-based dashboard rendering with proper case-sensitive role detection
  if (isAdmin) {
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

  if (isFinance) {
    return (
      <EnhancedFinanceDashboard
        serviceStats={mappedServiceStats}
        totalStats={stats}
        financialOverview={stats.financialMetrics || {}}
      />
    );
  }

  if (isManager) {
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

  // Operations Dashboard
  if (isOperations) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Operations Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName} {user?.lastName}! Here's your
              operations overview.
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

        {/* Key Metrics */}
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
                {formatNumber(stats.todayTransactions)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {formatNumber(stats.totalTransactions)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Volume
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common operational tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Smartphone className="mr-2 h-4 w-4" />
                Process MoMo
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="mr-2 h-4 w-4" />
                Agency Banking
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="mr-2 h-4 w-4" />
                E-Zwich Services
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Zap className="mr-2 h-4 w-4" />
                Power Services
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Supervisor Dashboard
  if (isSupervisor) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Supervisor Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName} {user?.lastName}! Here's your
              supervision overview.
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

        {/* Key Metrics */}
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
                {formatNumber(stats.todayTransactions)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {formatNumber(stats.totalTransactions)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Volume
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
                Pending Approvals
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.pendingApprovals || 0}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common supervision tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                Review Transactions
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Requests
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Smartphone className="mr-2 h-4 w-4" />
                Process MoMo
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="mr-2 h-4 w-4" />
                Agency Banking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Cashier Dashboard
  if (isCashier) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cashier Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName} {user?.lastName}! Here's your
              transaction overview.
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

        {/* Key Metrics */}
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
                {formatNumber(stats.todayTransactions)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {formatNumber(stats.totalTransactions)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Volume
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common transaction tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Smartphone className="mr-2 h-4 w-4" />
                Process MoMo
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="mr-2 h-4 w-4" />
                Agency Banking
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="mr-2 h-4 w-4" />
                E-Zwich Services
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Zap className="mr-2 h-4 w-4" />
                Power Services
              </Button>
            </CardContent>
          </Card>
        </div>
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

      {/* Key Metrics */}
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
              {formatNumber(stats.todayTransactions)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {formatNumber(stats.totalTransactions)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Volume
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
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

      {/* Service Performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col">
              <Smartphone className="h-6 w-6 mb-2" />
              <span>MoMo Services</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Building2 className="h-6 w-6 mb-2" />
              <span>Agency Banking</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <CreditCard className="h-6 w-6 mb-2" />
              <span>E-Zwich</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Zap className="h-6 w-6 mb-2" />
              <span>Power Services</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
