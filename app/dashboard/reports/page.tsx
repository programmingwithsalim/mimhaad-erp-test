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
  ChevronDown,
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

  // Helper functions for date ranges
  const setQuickDateRange = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  const setMonthRange = (months: number) => {
    const now = new Date();
    setDateRange({
      from: subMonths(now, months),
      to: now,
    });
  };

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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Financial Reports
          </h1>
          <p className="text-muted-foreground text-lg">
            Generate and view comprehensive financial reports
          </p>

          {/* Branch and Role Info */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="flex items-center gap-2 px-3 py-1"
            >
              {canViewAllBranches ? (
                selectedBranch === "all" ? (
                  <>
                    <Eye className="h-4 w-4" />
                    All Branches
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4" />
                    {branches.find((b) => b.id === selectedBranch)?.name ||
                      "Selected Branch"}
                  </>
                )
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  {userBranchName || "Your Branch"}
                </>
              )}
            </Badge>
            {user?.role && (
              <Badge variant="secondary" className="px-3 py-1">
                {user.role}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchReportData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button variant="outline" onClick={() => exportReport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => exportReport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
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
          if (canViewAllBranches) {
            setSelectedBranch("all");
          } else {
            setSelectedBranch(userBranchId || "all");
          }
          fetchReportData();
        }}
        loading={loading}
      />

      {/* Alerts */}
      {reportData && !reportData.hasData && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            No transaction data found for the selected date range. Try adjusting
            the date range or create some transactions first.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            {error} - Please try again or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      )}

      {reportData?.note && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            {reportData.note}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Loading Reports</h3>
              <p className="text-muted-foreground">
                Fetching financial data...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Financial Reports Tabs */}
      {!loading && (
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-1">
            <TabsTrigger
              value="summary"
              className="flex items-center gap-2 py-3 px-4"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Summary</span>
            </TabsTrigger>
            {canViewReports && (
              <TabsTrigger
                value="income-statement"
                className="flex items-center gap-2 py-3 px-4"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Income</span>
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger
                value="balance-sheet"
                className="flex items-center gap-2 py-3 px-4"
              >
                <PieChart className="h-4 w-4" />
                <span className="hidden sm:inline">Balance</span>
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger
                value="profit-loss"
                className="flex items-center gap-2 py-3 px-4"
              >
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">P&L</span>
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger
                value="fixed-assets"
                className="flex items-center gap-2 py-3 px-4"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Assets</span>
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger
                value="expenses"
                className="flex items-center gap-2 py-3 px-4"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Expenses</span>
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger
                value="equity"
                className="flex items-center gap-2 py-3 px-4"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Equity</span>
              </TabsTrigger>
            )}
            {canViewReports && (
              <TabsTrigger
                value="cash-flow"
                className="flex items-center gap-2 py-3 px-4"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Cash Flow</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
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
                    <div className="space-y-8">
                      {/* Key Metrics */}
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="border-l-4 border-l-green-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Total Revenue
                              </p>
                              <p className="text-2xl font-bold text-green-600">
                                GHS{" "}
                                {reportData.summary.totalRevenue.toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-red-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Total Expenses
                              </p>
                              <p className="text-2xl font-bold text-red-600">
                                GHS{" "}
                                {reportData.summary.totalExpenses.toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Net Income
                              </p>
                              <p className="text-2xl font-bold text-blue-600">
                                GHS{" "}
                                {reportData.summary.netIncome.toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Profit Margin
                              </p>
                              <p className="text-2xl font-bold text-purple-600">
                                {reportData.summary.profitMargin.toFixed(1)}%
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Service Breakdown */}
                      {reportData.services &&
                        reportData.services.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-xl font-semibold">
                              Service Performance
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {reportData.services.map((service, index) => (
                                <Card
                                  key={index}
                                  className="hover:shadow-md transition-shadow"
                                >
                                  <CardContent className="pt-6">
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <p className="text-lg font-semibold">
                                          {service.service}
                                        </p>
                                        <Badge variant="outline">
                                          {service.transactions} txn
                                        </Badge>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="text-sm text-muted-foreground">
                                            Volume:
                                          </span>
                                          <span className="font-semibold">
                                            GHS{" "}
                                            {service.volume.toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-sm text-muted-foreground">
                                            Fees:
                                          </span>
                                          <span className="font-semibold">
                                            GHS {service.fees.toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Cash Position */}
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold">
                          Cash Position & Trends
                        </h3>
                        <div className="grid gap-4 md:grid-cols-3">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  Cash Balance
                                </p>
                                <p className="text-2xl font-bold">
                                  GHS{" "}
                                  {reportData.summary.cashPosition.toLocaleString()}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  Revenue Change
                                </p>
                                <p
                                  className={`text-2xl font-bold ${
                                    reportData.summary.revenueChange >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {reportData.summary.revenueChange > 0
                                    ? "+"
                                    : ""}
                                  {reportData.summary.revenueChange}%
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  Expense Change
                                </p>
                                <p
                                  className={`text-2xl font-bold ${
                                    reportData.summary.expenseChange <= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {reportData.summary.expenseChange > 0
                                    ? "+"
                                    : ""}
                                  {reportData.summary.expenseChange}%
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
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
            <TabsContent value="income-statement" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Income Statement</CardTitle>
                      <CardDescription>
                        Revenue, expenses, and net income for the selected
                        period
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={exportIncomeStatementPDF}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportData ? (
                    reportData.hasData ? (
                      <div className="space-y-8">
                        {/* Revenue Section */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-green-600">
                            Revenue
                          </h3>
                          <div className="space-y-3">
                            {reportData.services &&
                              reportData.services.map((service, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center py-3 border-b border-gray-100"
                                >
                                  <span className="font-medium">
                                    {service.service}
                                  </span>
                                  <span className="font-semibold text-green-600">
                                    GHS {service.volume.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            <div className="flex justify-between items-center py-4 border-t-2 border-green-200 font-bold text-lg">
                              <span>Total Revenue</span>
                              <span className="text-green-600">
                                GHS{" "}
                                {reportData.summary.totalRevenue.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expenses Section */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-red-600">
                            Expenses
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                              <span>Operating Expenses</span>
                              <span className="font-semibold text-red-600">
                                GHS{" "}
                                {reportData.summary.totalExpenses.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-t-2 border-red-200 font-bold text-lg">
                              <span>Total Expenses</span>
                              <span className="text-red-600">
                                GHS{" "}
                                {reportData.summary.totalExpenses.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Net Income */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-6 border-t-2 border-b-2 border-blue-200 font-bold text-xl bg-blue-50 px-4 rounded-lg">
                            <span>Net Income</span>
                            <span className="text-blue-600">
                              GHS{" "}
                              {reportData.summary.netIncome.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Income Statement Data
                        </h3>
                        <p className="text-muted-foreground">
                          No transaction data available for income statement.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12">
                      <RefreshCw className="h-12 w-12 text-muted-foreground animate-spin mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        Loading Income Statement
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
            <TabsContent value="balance-sheet" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Balance Sheet</CardTitle>
                      <CardDescription>
                        Assets, liabilities, and equity as of the selected date
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={exportStatementOfFinancialPositionPDF}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportData ? (
                    reportData.hasData ? (
                      <div className="space-y-8">
                        {/* Assets Section */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-green-600">
                            Assets
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                              <span className="font-medium">
                                Cash & Cash Equivalents
                              </span>
                              <span className="font-semibold text-green-600">
                                GHS{" "}
                                {reportData.summary.cashPosition.toLocaleString()}
                              </span>
                            </div>
                            {reportData.fixedAssets?.summary?.totalValue && (
                              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="font-medium">
                                  Fixed Assets
                                </span>
                                <span className="font-semibold text-green-600">
                                  GHS{" "}
                                  {reportData.fixedAssets.summary.totalValue.toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center py-4 border-t-2 border-green-200 font-bold text-lg">
                              <span>Total Assets</span>
                              <span className="text-green-600">
                                GHS{" "}
                                {(
                                  (reportData.summary.cashPosition || 0) +
                                  (reportData.fixedAssets?.summary
                                    ?.totalValue || 0)
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Liabilities Section */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-red-600">
                            Liabilities
                          </h3>
                          <div className="space-y-3">
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                No liabilities data available
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Equity Section */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-blue-600">
                            Equity
                          </h3>
                          <div className="space-y-3">
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                No equity data available
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Balance Check */}
                        <div className="space-y-4">
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">
                              Insufficient data for balance check
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Balance Sheet Data
                        </h3>
                        <p className="text-muted-foreground">
                          No transaction data available for balance sheet.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12">
                      <RefreshCw className="h-12 w-12 text-muted-foreground animate-spin mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        Loading Balance Sheet
                      </h3>
                      <p className="text-muted-foreground">
                        Fetching balance sheet data...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="profit-loss" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profit & Loss Statement</CardTitle>
                      <CardDescription>
                        Detailed profit and loss analysis for the period
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={exportProfitLossPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportData ? (
                    reportData.hasData ? (
                      <div className="space-y-8">
                        {/* Revenue Section */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-green-600">
                            Revenue
                          </h3>
                          <div className="space-y-3">
                            {reportData.services &&
                              reportData.services.map((service, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center py-3 border-b border-gray-100"
                                >
                                  <span className="font-medium">
                                    {service.service}
                                  </span>
                                  <span className="font-semibold text-green-600">
                                    GHS {service.volume.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            <div className="flex justify-between items-center py-4 border-t-2 border-green-200 font-bold text-lg">
                              <span>Total Revenue</span>
                              <span className="text-green-600">
                                GHS{" "}
                                {reportData.summary.totalRevenue.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Cost of Goods Sold */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-orange-600">
                            Cost of Goods Sold
                          </h3>
                          <div className="space-y-3">
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                No COGS data available
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Gross Profit */}
                        <div className="space-y-4">
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">
                              Insufficient data for gross profit calculation
                            </p>
                          </div>
                        </div>

                        {/* Operating Expenses */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-red-600">
                            Operating Expenses
                          </h3>
                          <div className="space-y-3">
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                No detailed expense breakdown available
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Net Income */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-6 border-t-2 border-b-2 border-purple-200 font-bold text-xl bg-purple-50 px-4 rounded-lg">
                            <span>Net Income</span>
                            <span className="text-purple-600">
                              GHS{" "}
                              {reportData.summary.netIncome.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No P&L Data
                        </h3>
                        <p className="text-muted-foreground">
                          No transaction data available for profit & loss
                          statement.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12">
                      <RefreshCw className="h-12 w-12 text-muted-foreground animate-spin mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        Loading P&L Statement
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
            <TabsContent value="fixed-assets" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Fixed Assets</CardTitle>
                      <CardDescription>
                        Property, plant, and equipment details
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={exportFixedAssetsPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportData?.fixedAssets ? (
                    <div className="space-y-8">
                      {/* Summary */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Total Value
                              </p>
                              <p className="text-2xl font-bold text-blue-600">
                                GHS{" "}
                                {reportData.fixedAssets.summary?.totalValue?.toLocaleString() ||
                                  "0"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Asset Count
                              </p>
                              <p className="text-2xl font-bold text-green-600">
                                {reportData.fixedAssets.summary?.assetCount ||
                                  "0"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Average Value
                              </p>
                              <p className="text-2xl font-bold text-purple-600">
                                GHS{" "}
                                {reportData.fixedAssets.summary?.averageValue?.toLocaleString() ||
                                  "0"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Asset Details */}
                      {reportData.fixedAssets.assets &&
                        reportData.fixedAssets.assets.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-xl font-semibold">
                              Asset Details
                            </h3>
                            <div className="space-y-3">
                              {reportData.fixedAssets.assets.map(
                                (asset: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center py-3 border-b border-gray-100"
                                  >
                                    <div>
                                      <span className="font-medium">
                                        {asset.name || `Asset ${index + 1}`}
                                      </span>
                                      <p className="text-sm text-muted-foreground">
                                        {asset.description || "No description"}
                                      </p>
                                    </div>
                                    <span className="font-semibold">
                                      GHS {asset.value?.toLocaleString() || "0"}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Fixed Assets Data
                      </h3>
                      <p className="text-muted-foreground">
                        No fixed assets data available for the selected period.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="expenses" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Expenses Report</CardTitle>
                      <CardDescription>
                        Operating and administrative expenses breakdown
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={exportExpensesPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportData?.expenses ? (
                    <div className="space-y-8">
                      {/* Summary */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-l-4 border-l-red-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Total Expenses
                              </p>
                              <p className="text-2xl font-bold text-red-600">
                                GHS{" "}
                                {reportData.expenses.summary?.totalExpenses?.toLocaleString() ||
                                  reportData.summary.totalExpenses.toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-orange-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Categories
                              </p>
                              <p className="text-2xl font-bold text-orange-600">
                                {reportData.expenses.summary?.categoryCount ||
                                  "0"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Avg per Category
                              </p>
                              <p className="text-2xl font-bold text-purple-600">
                                GHS{" "}
                                {reportData.expenses.summary?.averagePerCategory?.toLocaleString() ||
                                  "0"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Expense Categories */}
                      {reportData.expenses.categories &&
                        reportData.expenses.categories.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-xl font-semibold">
                              Expense Categories
                            </h3>
                            <div className="space-y-3">
                              {reportData.expenses.categories.map(
                                (category: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center py-3 border-b border-gray-100"
                                  >
                                    <div>
                                      <span className="font-medium">
                                        {category.name ||
                                          `Category ${index + 1}`}
                                      </span>
                                      <p className="text-sm text-muted-foreground">
                                        {category.description ||
                                          "No description"}
                                      </p>
                                    </div>
                                    <span className="font-semibold text-red-600">
                                      GHS{" "}
                                      {category.amount?.toLocaleString() || "0"}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Expenses Data
                      </h3>
                      <p className="text-muted-foreground">
                        No expenses data available for the selected period.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="equity" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Equity Report</CardTitle>
                      <CardDescription>
                        Shareholders' equity and retained earnings
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={exportEquityPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportData?.equity ? (
                    <div className="space-y-8">
                      {/* Summary */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Total Equity
                              </p>
                              <p className="text-2xl font-bold text-blue-600">
                                GHS{" "}
                                {reportData.equity.summary?.totalEquity?.toLocaleString() ||
                                  "0"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Equity Accounts
                              </p>
                              <p className="text-2xl font-bold text-green-600">
                                {reportData.equity.summary?.equityAccounts ||
                                  "0"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Transactions
                              </p>
                              <p className="text-2xl font-bold text-purple-600">
                                {reportData.equity.summary?.totalTransactions ||
                                  "0"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Equity Components */}
                      {reportData.equity.components &&
                        reportData.equity.components.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-xl font-semibold">
                              Equity Components
                            </h3>
                            <div className="space-y-3">
                              {reportData.equity.components.map(
                                (component: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center py-3 border-b border-gray-100"
                                  >
                                    <span className="font-medium">
                                      {component.name ||
                                        `Component ${index + 1}`}
                                    </span>
                                    <span className="font-semibold text-blue-600">
                                      GHS{" "}
                                      {component.amount?.toLocaleString() ||
                                        "0"}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Equity Data
                      </h3>
                      <p className="text-muted-foreground">
                        No equity data available for the selected period.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="cash-flow" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Statement</CardTitle>
                  <CardDescription>
                    Operating, investing, and financing cash flows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData ? (
                    reportData.hasData ? (
                      <div className="space-y-8">
                        {/* Operating Activities */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-green-600">
                            Operating Activities
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                              <span className="font-medium">Net Income</span>
                              <span className="font-semibold text-green-600">
                                GHS{" "}
                                {reportData.summary.netIncome.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                No additional operating cash flow data available
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Investing Activities */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-blue-600">
                            Investing Activities
                          </h3>
                          <div className="space-y-3">
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                No investing activities data available
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Financing Activities */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-purple-600">
                            Financing Activities
                          </h3>
                          <div className="space-y-3">
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                No financing activities data available
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Cash Position */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-6 border-t-2 border-b-2 border-green-200 font-bold text-xl bg-green-50 px-4 rounded-lg">
                            <span>Ending Cash Balance</span>
                            <span className="text-green-600">
                              GHS{" "}
                              {reportData.summary.cashPosition.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Cash Flow Data
                        </h3>
                        <p className="text-muted-foreground">
                          No transaction data available for cash flow statement.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12">
                      <RefreshCw className="h-12 w-12 text-muted-foreground animate-spin mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        Loading Cash Flow
                      </h3>
                      <p className="text-muted-foreground">
                        Fetching cash flow data...
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
