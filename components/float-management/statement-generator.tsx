"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import {
  Download,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface FloatTransaction {
  id: string;
  account_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
  reference: string;
  recharge_method?: string;
  provider: string;
  account_type: string;
  created_by_name: string;
}

interface StatementGeneratorProps {
  account: {
    id: string;
    provider: string;
    account_type: string;
    current_balance: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatementGenerator({
  account,
  open,
  onOpenChange,
}: StatementGeneratorProps) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<FloatTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statementType, setStatementType] = useState<"summary" | "detailed">(
    "summary"
  );
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Set default date range (last 30 days)
  useEffect(() => {
    if (open) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      setEndDate(end.toISOString().split("T")[0]);
      setStartDate(start.toISOString().split("T")[0]);
    }
  }, [open]);

  // Fetch transactions when dates change
  useEffect(() => {
    if (open && account && startDate && endDate) {
      fetchTransactions();
    }
  }, [open, account, startDate, endDate]);

  const fetchTransactions = async () => {
    if (!account) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        accountId: account.id,
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T23:59:59Z`,
        limit: "1000", // Get all transactions for the period
      });

      const response = await fetch(`/api/float-transactions?${params}`);
      const data = await response.json();

      if (data.success) {
        setTransactions(data.data.transactions || []);
      } else {
        throw new Error(data.error || "Failed to fetch transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    if (!transactions.length) return null;

    const totalCredits = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebits = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const openingBalance =
      transactions[transactions.length - 1]?.balance_before || 0;
    const closingBalance =
      transactions[0]?.balance_after || account?.current_balance || 0;

    return {
      openingBalance,
      closingBalance,
      totalCredits,
      totalDebits,
      netChange: totalCredits - totalDebits,
      transactionCount: transactions.length,
    };
  };

  const generatePDF = async () => {
    if (!account || !transactions.length) return;

    try {
      setGeneratingPDF(true);
      const summary = calculateSummary();
      if (!summary) return;

      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      const { width, height } = page.getSize();

      // Load font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let yPosition = height - 50;

      // Header
      page.drawText("FLOAT ACCOUNT STATEMENT", {
        x: 50,
        y: yPosition,
        size: 20,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      // Account details
      page.drawText(`Account: ${account.provider} (${account.account_type})`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      page.drawText(
        `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(
          endDate
        ).toLocaleDateString()}`,
        {
          x: 50,
          y: yPosition,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        }
      );
      yPosition -= 20;

      page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 40;

      // Summary section
      page.drawText("SUMMARY", {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      const summaryItems = [
        {
          label: "Opening Balance",
          value: formatCurrency(summary.openingBalance),
        },
        { label: "Total Credits", value: formatCurrency(summary.totalCredits) },
        { label: "Total Debits", value: formatCurrency(summary.totalDebits) },
        { label: "Net Change", value: formatCurrency(summary.netChange) },
        {
          label: "Closing Balance",
          value: formatCurrency(summary.closingBalance),
        },
        {
          label: "Transaction Count",
          value: summary.transactionCount.toString(),
        },
      ];

      summaryItems.forEach((item) => {
        page.drawText(item.label, {
          x: 50,
          y: yPosition,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
        page.drawText(item.value, {
          x: 200,
          y: yPosition,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      });

      yPosition -= 20;

      // Transactions table header
      if (statementType === "detailed") {
        page.drawText("TRANSACTION DETAILS", {
          x: 50,
          y: yPosition,
          size: 14,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;

        // Table headers
        const headers = [
          "Date",
          "Type",
          "Amount",
          "Balance",
          "Description",
          "Reference",
        ];
        const headerX = [50, 100, 150, 200, 280, 400];

        headers.forEach((header, index) => {
          page.drawText(header, {
            x: headerX[index],
            y: yPosition,
            size: 8,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
        });
        yPosition -= 15;

        // Transaction rows
        transactions.slice(0, 30).forEach((transaction) => {
          // Limit to first 30 for PDF
          if (yPosition < 50) {
            page = pdfDoc.addPage([595.28, 841.89]);
            yPosition = height - 50;
          }

          const date = new Date(transaction.created_at).toLocaleDateString();
          const type = transaction.type;
          const amount = formatCurrency(transaction.amount);
          const balance = formatCurrency(transaction.balance_after);
          const description = transaction.description.substring(0, 20);
          const reference = transaction.reference.substring(0, 15);

          page.drawText(date, {
            x: headerX[0],
            y: yPosition,
            size: 7,
            font: font,
            color: rgb(0, 0, 0),
          });
          page.drawText(type, {
            x: headerX[1],
            y: yPosition,
            size: 7,
            font: font,
            color: rgb(0, 0, 0),
          });
          page.drawText(amount, {
            x: headerX[2],
            y: yPosition,
            size: 7,
            font: font,
            color: rgb(0, 0, 0),
          });
          page.drawText(balance, {
            x: headerX[3],
            y: yPosition,
            size: 7,
            font: font,
            color: rgb(0, 0, 0),
          });
          page.drawText(description, {
            x: headerX[4],
            y: yPosition,
            size: 7,
            font: font,
            color: rgb(0, 0, 0),
          });
          page.drawText(reference, {
            x: headerX[5],
            y: yPosition,
            size: 7,
            font: font,
            color: rgb(0, 0, 0),
          });

          yPosition -= 12;
        });
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `float-statement-${account.provider}-${startDate}-${endDate}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "PDF Generated",
        description: "Float account statement has been downloaded",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF statement",
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const exportCSV = () => {
    if (!transactions.length) return;

    const headers = [
      "Date",
      "Type",
      "Amount",
      "Balance Before",
      "Balance After",
      "Description",
      "Reference",
      "Created By",
    ];
    const csvContent = [
      headers.join(","),
      ...transactions.map((t) =>
        [
          new Date(t.created_at).toLocaleDateString(),
          t.type,
          t.amount,
          t.balance_before,
          t.balance_after,
          `"${t.description}"`,
          t.reference,
          t.created_by_name || "Unknown",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `float-transactions-${account?.provider}-${startDate}-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV Exported",
      description: "Transaction data has been downloaded",
    });
  };

  const summary = calculateSummary();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Float Account Statement
          </DialogTitle>
          <DialogDescription>
            Generate detailed statement for {account?.provider} account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="statementType">Statement Type</Label>
              <Select
                value={statementType}
                onValueChange={(value: "summary" | "detailed") =>
                  setStatementType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Only</SelectItem>
                  <SelectItem value="detailed">
                    Detailed with Transactions
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Card */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Account Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Opening Balance
                    </Label>
                    <div className="text-lg font-semibold">
                      {formatCurrency(summary.openingBalance)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Total Credits
                    </Label>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(summary.totalCredits)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Total Debits
                    </Label>
                    <div className="text-lg font-semibold text-red-600">
                      {formatCurrency(summary.totalDebits)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Net Change
                    </Label>
                    <div
                      className={`text-lg font-semibold ${
                        summary.netChange >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(summary.netChange)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Closing Balance
                    </Label>
                    <div className="text-lg font-semibold">
                      {formatCurrency(summary.closingBalance)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Transactions
                    </Label>
                    <div className="text-lg font-semibold">
                      {summary.transactionCount}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={generatePDF}
              disabled={generatingPDF || !transactions.length}
            >
              {generatingPDF ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={exportCSV}
              disabled={!transactions.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Transactions Table */}
          {statementType === "detailed" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Transaction History
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading transactions...</span>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Created By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(
                              transaction.created_at
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                transaction.amount > 0 ? "default" : "secondary"
                              }
                            >
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={
                              transaction.amount > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(transaction.balance_after)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {transaction.reference}
                          </TableCell>
                          <TableCell>
                            {transaction.created_by_name || "Unknown"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
