"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { CommissionDetails } from "./commission-details";
import {
  Eye,
  Edit,
  Trash,
  DollarSign,
  Download,
  FileText,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import type { Commission } from "@/lib/commission-types";
import { EditCommissionDialog } from "./edit-commission-dialog";
import { ReceiptManagementDialog } from "./receipt-management-dialog";

interface CommissionTableProps {
  commissions: Commission[];
  isLoading?: boolean;
  compact?: boolean;
  onRefresh?: () => void;
  onEdit?: (commission: Commission) => void;
  onDelete?: (commission: Commission) => void;
  onMarkPaid?: (commission: Commission) => void;
}

export function CommissionTable({
  commissions,
  isLoading = false,
  compact = false,
  onRefresh,
  onEdit,
  onDelete,
  onMarkPaid,
}: CommissionTableProps) {
  const { toast } = useToast();
  const [selectedCommission, setSelectedCommission] =
    useState<Commission | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  // State for bulk actions
  const [selectedCommissions, setSelectedCommissions] = useState<Commission[]>(
    []
  );
  const [selectAll, setSelectAll] = useState(false);

  const handleView = (commission: Commission) => {
    setSelectedCommission(commission);
    setViewDialogOpen(true);
  };

  const handleEdit = (commission: Commission) => {
    setSelectedCommission(commission);
    setEditDialogOpen(true);
    if (onEdit) onEdit(commission);
  };

  const handleDelete = (commission: Commission) => {
    setSelectedCommission(commission);
    setDeleteDialogOpen(true);
  };

  const handlePay = (commission: Commission) => {
    setSelectedCommission(commission);
    setPayDialogOpen(true);
  };

  const handleReceipt = (commission: Commission) => {
    setSelectedCommission(commission);
    setReceiptDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCommission || !onDelete) return;

    setActionLoading(true);
    try {
      await onDelete(selectedCommission);
      setDeleteDialogOpen(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Delete failed with error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmPay = async () => {
    if (!selectedCommission || !onMarkPaid) return;

    setActionLoading(true);
    try {
      await onMarkPaid(selectedCommission);
      setPayDialogOpen(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: "There was an error marking the commission as paid.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    if (onRefresh) onRefresh();
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCommissions([]);
    } else {
      setSelectedCommissions([...commissions]);
    }
    setSelectAll(!selectAll);
  };

  // Handle individual row selection
  const handleSelectRow = (commission: Commission, checked: boolean) => {
    if (checked) {
      setSelectedCommissions((prev) => [...prev, commission]);
    } else {
      setSelectedCommissions((prev) =>
        prev.filter((c) => c.id !== commission.id)
      );
    }
  };

  // Check if a commission is selected
  const isSelected = (commission: Commission) => {
    return selectedCommissions.some((c) => c.id === commission.id);
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Reference",
      "Source",
      "Amount",
      "Status",
      "Month",
      "Branch",
      "Description",
    ];

    const csvData = commissions.map((commission) => [
      commission.createdAt
        ? format(new Date(commission.createdAt), "yyyy-MM-dd HH:mm:ss")
        : "",
      commission.reference || "",
      commission.source || "",
      commission.amount ? Number(commission.amount).toFixed(2) : "0.00",
      commission.status || "",
      commission.month ? format(new Date(commission.month), "MMM yyyy") : "",
      commission.branchName || "",
      commission.description || "",
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
      `commissions-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${commissions.length} commissions to CSV`,
    });
  };

  const getSourceBadge = (source: string) => {
    const sourceColors: Record<string, string> = {
      mtn: "bg-yellow-500",
      vodafone: "bg-red-500",
      "airtel-tigo": "bg-blue-500",
      jumia: "bg-green-500",
      vra: "bg-purple-500",
      "agency-banking": "bg-indigo-500",
      other: "bg-gray-500",
    };

    const sourceLower = source.toLowerCase();
    return (
      <Badge
        className={`${
          sourceColors[sourceLower] || "bg-gray-500"
        } text-white hover:${sourceColors[sourceLower] || "bg-gray-600"}`}
      >
        {sourceLower === "mtn"
          ? "MTN"
          : sourceLower === "vodafone"
          ? "Vodafone"
          : sourceLower === "airtel-tigo"
          ? "AirtelTigo"
          : sourceLower === "jumia"
          ? "Jumia"
          : sourceLower === "vra"
          ? "VRA"
          : sourceLower === "agency-banking"
          ? "Agency Banking"
          : source}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
      paid: { bg: "bg-blue-100", text: "text-blue-800" },
    };

    const { bg, text } = statusColors[status] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
    };

    return (
      <Badge variant="outline" className={`${bg} ${text} border-0`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          {Array.from({ length: compact ? 5 : 10 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (!commissions || commissions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No commissions found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Export Button */}
      {!compact && (
        <div className="flex justify-between items-center mb-4">
          <div>
            {selectedCommissions.length > 0 && (
              <div className="bg-muted p-2 rounded-md flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">
                    {selectedCommissions.length}
                  </span>{" "}
                  of <span className="font-medium">{commissions.length}</span>{" "}
                  commissions selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCommissions([]);
                      setSelectAll(false);
                    }}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {!compact && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all commissions"
                  />
                </TableHead>
              )}
              <TableHead>Provider</TableHead>
              <TableHead>Reference</TableHead>
              {!compact && <TableHead>Month</TableHead>}
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((commission) => (
              <TableRow
                key={commission.id}
                className={isSelected(commission) ? "bg-muted/50" : undefined}
              >
                {!compact && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected(commission)}
                      onCheckedChange={(checked) =>
                        handleSelectRow(commission, !!checked)
                      }
                      aria-label={`Select commission ${commission.reference}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <span className="text-sm font-medium">
                    {commission.sourceName}
                  </span>
                </TableCell>
                <TableCell>{commission.reference}</TableCell>
                {!compact && (
                  <TableCell>
                    {commission.month
                      ? format(new Date(commission.month), "MMM yyyy")
                      : "Unknown"}
                  </TableCell>
                )}
                <TableCell>{formatCurrency(commission.amount)}</TableCell>
                <TableCell>{getStatusBadge(commission.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(commission)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(commission)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {/* Receipt Management Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={
                        commission.receipt_filename
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                      onClick={() => handleReceipt(commission)}
                      title={
                        commission.receipt_filename
                          ? "View Receipt"
                          : "Upload Receipt"
                      }
                    >
                      {commission.receipt_filename ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    {commission.status === "pending" && onMarkPaid && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue-600"
                        onClick={() => handlePay(commission)}
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(commission)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Commission Details</DialogTitle>
          </DialogHeader>
          {selectedCommission && (
            <CommissionDetails commission={selectedCommission} />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {selectedCommission && (
        <EditCommissionDialog
          commission={selectedCommission}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Commission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this commission?</p>
            {selectedCommission && (
              <div className="bg-muted p-3 rounded-md">
                <p>
                  <strong>Reference:</strong> {selectedCommission.reference}
                </p>
                <p>
                  <strong>Amount:</strong>{" "}
                  {formatCurrency(selectedCommission.amount)}
                </p>
                <p>
                  <strong>Status:</strong> {selectedCommission.status}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? "Deleting..." : "Delete Commission"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Commission as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to mark this commission as paid?</p>
            {selectedCommission && (
              <div className="bg-muted p-3 rounded-md">
                <p>
                  <strong>Reference:</strong> {selectedCommission.reference}
                </p>
                <p>
                  <strong>Amount:</strong>{" "}
                  {formatCurrency(selectedCommission.amount)}
                </p>
                <p>
                  <strong>Provider:</strong> {selectedCommission.sourceName}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmPay}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {actionLoading ? "Processing..." : "Mark as Paid"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Management Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Receipt Management</DialogTitle>
          </DialogHeader>
          {selectedCommission && (
            <ReceiptManagementDialog
              commission={selectedCommission}
              onClose={() => setReceiptDialogOpen(false)}
              onSuccess={() => {
                setReceiptDialogOpen(false);
                if (onRefresh) onRefresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
