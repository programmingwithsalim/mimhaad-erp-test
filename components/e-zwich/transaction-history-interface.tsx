"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  Printer,
  Receipt,
  CreditCard,
  DollarSign,
  Calendar,
  User,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import { TransactionEditDialog } from "@/components/shared/transaction-edit-dialog";
import { TransactionDeleteDialog } from "@/components/shared/transaction-delete-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";

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
  fee?: number;
  processed_by?: string;
  branch_id?: string;
  notes?: string;
  customer_photo?: string;
  id_front_image?: string;
  id_back_image?: string;
  card_type?: string;
  id_type?: string;
  id_number?: string;
  id_expiry_date?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  date_of_birth?: string;
  gender?: string;
  customer_email?: string;
}

interface TransactionHistoryInterfaceProps {
  branchId: string;
}

export function TransactionHistoryInterface({
  branchId,
}: TransactionHistoryInterfaceProps) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("withdrawals");

  // Dialog states
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [currentTransaction, setCurrentTransaction] =
    useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const loadTransactions = async () => {
    if (!branchId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/e-zwich/transactions?branchId=${branchId}&limit=100`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          setFilteredTransactions(data.transactions);
        } else {
          setTransactions([]);
          setFilteredTransactions([]);
        }
      } else {
        setTransactions([]);
        setFilteredTransactions([]);
      }
    } catch (error) {
      console.error("Error loading E-Zwich transactions:", error);
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      loadTransactions();
    }
  }, [branchId]);

  useEffect(() => {
    let filtered = transactions;

    // Filter by type (withdrawal vs issuance)
    if (activeTab === "withdrawals") {
      filtered = filtered.filter((t) => t.type === "withdrawal");
    } else if (activeTab === "issuances") {
      filtered = filtered.filter((t) => t.type === "card_issuance");
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.customer_phone?.includes(searchTerm) ||
          t.card_number?.includes(searchTerm) ||
          t.id?.includes(searchTerm)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Filter by date
    if (dateFilter !== "all") {
      const today = new Date();
      const transactionDate = new Date();

      switch (dateFilter) {
        case "today":
          filtered = filtered.filter((t) => {
            const tDate = new Date(t.created_at);
            return tDate.toDateString() === today.toDateString();
          });
          break;
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter((t) => {
            const tDate = new Date(t.created_at);
            return tDate >= weekAgo;
          });
          break;
        case "month":
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter((t) => {
            const tDate = new Date(t.created_at);
            return tDate >= monthAgo;
          });
          break;
      }
    }

    setFilteredTransactions(filtered);
  }, [
    transactions,
    searchTerm,
    statusFilter,
    typeFilter,
    dateFilter,
    activeTab,
  ]);

  const getStatusBadge = (status: string | undefined | null) => {
    if (!status) {
      return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
    }

    const statusConfig = {
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      failed: { color: "bg-red-100 text-red-800", label: "Failed" },
      reversed: { color: "bg-gray-100 text-gray-800", label: "Reversed" },
      processing: { color: "bg-blue-100 text-blue-800", label: "Processing" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };

    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleDelete = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const handleTransactionSuccess = () => {
    loadTransactions();
    toast({
      title: "Success",
      description: "Transaction updated successfully",
    });
  };

  const printReceipt = (transaction: Transaction) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const amount = Number(transaction.amount) || 0;
      const fee = Number(transaction.fee) || 0;
      const total = amount + fee;

      printWindow.document.write(`
        <html>
          <head>
            <title>E-Zwich Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .transaction-details { margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; margin: 5px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>E-Zwich Transaction Receipt</h2>
              <p>Transaction ID: ${transaction.id}</p>
              <p>Date: ${format(
                new Date(transaction.created_at),
                "PPP 'at' HH:mm"
              )}</p>
            </div>
            <div class="transaction-details">
              <div class="row">
                <strong>Type:</strong>
                <span>${
                  transaction.type === "withdrawal"
                    ? "Withdrawal"
                    : "Card Issuance"
                }</span>
              </div>
              <div class="row">
                <strong>Customer:</strong>
                <span>${transaction.customer_name}</span>
              </div>
              ${
                transaction.customer_phone
                  ? `
              <div class="row">
                <strong>Phone:</strong>
                <span>${transaction.customer_phone}</span>
              </div>
              `
                  : ""
              }
              ${
                transaction.card_number
                  ? `
              <div class="row">
                <strong>Card Number:</strong>
                <span>${transaction.card_number}</span>
              </div>
              `
                  : ""
              }
              ${
                amount > 0
                  ? `
              <div class="row">
                <strong>Amount:</strong>
                <span>${formatCurrency(amount)}</span>
              </div>
              `
                  : ""
              }
              ${
                fee > 0
                  ? `
              <div class="row">
                <strong>Fee:</strong>
                <span>${formatCurrency(fee)}</span>
              </div>
              `
                  : ""
              }
              <div class="row">
                <strong>Total:</strong>
                <span>${formatCurrency(total)}</span>
              </div>
              <div class="row">
                <strong>Status:</strong>
                <span>${transaction.status}</span>
              </div>
            </div>
            <div class="footer">
              <p>Thank you for using E-Zwich services</p>
              <p>Generated on ${format(new Date(), "PPP 'at' HH:mm")}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    return type === "withdrawal" ? (
      <DollarSign className="h-4 w-4" />
    ) : (
      <CreditCard className="h-4 w-4" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            View and manage E-Zwich withdrawal and card issuance history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by customer name, phone, card number, or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="reversed">Reversed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={loadTransactions}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Tabs for Withdrawals vs Issuances */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="issuances">Card Issuances</TabsTrigger>
            </TabsList>

            <TabsContent value="withdrawals" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Card Number</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          {loading ? (
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                              Loading transactions...
                            </div>
                          ) : (
                            "No withdrawal transactions found"
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-sm">
                            {transaction.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {transaction.customer_name}
                              </div>
                              {transaction.customer_phone && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {transaction.customer_phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {transaction.card_number || "N/A"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {transaction.amount
                              ? formatCurrency(transaction.amount)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {transaction.fee
                              ? formatCurrency(transaction.fee)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>
                                {format(
                                  new Date(transaction.created_at),
                                  "MMM dd, yyyy"
                                )}
                              </div>
                              <div className="text-muted-foreground">
                                {format(
                                  new Date(transaction.created_at),
                                  "HH:mm"
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TransactionActions
                                transaction={transaction}
                                userRole={user?.role || "User"}
                                sourceModule="e_zwich"
                                onSuccess={handleTransactionSuccess}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="issuances" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Card Number</TableHead>
                      <TableHead>Card Type</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          {loading ? (
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                              Loading transactions...
                            </div>
                          ) : (
                            "No card issuance transactions found"
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-sm">
                            {transaction.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {transaction.customer_name}
                              </div>
                              {transaction.customer_phone && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {transaction.customer_phone}
                                </div>
                              )}
                              {transaction.customer_email && (
                                <div className="text-sm text-muted-foreground">
                                  {transaction.customer_email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {transaction.card_number || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {transaction.card_type || "Standard"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {transaction.fee
                              ? formatCurrency(transaction.fee)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>
                                {format(
                                  new Date(transaction.created_at),
                                  "MMM dd, yyyy"
                                )}
                              </div>
                              <div className="text-muted-foreground">
                                {format(
                                  new Date(transaction.created_at),
                                  "HH:mm"
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TransactionActions
                                transaction={transaction}
                                sourceModule="e_zwich"
                                onSuccess={handleTransactionSuccess}
                                onEdit={() => handleEdit(transaction)}
                                onDelete={() => handleDelete(transaction)}
                              />
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
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction Receipt
            </DialogTitle>
            <DialogDescription>
              Detailed transaction information and receipt
            </DialogDescription>
          </DialogHeader>
          {currentTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Transaction ID:</span>
                  <p className="font-mono">{currentTransaction.id}</p>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <p className="capitalize flex items-center gap-2">
                    {getTransactionTypeIcon(currentTransaction.type)}
                    {currentTransaction.type === "withdrawal"
                      ? "Withdrawal"
                      : "Card Issuance"}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Customer:</span>
                  <p>{currentTransaction.customer_name}</p>
                </div>
                <div>
                  <span className="font-medium">Phone:</span>
                  <p>{currentTransaction.customer_phone || "N/A"}</p>
                </div>
                {currentTransaction.customer_email && (
                  <div>
                    <span className="font-medium">Email:</span>
                    <p>{currentTransaction.customer_email}</p>
                  </div>
                )}
                {currentTransaction.card_number && (
                  <div>
                    <span className="font-medium">Card Number:</span>
                    <p className="font-mono">
                      {currentTransaction.card_number}
                    </p>
                  </div>
                )}
                {currentTransaction.amount && (
                  <div>
                    <span className="font-medium">Amount:</span>
                    <p className="font-medium">
                      {formatCurrency(currentTransaction.amount)}
                    </p>
                  </div>
                )}
                {currentTransaction.fee && (
                  <div>
                    <span className="font-medium">Fee:</span>
                    <p>{formatCurrency(currentTransaction.fee)}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="mt-1">
                    {getStatusBadge(currentTransaction.status)}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Date:</span>
                  <p>
                    {format(
                      new Date(currentTransaction.created_at),
                      "PPP 'at' HH:mm"
                    )}
                  </p>
                </div>
                {currentTransaction.card_type && (
                  <div>
                    <span className="font-medium">Card Type:</span>
                    <p className="capitalize">{currentTransaction.card_type}</p>
                  </div>
                )}
                {currentTransaction.id_type && (
                  <div>
                    <span className="font-medium">ID Type:</span>
                    <p>{currentTransaction.id_type}</p>
                  </div>
                )}
                {currentTransaction.id_number && (
                  <div>
                    <span className="font-medium">ID Number:</span>
                    <p>{currentTransaction.id_number}</p>
                  </div>
                )}
                {currentTransaction.city && (
                  <div>
                    <span className="font-medium">City:</span>
                    <p>{currentTransaction.city}</p>
                  </div>
                )}
                {currentTransaction.region && (
                  <div>
                    <span className="font-medium">Region:</span>
                    <p>{currentTransaction.region}</p>
                  </div>
                )}
              </div>

              {currentTransaction.notes && (
                <div>
                  <span className="font-medium">Notes:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentTransaction.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => printReceipt(currentTransaction)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button onClick={() => setShowReceiptDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <TransactionEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        transaction={selectedTransaction}
        sourceModule="e_zwich"
        onSuccess={() => {
          setEditDialogOpen(false);
          setSelectedTransaction(null);
          handleTransactionSuccess();
        }}
      />

      {/* Delete Transaction Dialog */}
      <TransactionDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        transaction={selectedTransaction}
        sourceModule="e_zwich"
        onSuccess={() => {
          setDeleteDialogOpen(false);
          setSelectedTransaction(null);
          handleTransactionSuccess();
        }}
      />
    </div>
  );
}
