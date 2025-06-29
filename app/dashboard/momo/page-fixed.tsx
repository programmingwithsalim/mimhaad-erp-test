"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, isValid, parseISO } from "date-fns";
import {
  Download,
  RefreshCw,
  Printer,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Building2,
  DollarSign,
  Edit,
  Trash2,
  Smartphone,
  Loader2,
  TrendingDown,
  Users,
} from "lucide-react";

// Import the export utilities at the top
import { exportToCSV, formatTransactionForExport } from "@/lib/export-utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/currency";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BranchIndicator } from "@/components/branch/branch-indicator";
import { useBranchFloatAccounts } from "@/hooks/use-branch-float-accounts";
import { useBranchTransactions } from "@/hooks/use-branch-transactions";
import { BranchFloatDisplay } from "@/components/shared/branch-float-display";
import { useCashInTillEnhanced } from "@/hooks/use-cash-in-till-enhanced";
import { TransactionEditDialog } from "@/components/shared/transaction-edit-dialog";
import { TransactionDeleteDialog } from "@/components/shared/transaction-delete-dialog";
import { TransactionReceipt } from "@/components/shared/transaction-receipt";
import { useServiceStatistics } from "@/hooks/use-service-statistics";

// Transaction interface
interface MoMoTransaction {
  id: string;
  date: string;
  customerName: string;
  phoneNumber: string;
  amount: number;
  fee: number;
  type: "cash-in" | "cash-out";
  provider: string;
  reference?: string;
  status: string;
  branchId: string;
  userId: string;
  cashTillAffected: number;
  floatAffected: number;
}

// Transaction form schema
const transactionFormSchema = z.object({
  transactionType: z.enum(["cash-in", "cash-out"]),
  customerName: z.string().min(2, {
    message: "Customer name must be at least 2 characters.",
  }),
  phoneNumber: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }),
  amount: z.string().refine(
    (value) => {
      const num = Number(value);
      return !isNaN(num) && num > 0;
    },
    {
      message: "Amount must be a valid number greater than zero.",
    }
  ),
  fee: z.string().optional(),
  provider: z.string().min(1, { message: "Provider is required" }),
  reference: z.string().optional(),
});

type FormValues = z.infer<typeof transactionFormSchema>;

