"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  RefreshCw,
  Zap,
  TrendingUp,
  Activity,
  Wallet,
  DollarSign,
  Printer,
  Edit,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useBranchFloatAccounts } from "@/hooks/use-branch-float-accounts";
import { useDynamicFee } from "@/hooks/use-dynamic-fee";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { DynamicFloatDisplay } from "@/components/shared/dynamic-float-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import {
  TransactionReceipt,
  TransactionReceiptData,
} from "@/components/shared/transaction-receipt";
import { EnhancedPowerTransactionForm } from "@/components/power/enhanced-power-transaction-form";

const powerTransactionSchema = z.object({
  meterNumber: z.string().min(1, "Meter number is required"),
  floatAccountId: z.string().min(1, "Power provider is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  reference: z.string().optional(),
});

type PowerTransactionFormData = z.infer<typeof powerTransactionSchema>;

export default function PowerPageEnhancedFixed() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedFee, setCalculatedFee] = useState<number>(0);
  const [statistics, setStatistics] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [receiptData, setReceiptData] = useState<TransactionReceiptData | null>(
    null
  );
  const [showReceipt, setShowReceipt] = useState(false);

  const {
    accounts: floatAccounts,
    loading: isLoadingAccounts,
    refetch: refreshAccounts,
  } = useBranchFloatAccounts();

  // Filter power accounts
  const powerFloats = floatAccounts.filter(
    (account) =>
      account.is_active &&
      (account.account_type === "power" ||
        account.provider.toLowerCase().includes("power") ||
        account.provider.toLowerCase().includes("electricity") ||
        account.provider.toLowerCase().includes("ecg") ||
        account.provider.toLowerCase().includes("nedco"))
  );

  // When preparing floatAccounts for DynamicFloatDisplay, show power float accounts and cash-in-till for the branch:
  const allRelevantFloats = [
    ...floatAccounts.filter(
      (acc) =>
        acc.is_active &&
        (acc.account_type === "power" ||
          acc.provider.toLowerCase().includes("power") ||
          acc.provider.toLowerCase().includes("electricity") ||
          acc.provider.toLowerCase().includes("ecg") ||
          acc.provider.toLowerCase().includes("nedco"))
    ),
    ...floatAccounts.filter(
      (acc) => acc.account_type === "cash-in-till" && acc.is_active
    ),
  ];

  const form = useForm<PowerTransactionFormData>({
    resolver: zodResolver(powerTransactionSchema),
    defaultValues: {
      meterNumber: "",
      floatAccountId: "",
      amount: 0,
      customerName: "",
      customerPhone: "",
      reference: "",
    },
  });

  const watchedAmount = form.watch("amount");
  const watchedFloatId = form.watch("floatAccountId");

  // Use dynamic fee calculation
  const { calculateFee } = useDynamicFee();

  // Calculate fee when amount or provider changes
  useEffect(() => {
    const fetchFee = async () => {
      if (watchedAmount && watchedAmount > 0) {
        try {
          const feeResult = await calculateFee(
            "power",
            "transaction",
            watchedAmount
          );
          setCalculatedFee(feeResult.fee);
        } catch (error) {
          console.error("Error calculating fee:", error);
          setCalculatedFee(Math.min(watchedAmount * 0.02, 10)); // 2% max 10 GHS fallback
        }
      } else {
        setCalculatedFee(0);
      }
    };

    fetchFee();
  }, [watchedAmount, calculateFee]);

  const onSubmit = async (data: PowerTransactionFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "User information not available. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    const selectedFloat = powerFloats.find((f) => f.id === data.floatAccountId);
    if (!selectedFloat) {
      toast({
        title: "Error",
        description: "Please select a power provider.",
        variant: "destructive",
      });
      return;
    }

    const totalRequired = data.amount + calculatedFee;
    if (selectedFloat.current_balance < totalRequired) {
      toast({
        title: "Insufficient Float Balance",
        description: `This transaction requires GHS ${totalRequired.toFixed(
          2
        )} but the float only has GHS ${selectedFloat.current_balance.toFixed(
          2
        )}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/transactions/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: "power",
          transactionType: "sale",
          amount: data.amount,
          fee: calculatedFee,
          customerName: data.customerName,
          phoneNumber: data.customerPhone,
          provider: selectedFloat.provider,
          reference: data.reference || `POWER-${Date.now()}`,
          notes: `Meter: ${data.meterNumber}`,
          branchId: user.branchId,
          userId: user.id,
          processedBy: user.name || user.username,
          metadata: {
            meter_number: data.meterNumber,
            float_account_id: data.floatAccountId,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process transaction");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Power transaction processed successfully",
        });

        // Set receipt data for shared component
        setReceiptData({
          transactionId: result.transaction.id,
          sourceModule: "power",
          transactionType: "sale",
          amount: data.amount,
          fee: calculatedFee,
          customerName: data.customerName || "",
          customerPhone: data.customerPhone || "",
          reference: result.transaction.reference || result.transaction.id,
          branchName: user?.branchName || "Main Branch",
          date: new Date().toISOString(),
          additionalData: {
            provider: selectedFloat.provider,
            meterNumber: data.meterNumber,
          },
        });
        setShowReceipt(true);

        form.reset();
        setCalculatedFee(0);
        // Refresh accounts and transactions
        await refreshAccounts();
        // Refetch transactions to show the new transaction
        const transactionResponse = await fetch(
          `/api/transactions/unified?branchId=${user.branchId}&serviceType=power&orderBy=created_at&orderDirection=desc`
        );
        const transactionData = await transactionResponse.json();
        if (
          transactionData.success &&
          Array.isArray(transactionData.transactions)
        ) {
          setTransactions(transactionData.transactions);
        }
      } else {
        throw new Error(result.error || "Failed to process transaction");
      }
    } catch (error) {
      console.error("Error processing power transaction:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to process transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFloatStatus = (current: number, min: number) => {
    if (current < min) return { label: "Critical", color: "destructive" };
    if (current < min * 1.5) return { label: "Low", color: "warning" };
    return { label: "Healthy", color: "success" };
  };

  useEffect(() => {
    if (user?.branchId) {
      console.log(
        "🔍 [POWER] Fetching transactions for branch:",
        user.branchId
      );

      // Fetch transactions from unified API
      fetch(
        `/api/transactions/unified?branchId=${user.branchId}&serviceType=power&orderBy=created_at&orderDirection=desc`
      )
        .then((res) => res.json())
        .then((data) => {
          console.log("🔍 [POWER] Transactions response:", data);
          if (data.success && Array.isArray(data.transactions)) {
            console.log(
              "🔍 [POWER] Setting transactions:",
              data.transactions.length
            );
            setTransactions(data.transactions);
          } else {
            console.log("🔍 [POWER] No transactions found or error:", data);
            setTransactions([]);
          }
        })
        .catch((error) => {
          console.error("Error fetching power transactions:", error);
          setTransactions([]);
        });

      console.log("🔍 [POWER] Fetching statistics for branch:", user.branchId);

      // Fetch statistics from unified API
      fetch(
        `/api/transactions/unified?branchId=${user.branchId}&serviceType=power&action=statistics`
      )
        .then((res) => res.json())
        .then((data) => {
          console.log("🔍 [POWER] Statistics response:", data);
          if (data.success) {
            console.log("🔍 [POWER] Setting statistics:", data.statistics);
            setStatistics(data.statistics);
          } else {
            console.log("🔍 [POWER] Statistics error:", data);
          }
        })
        .catch((error) => {
          console.error("Error fetching power statistics:", error);
        });
    }
  }, [user?.branchId]);

  const handleEdit = (tx: any) => {
    setCurrentTransaction(tx);
    setShowEditDialog(true);
  };
  const handleDelete = (tx: any) => {
    setCurrentTransaction(tx);
    setShowDeleteDialog(true);
  };
  const confirmDelete = async () => {
    if (!currentTransaction) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/unified`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          transactionId: currentTransaction.id,
          sourceModule: "power",
          reason: "User requested deletion",
          userId: user?.id,
          branchId: user?.branchId,
          processedBy: user?.name || user?.username,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Transaction Deleted",
          description: "Transaction has been deleted successfully",
        });
        setShowDeleteDialog(false);
        setCurrentTransaction(null);
        // Refresh transactions from unified API
        if (user?.branchId) {
          fetch(
            `/api/transactions/unified?branchId=${user.branchId}&serviceType=power&orderBy=created_at&orderDirection=desc`
          )
            .then((res) => res.json())
            .then((data) => {
              if (data.success && Array.isArray(data.transactions)) {
                setTransactions(data.transactions);
              } else {
                setTransactions([]);
              }
            });
        }
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
      setIsDeleting(false);
    }
  };
  const handleEditSubmit = async (updated: any) => {
    if (!currentTransaction) return;
    setIsEditing(true);
    try {
      const response = await fetch(
        `/api/power/transactions/${currentTransaction.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        }
      );
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Transaction Updated",
          description: "Transaction has been updated successfully",
        });
        setShowEditDialog(false);
        setCurrentTransaction(null);
        // Refresh transactions
        if (user?.branchId) {
          fetch(`/api/power/transactions?branchId=${user.branchId}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.success && Array.isArray(data.transactions)) {
                setTransactions(data.transactions);
              } else {
                setTransactions([]);
              }
            });
        }
      } else {
        toast({
          title: "Update Failed",
          description: result.error || "Failed to update transaction",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update transaction",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
            Completed
          </span>
        );
      case "pending":
        return (
          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
            Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
            Failed
          </span>
        );
      case "reversed":
        return (
          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
            Reversed
          </span>
        );
      case "deleted":
        return (
          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700 line-through">
            Deleted
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {status || "Unknown"}
          </span>
        );
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8" />
            Power Services
          </h1>
          <p className="text-muted-foreground">
            Manage electricity bill payments and power services
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAccounts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Providers
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{powerFloats.length}</div>
            <p className="text-xs text-muted-foreground">
              Available power providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Float Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                powerFloats.reduce((sum, acc) => sum + acc.current_balance, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined power float
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Transactions
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.summary?.completedCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Processed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statistics?.summary?.totalCommission || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Fees collected</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">New Transaction</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transaction Form */}
            <div className="lg:col-span-2">
              <EnhancedPowerTransactionForm
                powerFloats={powerFloats}
                user={user}
                onSuccess={(transaction) => {
                  // Refresh transactions after successful transaction
                  if (user?.branchId) {
                    fetch(
                      `/api/transactions/unified?branchId=${user.branchId}&serviceType=power&orderBy=created_at&orderDirection=desc`
                    )
                      .then((res) => res.json())
                      .then((data) => {
                        if (data.success && Array.isArray(data.transactions)) {
                          setTransactions(data.transactions);
                        }
                      });
                  }
                  refreshAccounts();
                }}
              />
            </div>

            {/* Float Balances Sidebar */}
            <div className="space-y-4">
              {/* Cash in Till Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cash in Till
                    </CardTitle>
                    <CardDescription>
                      Available cash for transactions
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshAccounts}
                    disabled={isLoadingAccounts}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        isLoadingAccounts ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      {(() => {
                        const cashAccount = floatAccounts.find(
                          (acc) =>
                            acc.account_type === "cash-in-till" && acc.is_active
                        );
                        return cashAccount
                          ? `GHS ${cashAccount.current_balance.toFixed(2)}`
                          : "GHS 0.00";
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Power Float Accounts */}
              {powerFloats.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Power Float Accounts
                      </CardTitle>
                      <CardDescription>
                        Available power provider floats
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {powerFloats.map((float) => (
                        <div
                          key={float.id}
                          className="flex justify-between items-center p-2 border rounded"
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {float.provider}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {float.account_number}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-600">
                              GHS {float.current_balance.toFixed(2)}
                            </div>
                            <Badge
                              variant={
                                float.current_balance < float.min_threshold
                                  ? "destructive"
                                  : float.current_balance <
                                    float.min_threshold * 1.5
                                  ? "secondary"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {float.current_balance < float.min_threshold
                                ? "Low"
                                : float.current_balance <
                                  float.min_threshold * 1.5
                                ? "Warning"
                                : "Healthy"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All Power transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    No transactions found. Process your first power transaction
                    to see history here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border rounded-lg bg-white">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">
                          Date
                        </th>
                        <th className="px-3 py-2 text-left font-semibold">
                          Meter Number
                        </th>
                        <th className="px-3 py-2 text-left font-semibold">
                          Provider
                        </th>
                        <th className="px-3 py-2 text-left font-semibold">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-left font-semibold">
                          Customer
                        </th>
                        <th className="px-3 py-2 text-left font-semibold">
                          Status
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx: any, idx: number) => (
                        <tr
                          key={tx.id}
                          className={
                            idx % 2 === 0
                              ? "bg-white hover:bg-gray-50"
                              : "bg-gray-50 hover:bg-gray-100"
                          }
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            {tx.date || tx.created_at
                              ? new Date(
                                  tx.date || tx.created_at
                                ).toLocaleString()
                              : "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {tx.meter_number ||
                              tx.metadata?.meter_number ||
                              "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {tx.provider}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-semibold text-green-700">
                            GHS {Number(tx.amount).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {tx.customerName || tx.customer_name || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {getStatusBadge(tx.status)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <TransactionActions
                              transaction={tx}
                              userRole={user?.role || "Operation"}
                              sourceModule="power"
                              onSuccess={() => {
                                // Refresh transactions from unified API
                                if (user?.branchId) {
                                  fetch(
                                    `/api/transactions/unified?branchId=${user.branchId}&serviceType=power&orderBy=created_at&orderDirection=desc`
                                  )
                                    .then((res) => res.json())
                                    .then((data) => {
                                      if (
                                        data.success &&
                                        Array.isArray(data.transactions)
                                      ) {
                                        setTransactions(data.transactions);
                                      } else {
                                        setTransactions([]);
                                      }
                                    });
                                }
                                refreshAccounts();
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Power Transaction</DialogTitle>
          </DialogHeader>
          {/* Add form fields for editing (meter number, amount, etc.) and a submit button that calls handleEditSubmit */}
          {/* ... */}
        </DialogContent>
      </Dialog>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction?
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={isDeleting}
          >
            Delete
          </Button>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
      <TransactionReceipt
        data={receiptData}
        open={showReceipt}
        onOpenChange={setShowReceipt}
      />
    </div>
  );
}
