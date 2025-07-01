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
  Zap,
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
} from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  meter_number: string;
  amount: number;
  customer_name: string;
  customer_phone?: string;
  provider: string;
  reference?: string;
  status: string;
  created_at: string;
}

export default function PowerPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const {
    statistics,
    floatAlerts,
    isLoading: statsLoading,
    refreshStatistics,
  } = useServiceStatistics("power");

  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [floatAccounts, setFloatAccounts] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingFloats, setLoadingFloats] = useState(false);
  const [activeTab, setActiveTab] = useState("payment");
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");

  const [paymentForm, setPaymentForm] = useState({
    meter_number: "",
    amount: "",
    customer_name: "",
    customer_phone: "",
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
        `/api/power/transactions?branchId=${user.branchId}&limit=50`
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
      console.error("Error loading power transactions:", error);
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
          setFloatAccounts(
            data.accounts.filter((a: any) => a.account_type === "power")
          );
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

  const handlePaymentSubmit = async (e: React.FormEvent) => {
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
      !paymentForm.meter_number ||
      !paymentForm.amount ||
      !paymentForm.customer_name ||
      !paymentForm.provider
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
        meter_number: paymentForm.meter_number,
        amount: Number.parseFloat(paymentForm.amount),
        customer_name: paymentForm.customer_name,
        customer_phone: paymentForm.customer_phone,
        provider: paymentForm.provider,
        reference: `PWR-${Date.now()}`,
        notes: paymentForm.notes,
        userId: user.id,
        branchId: user.branchId,
      };

      const response = await fetch("/api/power/transactions", {
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
        setPaymentForm({
          meter_number: "",
          amount: "",
          customer_name: "",
          customer_phone: "",
          provider: "",
          notes: "",
        });

        // Refresh data
        loadTransactions();
        loadFloatAccounts();
        refreshStatistics();

        toast({
          title: "Payment Successful",
          description: "Power bill payment processed successfully",
        });
      } else {
        toast({
          title: "Payment Failed",
          description: result.error || "Failed to process payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment Failed",
        description: "Failed to process payment",
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
      !window.confirm(
        "Are you sure you want to delete this transaction? This action cannot be undone."
      )
    )
      return;
    try {
      const response = await fetch(`/api/power/transactions/${transactionId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Transaction Deleted",
          description: "Transaction has been deleted successfully",
        });
        loadTransactions();
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
    }
  };

  const handleProviderChange = (provider: string) => {
    setPaymentForm((prev) => ({ ...prev, provider }));
    setSelectedProvider(provider);
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
              <title>Power Payment Receipt</title>
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
          <h1 className="text-3xl font-bold">Power Services</h1>
          <p className="text-muted-foreground">
            Manage electricity bill payments and float accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveTab("payment")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Payment
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              loadTransactions();
              loadFloatAccounts();
              refreshStatistics();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
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
              Today's Payments
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
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
          <TabsTrigger value="payment">Bill Payment</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Form - 2 columns */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Electricity Bill Payment
                  </CardTitle>
                  <CardDescription>
                    Process electricity bill payments for customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="meter_number">Meter Number *</Label>
                        <Input
                          id="meter_number"
                          value={paymentForm.meter_number}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              meter_number: e.target.value,
                            })
                          }
                          placeholder="Enter meter number"
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
                          value={paymentForm.amount}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
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
                          value={paymentForm.customer_name}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
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
                          value={paymentForm.customer_phone}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              customer_phone: e.target.value,
                            })
                          }
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="provider">Electricity Provider *</Label>
                        <Select
                          value={paymentForm.provider}
                          onValueChange={handleProviderChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ECG">ECG</SelectItem>
                            <SelectItem value="NEDCo">NEDCo</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={paymentForm.notes}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
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
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Process Payment
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
                selectedProvider={selectedProvider}
                floatAccounts={floatAccounts}
                serviceType="Power"
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
                  <CardDescription>All power bill payments</CardDescription>
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
                  <Zap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Transactions Found
                  </h3>
                  <p className="text-muted-foreground">
                    No power bill payments have been processed yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Meter Number</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Amount</TableHead>
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
                        <TableCell>{transaction.customer_name}</TableCell>
                        <TableCell>{transaction.meter_number}</TableCell>
                        <TableCell>{transaction.provider}</TableCell>
                        <TableCell>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
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
              Power Payment Receipt
            </DialogTitle>
            <DialogDescription>
              Payment completed successfully
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
                <div className="flex justify-between text-sm">
                  <span>Meter Number:</span>
                  <span>{currentTransaction.meter_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Provider:</span>
                  <span>{currentTransaction.provider}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(currentTransaction.amount)}</span>
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
