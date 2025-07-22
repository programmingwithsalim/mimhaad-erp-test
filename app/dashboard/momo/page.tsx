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
import { useDynamicFee } from "@/hooks/use-dynamic-fee";
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
  Database,
} from "lucide-react";
import { format } from "date-fns";
import { EditMoMoTransactionDialog } from "@/components/transactions/edit-momo-transaction-dialog";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import {
  TransactionReceipt,
  TransactionReceiptData,
} from "@/components/shared/transaction-receipt";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [receiptData, setReceiptData] = useState<TransactionReceiptData | null>(
    null
  );

  const [formData, setFormData] = useState({
    type: "",
    amount: "",
    fee: "",
    customer_name: "",
    phone_number: "",
    provider: "",
    notes: "",
  });

  const [feeLoading, setFeeLoading] = useState(false);

  // Use dynamic fee calculation
  const { calculateFee } = useDynamicFee();

  // Track if user has manually modified the fee
  const [userModifiedFee, setUserModifiedFee] = useState(false);

  // Calculate fee when type, amount, or provider changes (only if user hasn't manually modified)
  useEffect(() => {
    const fetchFee = async () => {
      if (!formData.type || !formData.amount || !formData.provider) {
        setFormData((prev) => ({ ...prev, fee: "" }));
        return;
      }

      // Only auto-calculate if user hasn't manually modified the fee
      if (!userModifiedFee) {
        setFeeLoading(true);
        try {
          // Map transaction types for fee calculation
          const transactionTypeForFee =
            formData.type === "cash-in" ? "deposit" : "withdrawal";
          const feeResult = await calculateFee(
            "momo",
            transactionTypeForFee,
            Number(formData.amount)
          );
          setFormData((prev) => ({
            ...prev,
            fee: feeResult.fee.toString(),
          }));
        } catch (err) {
          setFormData((prev) => ({
            ...prev,
            fee: "0",
          }));
        } finally {
          setFeeLoading(false);
        }
      }
    };

    fetchFee();
  }, [
    formData.type,
    formData.amount,
    formData.provider,
    calculateFee,
    userModifiedFee,
  ]);

  // Reset user modification flag when form is reset
  useEffect(() => {
    if (!formData.fee || formData.fee === "") {
      setUserModifiedFee(false);
    }
  }, [formData.fee]);

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
          // Filter for MoMo accounts and only active ones
          const momoAccounts = data.accounts.filter(
            (account: any) =>
              account.is_active === true &&
              (account.account_type === "momo" ||
                account.provider?.toLowerCase().includes("momo") ||
                account.provider?.toLowerCase().includes("mtn") ||
                account.provider?.toLowerCase().includes("vodafone") ||
                account.provider?.toLowerCase().includes("airteltigo"))
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

    // Validate phone number - must be exactly 10 digits with no letters
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone_number)) {
      toast({
        title: "Invalid Phone Number",
        description:
          "Phone number must be exactly 10 digits (e.g., 0241234567)",
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
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const transactionTypeForFee =
        formData.type === "cash-in" ? "deposit" : "withdrawal";
      const response = await fetch("/api/transactions/unified", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceType: "momo",
          transactionType: transactionTypeForFee,
          amount: Number(formData.amount),
          fee: Number(formData.fee) || 0, // Use the fee from form (modified or auto-calculated)
          customerName: formData.customer_name,
          phoneNumber: formData.phone_number,
          provider: formData.provider,
          reference: `MOMO-${Date.now()}`,
          notes: formData.notes,
          branchId: user.branchId,
          userId: user.id,
          processedBy: user.name || user.username,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Transaction Successful",
          description:
            result.message || "MoMo transaction processed successfully",
        });

        // Show receipt automatically if available
        if (result.receipt) {
          setReceiptData(result.receipt);
          setShowReceiptDialog(true);
        }

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
      } else {
        throw new Error(result.error || "Failed to process transaction");
      }
    } catch (error) {
      toast({
        title: "Transaction Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
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

  const handleDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      const response = await fetch(
        `/api/transactions/${transactionToDelete.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceModule: "momo",
            processedBy: user?.id,
            branchId: user?.branchId,
            reason: "User requested deletion",
          }),
        }
      );
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
      toast({
        title: "Delete Failed",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setTransactionToDelete(null);
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) {
      toast({
        title: "No Data",
        description: "No transactions to export",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Customer Name",
      "Phone Number",
      "Provider",
      "Amount",
      "Fee",
      "Status",
      "Reference",
    ];

    const csvData = transactions.map((transaction) => [
      format(new Date(transaction.created_at), "yyyy-MM-dd HH:mm:ss"),
      transaction.type,
      transaction.customer_name,
      transaction.phone_number,
      transaction.provider,
      transaction.amount,
      transaction.fee,
      transaction.status,
      transaction.reference || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `momo-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: "MoMo transactions exported to CSV",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            Pending
          </Badge>
        );
      case "failed":
      case "error":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700">
            Failed
          </Badge>
        );
      case "reversed":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Reversed
          </Badge>
        );
      case "deleted":
        return (
          <Badge
            variant="outline"
            className="bg-gray-200 text-gray-700 line-through"
          >
            Deleted
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
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
                            {floatAccounts.map((account: any) => (
                              <SelectItem
                                key={account.provider}
                                value={account.provider}
                              >
                                {account.provider}
                                {account.current_balance !== undefined &&
                                  ` (Bal: ${formatCurrency(
                                    account.current_balance
                                  )})`}
                              </SelectItem>
                            ))}
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
                          onChange={(e) => {
                            // Only allow digits
                            const value = e.target.value.replace(/\D/g, "");
                            // Limit to 10 digits
                            const limitedValue = value.slice(0, 10);
                            setFormData({
                              ...formData,
                              phone_number: limitedValue,
                            });
                          }}
                          placeholder="0241234567"
                          maxLength={10}
                          pattern="[0-9]{10}"
                          title="Phone number must be exactly 10 digits"
                          required
                        />
                        {formData.phone_number &&
                          formData.phone_number.length !== 10 && (
                            <p className="text-sm text-destructive">
                              Phone number must be exactly 10 digits
                            </p>
                          )}
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
                          onChange={(e) => {
                            setFormData({ ...formData, fee: e.target.value });
                            setUserModifiedFee(true);
                          }}
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
                <div className="flex gap-2">
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
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
                          {(() => {
                            const rawDate =
                              transaction.created_at || transaction.date;
                            const parsedDate = rawDate
                              ? new Date(rawDate)
                              : null;
                            return parsedDate &&
                              !isNaN(parsedDate.getTime()) ? (
                              format(parsedDate, "MMM dd, yyyy HH:mm")
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="capitalize">
                          {transaction.type}
                        </TableCell>
                        <TableCell>
                          {transaction.customerName ||
                            transaction.customer_name}
                        </TableCell>
                        <TableCell>
                          {transaction.phoneNumber || transaction.phone_number}
                        </TableCell>
                        <TableCell>{transaction.provider}</TableCell>
                        <TableCell>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>{formatCurrency(transaction.fee)}</TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell>
                          <TransactionActions
                            transaction={transaction}
                            userRole={user?.role || "Operation"}
                            sourceModule="momo"
                            onSuccess={() => {
                              loadTransactions();
                              loadFloatAccounts();
                              refreshStatistics();
                            }}
                          />
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
      <TransactionReceipt
        data={receiptData}
        open={showReceiptDialog}
        onOpenChange={setShowReceiptDialog}
      />

      <EditMoMoTransactionDialog
        transaction={editingTransaction}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          setShowEditDialog(false);
          setEditingTransaction(null);
          loadTransactions();
          loadFloatAccounts();
          refreshStatistics();
        }}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
