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
} from "lucide-react";

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
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<string>("");

  const canEdit =
    userRole === "Admin" || userRole === "Manager" || userRole === "Finance";
  const canDelete = userRole === "Admin" || userRole === "Finance";
  const canReverse =
    userRole === "Admin" || userRole === "Manager" || userRole === "Operations";

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
      const response = await fetch("/api/transactions/unified", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reverse",
          transactionId: transaction.id,
          sourceModule: sourceModule,
          reason: reverseReason,
          userId: user?.id,
          branchId: user?.branchId,
          processedBy: user?.name || user?.username,
        }),
      });

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
      const response = await fetch("/api/transactions/unified", {
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
      const response = await fetch(
        `/api/transactions/unified?action=receipt&transactionId=${
          transaction.id
        }&sourceModule=${sourceModule}&branchName=${
          user?.branchName || "Branch"
        }`
      );

      const result = await response.json();

      if (result.success && result.receipt) {
        setReceipt(result.receipt);
        setShowReceiptDialog(true);
      } else {
        throw new Error(result.error || "Failed to generate receipt");
      }
    } catch (error) {
      toast({
        title: "Receipt Generation Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && receipt) {
      printWindow.document.write(receipt);
      printWindow.document.close();
      printWindow.print();
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

          {canEdit && onEdit && (
            <DropdownMenuItem onClick={() => onEdit(transaction)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Transaction
            </DropdownMenuItem>
          )}

          {canReverse && (
            <DropdownMenuItem onClick={() => setShowReverseDialog(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reverse Transaction
            </DropdownMenuItem>
          )}

          {canDelete && (
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
              This will create a reversal transaction and update float balances.
              Please provide a reason for the reversal.
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
              This will permanently delete the transaction and update float
              balances. This action cannot be undone. Please provide a reason
              for the deletion.
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
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
            <DialogDescription>
              Transaction receipt generated successfully
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="border rounded-lg p-4 bg-gray-50"
              dangerouslySetInnerHTML={{ __html: receipt }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowReceiptDialog(false)}
              >
                Close
              </Button>
              <Button onClick={handlePrintReceipt}>
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
