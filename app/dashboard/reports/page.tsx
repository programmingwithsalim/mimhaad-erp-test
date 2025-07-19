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
  Calculator,
  DollarSign,
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { ReportsFilterBar } from "@/components/reports/reports-filter-bar";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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
  fixedAssets?: any;
  expenses?: any;
  equity?: any;
  profitLoss?: any;
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
    setLoading(true);
    setError(null);

    try {
      // Fetch comprehensive report data
      const response = await fetch(
        `/api/reports/comprehensive?from=${format(
          dateRange.from,
          "yyyy-MM-dd"
        )}&to=${format(
          dateRange.to,
          "yyyy-MM-dd"
        )}&branch=${selectedBranch}&userRole=${user?.role}&userBranchId=${
          user?.branchId
        }`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch report data");
      }

      const result = await response.json();

      if (result.success) {
        // Fetch additional report data
        const [fixedAssetsData, expensesData, equityData, profitLossData] =
          await Promise.all([
            fetch(
              `/api/reports/fixed-assets?from=${format(
                dateRange.from,
                "yyyy-MM-dd"
              )}&to=${format(
                dateRange.to,
                "yyyy-MM-dd"
              )}&branch=${selectedBranch}`,
              { credentials: "include" }
            ),
            fetch(
              `/api/reports/expenses?from=${format(
                dateRange.from,
                "yyyy-MM-dd"
              )}&to=${format(
                dateRange.to,
                "yyyy-MM-dd"
              )}&branch=${selectedBranch}`,
              { credentials: "include" }
            ),
            fetch(
              `/api/reports/equity?from=${format(
                dateRange.from,
                "yyyy-MM-dd"
              )}&to=${format(
                dateRange.to,
                "yyyy-MM-dd"
              )}&branch=${selectedBranch}`,
              { credentials: "include" }
            ),
            fetch(
              `/api/reports/profit-loss?from=${format(
                dateRange.from,
                "yyyy-MM-dd"
              )}&to=${format(
                dateRange.to,
                "yyyy-MM-dd"
              )}&branch=${selectedBranch}`,
              { credentials: "include" }
            ),
          ]);

        const fixedAssetsResult = await fixedAssetsData.json();
        const expensesResult = await expensesData.json();
        const equityResult = await equityData.json();
        const profitLossResult = await profitLossData.json();

        setReportData({
          ...result.data,
          fixedAssets: fixedAssetsResult.success
            ? fixedAssetsResult.data
            : null,
          expenses: expensesResult.success ? expensesResult.data : null,
          equity: equityResult.success ? equityResult.data : null,
          profitLoss: profitLossResult.success ? profitLossResult.data : null,
          hasData: true,
        });
      } else {
        setError(result.error || "Failed to fetch report data");
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch report data"
      );
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (exportFormat: "pdf" | "excel" | "csv") => {
    try {
      const params = new URLSearchParams({
        from: format(dateRange.from, "yyyy-MM-dd"),
        to: format(dateRange.to, "yyyy-MM-dd"),
        format: exportFormat,
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
        a.download = `financial-report-${exportFormat}-${format(
          dateRange.from,
          "yyyy-MM-dd"
        )}-${format(dateRange.to, "yyyy-MM-dd")}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Export Successful",
          description: `Report exported as ${exportFormat.toUpperCase()}`,
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

  const exportStatementOfFinancialPositionPDF = async () => {
    // Mock data (replace with API call as needed)
    const data = {
      assets: {
        current: {
          cashAndCashEquivalents: 12595.5,
          accountsReceivable: 0,
          inventory: 0,
          prepaidExpenses: 0,
          shortTermInvestments: 0,
          totalCurrent: 12595.5,
        },
        nonCurrent: {
          propertyPlantEquipment: 0,
          accumulatedDepreciation: 0,
          netPropertyPlantEquipment: 0,
          intangibleAssets: 0,
          longTermInvestments: 0,
          goodwill: 0,
          totalNonCurrent: 0,
        },
        totalAssets: 12595.5,
      },
      liabilities: {
        current: {
          accountsPayable: 0,
          shortTermDebt: 0,
          accruedLiabilities: 0,
          currentPortionLongTermDebt: 0,
          taxesPayable: 0,
          totalCurrent: 0,
        },
        nonCurrent: {
          longTermDebt: 0,
          deferredTaxLiabilities: 0,
          pensionObligations: 0,
          totalNonCurrent: 0,
        },
        totalLiabilities: 0,
      },
      equity: {
        capitalStock: 0,
        retainedEarnings: 0,
        accumulatedOtherComprehensiveIncome: 0,
        totalEquity: 0,
      },
    };

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Title
    page.drawText("MIMHAAD VENTURES", {
      x: 50,
      y: height - 60,
      size: 24,
      font: fontBold,
    });
    page.drawText("STATEMENT OF FINANCIAL POSITION", {
      x: 50,
      y: height - 90,
      size: 16,
      font: fontBold,
    });
    page.drawText("As at the Period 31st December 2025", {
      x: 50,
      y: height - 110,
      size: 12,
      font: font,
    });

    // Section titles
    page.drawText("Assets", {
      x: 50,
      y: height - 140,
      size: 12,
      font: fontBold,
    });
    page.drawText("Liabilities & Equities", {
      x: 320,
      y: height - 140,
      size: 12,
      font: fontBold,
    });

    // Assets section
    let y = height - 160;
    page.drawText("Current Assets", { x: 50, y, size: 10, font: fontBold });
    y -= 16;
    page.drawText("Cash and Cash Equivalents", { x: 60, y, size: 10, font });
    page.drawText(data.assets.current.cashAndCashEquivalents.toLocaleString(), {
      x: 200,
      y,
      size: 10,
      font,
    });
    y -= 16;
    page.drawText("Total Current Assets", {
      x: 60,
      y,
      size: 10,
      font: fontBold,
    });
    page.drawText(data.assets.current.totalCurrent.toLocaleString(), {
      x: 200,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 24;
    page.drawText("Non-Current Assets", { x: 50, y, size: 10, font: fontBold });
    y -= 16;
    page.drawText("Total Non-Current Assets", {
      x: 60,
      y,
      size: 10,
      font: fontBold,
    });
    page.drawText(data.assets.nonCurrent.totalNonCurrent.toLocaleString(), {
      x: 200,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 24;
    page.drawText("Total Assets", { x: 50, y, size: 10, font: fontBold });
    page.drawText(data.assets.totalAssets.toLocaleString(), {
      x: 200,
      y,
      size: 10,
      font: fontBold,
    });

    // Liabilities & Equities section
    y = height - 160;
    page.drawText("Current Liabilities", {
      x: 320,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 16;
    page.drawText("Total Current Liabilities", {
      x: 330,
      y,
      size: 10,
      font: fontBold,
    });
    page.drawText(data.liabilities.current.totalCurrent.toLocaleString(), {
      x: 500,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 24;
    page.drawText("Non-Current Liabilities", {
      x: 320,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 16;
    page.drawText("Total Non-Current Liabilities", {
      x: 330,
      y,
      size: 10,
      font: fontBold,
    });
    page.drawText(
      data.liabilities.nonCurrent.totalNonCurrent.toLocaleString(),
      { x: 500, y, size: 10, font: fontBold }
    );
    y -= 24;
    page.drawText("Total Liabilities", { x: 320, y, size: 10, font: fontBold });
    page.drawText(data.liabilities.totalLiabilities.toLocaleString(), {
      x: 500,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 24;
    page.drawText("Equities", { x: 320, y, size: 10, font: fontBold });
    y -= 16;
    page.drawText("Total Equities", { x: 330, y, size: 10, font: fontBold });
    page.drawText(data.equity.totalEquity.toLocaleString(), {
      x: 500,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 24;
    page.drawText("Total Liabilities & Equities", {
      x: 320,
      y,
      size: 10,
      font: fontBold,
    });
    page.drawText(
      (
        data.liabilities.totalLiabilities + data.equity.totalEquity
      ).toLocaleString(),
      { x: 500, y, size: 10, font: fontBold }
    );

    // Download the PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Statement_of_Financial_Position.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportIncomeStatementPDF = async () => {
    // TODO: Implement PDF generation for Income Statement using pdf-lib
    // Fetch data, generate PDF, and trigger download
    alert("Income Statement PDF export coming soon!");
  };

  const exportProfitLossPDF = async () => {
    try {
      const response = await fetch(
        `/api/reports/profit-loss?from=${format(
          dateRange.from,
          "yyyy-MM-dd"
        )}&to=${format(dateRange.to, "yyyy-MM-dd")}&branch=${selectedBranch}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Generate PDF using pdf-lib
          const pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage([595, 842]); // A4 size
          const { width, height } = page.getSize();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

          // Title
          page.drawText("MIMHAAD VENTURES", {
            x: 50,
            y: height - 60,
            size: 24,
            font: fontBold,
          });
          page.drawText("PROFIT & LOSS STATEMENT", {
            x: 50,
            y: height - 90,
            size: 16,
            font: fontBold,
          });
          page.drawText(
            `For the period ${format(dateRange.from, "dd/MM/yyyy")} to ${format(
              dateRange.to,
              "dd/MM/yyyy"
            )}`,
            {
              x: 50,
              y: height - 110,
              size: 12,
              font: font,
            }
          );

          // Summary
          let y = height - 150;
          page.drawText("SUMMARY", { x: 50, y, size: 14, font: fontBold });
          y -= 20;
          page.drawText(
            `Total Revenue: GHS ${data.data.summary.totalRevenue.toLocaleString()}`,
            { x: 50, y, size: 12, font: font }
          );
          y -= 16;
          page.drawText(
            `Total Expenses: GHS ${data.data.summary.totalExpenses.toLocaleString()}`,
            { x: 50, y, size: 12, font: font }
          );
          y -= 16;
          page.drawText(
            `Gross Profit: GHS ${data.data.summary.grossProfit.toLocaleString()}`,
            { x: 50, y, size: 12, font: font }
          );
          y -= 16;
          page.drawText(
            `Profit Margin: ${data.data.summary.profitMargin.toFixed(1)}%`,
            { x: 50, y, size: 12, font: font }
          );

          // Download the PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "Profit_Loss_Statement.pdf";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error("Error exporting P&L PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export Profit & Loss statement",
        variant: "destructive",
      });
    }
  };

  const exportFixedAssetsPDF = async () => {
    try {
      const response = await fetch(
        `/api/reports/fixed-assets?from=${format(
          dateRange.from,
          "yyyy-MM-dd"
        )}&to=${format(dateRange.to, "yyyy-MM-dd")}&branch=${selectedBranch}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Generate PDF using pdf-lib
          const pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage([595, 842]); // A4 size
          const { width, height } = page.getSize();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

          // Title
          page.drawText("MIMHAAD VENTURES", {
            x: 50,
            y: height - 60,
            size: 24,
            font: fontBold,
          });
          page.drawText("FIXED ASSETS REPORT", {
            x: 50,
            y: height - 90,
            size: 16,
            font: fontBold,
          });
          page.drawText(`As at ${format(new Date(), "dd/MM/yyyy")}`, {
            x: 50,
            y: height - 110,
            size: 12,
            font: font,
          });

          // Summary
          let y = height - 150;
          page.drawText("SUMMARY", { x: 50, y, size: 14, font: fontBold });
          y -= 20;
          page.drawText(`Total Assets: ${data.data.summary.totalAssets}`, {
            x: 50,
            y,
            size: 12,
            font: font,
          });
          y -= 16;
          page.drawText(
            `Total Purchase Cost: GHS ${data.data.summary.totalPurchaseCost.toLocaleString()}`,
            { x: 50, y, size: 12, font: font }
          );
          y -= 16;
          page.drawText(
            `Net Book Value: GHS ${data.data.summary.netBookValue.toLocaleString()}`,
            { x: 50, y, size: 12, font: font }
          );
          y -= 16;
          page.drawText(
            `Total Depreciation: GHS ${data.data.summary.totalDepreciation.toLocaleString()}`,
            { x: 50, y, size: 12, font: font }
          );

          // Download the PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "Fixed_Assets_Report.pdf";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error("Error exporting Fixed Assets PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export Fixed Assets report",
        variant: "destructive",
      });
    }
  };

  const exportExpensesPDF = async () => {
    try {
      const response = await fetch(
        `/api/reports/expenses?from=${format(
          dateRange.from,
          "yyyy-MM-dd"
        )}&to=${format(dateRange.to, "yyyy-MM-dd")}&branch=${selectedBranch}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Generate PDF using pdf-lib
          const pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage([595, 842]); // A4 size
          const { width, height } = page.getSize();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

          // Title
          page.drawText("MIMHAAD VENTURES", {
            x: 50,
            y: height - 60,
            size: 24,
            font: fontBold,
          });
          page.drawText("EXPENSES REPORT", {
            x: 50,
            y: height - 90,
            size: 16,
            font: fontBold,
          });
          page.drawText(
            `For the period ${format(dateRange.from, "dd/MM/yyyy")} to ${format(
              dateRange.to,
              "dd/MM/yyyy"
            )}`,
            {
              x: 50,
              y: height - 110,
              size: 12,
              font: font,
            }
          );

          // Summary
          let y = height - 150;
          page.drawText("SUMMARY", { x: 50, y, size: 14, font: fontBold });
          y -= 20;
          page.drawText(
            `Total Expenses: GHS ${data.data.summary.totalAmount.toLocaleString()}`,
            { x: 50, y, size: 12, font: font }
          );
          y -= 16;
          page.drawText(
            `Paid Expenses: GHS ${data.data.summary.paidAmount.toLocaleString()}`,
            { x: 50, y, size: 12, font: font }
          );
          y -= 16;
          page.drawText(
            `Pending Expenses: GHS ${data.data.summary.pendingAmount.toLocaleString()}`,
            { x: 50, y, size: 12, font: font }
          );
          y -= 16;
          page.drawText(
            `Payment Rate: ${data.data.summary.paymentRate.toFixed(1)}%`,
            { x: 50, y, size: 12, font: font }
          );

          // Download the PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "Expenses_Report.pdf";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error("Error exporting Expenses PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export Expenses report",
        variant: "destructive",
      });
    }
  };

  const exportEquityPDF = async () => {
    try {
      const response = await fetch(
        `/api/reports/equity?from=${format(
          dateRange.from,
          "yyyy-MM-dd"
        )}&to=${format(dateRange.to, "yyyy-MM-dd")}&branch=${selectedBranch}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Generate PDF using pdf-lib
          const pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage([595, 842]); // A4 size
          const { width, height } = page.getSize();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

          // Title
          page.drawText("MIMHAAD VENTURES", {
            x: 50,
            y: height - 60,
            size: 24,
            font: fontBold,
          });
          page.drawText("EQUITY REPORT", {
            x: 50,
            y: height - 90,
            size: 16,
            font: fontBold,
          });
          page.drawText(`As at ${format(new Date(), "dd/MM/yyyy")}`, {
            x: 50,
            y: height - 110,
            size: 12,
            font: font,
          });

          // Summary
          let y = height - 150;
          page.drawText("SUMMARY", { x: 50, y, size: 14, font: fontBold });
          y -= 20;
          page.drawText(
            `Total Equity: GHS ${data.data.summary.totalEquity.toLocaleString()}`,
            { x: 50, y, size: 12, font: font }
          );
          y -= 16;
          page.drawText(
            `Equity Accounts: ${data.data.summary.equityAccounts}`,
            { x: 50, y, size: 12, font: font }
          );
          y -= 16;
          page.drawText(
            `Total Transactions: ${data.data.summary.totalTransactions}`,
            { x: 50, y, size: 12, font: font }
          );

          // Download the PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "Equity_Report.pdf";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error("Error exporting Equity PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export Equity report",
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
            Export Text
          </Button>
          <Button variant="outline" onClick={() => exportReport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => exportReport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
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
          <TabsList className="grid w-full grid-cols-8">
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
                value="profit-loss"
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                Profit & Loss
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger
                value="fixed-assets"
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Fixed Assets
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger value="expenses" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Expenses
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger value="equity" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Equity
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
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline"
                      onClick={exportIncomeStatementPDF}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Income Statement (PDF)
                    </Button>
                  </div>
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
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline"
                      onClick={exportStatementOfFinancialPositionPDF}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Statement of Financial Position (PDF)
                    </Button>
                  </div>
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

          {canViewReports && (
            <TabsContent value="profit-loss">
              <Card>
                <CardHeader>
                  <CardTitle>Profit & Loss Statement</CardTitle>
                  <CardDescription>
                    Detailed revenue, expenses, and profit analysis for the
                    selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline"
                      onClick={() => exportProfitLossPDF()}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export P&L (PDF)
                    </Button>
                  </div>
                  {reportData ? (
                    reportData.hasData ? (
                      <div className="space-y-6">
                        {/* Summary Metrics */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Total Revenue
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              GHS{" "}
                              {reportData.summary.totalRevenue.toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Total Expenses
                            </p>
                            <p className="text-2xl font-bold text-red-600">
                              GHS{" "}
                              {reportData.summary.totalExpenses.toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Gross Profit
                            </p>
                            <p
                              className={`text-2xl font-bold ${
                                reportData.summary.netIncome >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              GHS{" "}
                              {reportData.summary.netIncome.toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Profit Margin
                            </p>
                            <p
                              className={`text-2xl font-bold ${
                                reportData.summary.netIncome >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {(
                                (reportData.summary.netIncome /
                                  reportData.summary.totalRevenue) *
                                100
                              ).toFixed(1)}
                              %
                            </p>
                          </div>
                        </div>

                        {/* Revenue Breakdown */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Revenue Breakdown
                          </h3>
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
                                  <span className="text-green-600">
                                    GHS {service.volume.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Expense Breakdown */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Expense Breakdown
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-2 border-b">
                              <span>Operating Expenses</span>
                              <span className="text-red-600">
                                GHS{" "}
                                {reportData.summary.totalExpenses.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                              <span>Depreciation</span>
                              <span className="text-red-600">GHS 0</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-t-2 font-bold">
                              <span>Total Expenses</span>
                              <span className="text-red-600">
                                GHS{" "}
                                {reportData.summary.totalExpenses.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No data available</p>
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
                        Fetching profit & loss data...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="fixed-assets">
              <Card>
                <CardHeader>
                  <CardTitle>Fixed Assets Report</CardTitle>
                  <CardDescription>
                    Fixed assets, depreciation, and asset management overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline"
                      onClick={() => exportFixedAssetsPDF()}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Fixed Assets (PDF)
                    </Button>
                  </div>
                  {reportData ? (
                    reportData.hasData ? (
                      <div className="space-y-6">
                        {/* Asset Summary */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Total Assets
                            </p>
                            <p className="text-2xl font-bold">
                              {reportData.fixedAssets?.summary?.totalAssets ||
                                0}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Total Value
                            </p>
                            <p className="text-2xl font-bold">
                              GHS{" "}
                              {(
                                reportData.fixedAssets?.summary
                                  ?.totalPurchaseCost || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Net Book Value
                            </p>
                            <p className="text-2xl font-bold">
                              GHS{" "}
                              {(
                                reportData.fixedAssets?.summary?.netBookValue ||
                                0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Total Depreciation
                            </p>
                            <p className="text-2xl font-bold text-red-600">
                              GHS{" "}
                              {(
                                reportData.fixedAssets?.summary
                                  ?.totalDepreciation || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Asset Categories */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Assets by Category
                          </h3>
                          <div className="space-y-2">
                            {reportData.fixedAssets?.categoryBreakdown?.map(
                              (category, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center py-2 border-b"
                                >
                                  <span className="font-medium">
                                    {category.category}
                                  </span>
                                  <div className="text-right">
                                    <div className="font-medium">
                                      GHS{" "}
                                      {Number(
                                        category.total_cost
                                      ).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {category.count} assets
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No fixed assets data available
                      </p>
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
                        Fetching fixed assets data...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="expenses">
              <Card>
                <CardHeader>
                  <CardTitle>Expenses Report</CardTitle>
                  <CardDescription>
                    Detailed expense analysis and breakdown by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline"
                      onClick={() => exportExpensesPDF()}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Expenses (PDF)
                    </Button>
                  </div>
                  {reportData ? (
                    reportData.hasData ? (
                      <div className="space-y-6">
                        {/* Expense Summary */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Total Expenses
                            </p>
                            <p className="text-2xl font-bold text-red-600">
                              GHS{" "}
                              {reportData.summary.totalExpenses.toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Paid Expenses
                            </p>
                            <p className="text-2xl font-bold">
                              GHS{" "}
                              {(
                                reportData.expenses?.summary?.paidAmount || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Pending Expenses
                            </p>
                            <p className="text-2xl font-bold text-orange-600">
                              GHS{" "}
                              {(
                                reportData.expenses?.summary?.pendingAmount || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Payment Rate
                            </p>
                            <p className="text-2xl font-bold">
                              {(
                                reportData.expenses?.summary?.paymentRate || 0
                              ).toFixed(1)}
                              %
                            </p>
                          </div>
                        </div>

                        {/* Expense Categories */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Expenses by Category
                          </h3>
                          <div className="space-y-2">
                            {reportData.expenses?.categoryBreakdown?.map(
                              (category, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center py-2 border-b"
                                >
                                  <span className="font-medium">
                                    {category.category}
                                  </span>
                                  <div className="text-right">
                                    <div className="font-medium text-red-600">
                                      GHS{" "}
                                      {Number(
                                        category.total_amount
                                      ).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {category.count} expenses
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No expenses data available
                      </p>
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
                        Fetching expenses data...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="equity">
              <Card>
                <CardHeader>
                  <CardTitle>Equity Report</CardTitle>
                  <CardDescription>
                    Owner's equity, retained earnings, and equity changes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end mb-4">
                    <Button variant="outline" onClick={() => exportEquityPDF()}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Equity (PDF)
                    </Button>
                  </div>
                  {reportData ? (
                    reportData.hasData ? (
                      <div className="space-y-6">
                        {/* Equity Summary */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Total Equity
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              GHS{" "}
                              {(
                                reportData.equity?.summary?.totalEquity || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Share Capital
                            </p>
                            <p className="text-2xl font-bold">
                              GHS{" "}
                              {(
                                reportData.equity?.equityComponents?.find(
                                  (c) => c.equity_type === "Share Capital"
                                )?.net_balance || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Retained Earnings
                            </p>
                            <p className="text-2xl font-bold">
                              GHS{" "}
                              {(
                                reportData.equity?.equityComponents?.find(
                                  (c) => c.equity_type === "Retained Earnings"
                                )?.net_balance || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Current Year Earnings
                            </p>
                            <p className="text-2xl font-bold">
                              GHS{" "}
                              {(
                                reportData.equity?.equityComponents?.find(
                                  (c) =>
                                    c.equity_type === "Current Year Earnings"
                                )?.net_balance || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Equity Components */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Equity Components
                          </h3>
                          <div className="space-y-2">
                            {reportData.equity?.equityComponents?.map(
                              (component, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center py-2 border-b"
                                >
                                  <span className="font-medium">
                                    {component.name}
                                  </span>
                                  <div className="text-right">
                                    <div className="font-medium text-green-600">
                                      GHS{" "}
                                      {Number(
                                        component.net_balance
                                      ).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {component.equity_type}
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No equity data available
                      </p>
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
                        Fetching equity data...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
