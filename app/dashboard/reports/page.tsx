"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  TrendingUp,
  BarChart3,
  PieChart,
  Eye,
  Building2,
  AlertTriangle,
  RefreshCw,
  Download,
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { ReportsFilterBar } from "@/components/reports/reports-filter-bar";

interface Branch {
  id: string;
  name: string;
  location?: string;
}

interface ReportData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    cashPosition: number;
    profitMargin: number;
    revenueChange: number;
    expenseChange: number;
  };
  services: Array<{
    service: string;
    transactions: number;
    volume: number;
    fees: number;
  }>;
  timeSeries: Array<{
    date: string;
    revenue: number;
    expenses: number;
  }>;
  lastUpdated: string;
  note?: string;
  hasData: boolean;
}

export default function ReportsPage() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine user permissions
  const isAdmin = user?.role === "Admin";
  const isFinance = user?.role === "Finance";
  const isManager = user?.role === "Manager";
  const isOperations = user?.role === "Operations";
  const isCashier = user?.role === "Cashier";
  const canViewAllBranches = isAdmin;
  const userBranchId = user?.branchId;
  const userBranchName = user?.branchName;

  // Role-based access control
  const canViewReports = isAdmin || isFinance || isManager;

  const fetchBranches = async () => {
    if (canViewAllBranches) {
      // Admin users: fetch all branches
      try {
        const response = await fetch("/api/branches", {
          credentials: "include",
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            setBranches(result.data);
          } else if (Array.isArray(result)) {
            setBranches(result);
          }
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    } else if (userBranchId && userBranchName) {
      // Non-admin users: set only their assigned branch
      setBranches([{ id: userBranchId, name: userBranchName }]);
      setSelectedBranch(userBranchId);
    }
  };

  const fetchReportData = async () => {
    if (!canViewReports) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        from: format(dateRange.from, "yyyy-MM-dd"),
        to: format(dateRange.to, "yyyy-MM-dd"),
        userRole: user?.role || "",
        userBranchId: userBranchId || "",
        branch: canViewAllBranches ? selectedBranch : userBranchId || "all",
      });

      console.log("Fetching report data with params:", params.toString());

      const response = await fetch(`/api/reports/comprehensive?${params}`, {
        credentials: "include",
      });

      console.log("Reports API response status:", response.status);

      const result = await response.json();
      console.log("Reports API result:", result);

      if (result.success) {
        setReportData(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch report data");
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      toast({
        title: "Error",
        description: "Failed to load report data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: "pdf" | "excel" | "csv") => {
    try {
      const params = new URLSearchParams({
        from: format(dateRange.from, "yyyy-MM-dd"),
        to: format(dateRange.to, "yyyy-MM-dd"),
        format,
        userRole: user?.role || "",
        userBranchId: userBranchId || "",
        branch: canViewAllBranches ? selectedBranch : userBranchId || "all",
      });

      const response = await fetch(`/api/reports/export?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `financial-report-${format}-${format(
          dateRange.from,
          "yyyy-MM-dd"
        )}-${format(dateRange.to, "yyyy-MM-dd")}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Export Successful",
          description: `Report exported as ${format.toUpperCase()}`,
        });
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchBranches();
    // Set initial branch selection based on user role
    if (!canViewAllBranches && userBranchId) {
      setSelectedBranch(userBranchId);
    }
  }, []);

  useEffect(() => {
    if (canViewReports) {
      fetchReportData();
    }
  }, [dateRange, selectedBranch, canViewReports]);

  // If user doesn't have permission to view reports
  if (!canViewReports) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            You don't have permission to view financial reports. Please contact
            your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Financial Reports
          </h1>
          <p className="text-muted-foreground">
            Generate and view comprehensive financial reports
          </p>
          {/* Branch Indicator */}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="flex items-center gap-1">
              {canViewAllBranches ? (
                selectedBranch === "all" ? (
                  <>
                    <Eye className="h-3 w-3" />
                    All Branches
                  </>
                ) : (
                  <>
                    <Building2 className="h-3 w-3" />
                    {branches.find((b) => b.id === selectedBranch)?.name ||
                      "Selected Branch"}
                  </>
                )
              ) : (
                <>
                  <Building2 className="h-3 w-3" />
                  {userBranchName || "Your Branch"}
                </>
              )}
            </Badge>
            {user?.role && (
              <Badge variant="secondary" className="text-xs">
                {user.role}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchReportData}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => exportReport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <ReportsFilterBar
        dateRange={dateRange}
        setDateRange={setDateRange}
        branches={branches}
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        canViewAllBranches={canViewAllBranches}
        onApply={fetchReportData}
        onReset={() => {
          setDateRange({ from: subDays(new Date(), 30), to: new Date() });
          // Reset branch selection based on user role
          if (canViewAllBranches) {
            setSelectedBranch("all");
          } else {
            setSelectedBranch(userBranchId || "all");
          }
          fetchReportData();
        }}
        loading={loading}
      />

      {/* Debug info */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-4 p-4 bg-gray-100 rounded text-xs">
          <p>
            <strong>Debug Info:</strong>
          </p>
          <p>canViewAllBranches: {canViewAllBranches.toString()}</p>
          <p>branches count: {branches.length}</p>
          <p>selectedBranch: {selectedBranch}</p>
          <p>userBranchId: {userBranchId}</p>
          <p>userBranchName: {userBranchName}</p>
          <p>branches: {JSON.stringify(branches, null, 2)}</p>
        </div>
      )}

      {/* Branch Info for Non-Admin Users */}
      {!canViewAllBranches && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {userBranchName || "Your Branch"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Showing data for your assigned branch only
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data Alert */}
      {reportData && !reportData.hasData && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            No transaction data found for the selected date range. Try adjusting
            the date range or create some transactions first.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            {error} - Please try again or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      )}

      {/* Sample Data Notice */}
      {reportData?.note && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            {reportData.note}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading report data...</p>
          </div>
        </div>
      )}

      {/* Financial Reports Tabs */}
      {!loading && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Summary
            </TabsTrigger>
            {canViewReports && (
              <TabsTrigger
                value="income-statement"
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Income Statement
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger
                value="balance-sheet"
                className="flex items-center gap-2"
              >
                <PieChart className="h-4 w-4" />
                Balance Sheet
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger
                value="cash-flow"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Cash Flow
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger
                value="operational"
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Operational
              </TabsTrigger>
            )}
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>
                  Overview of financial performance for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportData ? (
                  reportData.hasData ? (
                    <div className="space-y-6">
                      {/* Key Metrics */}
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Total Revenue
                          </p>
                          <p className="text-2xl font-bold">
                            GHS{" "}
                            {reportData.summary.totalRevenue.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Total Expenses
                          </p>
                          <p className="text-2xl font-bold">
                            GHS{" "}
                            {reportData.summary.totalExpenses.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Net Income
                          </p>
                          <p className="text-2xl font-bold">
                            GHS {reportData.summary.netIncome.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Profit Margin
                          </p>
                          <p className="text-2xl font-bold">
                            {reportData.summary.profitMargin.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Service Breakdown */}
                      {reportData.services &&
                        reportData.services.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">
                              Service Performance
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {reportData.services.map((service, index) => (
                                <Card key={index}>
                                  <CardContent className="pt-6">
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium">
                                        {service.service}
                                      </p>
                                      <p className="text-2xl font-bold">
                                        GHS {service.volume.toLocaleString()}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {service.transactions} transactions
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Fees: GHS{" "}
                                        {service.fees.toLocaleString()}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Cash Position */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Cash Position</h3>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  Cash Balance
                                </p>
                                <p className="text-2xl font-bold">
                                  GHS{" "}
                                  {reportData.summary.cashPosition.toLocaleString()}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  Revenue Change
                                </p>
                                <p className="text-2xl font-bold">
                                  {reportData.summary.revenueChange > 0
                                    ? "+"
                                    : ""}
                                  {reportData.summary.revenueChange}%
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  Expense Change
                                </p>
                                <p className="text-2xl font-bold">
                                  {reportData.summary.expenseChange > 0
                                    ? "+"
                                    : ""}
                                  {reportData.summary.expenseChange}%
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                        <BarChart3 className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        No Data Available
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        No transaction data found for the selected date range.
                        Try adjusting the date range or create some transactions
                        first.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center mb-6">
                        <Button
                          variant="outline"
                          onClick={() => setQuickDateRange(30)}
                        >
                          Try Last 30 Days
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setMonthRange(1)}
                        >
                          Try Last Month
                        </Button>
                      </div>

                      {/* Helpful Guide */}
                      <div className="max-w-md mx-auto">
                        <h4 className="font-medium mb-3">
                          To see real data, create transactions in:
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>MOMO</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Agency Banking</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>E-ZWICH</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>Power</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                            <span>Jumia</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span>Expenses</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                      <RefreshCw className="h-12 w-12 text-muted-foreground animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Loading Data</h3>
                    <p className="text-muted-foreground">
                      Fetching report data...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canViewReports && (
            <TabsContent value="income-statement">
              <Card>
                <CardHeader>
                  <CardTitle>Income Statement</CardTitle>
                  <CardDescription>
                    Revenue, expenses, and net income for the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData ? (
                    reportData.hasData ? (
                      <div className="space-y-6">
                        {/* Revenue Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Revenue</h3>
                          <div className="space-y-2">
                            {reportData.services &&
                              reportData.services.map((service, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center py-2 border-b"
                                >
                                  <span className="font-medium">
                                    {service.service}
                                  </span>
                                  <span>
                                    GHS {service.volume.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            <div className="flex justify-between items-center py-2 border-t-2 font-bold">
                              <span>Total Revenue</span>
                              <span>
                                GHS{" "}
                                {reportData.summary.totalRevenue.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expenses Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Expenses</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-2 border-b">
                              <span>Operating Expenses</span>
                              <span>
                                GHS{" "}
                                {reportData.summary.totalExpenses.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-t-2 font-bold">
                              <span>Total Expenses</span>
                              <span>
                                GHS{" "}
                                {reportData.summary.totalExpenses.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Net Income */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-4 border-t-2 border-b-2 font-bold text-lg">
                            <span>Net Income</span>
                            <span>
                              GHS{" "}
                              {reportData.summary.netIncome.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                          <TrendingUp className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          No Income Data
                        </h3>
                        <p className="text-muted-foreground">
                          No revenue or expense data available for the selected
                          period.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12">
                      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                        <RefreshCw className="h-12 w-12 text-muted-foreground animate-spin" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        Loading Data
                      </h3>
                      <p className="text-muted-foreground">
                        Fetching income statement data...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="balance-sheet">
              <Card>
                <CardHeader>
                  <CardTitle>Balance Sheet</CardTitle>
                  <CardDescription>
                    Assets, liabilities, and equity as of the selected date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData ? (
                    <div className="space-y-6">
                      {/* Assets */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Assets</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span>Cash and Cash Equivalents</span>
                            <span>
                              GHS{" "}
                              {reportData.summary.cashPosition.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span>Accounts Receivable</span>
                            <span>GHS 0</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span>Inventory</span>
                            <span>GHS 0</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-t-2 font-bold">
                            <span>Total Assets</span>
                            <span>
                              GHS{" "}
                              {reportData.summary.cashPosition.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Liabilities */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Liabilities</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span>Accounts Payable</span>
                            <span>GHS 0</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span>Accrued Expenses</span>
                            <span>GHS 0</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-t-2 font-bold">
                            <span>Total Liabilities</span>
                            <span>GHS 0</span>
                          </div>
                        </div>
                      </div>

                      {/* Equity */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Equity</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span>Retained Earnings</span>
                            <span>
                              GHS{" "}
                              {reportData.summary.netIncome.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-t-2 font-bold">
                            <span>Total Equity</span>
                            <span>
                              GHS{" "}
                              {reportData.summary.netIncome.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="cash-flow">
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Statement</CardTitle>
                  <CardDescription>
                    Cash inflows and outflows for the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData ? (
                    <div className="space-y-6">
                      {/* Operating Activities */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Operating Activities
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span>Net Income</span>
                            <span>
                              GHS{" "}
                              {reportData.summary.netIncome.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span>Depreciation</span>
                            <span>GHS 0</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-t-2 font-bold">
                            <span>Net Cash from Operations</span>
                            <span>
                              GHS{" "}
                              {reportData.summary.netIncome.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Investing Activities */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Investing Activities
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span>Capital Expenditures</span>
                            <span>GHS 0</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-t-2 font-bold">
                            <span>Net Cash from Investing</span>
                            <span>GHS 0</span>
                          </div>
                        </div>
                      </div>

                      {/* Financing Activities */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Financing Activities
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span>Dividends Paid</span>
                            <span>GHS 0</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-t-2 font-bold">
                            <span>Net Cash from Financing</span>
                            <span>GHS 0</span>
                          </div>
                        </div>
                      </div>

                      {/* Net Change */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-4 border-t-2 border-b-2 font-bold text-lg">
                          <span>Net Change in Cash</span>
                          <span>
                            GHS {reportData.summary.netIncome.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="operational">
              <Card>
                <CardHeader>
                  <CardTitle>Operational Reports</CardTitle>
                  <CardDescription>
                    Service performance and operational metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData && reportData.services ? (
                    <div className="space-y-6">
                      {/* Service Performance Table */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Service Performance
                        </h3>
                        <div className="border rounded-lg">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="text-left p-4 font-medium">
                                  Service
                                </th>
                                <th className="text-right p-4 font-medium">
                                  Transactions
                                </th>
                                <th className="text-right p-4 font-medium">
                                  Volume
                                </th>
                                <th className="text-right p-4 font-medium">
                                  Fees
                                </th>
                                <th className="text-right p-4 font-medium">
                                  Avg. Transaction
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.services.map((service, index) => (
                                <tr key={index} className="border-b">
                                  <td className="p-4 font-medium">
                                    {service.service}
                                  </td>
                                  <td className="p-4 text-right">
                                    {service.transactions.toLocaleString()}
                                  </td>
                                  <td className="p-4 text-right">
                                    GHS {service.volume.toLocaleString()}
                                  </td>
                                  <td className="p-4 text-right">
                                    GHS {service.fees.toLocaleString()}
                                  </td>
                                  <td className="p-4 text-right">
                                    GHS{" "}
                                    {service.transactions > 0
                                      ? (
                                          service.volume / service.transactions
                                        ).toLocaleString()
                                      : "0"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Total Transactions
                              </p>
                              <p className="text-2xl font-bold">
                                {reportData.services
                                  .reduce((sum, s) => sum + s.transactions, 0)
                                  .toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Average Transaction Value
                              </p>
                              <p className="text-2xl font-bold">
                                GHS{" "}
                                {reportData.services.reduce(
                                  (sum, s) => sum + s.transactions,
                                  0
                                ) > 0
                                  ? (
                                      reportData.services.reduce(
                                        (sum, s) => sum + s.volume,
                                        0
                                      ) /
                                      reportData.services.reduce(
                                        (sum, s) => sum + s.transactions,
                                        0
                                      )
                                    ).toLocaleString()
                                  : "0"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Total Fees Collected
                              </p>
                              <p className="text-2xl font-bold">
                                GHS{" "}
                                {reportData.services
                                  .reduce((sum, s) => sum + s.fees, 0)
                                  .toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No operational data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Export Reports</CardTitle>
                <CardDescription>
                  Download reports in various formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Button onClick={() => exportReport("pdf")} className="h-20">
                    <Download className="h-6 w-6 mr-2" />
                    Export as PDF
                  </Button>
                  <Button
                    onClick={() => exportReport("excel")}
                    className="h-20"
                  >
                    <Download className="h-6 w-6 mr-2" />
                    Export as Excel
                  </Button>
                  <Button onClick={() => exportReport("csv")} className="h-20">
                    <Download className="h-6 w-6 mr-2" />
                    Export as CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
