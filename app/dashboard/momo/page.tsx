"use client";

import type React from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useServiceStatistics } from "@/hooks/use-service-statistics";
import { DynamicFloatDisplay } from "@/components/shared/dynamic-float-display";
import {
  Smartphone,
  TrendingUp,
  DollarSign,
  Users,
  RefreshCw,
  Plus,
  Download,
  AlertTriangle,
  Edit,
  Trash2,
  Printer,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee: number;
  customer_name: string;
  phone_number: string;
  provider: string;
  reference?: string;
  status: string;
  created_at: string;
  gl_entry_id?: string;
  notes?: string;
}

export default function MoMoPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const {
    statistics,
    floatAlerts,
    isLoading: statsLoading,
    refreshStatistics,
  } = useServiceStatistics("momo");

  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [floatAccounts, setFloatAccounts] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingFloats, setLoadingFloats] = useState(false);
  const [activeTab, setActiveTab] = useState("transaction");
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [formData, setFormData] = useState({
    type: "",
    amount: "",
    fee: "",
    customer_name: "",
    phone_number: "",
    provider: "",
    notes: "",
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount || 0);
  };

  const loadTransactions = async () => {
    if (!user?.branchId) return;

    try {
      setLoadingTransactions(true);
      const response = await fetch(
        `/api/momo/transactions?branchId=${user.branchId}&limit=50`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        } else {
          setTransactions([]);
        }
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error loading MoMo transactions:", error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadFloatAccounts = async () => {
    if (!user?.branchId) return;

    try {
      setLoadingFloats(true);
      const response = await fetch(
        `/api/float-accounts?branchId=${user.branchId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.accounts)) {
          // Filter for MoMo accounts
          const momoAccounts = data.accounts.filter(
            (account: any) =>
              account.account_type === "momo" ||
              account.provider?.toLowerCase().includes("momo") ||
              account.provider?.toLowerCase().includes("mtn") ||
              account.provider?.toLowerCase().includes("vodafone") ||
              account.provider?.toLowerCase().includes("airteltigo")
          );
          setFloatAccounts(momoAccounts);
        } else {
          setFloatAccounts([]);
        }
      } else {
        setFloatAccounts([]);
      }
    } catch (error) {
      console.error("Error loading float accounts:", error);
      setFloatAccounts([]);
    } finally {
      setLoadingFloats(false);
    }
  };

  useEffect(() => {
    if (user?.branchId) {
      loadTransactions();
      loadFloatAccounts();
    }
  }, [user?.branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.branchId || !user?.id) {
      toast({
        title: "Error",
        description: "Branch ID is required",
        variant: "destructive",
      });
      return;
    }

    if (
      !formData.type ||
      !formData.amount ||
      !formData.customer_name ||
      !formData.phone_number ||
      !formData.provider
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const transactionData = {
        type: formData.type,
        amount: Number.parseFloat(formData.amount),
        fee: Number.parseFloat(formData.fee || "0"),
        customer_name: formData.customer_name,
        phone_number: formData.phone_number,
        provider: formData.provider,
        reference: `MOMO-${Date.now()}`,
        branchId: user.branchId,
        userId: user.id,
        notes: formData.notes,
      };

      const response = await fetch("/api/momo/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      const result = await response.json();

      if (result.success) {
        // Show receipt
        setCurrentTransaction({
          ...transactionData,
          id: result.transactionId,
          status: "completed",
          created_at: new Date().toISOString(),
        });
        setShowReceiptDialog(true);

        // Reset form
        setFormData({
          type: "",
          amount: "",
          fee: "",
          customer_name: "",
          phone_number: "",
          provider: "",
          notes: "",
        });

        // Refresh data
        loadTransactions();
        loadFloatAccounts();
        refreshStatistics();

        toast({
          title: "Transaction Successful",
          description: "MoMo transaction created successfully",
        });
      } else {
        toast({
          title: "Transaction Failed",
          description: result.error || "Failed to create transaction",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast({
        title: "Transaction Failed",
        description: "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowEditDialog(true);
  };

  const handleDelete = async (transactionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this transaction? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/momo/transactions/${transactionId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Transaction Deleted",
          description: "Transaction has been deleted successfully",
        });
        loadTransactions();
        loadFloatAccounts();
        refreshStatistics();
      } else {
        toast({
          title: "Delete Failed",
          description: result.error || "Failed to delete transaction",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Type",
      "Customer",
      "Phone",
      "Provider",
      "Amount",
      "Fee",
      "Status",
    ];
    const csvData = transactions.map((transaction) => [
      format(new Date(transaction.created_at), "yyyy-MM-dd HH:mm:ss"),
      transaction.type,
      transaction.customer_name,
      transaction.phone_number,
      transaction.provider,
      transaction.amount.toFixed(2),
      transaction.fee.toFixed(2),
      transaction.status,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `momo-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${transactions.length} transactions to CSV`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const printReceipt = () => {
    const printContent = document.getElementById("receipt-content");
    if (printContent) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Transaction Receipt</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt { max-width: 300px; margin: 0 auto; }
                .center { text-align: center; }
                .line { border-bottom: 1px solid #000; margin: 10px 0; }
                .row { display: flex; justify-content: space-between; margin: 5px 0; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mobile Money Services</h1>
          <p className="text-muted-foreground">
            Manage mobile money transactions and float accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveTab("transaction")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              loadTransactions();
              loadFloatAccounts();
              refreshStatistics();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Float Alerts */}
      {floatAlerts.length > 0 && (
        <div className="space-y-2">
          {floatAlerts.map((alert) => (
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
                <span className="font-medium">{alert.provider}</span> float
                balance is {alert.severity}:{" "}
                {formatCurrency(alert.current_balance)} (Min:{" "}
                {formatCurrency(alert.min_threshold)})
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Transactions
            </CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.todayTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {statistics.totalTransactions}
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
              {formatCurrency(statistics.todayVolume)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(statistics.totalVolume)}
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
              {formatCurrency(statistics.todayCommission)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(statistics.totalCommission)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Providers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.activeProviders}
            </div>
            <p className="text-xs text-muted-foreground">
              Float: {formatCurrency(statistics.floatBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transaction">New Transaction</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="transaction" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transaction Form - 2 columns */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Create MoMo Transaction
                  </CardTitle>
                  <CardDescription>
                    Process a new mobile money transaction
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="type">Transaction Type *</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) =>
                            setFormData({ ...formData, type: value })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select transaction type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash-in">Cash In</SelectItem>
                            <SelectItem value="cash-out">Cash Out</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="provider">Provider *</Label>
                        <Select
                          value={formData.provider}
                          onValueChange={(value) =>
                            setFormData({ ...formData, provider: value })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MTN">
                              MTN Mobile Money
                            </SelectItem>
                            <SelectItem value="Vodafone">
                              Vodafone Cash
                            </SelectItem>
                            <SelectItem value="AirtelTigo">
                              AirtelTigo Money
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customer_name">Customer Name *</Label>
                        <Input
                          id="customer_name"
                          value={formData.customer_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customer_name: e.target.value,
                            })
                          }
                          placeholder="Enter customer name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone_number">Phone Number *</Label>
                        <Input
                          id="phone_number"
                          value={formData.phone_number}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              phone_number: e.target.value,
                            })
                          }
                          placeholder="Enter phone number"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (GHS) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.amount}
                          onChange={(e) =>
                            setFormData({ ...formData, amount: e.target.value })
                          }
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fee">Fee (GHS)</Label>
                        <Input
                          id="fee"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.fee}
                          onChange={(e) =>
                            setFormData({ ...formData, fee: e.target.value })
                          }
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Transaction
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Float Display - 1 column */}
            <div className="lg:col-span-1">
              <DynamicFloatDisplay
                selectedProvider={formData.provider}
                floatAccounts={floatAccounts}
                serviceType="MoMo"
                onRefresh={loadFloatAccounts}
                isLoading={loadingFloats}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    All mobile money transactions
                  </CardDescription>
                </div>
                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Transactions Found
                  </h3>
                  <p className="text-muted-foreground">
                    No mobile money transactions have been processed yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(
                            new Date(transaction.created_at),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </TableCell>
                        <TableCell className="capitalize">
                          {transaction.type}
                        </TableCell>
                        <TableCell>{transaction.customer_name}</TableCell>
                        <TableCell>{transaction.phone_number}</TableCell>
                        <TableCell>{transaction.provider}</TableCell>
                        <TableCell>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>{formatCurrency(transaction.fee)}</TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(transaction)}
                              title="Edit Transaction"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(transaction.id)}
                              title="Delete Transaction"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction Receipt
            </DialogTitle>
            <DialogDescription>
              Transaction completed successfully
            </DialogDescription>
          </DialogHeader>
          {currentTransaction && (
            <div id="receipt-content" className="space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="text-lg font-bold">
                  MIMHAAD FINANCIAL SERVICES
                </h3>
                <p className="text-sm">{user?.branchName || "Main Branch"}</p>
                <p className="text-sm">Tel: 0241378880</p>
                <p className="text-sm">{format(new Date(), "PPP")}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Transaction ID:</span>
                  <span className="font-mono">{currentTransaction.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Customer:</span>
                  <span>{currentTransaction.customer_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Phone Number:</span>
                  <span>{currentTransaction.phone_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Transaction Type:</span>
                  <span className="capitalize">{currentTransaction.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Provider:</span>
                  <span>{currentTransaction.provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Amount:</span>
                  <span>{formatCurrency(currentTransaction.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fee:</span>
                  <span>{formatCurrency(currentTransaction.fee)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>Total:</span>
                  <span>
                    {formatCurrency(
                      currentTransaction.amount +
                        (currentTransaction.type === "cash-out"
                          ? currentTransaction.fee
                          : 0)
                    )}
                  </span>
                </div>
              </div>
              <div className="text-center text-xs border-t pt-4">
                <p>Thank you for using our service!</p>
                <p>For inquiries, please call 0241378880</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReceiptDialog(false)}
            >
              Close
            </Button>
            <Button onClick={printReceipt}>
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
