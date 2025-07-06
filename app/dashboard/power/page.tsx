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
import { useBranchFloatAccountsFixed } from "@/hooks/use-branch-float-accounts-fixed";
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

  const {
    accounts: floatAccounts,
    loading: isLoadingAccounts,
    refetch: refreshAccounts,
  } = useBranchFloatAccountsFixed();

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

  // Debug logging
  console.log("🔍 [POWER] All float accounts:", floatAccounts.length);
  console.log("🔍 [POWER] Power floats found:", powerFloats.length);
  powerFloats.forEach((account) => {
    console.log(
      `  - ${account.provider} (${account.account_type}): GHS ${account.current_balance}`
    );
  });

  // When preparing floatAccounts for DynamicFloatDisplay, include both power floats and cash in till accounts:
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

  // Debug logging when float accounts load
  useEffect(() => {
    console.log("🔍 [POWER] Float accounts loaded:", floatAccounts.length);
    console.log(
      "🔍 [POWER] All accounts:",
      floatAccounts.map((acc) => ({
        provider: acc.provider,
        account_type: acc.account_type,
        is_active: acc.is_active,
        balance: acc.current_balance,
      }))
    );
  }, [floatAccounts]);

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
        form.reset();
        setCalculatedFee(0);
        refreshAccounts();
        handlePrintReceipt(result.transaction);
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
      fetch(`/api/power/transactions?branchId=${user.branchId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.transactions)) {
            setTransactions(data.transactions);
          } else {
            setTransactions([]);
          }
        });

      // Fetch statistics
      fetch(`/api/power/statistics?branchId=${user.branchId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStatistics(data.data);
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
      const response = await fetch(
        `/api/power/transactions/${currentTransaction.id}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Transaction Deleted",
          description: "Transaction has been deleted successfully",
        });
        setShowDeleteDialog(false);
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
  const handlePrintReceipt = (tx: any) => {
    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) return;
    const receiptContent = `<!DOCTYPE html><html><head><title>Power Sale Receipt</title><style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; } .header { text-align: center; margin-bottom: 20px; } .logo { width: 60px; height: 60px; margin: 0 auto 10px; } .line { border-bottom: 1px dashed #000; margin: 10px 0; } .row { display: flex; justify-content: space-between; margin: 5px 0; } .footer { text-align: center; margin-top: 20px; font-size: 10px; }</style></head><body><div class='header'><h3>MIMHAAD FINANCIAL SERVICES</h3><p>${
      user?.branchName || ""
    }</p><p>Tel: 0241378880</p><p>${
      tx.created_at ? new Date(tx.created_at).toLocaleString() : ""
    }</p></div><div class='line'></div><h4 style='text-align: center;'>POWER SALE RECEIPT</h4><div class='line'></div><div class='row'><span>Transaction ID:</span><span>${
      tx.id
    }</span></div><div class='row'><span>Meter Number:</span><span>${
      tx.meter_number
    }</span></div><div class='row'><span>Provider:</span><span>${
      tx.provider
    }</span></div><div class='row'><span>Amount:</span><span>GHS ${Number(
      tx.amount
    ).toFixed(2)}</span></div><div class='row'><span>Customer:</span><span>${
      tx.customer_name || "-"
    }</span></div><div class='row'><span>Phone:</span><span>${
      tx.customer_phone || "-"
    }</span></div><div class='line'></div><div class='footer'><p>Thank you for using our service!</p><p>For inquiries, please call 0241378880</p><p>Powered by MIMHAAD Financial Services</p></div></body></html>`;
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8" />
            Power Services - Fixed
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
              <Card>
                <CardHeader>
                  <CardTitle>Process Power Transaction</CardTitle>
                  <CardDescription>
                    Process electricity bill payments for customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Meter Number */}
                        <FormField
                          control={form.control}
                          name="meterNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Meter Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter meter number"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Power Provider */}
                        <FormField
                          control={form.control}
                          name="floatAccountId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Power Provider</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select power provider" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {powerFloats.map((float) => {
                                    const status = getFloatStatus(
                                      float.current_balance,
                                      float.min_threshold
                                    );
                                    return (
                                      <SelectItem
                                        key={float.id}
                                        value={float.id}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <span>{float.provider}</span>
                                          <div className="flex items-center gap-2 ml-2">
                                            <Badge
                                              variant={status.color as any}
                                              className="text-xs"
                                            >
                                              {status.label}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                              {formatCurrency(
                                                float.current_balance
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer Name */}
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Name (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter customer name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Customer Phone */}
                        <FormField
                          control={form.control}
                          name="customerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter customer phone"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Amount */}
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount (GHS)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="1"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Reference */}
                        <FormField
                          control={form.control}
                          name="reference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reference (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Auto-generated if empty"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Fee Display */}

                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Transaction Fee:
                          </span>
                          <span className="font-bold">
                            {formatCurrency(calculatedFee)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm font-medium">
                            Total Required:
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(watchedAmount + calculatedFee)}
                          </span>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Zap className="mr-2 h-4 w-4" />
                            Process Power Transaction
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Float Balances Sidebar */}
            <div className="space-y-4">
              <DynamicFloatDisplay
                selectedProvider={(() => {
                  const selectedFloat = powerFloats.find(
                    (f) => f.id === form.watch("floatAccountId")
                  );
                  return selectedFloat?.provider;
                })()}
                floatAccounts={allRelevantFloats.map((acc) => ({
                  ...acc,
                  account_name: acc.account_number || acc.provider || "",
                }))}
                serviceType="Power"
                onRefresh={refreshAccounts}
                isLoading={isLoadingAccounts}
              />
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
                            {tx.created_at
                              ? new Date(tx.created_at).toLocaleString()
                              : "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {tx.meter_number}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {tx.provider}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-semibold text-green-700">
                            GHS {Number(tx.amount).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {tx.customer_name || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                tx.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {tx.status || "-"}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <TransactionActions
                              transaction={tx}
                              userRole={user?.role || "Operation"}
                              sourceModule="power"
                              onSuccess={() => {
                                // Refresh transactions
                                if (user?.branchId) {
                                  fetch(
                                    `/api/power/transactions?branchId=${user.branchId}`
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
    </div>
  );
}
