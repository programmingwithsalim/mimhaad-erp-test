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
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useServiceStatistics } from "@/hooks/use-service-statistics";
import { useDynamicFee } from "@/hooks/use-dynamic-fee";
import { DynamicFloatDisplay } from "@/components/shared/dynamic-float-display";
import { TransactionEditDialog } from "@/components/shared/transaction-edit-dialog";
import { TransactionDeleteDialog } from "@/components/shared/transaction-delete-dialog";
import {
  Building2,
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
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { EditAgencyBankingTransactionDialog } from "@/components/transactions/edit-agency-banking-transaction-dialog";
import { TransactionReceipt } from "@/components/shared/transaction-receipt";
import { TransactionActions } from "@/components/transactions/transaction-actions";

export default function AgencyBankingPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const {
    statistics,
    floatAlerts,
    isLoading: statsLoading,
    refreshStatistics,
  } = useServiceStatistics("agency-banking");

  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [floatAccounts, setFloatAccounts] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingFloats, setLoadingFloats] = useState(false);

  // Dialog states for edit and delete
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [formData, setFormData] = useState({
    type: "",
    amount: "",
    fee: "",
    customer_name: "",
    account_number: "",
    partner_bank_id: "",
    notes: "",
  });
  const [feeLoading, setFeeLoading] = useState(false);

  // Helper to get selected partner bank object
  const selectedPartnerBank = floatAccounts.find(
    (fa: any) => fa.id === formData.partner_bank_id
  );

  // Use dynamic fee calculation
  const { calculateFee } = useDynamicFee();

  // Track if user has manually modified the fee
  const [userModifiedFee, setUserModifiedFee] = useState(false);

  // Fetch fee when type, amount, or partner bank changes (only if user hasn't manually modified)
  useEffect(() => {
    const fetchFee = async () => {
      if (!formData.type || !formData.amount || !formData.partner_bank_id) {
        setFormData((prev) => ({ ...prev, fee: "" }));
        return;
      }

      // Only auto-calculate if user hasn't manually modified the fee
      if (!userModifiedFee) {
      setFeeLoading(true);
      try {
        const feeResult = await calculateFee(
          "agency_banking",
          formData.type,
          Number(formData.amount)
        );
        setFormData((prev) => ({
          ...prev,
          fee: feeResult.fee.toString(),
        }));
      } catch (err) {
        setFormData((prev) => ({ ...prev, fee: "0" }));
      } finally {
        setFeeLoading(false);
        }
      }
    };
    fetchFee();
  }, [formData.type, formData.amount, formData.partner_bank_id, calculateFee, userModifiedFee]);

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
        `/api/agency-banking/transactions?branchId=${user.branchId}&limit=50`
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
      console.error("Error loading agency banking transactions:", error);
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
          // Filter for Agency Banking accounts
          const agencyAccounts = data.accounts.filter(
            (account: any) =>
              account.account_type === "agency-banking" ||
              account.provider?.toLowerCase().includes("bank") ||
              account.provider?.toLowerCase().includes("gcb") ||
              account.provider?.toLowerCase().includes("ecobank") ||
              account.provider?.toLowerCase().includes("absa")
          );
          setFloatAccounts(agencyAccounts);
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
      !formData.account_number ||
      !formData.partner_bank_id
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate amount (must be positive)
    const amount = Number(formData.amount);
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Validate account number (max 15 characters)
    if (formData.account_number.length > 15) {
      toast({
        title: "Invalid Account Number",
        description: "Account number cannot be more than 15 characters",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/agency-banking/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: formData.type,
          amount: Number(formData.amount),
          fee: Number(formData.fee) || 0,
          customer_name: formData.customer_name,
          account_number: formData.account_number,
          partner_bank_id: formData.partner_bank_id,
          reference: `AGENCY-${Date.now()}`,
          notes: formData.notes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Transaction Successful",
          description:
            result.message ||
            "Agency banking transaction processed successfully",
        });

        // Reset form
        setFormData({
          type: "",
          amount: "",
          fee: "",
          customer_name: "",
          account_number: "",
          partner_bank_id: "",
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

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Type",
      "Customer",
      "Account Number",
      "Partner Bank",
      "Amount",
      "Fee",
      "Status",
    ];
    const csvData = transactions.map((transaction: any) => [
      format(
        new Date(transaction.created_at || new Date()),
        "yyyy-MM-dd HH:mm:ss"
      ),
      transaction.type,
      transaction.customer_name || "",
      transaction.account_number || "",
      transaction.partner_bank || "",
      transaction.amount
        ? Number.parseFloat(transaction.amount).toFixed(2)
        : "0.00",
      transaction.fee ? Number.parseFloat(transaction.fee).toFixed(2) : "0.00",
      transaction.status || "completed",
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
      `agency-banking-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
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

  // Handle edit transaction
  const handleEditTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setEditDialogOpen(true);
  };

  // Handle delete transaction
  const handleDeleteTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  // Handle print transaction
  const handlePrintTransaction = (transaction: any) => {
    setReceiptData({
      transactionId: transaction.id,
      sourceModule: "agency_banking",
      transactionType: transaction.type,
      amount: Number(transaction.amount),
      fee: Number(transaction.fee),
      customerName: transaction.customer_name,
      reference: transaction.reference,
      branchName: user?.branchName || "",
      date: transaction.created_at,
      additionalData: {
        partnerBank: transaction.partner_bank,
        accountNumber: transaction.account_number,
      },
    });
    setReceiptDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agency Banking Services</h1>
          <p className="text-muted-foreground">
            Manage agency banking transactions and partner bank operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              // This will focus on the transaction form
              const transactionTab = document.querySelector(
                '[data-value="transaction"]'
              ) as HTMLElement;
              if (transactionTab) {
                transactionTab.click();
              }
            }}
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
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.severity === "critical"
                  ? "border-l-red-500 bg-red-50"
                  : "border-l-yellow-500 bg-yellow-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-4 w-4 ${
                    alert.severity === "critical"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                />
                <span className="font-medium">
                  {alert.provider} float balance is {alert.severity}:{" "}
                  {formatCurrency(alert.current_balance)}
                </span>
              </div>
            </div>
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
            <Building2 className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Partner Banks</CardTitle>
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
      <Tabs defaultValue="transaction" className="w-full">
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
                    <Building2 className="h-5 w-5" />
                    Create Agency Banking Transaction
                  </CardTitle>
                  <CardDescription>
                    Process a new agency banking transaction
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="type">Transaction Type</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) =>
                            setFormData({ ...formData, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select transaction type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deposit">Deposit</SelectItem>
                            <SelectItem value="withdrawal">
                              Withdrawal
                            </SelectItem>
                            <SelectItem value="interbank_transfer">
                              Inter Bank Transfer
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="partner_bank_id">Partner Bank</Label>
                        <Select
                          value={formData.partner_bank_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, partner_bank_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select partner bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {(floatAccounts as any[]).map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_name ||
                                  account.provider ||
                                  account.account_number}
                                {account.current_balance !== undefined &&
                                  ` (Bal: ${formatCurrency(
                                    account.current_balance
                                  )})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {floatAccounts.length === 0 && (
                          <div className="text-xs text-destructive mt-1">
                            No partner banks available for this branch.
                          </div>
                        )}
                        {selectedPartnerBank && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span>
                              Provider: {selectedPartnerBank.provider || "-"}
                            </span>
                            {" | "}
                            <span>
                              Account:{" "}
                              {selectedPartnerBank.account_number ||
                                selectedPartnerBank.account_name}
                            </span>
                            {" | "}
                            <span>
                              Balance:{" "}
                              {formatCurrency(
                                selectedPartnerBank.current_balance
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customer_name">Customer Name</Label>
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
                        <Label htmlFor="account_number">Account Number</Label>
                        <Input
                          id="account_number"
                          value={formData.account_number}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              account_number: e.target.value,
                            })
                          }
                          placeholder="Enter account number"
                          maxLength={15}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum 15 characters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (GHS)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={formData.amount}
                          onChange={(e) =>
                            setFormData({ ...formData, amount: e.target.value })
                          }
                          placeholder="0.00"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Must be greater than 0
                        </p>
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
                          placeholder={feeLoading ? "Calculating..." : "0.00"}
                        />
                        <p className="text-xs text-muted-foreground">
                          Auto-calculated fee can be modified as needed
                        </p>
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
                selectedProvider={selectedPartnerBank?.provider}
                floatAccounts={floatAccounts}
                serviceType="Agency Banking"
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
                    All agency banking transactions
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
                  <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Transactions Found
                  </h3>
                  <p className="text-muted-foreground">
                    No agency banking transactions have been processed yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Partner Bank</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(
                            new Date(transaction.created_at || new Date()),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </TableCell>
                        <TableCell className="capitalize">
                          {transaction.type}
                        </TableCell>
                        <TableCell>
                          {transaction.customer_name || "-"}
                        </TableCell>
                        <TableCell>
                          {transaction.account_number || "-"}
                        </TableCell>
                        <TableCell>{transaction.partner_bank || "-"}</TableCell>
                        <TableCell>
                          {formatCurrency(transaction.amount || 0)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(transaction.fee || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell>
                          <TransactionActions
                            transaction={transaction}
                            userRole={user?.role || "Operation"}
                            sourceModule="agency_banking"
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

      {/* Edit Dialog */}
      {editDialogOpen && selectedTransaction && (
        <EditAgencyBankingTransactionDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          transaction={selectedTransaction}
          onSuccess={() => {
            setEditDialogOpen(false);
            setSelectedTransaction(null);
            loadTransactions();
            loadFloatAccounts();
            refreshStatistics();
          }}
        />
      )}

      {/* Delete Dialog */}
      {deleteDialogOpen && selectedTransaction && (
        <TransactionDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          transaction={selectedTransaction}
          sourceModule="agency_banking"
          onSuccess={async () => {
            if (!selectedTransaction) return;
            try {
              const response = await fetch(
                `/api/transactions/${selectedTransaction.id}`,
                {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sourceModule: "agency_banking",
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
                  description: "Transaction has been deleted successfully.",
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
              setDeleteDialogOpen(false);
              setSelectedTransaction(null);
            }
          }}
        />
      )}

      {/* Receipt Dialog */}
      {receiptDialogOpen && receiptData && (
        <TransactionReceipt
          open={receiptDialogOpen}
          onOpenChange={setReceiptDialogOpen}
          data={receiptData}
        />
      )}
    </div>
  );
}