export default function MoMoPageFixed() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("new");
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  // New unified dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const [feeCalculation, setFeeCalculation] = useState(null);

  // Get current authenticated user
  const {
    user: currentUser,
    isLoading: isLoadingUser,
    error: userError,
  } = useCurrentUser();

  // Use branch-aware hooks
  const {
    accounts: floatAccounts,
    loading: isLoadingFloatAccounts,
    error: floatAccountsError,
    refetch: refreshFloatAccounts,
  } = useBranchFloatAccounts();

  const {
    transactions,
    stats: momoStats,
    loading: isLoadingTransactions,
    error: transactionsError,
    refetch: fetchTransactions,
  } = useBranchTransactions("momo");

  const {
    cashAccount,
    isLoading: isCashLoading,
    error: cashError,
    refreshCashTill,
  } = useCashInTillEnhanced(currentUser?.branchId);

  const {
    statistics,
    floatAlerts,
    isLoading: statsLoading,
    refreshStatistics,
  } = useServiceStatistics("momo");

  // Filter MoMo accounts - FIXED to include all MoMo providers including Z-Pay
  const momoAccounts = useMemo(() => {
    return floatAccounts.filter(
      (account) =>
        account.account_type === "momo" &&
        account.is_active &&
        ([
          "mtn",
          "vodafone",
          "airteltigo",
          "telecel",
          "zpay",
          "z-pay",
          "momo",
        ].some((provider) =>
          account.provider.toLowerCase().includes(provider)
        ) ||
          account.provider.toLowerCase().includes("mobile") ||
          account.provider.toLowerCase().includes("money"))
    );
  }, [floatAccounts]);

  // Form initialization
  const form = useForm<FormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      transactionType: "cash-in",
      customerName: "",
      phoneNumber: "",
      amount: "",
      fee: "",
      provider: "",
      reference: "",
    },
  });

  // Watch form values for fee calculation
  const watchAmount = form.watch("amount");
  const watchTransactionType = form.watch("transactionType");

  // Calculate fee based on amount and transaction type
  const calculateFee = async () => {
    if (!watchAmount || Number(watchAmount) <= 0) return;

    try {
      const response = await fetch("/api/momo/calculate-fee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(watchAmount),
          type: watchTransactionType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          form.setValue("fee", data.fee.toString());
          setFeeCalculation(data);
        } else {
          // Fallback to default fee calculation
          const fallbackFee = calculateFallbackFee(
            Number(watchAmount),
            watchTransactionType
          );
          form.setValue("fee", fallbackFee.toString());
        }
      } else {
        // Fallback to default fee calculation
        const fallbackFee = calculateFallbackFee(
          Number(watchAmount),
          watchTransactionType
        );
        form.setValue("fee", fallbackFee.toString());
      }
    } catch (error) {
      console.error("Error calculating fee:", error);
      // Fallback to default fee calculation
      const fallbackFee = calculateFallbackFee(
        Number(watchAmount),
        watchTransactionType
      );
      form.setValue("fee", fallbackFee.toString());
    }
  };

  // Auto-calculate fee when amount or transaction type changes
  useEffect(() => {
    if (watchAmount && Number(watchAmount) > 0) {
      calculateFee();
    }
  }, [watchAmount, watchTransactionType]);

  const calculateFallbackFee = (amount: number, transactionType: string) => {
    // Default fee calculation logic
    if (transactionType === "cash-in") {
      return Math.min(amount * 0.01, 10); // 1% up to GHS 10
    } else {
      return Math.min(amount * 0.015, 15); // 1.5% up to GHS 15
    }
  };

  // Process transaction - FIXED error handling
  const onSubmit = async (data: FormValues) => {
    setIsProcessing(true);

    try {
      if (!currentUser?.branchId) {
        throw new Error("Branch ID not found");
      }

      const selectedAccount = momoAccounts.find(
        (acc) => acc.provider === data.provider
      );
      if (!selectedAccount) {
        throw new Error("Selected provider account not found");
      }

      const requestData = {
        type: data.transactionType,
        amount: Number(data.amount),
        fee: Number(data.fee || 0),
        customer_name: data.customerName,
        phone_number: data.phoneNumber,
        float_account_id: selectedAccount.id,
        reference: data.reference || `MOMO-${Date.now()}`,
        user_id: currentUser.id,
        processed_by:
          currentUser.username || currentUser.fullName || "Unknown User",
        branch_id: currentUser.branchId,
      };

      console.log("🔷 [MOMO] Submitting request:", requestData);

      const response = await fetch(
        `/api/momo/branch/${currentUser.branchId}/transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": currentUser.id,
            "x-user-name":
              currentUser.username || currentUser.fullName || "Unknown User",
            "x-user-role": currentUser.role || "user",
            "x-branch-id": currentUser.branchId,
            "x-branch-name": currentUser.branchName || "Unknown Branch",
          },
          body: JSON.stringify(requestData),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Transaction Created Successfully",
          description: `${
            data.transactionType === "cash-in" ? "Cash-in" : "Cash-out"
          } of ${formatCurrency(Number(data.amount))} processed for ${
            data.customerName
          }`,
        });

        // Reset form
        form.reset();
        setFeeCalculation(null);

        // Refresh data
        fetchTransactions();
        refreshFloatAccounts();
        refreshCashTill();
        refreshStatistics();

        // Show receipt
        setCurrentTransaction({
          transactionId: result.transaction?.id || `momo-${Date.now()}`,
          sourceModule: "momo",
          transactionType: data.transactionType,
          amount: Number(data.amount),
          fee: Number(data.fee || 0),
          customerName: data.customerName,
          reference: data.reference,
          branchName: currentUser.branchName || "Unknown Branch",
          date: new Date().toISOString(),
          additionalData: {
            phoneNumber: data.phoneNumber,
            provider: data.provider,
          },
        });
        setShowReceiptDialog(true);
      } else {
        throw new Error(result.error || "Failed to create transaction");
      }
    } catch (error) {
      console.error("❌ [MOMO] Error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle edit transaction
  const handleEditTransaction = (transaction: any) => {
    console.log("🔧 [EDIT] Transaction clicked:", transaction);
    console.log("🔧 [EDIT] Current state - editDialogOpen:", editDialogOpen);
    console.log(
      "🔧 [EDIT] Current state - selectedTransaction:",
      selectedTransaction
    );

    // Map the transaction data to match what the dialog expects (snake_case)
    const mappedTransaction = {
      ...transaction,
      customer_name: transaction.customerName,
      phone_number: transaction.phoneNumber,
      created_at: transaction.date,
      transaction_type: transaction.type,
    };
    console.log("🔧 [EDIT] Mapped transaction:", mappedTransaction);

    setSelectedTransaction(mappedTransaction);
    console.log("🔧 [EDIT] Set selectedTransaction");

    setEditDialogOpen(true);
    console.log("🔧 [EDIT] Set editDialogOpen to true");
  };

  // Handle delete transaction
  const handleDeleteTransaction = (transaction: any) => {
    console.log("🗑️ [DELETE] Transaction clicked:", transaction);
    console.log(
      "🗑️ [DELETE] Current state - deleteDialogOpen:",
      deleteDialogOpen
    );
    console.log(
      "🗑️ [DELETE] Current state - selectedTransaction:",
      selectedTransaction
    );

    // Map the transaction data to match what the dialog expects (snake_case)
    const mappedTransaction = {
      ...transaction,
      customer_name: transaction.customerName,
      phone_number: transaction.phoneNumber,
      created_at: transaction.date,
      transaction_type: transaction.type,
    };
    console.log("🗑️ [DELETE] Mapped transaction:", mappedTransaction);

    setSelectedTransaction(mappedTransaction);
    console.log("🗑️ [DELETE] Set selectedTransaction");

    setDeleteDialogOpen(true);
    console.log("🗑️ [DELETE] Set deleteDialogOpen to true");
  };

  // Handle successful edit/delete
  const handleTransactionSuccess = () => {
    fetchTransactions();
    refreshStatistics();
    refreshFloatAccounts();
    refreshCashTill();
  };

  // Refresh all data
  const refreshAllData = useCallback(() => {
    fetchTransactions();
    refreshFloatAccounts();
    refreshCashTill();
    refreshStatistics();
  }, [
    fetchTransactions,
    refreshFloatAccounts,
    refreshCashTill,
    refreshStatistics,
  ]);

  // Load initial data
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "MMM dd, yyyy HH:mm");
  };

  const getTransactionTypeBadge = (type: string) => {
    return (
      <Badge variant={type === "cash-in" ? "default" : "secondary"}>
        {type === "cash-in" ? "Cash In" : "Cash Out"}
      </Badge>
    );
  };

  const printReceipt = (transaction: any) => {
    setCurrentTransaction({
      transactionId: transaction.id,
      sourceModule: "momo",
      transactionType: transaction.type,
      amount: transaction.amount,
      fee: transaction.fee,
      customerName: transaction.customerName,
      reference: transaction.reference,
      branchName: transaction.branchName || "Unknown Branch",
      date: transaction.date,
      additionalData: {
        phoneNumber: transaction.phoneNumber,
        provider: transaction.provider,
      },
    });
    setShowReceiptDialog(true);
  };

  const exportTransactions = () => {
    if (!transactions || transactions.length === 0) {
      toast({
        title: "No Data",
        description: "No transactions to export",
        variant: "destructive",
      });
      return;
    }

    const formattedTransactions = transactions.map((tx) =>
      formatTransactionForExport({
        id: tx.id,
        date: tx.date,
        customerName: tx.customerName,
        phoneNumber: tx.phoneNumber,
        type: tx.type,
        provider: tx.provider,
        amount: tx.amount,
        fee: tx.fee,
        status: tx.status,
        reference: tx.reference,
      })
    );

    exportToCSV(
      formattedTransactions,
      `momo-transactions-${new Date().toISOString().split("T")[0]}`
    );
  };

  // Loading states
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading user data...</span>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Error loading user data: {userError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mobile Money</h1>
          <p className="text-muted-foreground">
            Process mobile money transactions and manage float accounts
          </p>
        </div>
        <BranchIndicator />
      </div>

      {/* Test Section for Debugging */}
      <div className="p-4 border rounded-lg bg-yellow-50">
        <h3 className="font-semibold mb-2">🧪 Debug Test Section</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("🧪 [TEST] Edit dialog test clicked");
              const testTransaction = {
                id: "test-123",
                customerName: "Test Customer",
                phoneNumber: "1234567890",
                amount: 100,
                fee: 5,
                type: "cash-in",
                provider: "MTN",
                date: new Date().toISOString(),
                status: "completed",
                customer_name: "Test Customer",
                phone_number: "1234567890",
                created_at: new Date().toISOString(),
                transaction_type: "cash-in",
              };
              setSelectedTransaction(testTransaction);
              setEditDialogOpen(true);
            }}
          >
            Test Edit Dialog
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("🧪 [TEST] Delete dialog test clicked");
              const testTransaction = {
                id: "test-123",
                customerName: "Test Customer",
                phoneNumber: "1234567890",
                amount: 100,
                fee: 5,
                type: "cash-in",
                provider: "MTN",
                date: new Date().toISOString(),
                status: "completed",
                customer_name: "Test Customer",
                phone_number: "1234567890",
                created_at: new Date().toISOString(),
                transaction_type: "cash-in",
              };
              setSelectedTransaction(testTransaction);
              setDeleteDialogOpen(true);
            }}
          >
            Test Delete Dialog
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("🧪 [TEST] Current state:", {
                editDialogOpen,
                deleteDialogOpen,
                selectedTransaction,
              });
            }}
          >
            Log State
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                statistics?.totalTransactions || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(statistics?.totalAmount || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total transaction value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(statistics?.totalFees || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total fees collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                statistics?.uniqueCustomers || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique customers served
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Float Alerts */}
      {floatAlerts.length > 0 && (
        <div className="space-y-2">
          {floatAlerts.map((alert, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Float Account Display */}
      <BranchFloatDisplay serviceType="momo" />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="new">New Transaction</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Create New Transaction</CardTitle>
              <CardDescription>
                Process a new mobile money transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionType">Transaction Type</Label>
                    <Select
                      value={form.watch("transactionType")}
                      onValueChange={(value) =>
                        form.setValue(
                          "transactionType",
                          value as "cash-in" | "cash-out"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash-in">Cash In</SelectItem>
                        <SelectItem value="cash-out">Cash Out</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.transactionType && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.transactionType.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select
                      value={form.watch("provider")}
                      onValueChange={(value) =>
                        form.setValue("provider", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {momoAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.provider}>
                            {account.provider} -{" "}
                            {formatCurrency(account.current_balance)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.provider && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.provider.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (GHS)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      {...form.register("amount")}
                    />
                    {form.formState.errors.amount && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.amount.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fee">Fee (GHS)</Label>
                    <Input
                      id="fee"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...form.register("fee")}
                    />
                    {form.formState.errors.fee && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.fee.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      placeholder="Enter customer name"
                      {...form.register("customerName")}
                    />
                    {form.formState.errors.customerName && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.customerName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="0241234567"
                      {...form.register("phoneNumber")}
                    />
                    {form.formState.errors.phoneNumber && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.phoneNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference (Optional)</Label>
                  <Input
                    id="reference"
                    placeholder="Enter reference number"
                    {...form.register("reference")}
                  />
                  {form.formState.errors.reference && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.reference.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Transaction...
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Process Transaction
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Input
                placeholder="Search transactions..."
                className="max-w-sm"
              />
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={refreshAllData}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportTransactions}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                {/* Test button for debugging */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log("🧪 [TEST] Test button clicked");
                    const testTransaction = {
                      id: "test-123",
                      customerName: "Test Customer",
                      phoneNumber: "1234567890",
                      amount: 100,
                      fee: 5,
                      type: "cash-in",
                      provider: "MTN",
                      date: new Date().toISOString(),
                      status: "completed",
                    };
                    console.log(
                      "🧪 [TEST] Setting test transaction:",
                      testTransaction
                    );
                    setSelectedTransaction(testTransaction);
                    setEditDialogOpen(true);
                  }}
                >
                  Test Edit
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTransactions ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      <div className="flex justify-center items-center">
                        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                        <span>Loading transactions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      <span className="text-sm text-muted-foreground">
                        No transactions available. Create a new transaction or
                        try refreshing.
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>{tx.customerName}</TableCell>
                      <TableCell>{tx.phoneNumber}</TableCell>
                      <TableCell>{getTransactionTypeBadge(tx.type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{tx.provider}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tx.fee)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.status === "completed"
                              ? "default"
                              : tx.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => printReceipt(tx)}
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {tx.status === "completed" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  console.log(
                                    "🔧 [EDIT-BUTTON] Clicked for transaction:",
                                    tx
                                  );
                                  handleEditTransaction(tx);
                                }}
                                title="Edit Transaction"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  console.log(
                                    "🗑️ [DELETE-BUTTON] Clicked for transaction:",
                                    tx
                                  );
                                  handleDeleteTransaction(tx);
                                }}
                                title="Delete Transaction"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
            <DialogDescription>
              Transaction details for printing
            </DialogDescription>
          </DialogHeader>
          {currentTransaction && (
            <TransactionReceipt
              data={currentTransaction}
              onPrint={() => {
                window.print();
                setShowReceiptDialog(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <TransactionEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        transaction={selectedTransaction}
        sourceModule="momo"
        onSuccess={handleTransactionSuccess}
      />

      {/* Delete Transaction Dialog */}
      <TransactionDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        transaction={selectedTransaction}
        sourceModule="momo"
        onSuccess={handleTransactionSuccess}
      />
    </div>
  );
}
