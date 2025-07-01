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
import { DynamicFloatDisplay } from "@/components/shared/dynamic-float-display";
import {
  Package,
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
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function JumiaPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const {
    statistics,
    floatAlerts,
    isLoading: statsLoading,
    refreshStatistics,
  } = useServiceStatistics("jumia");

  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [floatAccounts, setFloatAccounts] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingFloats, setLoadingFloats] = useState(false);
  const [activeTab, setActiveTab] = useState("package_receipt");

  const [packageForm, setPackageForm] = useState({
    tracking_id: "",
    customer_name: "",
    customer_phone: "",
    notes: "",
  });

  const [podForm, setPodForm] = useState({
    tracking_id: "",
    amount: "",
    customer_name: "",
    customer_phone: "",
    delivery_status: "delivered",
    payment_method: "cash",
    float_account_id: "",
    notes: "",
  });

  const [settlementForm, setSettlementForm] = useState({
    amount: "",
    reference: "",
    float_account_id: "",
    notes: "",
  });

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
        `/api/jumia/transactions?branchId=${user.branchId}&limit=50`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setTransactions(data.data);
        } else {
          setTransactions([]);
        }
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error loading Jumia transactions:", error);
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
          // Filter for active accounts that can be used for settlements
          const activeAccounts = data.accounts.filter(
            (account: any) =>
              account.is_active && account.account_type !== "cash-in-till"
          );
          setFloatAccounts(activeAccounts);
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

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.branchId || !user?.id) {
      toast({
        title: "Error",
        description: "Branch ID is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/jumia/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_type: "package_receipt",
          ...packageForm,
          amount: 0,
          branch_id: user.branchId,
          user_id: user.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Package Receipt Recorded",
          description: `Package ${packageForm.tracking_id} has been successfully recorded.`,
        });
        setPackageForm({
          tracking_id: "",
          customer_name: "",
          customer_phone: "",
          notes: "",
        });
        // Refresh data
        loadTransactions();
        refreshStatistics();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to record package receipt",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error recording package:", error);
      toast({
        title: "Error",
        description: "Failed to record package receipt",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.branchId || !user?.id) {
      toast({
        title: "Error",
        description: "Branch ID is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/jumia/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_type: "pod_collection",
          ...podForm,
          amount: Number.parseFloat(podForm.amount),
          branch_id: user.branchId,
          user_id: user.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Payment Collection Recorded",
          description: `Payment of ${formatCurrency(
            Number.parseFloat(podForm.amount)
          )} collected for tracking ID ${podForm.tracking_id}.`,
        });
        setPodForm({
          tracking_id: "",
          amount: "",
          customer_name: "",
          customer_phone: "",
          delivery_status: "delivered",
          payment_method: "cash",
          float_account_id: "",
          notes: "",
        });
        // Refresh data
        loadTransactions();
        loadFloatAccounts();
        refreshStatistics();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to record payment collection",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: "Failed to record payment collection",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettlementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.branchId || !user?.id) {
      toast({
        title: "Error",
        description: "Branch ID is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/jumia/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_type: "settlement",
          ...settlementForm,
          amount: Number.parseFloat(settlementForm.amount),
          branch_id: user.branchId,
          user_id: user.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Settlement Processed",
          description: `Settlement of ${formatCurrency(
            Number.parseFloat(settlementForm.amount)
          )} has been successfully processed.`,
        });
        setSettlementForm({
          amount: "",
          reference: "",
          float_account_id: "",
          notes: "",
        });
        // Refresh data
        loadTransactions();
        loadFloatAccounts();
        refreshStatistics();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process settlement",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing settlement:", error);
      toast({
        title: "Error",
        description: "Failed to process settlement",
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
      "Tracking ID",
      "Customer",
      "Phone",
      "Amount",
      "Status",
      "Payment Method",
    ];
    const csvData = transactions.map((transaction: any) => [
      format(
        new Date(transaction.created_at || new Date()),
        "yyyy-MM-dd HH:mm:ss"
      ),
      transaction.transaction_type?.replace("_", " ") || "",
      transaction.tracking_id || "",
      transaction.customer_name || "",
      transaction.customer_phone || "",
      transaction.amount
        ? Number.parseFloat(transaction.amount).toFixed(2)
        : "0.00",
      transaction.delivery_status || transaction.status || "",
      transaction.payment_method || "",
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
      `jumia-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
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
      case "received":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Received
          </Badge>
        );
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Active
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Delivered
          </Badge>
        );
      case "returned":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700">
            Returned
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            Partial
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSelectedProvider = () => {
    if (activeTab === "pod_collection" && podForm.payment_method !== "cash") {
      return podForm.float_account_id;
    } else if (activeTab === "settlement") {
      return settlementForm.float_account_id;
    }
    return "";
  };

  const handleEdit = (transaction: any) => {
    setCurrentTransaction(transaction);
    setShowEditDialog(true);
  };

  const handleDelete = (transaction: any) => {
    setCurrentTransaction(transaction);
    setShowDeleteDialog(true);
  };

  const handlePrint = (transaction: any) => {
    setCurrentTransaction(transaction);
    setShowPrintDialog(true);
  };

  const confirmDelete = async () => {
    if (!currentTransaction) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/jumia/transactions/${currentTransaction.transaction_id}`,
        {
          method: "DELETE",
        }
      );
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Transaction Deleted",
          description: "Transaction has been deleted successfully",
        });
        setShowDeleteDialog(false);
        setCurrentTransaction(null);
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
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSubmit = async (updated: any) => {
    setIsEditing(true);
    try {
      const response = await fetch(
        `/api/jumia/transactions/${currentTransaction.transaction_id}`,
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
        loadTransactions();
        refreshStatistics();
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

  const printReceipt = () => {
    if (!currentTransaction) return;
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) return;
    const receiptContent = `<!DOCTYPE html><html><head><title>Jumia Transaction Receipt</title><style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; } .header { text-align: center; margin-bottom: 20px; } .logo { width: 60px; height: 60px; margin: 0 auto 10px; } .line { border-bottom: 1px dashed #000; margin: 10px 0; } .row { display: flex; justify-content: space-between; margin: 5px 0; } .footer { text-align: center; margin-top: 20px; font-size: 10px; }</style></head><body><div class='header'><img src='/logo.png' alt='MIMHAAD Logo' class='logo' /><h3>MIMHAAD FINANCIAL SERVICES</h3><p>${
      user?.branchName || ""
    }</p><p>Tel: 0241378880</p><p>${new Date(
      currentTransaction.created_at
    ).toLocaleString()}</p></div><div class='line'></div><h4 style='text-align: center;'>JUMIA TRANSACTION RECEIPT</h4><div class='line'></div><div class='row'><span>Transaction ID:</span><span>${
      currentTransaction.transaction_id
    }</span></div><div class='row'><span>Type:</span><span>${
      currentTransaction.transaction_type
    }</span></div><div class='row'><span>Tracking ID:</span><span>${
      currentTransaction.tracking_id
    }</span></div><div class='row'><span>Customer:</span><span>${
      currentTransaction.customer_name
    }</span></div><div class='row'><span>Phone:</span><span>${
      currentTransaction.customer_phone
    }</span></div><div class='row'><span>Amount:</span><span>GHS ${Number(
      currentTransaction.amount
    ).toFixed(2)}</span></div><div class='row'><span>Status:</span><span>${
      currentTransaction.status
    }</span></div><div class='line'></div><div class='footer'><p>Thank you for using our service!</p><p>For inquiries, please call 0241378880</p><p>Powered by MIMHAAD Financial Services</p></div></body></html>`;
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jumia Services</h1>
          <p className="text-muted-foreground">
            Manage packages, collections, and settlements
          </p>
        </div>
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
              Today's Packages
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
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
              Today's Collections
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
              Unsettled Amount
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statistics.floatBalance)}
            </div>
            <p className="text-xs text-muted-foreground">Pending settlement</p>
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
                    <Package className="h-5 w-5" />
                    Jumia Operations
                  </CardTitle>
                  <CardDescription>
                    Manage packages, collections, and settlements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="package_receipt">
                        Packages
                      </TabsTrigger>
                      <TabsTrigger value="pod_collection">
                        Collections
                      </TabsTrigger>
                      <TabsTrigger value="settlement">Settlements</TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="package_receipt"
                      className="space-y-4 mt-4"
                    >
                      <form
                        onSubmit={handlePackageSubmit}
                        className="space-y-4"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="tracking_id">Tracking ID</Label>
                            <Input
                              id="tracking_id"
                              value={packageForm.tracking_id}
                              onChange={(e) =>
                                setPackageForm({
                                  ...packageForm,
                                  tracking_id: e.target.value,
                                })
                              }
                              placeholder="Enter tracking ID"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="customer_name">Customer Name</Label>
                            <Input
                              id="customer_name"
                              value={packageForm.customer_name}
                              onChange={(e) =>
                                setPackageForm({
                                  ...packageForm,
                                  customer_name: e.target.value,
                                })
                              }
                              placeholder="Enter customer name"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="customer_phone">
                              Customer Phone
                            </Label>
                            <Input
                              id="customer_phone"
                              value={packageForm.customer_phone}
                              onChange={(e) =>
                                setPackageForm({
                                  ...packageForm,
                                  customer_phone: e.target.value,
                                })
                              }
                              placeholder="Enter phone number"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            value={packageForm.notes}
                            onChange={(e) =>
                              setPackageForm({
                                ...packageForm,
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
                              Recording...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Record Package Receipt
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent
                      value="pod_collection"
                      className="space-y-4 mt-4"
                    >
                      <form onSubmit={handlePodSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="pod_tracking_id">Tracking ID</Label>
                            <Input
                              id="pod_tracking_id"
                              value={podForm.tracking_id}
                              onChange={(e) =>
                                setPodForm({
                                  ...podForm,
                                  tracking_id: e.target.value,
                                })
                              }
                              placeholder="Enter tracking ID"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="pod_amount">
                              Amount to Collect (GHS)
                            </Label>
                            <Input
                              id="pod_amount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={podForm.amount}
                              onChange={(e) =>
                                setPodForm({
                                  ...podForm,
                                  amount: e.target.value,
                                })
                              }
                              placeholder="0.00"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="pod_customer_name">
                              Customer Name
                            </Label>
                            <Input
                              id="pod_customer_name"
                              value={podForm.customer_name}
                              onChange={(e) =>
                                setPodForm({
                                  ...podForm,
                                  customer_name: e.target.value,
                                })
                              }
                              placeholder="Enter customer name"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="pod_customer_phone">
                              Customer Phone
                            </Label>
                            <Input
                              id="pod_customer_phone"
                              value={podForm.customer_phone}
                              onChange={(e) =>
                                setPodForm({
                                  ...podForm,
                                  customer_phone: e.target.value,
                                })
                              }
                              placeholder="Enter phone number"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="delivery_status">
                              Delivery Status
                            </Label>
                            <Select
                              value={podForm.delivery_status}
                              onValueChange={(value) =>
                                setPodForm({
                                  ...podForm,
                                  delivery_status: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select delivery status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="delivered">
                                  Delivered
                                </SelectItem>
                                <SelectItem value="partial">
                                  Partial Delivery
                                </SelectItem>
                                <SelectItem value="returned">
                                  Returned
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="payment_method">
                              Payment Method
                            </Label>
                            <Select
                              value={podForm.payment_method}
                              onValueChange={(value) =>
                                setPodForm({
                                  ...podForm,
                                  payment_method: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="momo">
                                  Mobile Money
                                </SelectItem>
                                <SelectItem value="bank_transfer">
                                  Bank Transfer
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="pod_notes">Notes (Optional)</Label>
                          <Textarea
                            id="pod_notes"
                            value={podForm.notes}
                            onChange={(e) =>
                              setPodForm({ ...podForm, notes: e.target.value })
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
                              Recording...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Record Payment Collection
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="settlement" className="space-y-4 mt-4">
                      <form
                        onSubmit={handleSettlementSubmit}
                        className="space-y-4"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="settlement_amount">
                              Settlement Amount (GHS)
                            </Label>
                            <Input
                              id="settlement_amount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={settlementForm.amount}
                              onChange={(e) =>
                                setSettlementForm({
                                  ...settlementForm,
                                  amount: e.target.value,
                                })
                              }
                              placeholder="0.00"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="settlement_reference">
                              Reference
                            </Label>
                            <Input
                              id="settlement_reference"
                              value={settlementForm.reference}
                              onChange={(e) =>
                                setSettlementForm({
                                  ...settlementForm,
                                  reference: e.target.value,
                                })
                              }
                              placeholder="Enter settlement reference"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="settlement_float_account">
                              Float Account
                            </Label>
                            <Select
                              value={settlementForm.float_account_id}
                              onValueChange={(value) =>
                                setSettlementForm({
                                  ...settlementForm,
                                  float_account_id: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select float account" />
                              </SelectTrigger>
                              <SelectContent>
                                {floatAccounts.map((account: any) => (
                                  <SelectItem
                                    key={account.id}
                                    value={account.id}
                                  >
                                    {account.provider} -{" "}
                                    {formatCurrency(account.current_balance)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="settlement_notes">
                            Notes (Optional)
                          </Label>
                          <Textarea
                            id="settlement_notes"
                            value={settlementForm.notes}
                            onChange={(e) =>
                              setSettlementForm({
                                ...settlementForm,
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
                              Process Settlement
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Float Display - 1 column */}
            <div className="lg:col-span-1">
              <DynamicFloatDisplay
                selectedProvider={getSelectedProvider()}
                floatAccounts={floatAccounts}
                serviceType="Jumia"
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
                  <CardDescription>All Jumia transactions</CardDescription>
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
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Transactions Found
                  </h3>
                  <p className="text-muted-foreground">
                    No Jumia transactions have been processed yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tracking ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
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
                          {transaction.transaction_type?.replace("_", " ") ||
                            "-"}
                        </TableCell>
                        <TableCell>{transaction.tracking_id || "-"}</TableCell>
                        <TableCell>
                          {transaction.customer_name || "-"}
                        </TableCell>
                        <TableCell>
                          {transaction.customer_phone || "-"}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(transaction.amount || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(
                            transaction.delivery_status || transaction.status
                          )}
                        </TableCell>
                        <TableCell className="capitalize">
                          {transaction.payment_method?.replace("_", " ") || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(transaction)}
                              title="Edit"
                            >
                              <Edit className="w-5 h-5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(transaction)}
                              title="Delete"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handlePrint(transaction)}
                              title="Print"
                            >
                              <Printer className="w-5 h-5" />
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Jumia Transaction</DialogTitle>
            <DialogDescription>
              Update the transaction details below.
            </DialogDescription>
          </DialogHeader>
          {currentTransaction && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updated = {
                  tracking_id: formData.get("tracking_id"),
                  customer_name: formData.get("customer_name"),
                  customer_phone: formData.get("customer_phone"),
                  amount: Number(formData.get("amount")),
                  status: formData.get("status"),
                  delivery_status: formData.get("delivery_status"),
                  payment_method: formData.get("payment_method"),
                  notes: formData.get("notes"),
                };
                handleEditSubmit(updated);
              }}
              className="space-y-4"
            >
              <div>
                <Label>Tracking ID</Label>
                <Input
                  name="tracking_id"
                  defaultValue={currentTransaction.tracking_id}
                />
              </div>
              <div>
                <Label>Customer Name</Label>
                <Input
                  name="customer_name"
                  defaultValue={currentTransaction.customer_name}
                />
              </div>
              <div>
                <Label>Customer Phone</Label>
                <Input
                  name="customer_phone"
                  defaultValue={currentTransaction.customer_phone}
                />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={currentTransaction.amount}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Input name="status" defaultValue={currentTransaction.status} />
              </div>
              <div>
                <Label>Delivery Status</Label>
                <Input
                  name="delivery_status"
                  defaultValue={currentTransaction.delivery_status}
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Input
                  name="payment_method"
                  defaultValue={currentTransaction.payment_method}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  name="notes"
                  defaultValue={currentTransaction.notes}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditing}>
                  {isEditing ? "Updating..." : "Update Transaction"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Jumia Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
              <br />
              <strong>Transaction ID:</strong>{" "}
              {currentTransaction?.transaction_id}
              <br />
              <strong>Tracking ID:</strong> {currentTransaction?.tracking_id}
              <br />
              <strong>Amount:</strong> GHS{" "}
              {Number(currentTransaction?.amount).toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Receipt</DialogTitle>
            <DialogDescription>
              Click the button below to print the receipt for this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={printReceipt}>
              <Printer className="mr-2 h-4 w-4" /> Print Receipt
            </Button>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
