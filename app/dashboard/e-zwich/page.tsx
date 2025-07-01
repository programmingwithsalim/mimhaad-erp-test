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
import EnhancedCardIssuanceForm from "@/components/e-zwich/enhanced-card-issuance-form";
import { TransactionEditDialog } from "@/components/shared/transaction-edit-dialog";
import { TransactionDeleteDialog } from "@/components/shared/transaction-delete-dialog";
import {
  CreditCard,
  TrendingUp,
  DollarSign,
  Users,
  RefreshCw,
  Plus,
  AlertTriangle,
  Trash2,
  Printer,
  Receipt,
  Edit,
  ArrowRightLeft,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: string;
  amount?: number;
  customer_name: string;
  customer_phone?: string;
  card_number?: string;
  partner_bank?: string;
  status: string;
  created_at: string;
  settlement_account_id?: string;
}

export default function EZwichPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const {
    statistics,
    floatAlerts,
    isLoading: statsLoading,
    refreshStatistics,
  } = useServiceStatistics("e-zwich");

  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [floatAccounts, setFloatAccounts] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingFloats, setLoadingFloats] = useState(false);
  const [activeTab, setActiveTab] = useState("withdrawal");
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Unified dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const [withdrawalForm, setWithdrawalForm] = useState({
    card_number: "",
    amount: "",
    fee: "",
    customer_name: "",
    customer_phone: "",
    settlement_account_id: "",
    notes: "",
  });

  const [settleForm, setSettleForm] = useState({
    amount: "",
    settlement_account_id: "",
    partner_account_id: "",
    notes: "",
    reference: "",
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
        `/api/e-zwich/transactions?branchId=${user.branchId}&limit=50`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Transactionsssss", data);
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        } else {
          setTransactions([]);
        }
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error loading E-Zwich transactions:", error);
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
          setFloatAccounts(data.accounts);
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

  useEffect(() => {
    if (!withdrawalForm.amount) return;
    fetch(`/api/settings/fee-config/e-zwich?transactionType=withdrawal`)
      .then((res) => res.json())
      .then((data) => {
        let fee = data?.config?.fee_value || 0;
        if (data?.config?.fee_type === "percentage") {
          fee =
            (parseFloat(withdrawalForm.amount) *
              parseFloat(data.config.fee_value)) /
            100;
          if (data.config.minimum_fee)
            fee = Math.max(fee, parseFloat(data.config.minimum_fee));
          if (data.config.maximum_fee)
            fee = Math.min(fee, parseFloat(data.config.maximum_fee));
        }
        setWithdrawalForm((f) => ({ ...f, fee: fee.toFixed(2) }));
      });
  }, [withdrawalForm.amount]);

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
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
      !withdrawalForm.card_number ||
      !withdrawalForm.amount ||
      !withdrawalForm.customer_name ||
      !withdrawalForm.settlement_account_id
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
        type: "withdrawal",
        card_number: withdrawalForm.card_number,
        settlement_account_id: withdrawalForm.settlement_account_id,
        customer_name: withdrawalForm.customer_name,
        customer_phone: withdrawalForm.customer_phone,
        amount: Number.parseFloat(withdrawalForm.amount),
        fee: withdrawalForm.fee ? Number.parseFloat(withdrawalForm.fee) : 0,
        note: withdrawalForm.notes,
        user_id: user.id,
        branch_id: user.branchId,
        processed_by: user.name || user.id,
      };

      const response = await fetch("/api/e-zwich/transaction", {
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
          id: result.transaction?.id || `ezw-${Date.now()}`,
          status: "completed",
          created_at: new Date().toISOString(),
        });
        setShowReceiptDialog(true);

        // Reset form
        setWithdrawalForm({
          card_number: "",
          amount: "",
          fee: "",
          customer_name: "",
          customer_phone: "",
          settlement_account_id: "",
          notes: "",
        });

        // Refresh data
        loadTransactions();
        loadFloatAccounts();
        refreshStatistics();

        toast({
          title: "Transaction Successful",
          description: "E-Zwich withdrawal processed successfully",
        });
      } else {
        toast({
          title: "Transaction Failed",
          description: result.error || "Failed to process withdrawal",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      toast({
        title: "Transaction Failed",
        description: "Failed to process withdrawal",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettleBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.branchId || !user?.id) {
      toast({
        title: "Error",
        description: "Branch ID is required",
        variant: "destructive",
      });
      return;
    }

    if (!settleForm.amount || !settleForm.settlement_account_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const settlementData = {
        branchId: user.branchId,
        partnerAccountId: settleForm.partner_account_id,
        amount: Number.parseFloat(settleForm.amount),
        reference:
          settleForm.reference ||
          `End-of-day settlement ${new Date().toISOString().split("T")[0]}`,
        processedBy: user.name || user.id,
        userId: user.id,
      };

      const response = await fetch("/api/e-zwich/settlement/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settlementData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Settlement Successful",
          description: `E-Zwich balance of ${formatCurrency(
            Number.parseFloat(settleForm.amount)
          )} settled successfully`,
        });

        // Reset form and close dialog
        setSettleForm({
          amount: "",
          settlement_account_id: "",
          partner_account_id: "",
          notes: "",
          reference: "",
        });
        setShowSettleDialog(false);

        // Refresh data
        loadFloatAccounts();
        refreshStatistics();
      } else {
        toast({
          title: "Settlement Failed",
          description: result.error || "Failed to process settlement",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing settlement:", error);
      toast({
        title: "Settlement Failed",
        description: "Failed to process settlement",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    console.log("🔧 [EZWICH-EDIT] Transaction clicked:", transaction);
    // Map the transaction data to match what the dialog expects (snake_case)
    const mappedTransaction = {
      ...transaction,
      customer_name: transaction.customer_name,
      created_at: transaction.created_at,
      transaction_type: transaction.type,
    };
    setSelectedTransaction(mappedTransaction);
    setEditDialogOpen(true);
  };

  const handleDelete = async (transactionId: string) => {
    console.log("🗑️ [EZWICH-DELETE] Transaction ID clicked:", transactionId);
    // Find the transaction by ID
    const transaction = transactions.find((t) => t.id === transactionId);
    if (transaction) {
      const mappedTransaction = {
        ...transaction,
        customer_name: transaction.customer_name,
        created_at: transaction.created_at,
        transaction_type: transaction.type,
      };
      setSelectedTransaction(mappedTransaction);
      setDeleteDialogOpen(true);
    }
  };

  // Handle successful edit/delete
  const handleTransactionSuccess = () => {
    loadTransactions();
    loadFloatAccounts();
    refreshStatistics();
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
              <title>E-Zwich Receipt</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt { max-width: 300px; margin: 0 auto; }
                .center { text-align: center; }
                .line { border-bottom: 1px solid #000; margin: 10px 0; }
                .row { display: flex; justify-content: space-between; margin: 5px 0; }
                .logo { width: 60px; height: 60px; margin: 0 auto 10px; }
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
          <h1 className="text-3xl font-bold">E-Zwich Services</h1>
          <p className="text-muted-foreground">
            Manage E-Zwich withdrawals and card issuance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveTab("withdrawal")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Withdrawal
          </Button>
          <Button
            onClick={() => setActiveTab("card-issuance")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Card Issuance
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSettleDialog(true)}
            className="flex items-center gap-2"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Settle Balance
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
            <CreditCard className="h-4 w-4 text-muted-foreground" />
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
              Active Partners
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
          <TabsTrigger value="card-issuance">Card Issuance</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Withdrawal Form - 2 columns */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    E-Zwich Withdrawal
                  </CardTitle>
                  <CardDescription>
                    Process an E-Zwich card withdrawal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="card_number">Card Number *</Label>
                        <Input
                          id="card_number"
                          value={withdrawalForm.card_number}
                          onChange={(e) =>
                            setWithdrawalForm({
                              ...withdrawalForm,
                              card_number: e.target.value,
                            })
                          }
                          placeholder="Enter card number"
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
                          value={withdrawalForm.amount}
                          onChange={(e) =>
                            setWithdrawalForm({
                              ...withdrawalForm,
                              amount: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customer_name">Customer Name *</Label>
                        <Input
                          id="customer_name"
                          value={withdrawalForm.customer_name}
                          onChange={(e) =>
                            setWithdrawalForm({
                              ...withdrawalForm,
                              customer_name: e.target.value,
                            })
                          }
                          placeholder="Enter customer name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customer_phone">Customer Phone</Label>
                        <Input
                          id="customer_phone"
                          value={withdrawalForm.customer_phone}
                          onChange={(e) =>
                            setWithdrawalForm({
                              ...withdrawalForm,
                              customer_phone: e.target.value,
                            })
                          }
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="settlement_account_id">
                          Settlement Account *
                        </Label>
                        <Select
                          value={withdrawalForm.settlement_account_id}
                          onValueChange={(value) =>
                            setWithdrawalForm({
                              ...withdrawalForm,
                              settlement_account_id: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select settlement account" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(floatAccounts) &&
                            floatAccounts.length > 0 ? (
                              floatAccounts
                                .filter(
                                  (account: any) =>
                                    // account.isezwichpartner === true &&
                                    account.account_type === "e-zwich" &&
                                    account.is_active
                                )
                                .map((account: any) => (
                                  <SelectItem
                                    key={account.id}
                                    value={account.id}
                                  >
                                    {account.provider} -{" "}
                                    {formatCurrency(account.current_balance)}
                                    {account.current_balance <
                                      account.min_threshold && (
                                      <span className="ml-2 text-red-600">
                                        (Low)
                                      </span>
                                    )}
                                  </SelectItem>
                                ))
                            ) : (
                              <></>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="withdrawal_fee">Fee (GHS)</Label>
                        <Input
                          id="withdrawal_fee"
                          type="number"
                          value={withdrawalForm.fee || ""}
                          // readOnly
                          // disabled
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={withdrawalForm.notes}
                        onChange={(e) =>
                          setWithdrawalForm({
                            ...withdrawalForm,
                            notes: e.target.value,
                          })
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
                          Process Withdrawal
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
                selectedProvider={withdrawalForm.settlement_account_id}
                floatAccounts={floatAccounts}
                serviceType="e-zwich"
                onRefresh={loadFloatAccounts}
                isLoading={loadingFloats}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="card-issuance" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <EnhancedCardIssuanceForm
                allFloatAccounts={
                  Array.isArray(floatAccounts) ? floatAccounts : []
                }
                onSuccess={(data) => {
                  setCurrentTransaction({
                    ...data,
                    id: data.id || `card-${Date.now()}`,
                    type: "card_issuance",
                    status: "completed",
                    created_at: new Date().toISOString(),
                  });
                  setShowReceiptDialog(true);
                  loadTransactions();
                  refreshStatistics();
                }}
              />
            </div>

            {/* Float Display - 1 column */}
            <div className="lg:col-span-1">
              <DynamicFloatDisplay
                selectedProvider={withdrawalForm.settlement_account_id}
                floatAccounts={floatAccounts}
                serviceType="e-zwich"
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
                    All E-Zwich transactions and card issuances
                  </CardDescription>
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
                  <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Transactions Found
                  </h3>
                  <p className="text-muted-foreground">
                    No E-Zwich transactions have been processed yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Card Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {format(
                            new Date(tx.created_at),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </TableCell>
                        <TableCell>
                          {tx.type === "withdrawal"
                            ? "Withdrawal"
                            : "Card Issuance"}
                        </TableCell>
                        <TableCell>{tx.card_number}</TableCell>
                        <TableCell>{tx.customer_name}</TableCell>
                        <TableCell>
                          {tx.type === "withdrawal"
                            ? `GHS ${tx.amount}`
                            : `GHS ${tx.amount}`}
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setCurrentTransaction(tx);
                                setShowReceiptDialog(true);
                              }}
                              title="View"
                            >
                              <Eye className="w-5 h-5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(tx)}
                              title="Edit"
                            >
                              <Edit className="w-5 h-5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={printReceipt}
                              title="Print"
                            >
                              <Printer className="w-5 h-5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(tx.id)}
                              title="Delete"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-5 h-5" />
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

      {/* Settlement Dialog */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Settle E-Zwich Balance
            </DialogTitle>
            <DialogDescription>
              Transfer E-Zwich balance to partner account
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSettleBalance} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settle_amount">Amount (GHS) *</Label>
              <Input
                id="settle_amount"
                type="number"
                step="0.01"
                min="0"
                value={settleForm.amount}
                onChange={(e) =>
                  setSettleForm({ ...settleForm, amount: e.target.value })
                }
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settle_account">
                Settlement Account (From) *
              </Label>
              <Select
                value={settleForm.settlement_account_id}
                onValueChange={(value) =>
                  setSettleForm({ ...settleForm, settlement_account_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select settlement account" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(floatAccounts) &&
                    floatAccounts
                      .filter(
                        (account: any) =>
                          // account.isezwichpartner === true &&
                          account.account_type === "e-zwich" &&
                          account.is_active
                      )
                      .map((account: any) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.provider} -{" "}
                          {formatCurrency(account.current_balance)}
                          {account.current_balance < account.min_threshold && (
                            <span className="ml-2 text-red-600">(Low)</span>
                          )}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner_account">Partner Account (To) *</Label>
              <Select
                value={settleForm.partner_account_id}
                onValueChange={(value) =>
                  setSettleForm({ ...settleForm, partner_account_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select partner account" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(floatAccounts) &&
                    floatAccounts
                      .filter(
                        (account: any) =>
                          account.isezwichpartner === true &&
                          account.account_type === "agency-banking" &&
                          account.is_active
                      )
                      .map((account: any) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.provider} -{" "}
                          {formatCurrency(account.current_balance)}
                          {account.current_balance < account.min_threshold && (
                            <span className="ml-2 text-red-600">(Low)</span>
                          )}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settle_notes">Notes (Optional)</Label>
              <Textarea
                id="settle_notes"
                value={settleForm.notes}
                onChange={(e) =>
                  setSettleForm({ ...settleForm, notes: e.target.value })
                }
                placeholder="Settlement notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSettleDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Settle Balance"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              E-Zwich Receipt
            </DialogTitle>
            <DialogDescription>
              Transaction completed successfully
            </DialogDescription>
          </DialogHeader>
          {currentTransaction && (
            <div id="receipt-content" className="space-y-4">
              <div className="text-center border-b pb-4">
                <img
                  src="/logo.png"
                  alt="MIMHAAD Logo"
                  className="w-16 h-16 mx-auto mb-2"
                />
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
                {currentTransaction.customer_phone && (
                  <div className="flex justify-between text-sm">
                    <span>Phone Number:</span>
                    <span>{currentTransaction.customer_phone}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Transaction Type:</span>
                  <span className="capitalize">{currentTransaction.type}</span>
                </div>
                {currentTransaction.card_number && (
                  <div className="flex justify-between text-sm">
                    <span>Card Number:</span>
                    <span>{currentTransaction.card_number}</span>
                  </div>
                )}
                {currentTransaction.amount && (
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Amount:</span>
                    <span>{formatCurrency(currentTransaction.amount)}</span>
                  </div>
                )}
                {currentTransaction.fee && (
                  <div className="flex justify-between text-sm">
                    <span>Fee:</span>
                    <span>{formatCurrency(currentTransaction.fee)}</span>
                  </div>
                )}
                {currentTransaction.partner_bank && (
                  <div className="flex justify-between text-sm">
                    <span>Partner Bank:</span>
                    <span>{currentTransaction.partner_bank}</span>
                  </div>
                )}
                {currentTransaction.payment_method && (
                  <div className="flex justify-between text-sm">
                    <span>Payment Method:</span>
                    <span>{currentTransaction.payment_method}</span>
                  </div>
                )}
                {currentTransaction.reference && (
                  <div className="flex justify-between text-sm">
                    <span>Reference:</span>
                    <span>{currentTransaction.reference}</span>
                  </div>
                )}
                {currentTransaction.status && (
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <span>{currentTransaction.status}</span>
                  </div>
                )}
                {currentTransaction.created_at && (
                  <div className="flex justify-between text-sm">
                    <span>Date:</span>
                    <span>
                      {format(new Date(currentTransaction.created_at), "PPP p")}
                    </span>
                  </div>
                )}
              </div>
              {/* Show images if card issuance and images exist */}
              {currentTransaction.type === "card_issuance" &&
                (currentTransaction.customer_photo ||
                  currentTransaction.id_front_image ||
                  currentTransaction.id_back_image) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {currentTransaction.customer_photo && (
                      <div className="flex flex-col items-center">
                        <div className="font-semibold mb-1">Customer Photo</div>
                        <img
                          src={
                            typeof currentTransaction.customer_photo ===
                            "string"
                              ? currentTransaction.customer_photo
                              : URL.createObjectURL(
                                  currentTransaction.customer_photo
                                )
                          }
                          alt="Customer Photo"
                          className="w-32 h-32 object-cover rounded border shadow"
                        />
                      </div>
                    )}
                    {currentTransaction.id_front_image && (
                      <div className="flex flex-col items-center">
                        <div className="font-semibold mb-1">ID Front Image</div>
                        <img
                          src={
                            typeof currentTransaction.id_front_image ===
                            "string"
                              ? currentTransaction.id_front_image
                              : URL.createObjectURL(
                                  currentTransaction.id_front_image
                                )
                          }
                          alt="ID Front"
                          className="w-32 h-32 object-cover rounded border shadow"
                        />
                      </div>
                    )}
                    {currentTransaction.id_back_image && (
                      <div className="flex flex-col items-center">
                        <div className="font-semibold mb-1">ID Back Image</div>
                        <img
                          src={
                            typeof currentTransaction.id_back_image === "string"
                              ? currentTransaction.id_back_image
                              : URL.createObjectURL(
                                  currentTransaction.id_back_image
                                )
                          }
                          alt="ID Back"
                          className="w-32 h-32 object-cover rounded border shadow"
                        />
                      </div>
                    )}
                  </div>
                )}
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

      {/* Edit Transaction Dialog */}
      <TransactionEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        transaction={selectedTransaction}
        sourceModule="e_zwich"
        onSuccess={handleTransactionSuccess}
      />

      {/* Delete Transaction Dialog */}
      <TransactionDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        transaction={selectedTransaction}
        sourceModule="e_zwich"
        onSuccess={handleTransactionSuccess}
      />
    </div>
  );
}
