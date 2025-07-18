"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  MoreVertical,
  Edit,
  RotateCcw,
  Trash2,
  Receipt,
  Eye,
  Printer,
  CheckCircle,
} from "lucide-react";
import {
  TransactionReceipt,
  TransactionReceiptData,
} from "@/components/shared/transaction-receipt";

interface TransactionActionsProps {
  transaction: any;
  userRole: string;
  onEdit?: (transaction: any) => void;
  onDelete?: (transaction: any) => void;
  onPrint?: () => void;
  onReverse?: () => void;
  onView?: () => void;
  sourceModule: string;
  onSuccess?: () => void;
}

export function TransactionActions({
  transaction,
  userRole,
  onEdit,
  onDelete,
  onPrint,
  onReverse,
  onView,
  sourceModule,
  onSuccess,
}: TransactionActionsProps) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<TransactionReceiptData | null>(
    null
  );
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);

  const canEdit =
    userRole === "Admin" || userRole === "Manager" || userRole === "Finance";
  const canDelete = userRole === "Admin" || userRole === "Finance";
  const canReverse =
    userRole === "Admin" || userRole === "Manager" || userRole === "Operations";
  const canApprove =
    userRole === "Admin" || userRole === "Manager" || userRole === "Cashier";

  // Special handling for Jumia transactions
  const isJumiaPackageReceipt =
    sourceModule === "jumia" &&
    transaction.transaction_type === "package_receipt";
  const isJumiaPodCollection =
    sourceModule === "jumia" &&
    transaction.transaction_type === "pod_collection";
  const isJumiaSettlement =
    sourceModule === "jumia" && transaction.transaction_type === "settlement";

  // Package receipts cannot be reversed, but can be edited/deleted without GL posting
  const canReverseTransaction = canReverse && !isJumiaPackageReceipt;
  // POD collections and settlements can be edited/deleted with GL posting
  const canEditTransaction = canEdit;
  const canDeleteTransaction = canDelete;

  const handleReverse = async () => {
    if (!reverseReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the reversal",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // For Jumia package receipts, show error since they can't be reversed
      if (isJumiaPackageReceipt) {
        toast({
          title: "Cannot Reverse Package Receipt",
          description:
            "Package receipts don't affect GL accounts and cannot be reversed",
          variant: "destructive",
        });
        setShowReverseDialog(false);
        setReverseReason("");
        return;
      }

      let response;
      if (sourceModule === "jumia") {
        response = await fetch(
          `/api/jumia/transactions/${transaction.transaction_id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "reverse",
              reason: reverseReason,
              userId: user?.id,
              branchId: user?.branchId,
              processedBy:
                user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.email,
            }),
          }
        );
      } else {
        response = await fetch("/api/transactions/unified", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reverse",
            transactionId: transaction.id,
            sourceModule: sourceModule,
            reason: reverseReason,
            userId: user?.id,
            branchId: user?.branchId,
            processedBy:
              user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.email,
          }),
        });
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Transaction Reversed",
          description:
            result.message || "Transaction has been reversed successfully",
        });
        setShowReverseDialog(false);
        setReverseReason("");
        onSuccess?.();
      } else {
        throw new Error(result.error || "Failed to reverse transaction");
      }
    } catch (error) {
      toast({
        title: "Reversal Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the deletion",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // For Jumia transactions, use the Jumia-specific API
      let response;
      if (sourceModule === "jumia") {
        response = await fetch(
          `/api/jumia/transactions/${transaction.transaction_id}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: deleteReason,
              userId: user?.id,
              branchId: user?.branchId,
              processedBy: user?.name || user?.username,
            }),
          }
        );
      } else {
        response = await fetch("/api/transactions/unified", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            transactionId: transaction.id,
            sourceModule: sourceModule,
            reason: deleteReason,
            userId: user?.id,
            branchId: user?.branchId,
            processedBy: user?.name || user?.username,
          }),
        });
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Transaction Deleted",
          description:
            result.message || "Transaction has been deleted successfully",
        });
        setShowDeleteDialog(false);
        setDeleteReason("");
        onSuccess?.();
      } else {
        throw new Error(result.error || "Failed to delete transaction");
      }
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateReceipt = async () => {
    try {
      // Format transaction data for the shared receipt component
      const formattedReceiptData: TransactionReceiptData = {
        transactionId: transaction.id || transaction.transaction_id,
        sourceModule: sourceModule as any,
        transactionType:
          transaction.type || transaction.transaction_type || "transaction",
        amount: transaction.amount || 0,
        fee: transaction.fee || 0,
        customerName: transaction.customer_name || transaction.customerName,
        customerPhone: transaction.customer_phone || transaction.customerPhone,
        reference:
          transaction.reference || transaction.id || transaction.transaction_id,
        branchName: user?.branchName || "Main Branch",
        date:
          transaction.created_at ||
          transaction.date ||
          new Date().toISOString(),
        additionalData: {
          // Add any additional data specific to the transaction type
          ...(transaction.meter_number && {
            "Meter Number": transaction.meter_number,
          }),
          ...(transaction.provider && { Provider: transaction.provider }),
          ...(transaction.tracking_id && {
            "Tracking ID": transaction.tracking_id,
          }),
          ...(transaction.card_number && {
            "Card Number": transaction.card_number,
          }),
          ...(transaction.partner_bank && {
            "Partner Bank": transaction.partner_bank,
          }),
          ...(transaction.status && { Status: transaction.status }),
        },
      };

      setReceiptData(formattedReceiptData);
      setShowReceipt(true);
    } catch (error) {
      toast({
        title: "Receipt Generation Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleEditSubmit = async (updated: any) => {
    if (!currentTransaction) return;
    setIsProcessing(true);
    try {
      // For Jumia transactions, use the Jumia-specific API
      let response;
      if (sourceModule === "jumia") {
        response = await fetch(
          `/api/jumia/transactions/${currentTransaction.transaction_id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...updated,
              userId: user?.id,
              branchId: user?.branchId,
              processedBy: user?.name || user?.username,
            }),
          }
        );
      } else {
        response = await fetch("/api/transactions/unified", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "edit",
            transactionId: currentTransaction.id,
            sourceModule: sourceModule,
            updates: updated,
            userId: user?.id,
            branchId: user?.branchId,
            processedBy: user?.name || user?.username,
          }),
        });
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Transaction Updated",
          description:
            result.message || "Transaction has been updated successfully",
        });
        setShowEditDialog(false);
        setCurrentTransaction(null);
        onSuccess?.();
      } else {
        throw new Error(result.error || "Failed to update transaction");
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproval = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/transactions/unified", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          transactionId: transaction.id,
          sourceModule: sourceModule,
          notes: approvalNotes,
          userId: user?.id,
          branchId: user?.branchId,
          processedBy:
            user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : user?.email,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Transaction Approved",
          description:
            result.message || "Transaction has been approved successfully",
        });
        setShowApprovalDialog(false);
        setApprovalNotes("");
        onSuccess?.();
      } else {
        throw new Error(result.error || "Failed to approve transaction");
      }
    } catch (error) {
      toast({
        title: "Approval Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onView && (
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={handleGenerateReceipt}>
            <Receipt className="mr-2 h-4 w-4" />
            Generate Receipt
          </DropdownMenuItem>

          {canApprove && transaction.status === "pending" && (
            <DropdownMenuItem onClick={() => setShowApprovalDialog(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Transaction
            </DropdownMenuItem>
          )}

          {canEditTransaction && onEdit && (
            <DropdownMenuItem
              onClick={() => {
                setCurrentTransaction(transaction);
                setShowEditDialog(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Transaction
            </DropdownMenuItem>
          )}

          {canReverseTransaction && (
            <DropdownMenuItem onClick={() => setShowReverseDialog(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reverse Transaction
            </DropdownMenuItem>
          )}

          {canDeleteTransaction && (
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Transaction
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reverse Transaction Dialog */}
      <Dialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Transaction</DialogTitle>
            <DialogDescription>
              {isJumiaPackageReceipt
                ? "Package receipts cannot be reversed as they don't affect GL accounts."
                : "This will create a reversal transaction and update float balances. Please provide a reason for the reversal."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reverse-reason">Reason for Reversal *</Label>
              <Textarea
                id="reverse-reason"
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Enter reason for reversal..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowReverseDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReverse}
                disabled={isProcessing || !reverseReason.trim()}
              >
                {isProcessing ? "Reversing..." : "Reverse Transaction"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              {isJumiaPackageReceipt
                ? "This will permanently delete the package receipt. Package receipts don't affect GL accounts, so no GL entries will be reversed."
                : "This will permanently delete the transaction and update float balances. This action cannot be undone. Please provide a reason for the deletion."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="delete-reason">Reason for Deletion *</Label>
              <Textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for deletion..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isProcessing || !deleteReason.trim()}
              >
                {isProcessing ? "Deleting..." : "Delete Transaction"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <TransactionReceipt
        data={receiptData}
        open={showReceipt}
        onOpenChange={setShowReceipt}
      />

      {/* Edit Transaction Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Jumia Transaction</DialogTitle>
            <DialogDescription>
              {isJumiaPackageReceipt
                ? "Update package receipt details. Package receipts don't affect GL accounts."
                : "Update transaction details. This will update GL entries if applicable."}
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
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? "Updating..." : "Update Transaction"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Transaction</DialogTitle>
            <DialogDescription>
              Approve this transaction. This will mark it as completed and
              update any pending balances.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
              <Textarea
                id="approval-notes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Enter any notes for this approval..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowApprovalDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button onClick={handleApproval} disabled={isProcessing}>
                {isProcessing ? "Approving..." : "Approve Transaction"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
