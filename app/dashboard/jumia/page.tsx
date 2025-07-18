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
  Eye,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import {
  TransactionReceipt,
  TransactionReceiptData,
} from "@/components/shared/transaction-receipt";

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
  const [packages, setPackages] = useState([]);
  const [floatAccounts, setFloatAccounts] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingFloats, setLoadingFloats] = useState(false);
  const [activeTab, setActiveTab] = useState("packages");

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
    is_pod: true, // New field to indicate if it's a POD package
  });

  const [settlementForm, setSettlementForm] = useState({
    amount: "",
    reference: "",
    float_account_id: "none",
    tracking_id: "",
    notes: "",
  });

  const [settlementCalculator, setSettlementCalculator] = useState({
    settlementAmount: 0,
    collectionCount: 0,
    unsettledPackageCount: 0,
    lastSettlementDate: null,
    fromDate: "",
    toDate: "",
  });

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSettlementFloat, setSelectedSettlementFloat] =
    useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [receiptData, setReceiptData] = useState<TransactionReceiptData | null>(
    null
  );
  const [showReceipt, setShowReceipt] = useState(false);

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

  const loadPackages = async () => {
    if (!user?.branchId) return;

    try {
      setLoadingPackages(true);
      const response = await fetch(
        `/api/jumia/packages?branchId=${user.branchId}&limit=50`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setPackages(data.data);
        } else {
          setPackages([]);
        }
      } else {
        setPackages([]);
      }
    } catch (error) {
      console.error("Error loading Jumia packages:", error);
      setPackages([]);
    } finally {
      setLoadingPackages(false);
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
            data.accounts.filter((account: any) => account.is_active)
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
      loadPackages();
      loadFloatAccounts();
      calculateSettlementAmount(); // Auto-calculate settlement amount on load
    }
  }, [user?.branchId]);

  // Auto-calculate settlement amount when settlement tab is opened
  useEffect(() => {
    if (user?.branchId && activeTab === "settlement") {
      calculateSettlementAmount();
    }
  }, [user?.branchId, activeTab]);

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validate required fields
    if (!packageForm.tracking_id.trim() || !packageForm.customer_name.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate customer phone (if provided, must be exactly 10 digits)
    if (packageForm.customer_phone) {
      if (
        packageForm.customer_phone.length !== 10 ||
        !/^\d{10}$/.test(packageForm.customer_phone)
      ) {
        toast({
          title: "Invalid Phone Number",
          description:
            "Phone number must be exactly 10 digits (e.g., 0241234567)",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/jumia/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tracking_id: packageForm.tracking_id.trim(),
          customer_name: packageForm.customer_name.trim(),
          customer_phone: packageForm.customer_phone.trim() || null,
          notes: packageForm.notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Package Recorded",
          description: "Package has been successfully recorded",
        });

        // Reset form
        setPackageForm({
          tracking_id: "",
          customer_name: "",
          customer_phone: "",
          notes: "",
        });
        // Refresh data
        loadPackages();
        refreshStatistics();
        calculateSettlementAmount(); // Recalculate settlement amount after package creation
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to record package",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error recording package:", error);
      toast({
        title: "Error",
        description: "Failed to record package. Please try again.",
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

    // Validate required fields
    if (!podForm.tracking_id || !podForm.customer_name) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate amount only if it's a POD package
    if (podForm.is_pod) {
      if (!podForm.amount || Number(podForm.amount) <= 0) {
        toast({
          title: "Invalid Amount",
          description:
            "Please enter a valid amount greater than 0 for POD packages",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate customer phone (if provided, must be exactly 10 digits)
    if (podForm.customer_phone) {
      if (
        podForm.customer_phone.length !== 10 ||
        !/^\d{10}$/.test(podForm.customer_phone)
      ) {
        toast({
          title: "Invalid Phone Number",
          description:
            "Phone number must be exactly 10 digits (e.g., 0241234567)",
          variant: "destructive",
        });
        return;
      }
    }

    if (!podForm.float_account_id) {
      toast({
        title: "Missing Float Account",
        description: "Please select a float account for payment",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/jumia/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_type: "pod_collection",
          tracking_id: podForm.tracking_id.trim(),
          amount: podForm.is_pod ? Number(podForm.amount) : 0,
          customer_name: podForm.customer_name.trim(),
          customer_phone: podForm.customer_phone.trim() || null,
          delivery_status: podForm.delivery_status,
          payment_method: podForm.payment_method,
          float_account_id: podForm.float_account_id || null,
          notes: podForm.notes.trim() || null,
          branch_id: user.branchId,
          user_id: user.id,
          is_pod: podForm.is_pod, // Send POD flag
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Collection Recorded",
          description: podForm.is_pod
            ? `POD collection of ${formatCurrency(
                Number(podForm.amount)
              )} recorded for ${podForm.customer_name}`
            : `Free delivery recorded for ${podForm.customer_name}`,
        });

        // Reset form
        setPodForm({
          tracking_id: "",
          amount: "",
          customer_name: "",
          customer_phone: "",
          delivery_status: "delivered",
          payment_method: "cash",
          float_account_id: "",
          notes: "",
          is_pod: true,
        });

        // Refresh data
        loadTransactions();
        loadPackages();
        refreshStatistics();
        calculateSettlementAmount(); // Recalculate settlement amount after collection
      } else {
        throw new Error(result.error || "Failed to record payment collection");
      }
    } catch (error) {
      toast({
        title: "Failed to Record Payment",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
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
    if (!settlementForm.amount || !settlementForm.reference) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate amount (must be positive and not exceed available amount)
    const amount = Number(settlementForm.amount);
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Check if amount exceeds available settlement amount
    if (amount > settlementCalculator.settlementAmount) {
      toast({
        title: "Amount Too High",
        description: `Amount cannot exceed available settlement amount of ${formatCurrency(
          settlementCalculator.settlementAmount
        )}`,
        variant: "destructive",
      });
      return;
    }
    if (
      !settlementForm.float_account_id ||
      settlementForm.float_account_id === "none"
    ) {
      toast({
        title: "Missing Float Account",
        description: "Please select a float account for settlement",
        variant: "destructive",
      });
      return;
    }
    const selectedFloat = floatAccounts.find(
      (a) => a.id === settlementForm.float_account_id
    );
    if (!selectedFloat) {
      toast({
        title: "Invalid Float Account",
        description: "Selected float account is invalid.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const settlementData = {
        transaction_type: "settlement",
        amount: Number.parseFloat(settlementForm.amount),
        settlement_reference: settlementForm.reference, // Fix: map reference to settlement_reference
        float_account_id: settlementForm.float_account_id,
        tracking_id: settlementForm.tracking_id || null,
        notes: settlementForm.notes || null,
        branch_id: user.branchId,
        user_id: user.id,
        paymentAccountCode: selectedFloat.gl_account_code,
        paymentAccountName: selectedFloat.provider,
      };

      console.log("Submitting settlement data:", settlementData);

      const response = await fetch("/api/jumia/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settlementData),
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
          float_account_id: "none",
          tracking_id: "",
          notes: "",
        });
        loadTransactions();
        loadPackages();
        refreshStatistics();
        calculateSettlementAmount(); // Recalculate settlement amount after settlement
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

  const calculateSettlementAmount = async () => {
    if (!user?.branchId) return;

    try {
      console.log("Calculating settlement amount for branch:", user.branchId);
      const response = await fetch(
        `/api/jumia/settlement-calculator?branchId=${user.branchId}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Settlement calculator response:", data);
        if (data.success) {
          console.log("Setting settlement calculator data:", data.data);
          setSettlementCalculator(data.data);

          // Show success message with the calculated amount
          toast({
            title: "Settlement Calculator Updated",
            description: `Available for settlement: ${formatCurrency(
              data.data.settlementAmount
            )}`,
          });

          // Remove auto-population - let users enter any amount they want
          // setSettlementForm((prev) => ({
          //   ...prev,
          //   amount: data.data.settlementAmount.toString(),
          // }));
        }
      } else {
        console.error(
          "Settlement calculator API error:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error calculating settlement amount:", error);
    }
  };

  const searchPackageByTracking = async (trackingId: string) => {
    if (!trackingId.trim() || !user?.branchId) return;

    try {
      const response = await fetch(
        `/api/jumia/packages/search?trackingId=${trackingId}&branchId=${user.branchId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const packageInfo = data.data;
          setSettlementForm((prev) => ({
            ...prev,
            tracking_id: packageInfo.tracking_id,
            notes: `Package: ${packageInfo.customer_name} - ${
              packageInfo.customer_phone || "No phone"
            }`,
          }));

          toast({
            title: "Package Found",
            description: `Package info loaded for ${packageInfo.customer_name}`,
          });
        } else {
          toast({
            title: "Package Not Found",
            description: "No package found with this tracking ID",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error searching package:", error);
      toast({
        title: "Error",
        description: "Failed to search package",
        variant: "destructive",
      });
    }
  };

  const searchPackageForCollection = async (trackingId: string) => {
    if (!trackingId.trim() || !user?.branchId) return;

    try {
      const response = await fetch(
        `/api/jumia/packages/search?trackingId=${trackingId}&branchId=${user.branchId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const packageInfo = data.data;

          // Auto-populate collection form
          setPodForm((prev) => ({
            ...prev,
            tracking_id: packageInfo.tracking_id,
            customer_name: packageInfo.customer_name,
            customer_phone: packageInfo.customer_phone || "",
          }));

          toast({
            title: "Package Found",
            description: `Package info loaded for ${packageInfo.customer_name}`,
          });
        } else {
          toast({
            title: "Package Not Found",
            description:
              "No package found with this tracking ID. Please record the package first.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error searching package:", error);
      toast({
        title: "Error",
        description: "Failed to search package",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Type",
      "Tracking ID/Reference",
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
      transaction.transaction_type === "settlement"
        ? transaction.settlement_reference || transaction.tracking_id || ""
        : transaction.tracking_id || "",
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

  const handleEdit = (tx: any) => {
    setCurrentTransaction(tx);
    setShowEditDialog(true);
  };

  const handleDelete = (tx: any) => {
    setCurrentTransaction(tx);
    setShowDeleteDialog(true);
  };

  const handlePrint = (tx: any) => {
    setCurrentTransaction(tx);
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
    if (!currentTransaction) return;
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

  const printReceipt = (tx: any) => {
    // Format transaction data for the shared receipt component
    const formattedReceiptData: TransactionReceiptData = {
      transactionId: tx.id || tx.transaction_id,
      sourceModule: "jumia",
      transactionType: tx.transaction_type || "package_receipt",
      amount: tx.amount || 0,
      fee: tx.fee || 0,
      customerName: tx.customer_name,
      customerPhone: tx.customer_phone,
      reference: tx.reference || tx.id || tx.transaction_id,
      branchName: user?.branchName || "Main Branch",
      date: tx.created_at || tx.date || new Date().toISOString(),
      additionalData: {
        "Tracking ID": tx.tracking_id,
        "Delivery Status": tx.delivery_status,
        "Payment Method": tx.payment_method,
        Status: tx.status,
      },
    };

    setReceiptData(formattedReceiptData);
    setShowReceipt(true);
  };

  const getStatusText = (status: string) => {
    if (!status) return "-";
    const map: Record<string, string> = {
      active: "Active",
      completed: "Completed",
      reversed: "Reversed",
      deleted: "Deleted",
      pending: "Pending",
      delivered: "Delivered",
      returned: "Returned",
      partial: "Partial Delivery",
      unknown: "Unknown",
    };
    return (
      map[status.toLowerCase()] ||
      status.charAt(0).toUpperCase() + status.slice(1)
    );
  };

  const shouldShowPaymentMethod = (transaction: any) => {
    return (
      transaction.transaction_type === "pod_collection" ||
      transaction.transaction_type === "settlement"
    );
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
            loadPackages();
            loadFloatAccounts();
            refreshStatistics();
            calculateSettlementAmount(); // Recalculate settlement amount on refresh
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
              Total Collections
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statistics.totalCommission || 0)}
            </div>
            <p className="text-xs text-muted-foreground">All POD collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Settlements
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                statistics.summary?.settlementAmount ||
                  statistics.total_settlement_amount ||
                  0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Amount settled to Jumia
            </p>
          </CardContent>
        </Card>

        {/* Jumia Liability Card (was: Float Balance) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Jumia Liability
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                statistics.liability ??
                  statistics.float_balance ??
                  statistics.floatBalance ??
                  0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              True Jumia liability (POD collections minus settlements)
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
                      <TabsTrigger value="packages">Packages</TabsTrigger>
                      <TabsTrigger value="pod_collection">
                        Collections
                      </TabsTrigger>
                      <TabsTrigger value="settlement">Settlements</TabsTrigger>
                    </TabsList>

                    <TabsContent value="packages" className="space-y-4 mt-4">
                      <form
                        onSubmit={handlePackageSubmit}
                        className="space-y-4"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="package_tracking_id">
                              Tracking ID
                            </Label>
                            <Input
                              id="package_tracking_id"
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
                            <Label htmlFor="package_customer_name">
                              Customer Name
                            </Label>
                            <Input
                              id="package_customer_name"
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
                            <Label htmlFor="package_customer_phone">
                              Customer Phone
                            </Label>
                            <Input
                              id="package_customer_phone"
                              maxLength={10}
                              value={packageForm.customer_phone}
                              onChange={(e) => {
                                // Only allow digits
                                const value = e.target.value.replace(/\D/g, "");
                                // Limit to 10 digits
                                const limitedValue = value.slice(0, 10);
                                setPackageForm({
                                  ...packageForm,
                                  customer_phone: limitedValue,
                                });
                              }}
                              placeholder="0241234567"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="package_notes">
                            Notes (Optional)
                          </Label>
                          <Textarea
                            id="package_notes"
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
                            <div className="flex gap-2">
                              <Input
                                id="pod_tracking_id"
                                value={podForm.tracking_id}
                                onChange={(e) =>
                                  setPodForm({
                                    ...podForm,
                                    tracking_id: e.target.value,
                                  })
                                }
                                onBlur={(e) => {
                                  if (e.target.value.trim()) {
                                    searchPackageForCollection(e.target.value);
                                  }
                                }}
                                placeholder="Enter tracking ID"
                                required
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  searchPackageForCollection(
                                    podForm.tracking_id
                                  )
                                }
                                disabled={!podForm.tracking_id.trim()}
                              >
                                Search
                              </Button>
                            </div>
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
                              disabled={!podForm.is_pod}
                              required={podForm.is_pod}
                            />
                            <div className="text-xs text-muted-foreground">
                              {podForm.is_pod
                                ? "Required for POD packages"
                                : "Not required for free packages"}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="is_pod">Package Type</Label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="is_pod"
                                checked={podForm.is_pod}
                                onChange={(e) =>
                                  setPodForm({
                                    ...podForm,
                                    is_pod: e.target.checked,
                                    amount: e.target.checked
                                      ? podForm.amount
                                      : "0",
                                  })
                                }
                                className="rounded"
                              />
                              <Label htmlFor="is_pod" className="text-sm">
                                Pay on Delivery (POD)
                              </Label>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Check if customer needs to pay for this package
                            </div>
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
                              maxLength={10}
                              value={podForm.customer_phone}
                              onChange={(e) => {
                                // Only allow digits
                                const value = e.target.value.replace(/\D/g, "");
                                // Limit to 10 digits
                                const limitedValue = value.slice(0, 10);
                                setPodForm({
                                  ...podForm,
                                  customer_phone: limitedValue,
                                });
                              }}
                              placeholder="0241234567"
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
                            <Label htmlFor="pod_payment_method">
                              Payment Method
                            </Label>
                            <Select
                              value={podForm.payment_method}
                              onValueChange={(value) => {
                                setPodForm({
                                  ...podForm,
                                  payment_method: value,
                                  float_account_id: "",
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="momo">MoMo</SelectItem>
                                <SelectItem value="agency-banking">
                                  Agency Banking
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="pod_float_account_id">
                              Float Account
                            </Label>
                            <Select
                              value={podForm.float_account_id}
                              onValueChange={(value) =>
                                setPodForm({
                                  ...podForm,
                                  float_account_id: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select float account" />
                              </SelectTrigger>
                              <SelectContent>
                                {floatAccounts
                                  .filter((account) => {
                                    if (podForm.payment_method === "")
                                      return true;
                                    if (podForm.payment_method === "cash") {
                                      return (
                                        account.account_type === "cash-in-till"
                                      );
                                    }
                                    if (podForm.payment_method === "momo") {
                                      return account.account_type === "momo";
                                    }
                                    if (
                                      podForm.payment_method ===
                                      "agency-banking"
                                    ) {
                                      return (
                                        account.account_type ===
                                        "agency-banking"
                                      );
                                    }
                                    if (podForm.payment_method === "jumia") {
                                      return account.account_type === "jumia";
                                    }
                                    return false;
                                  })
                                  .map((account) => (
                                    <SelectItem
                                      key={account.id}
                                      value={account.id}
                                    >
                                      {account.provider} -{" "}
                                      {account.account_number} (GHS{" "}
                                      {Number(
                                        account.current_balance || 0
                                      ).toFixed(2)}
                                      )
                                    </SelectItem>
                                  ))}
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
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Settlement
                          </CardTitle>
                          <CardDescription>
                            Record payments to Jumia for collected amounts
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Settlement Calculator */}
                          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-2">
                              Settlement Calculator
                            </h4>
                            <p className="text-sm text-blue-700 mb-3">
                              Shows total POD collections available for
                              settlement. Enter any amount you want to settle
                              below.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">
                                  Collections:
                                </span>
                                <div className="font-semibold">
                                  {settlementCalculator.collectionCount}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Available for Settlement:
                                </span>
                                <div className="font-semibold text-blue-900">
                                  {formatCurrency(
                                    settlementCalculator.settlementAmount
                                  )}
                                </div>
                                {settlementCalculator.settlementAmount > 0 && (
                                  <div className="text-xs text-green-600 mt-1">
                                    ✓ Ready to settle
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Unsettled Packages:
                                </span>
                                <div className="font-semibold">
                                  {settlementCalculator.unsettledPackageCount}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Last Settlement:
                                </span>
                                <div className="font-semibold text-xs">
                                  {settlementCalculator.lastSettlementDate
                                    ? format(
                                        new Date(
                                          settlementCalculator.lastSettlementDate
                                        ),
                                        "MMM dd, yyyy"
                                      )
                                    : "Never"}
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={calculateSettlementAmount}
                              variant="outline"
                              size="sm"
                              className="mt-3"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Refresh Calculator
                            </Button>
                          </div>

                          <form
                            onSubmit={handleSettlementSubmit}
                            className="space-y-4"
                          >
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="settlement_amount">
                                  Settlement Amount
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="settlement_amount"
                                    type="number"
                                    step="0.01"
                                    value={settlementForm.amount}
                                    onChange={(e) =>
                                      setSettlementForm({
                                        ...settlementForm,
                                        amount: e.target.value,
                                      })
                                    }
                                    placeholder={`Enter amount to settle (max: ${formatCurrency(
                                      settlementCalculator.settlementAmount
                                    )})`}
                                    required
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                      setSettlementForm({
                                        ...settlementForm,
                                        amount:
                                          settlementCalculator.settlementAmount.toString(),
                                      })
                                    }
                                    disabled={
                                      settlementCalculator.settlementAmount <= 0
                                    }
                                    className="whitespace-nowrap"
                                  >
                                    Settle All
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                  You can settle any amount up to the total
                                  available. Partial settlements are allowed.
                                </p>
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
                                  placeholder="Settlement reference"
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="settlement_tracking_id">
                                  Tracking ID (Optional)
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="settlement_tracking_id"
                                    value={settlementForm.tracking_id}
                                    onChange={(e) =>
                                      setSettlementForm({
                                        ...settlementForm,
                                        tracking_id: e.target.value,
                                      })
                                    }
                                    placeholder="Enter tracking ID"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                      searchPackageByTracking(
                                        settlementForm.tracking_id
                                      )
                                    }
                                    disabled={
                                      !settlementForm.tracking_id.trim()
                                    }
                                  >
                                    Search
                                  </Button>
                                </div>
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
                                    <SelectItem value="none">
                                      No float account
                                    </SelectItem>
                                    {floatAccounts.map((account) => (
                                      <SelectItem
                                        key={account.id}
                                        value={account.id}
                                      >
                                        {account.account_type} -{" "}
                                        {formatCurrency(
                                          account.current_balance
                                        )}
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
                                placeholder="Additional notes"
                              />
                            </div>

                            <Button
                              type="submit"
                              disabled={submitting}
                              className="w-full"
                            >
                              {submitting ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Record Settlement
                                </>
                              )}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Packages List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Packages
                </CardTitle>
                <CardDescription>
                  Recorded packages and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPackages ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : packages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No packages recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {packages.map((pkg: any) => (
                      <div
                        key={pkg.id}
                        className="p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm">
                            {pkg.tracking_id}
                          </div>
                          <Badge
                            variant={
                              pkg.status === "received"
                                ? "default"
                                : pkg.status === "delivered"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {pkg.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>{pkg.customer_name}</div>
                          {pkg.customer_phone && (
                            <div>{pkg.customer_phone}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Received:{" "}
                            {format(new Date(pkg.received_at), "MMM dd, yyyy")}
                          </div>
                          {pkg.delivered_at && (
                            <div className="text-xs text-gray-500">
                              Delivered:{" "}
                              {format(
                                new Date(pkg.delivered_at),
                                "MMM dd, yyyy"
                              )}
                            </div>
                          )}
                          {pkg.settled_at && (
                            <div className="text-xs text-gray-500">
                              Settled:{" "}
                              {format(new Date(pkg.settled_at), "MMM dd, yyyy")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transactions List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Transactions
                </CardTitle>
                <CardDescription>Collections and settlements</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {transactions.map((tx: any) => (
                      <div
                        key={tx.id}
                        className="p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm">
                            {tx.transaction_type === "pod_collection"
                              ? "Collection"
                              : "Settlement"}
                          </div>
                          <Badge
                            variant={getStatusBadge(tx.status)}
                            className="text-xs"
                          >
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div className="font-semibold">
                            {formatCurrency(tx.amount)}
                          </div>
                          {tx.tracking_id && (
                            <div>Tracking: {tx.tracking_id}</div>
                          )}
                          {tx.customer_name && (
                            <div>Customer: {tx.customer_name}</div>
                          )}
                          {tx.settlement_reference && (
                            <div>Ref: {tx.settlement_reference}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {format(
                              new Date(tx.created_at),
                              "MMM dd, yyyy HH:mm"
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
            <Button onClick={() => printReceipt(currentTransaction)}>
              <Printer className="mr-2 h-4 w-4" /> Print Receipt
            </Button>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Receipt Dialog */}
      <TransactionReceipt
        data={receiptData}
        open={showReceipt}
        onOpenChange={setShowReceipt}
      />
    </div>
  );
}
