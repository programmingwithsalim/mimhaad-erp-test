"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Expense } from "@/lib/expense-types"

interface ExpenseApprovalDialogProps {
  expense: Expense
  onApprovalComplete: () => void
}

export function ExpenseApprovalDialog({ expense, onApprovalComplete }: ExpenseApprovalDialogProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [comments, setComments] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const response = await fetch(`/api/expenses/${expense.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approver_id: "00000000-0000-0000-0000-000000000001", // System user
          comments: comments || undefined,
        }),
      })

      if (response.ok) {
        setApproveDialogOpen(false)
        setComments("")
        onApprovalComplete()
      } else {
        const data = await response.json()
        alert(`Failed to approve expense: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error approving expense:", error)
      alert("An error occurred while approving the expense")
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection")
      return
    }

    setIsRejecting(true)
    try {
      const response = await fetch(`/api/expenses/${expense.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rejector_id: "00000000-0000-0000-0000-000000000001", // System user
          reason: rejectionReason,
        }),
      })

      if (response.ok) {
        setRejectDialogOpen(false)
        setRejectionReason("")
        onApprovalComplete()
      } else {
        const data = await response.json()
        alert(`Failed to reject expense: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error rejecting expense:", error)
      alert("An error occurred while rejecting the expense")
    } finally {
      setIsRejecting(false)
    }
  }

  if (expense.status !== "pending") {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant={
            expense.status === "approved"
              ? "default"
              : expense.status === "rejected"
                ? "destructive"
                : expense.status === "paid"
                  ? "secondary"
                  : "outline"
          }
        >
          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
        </Badge>
        {expense.status === "approved" && (
          <span className="text-sm text-muted-foreground">Approved by {expense.approved_by}</span>
        )}
        {expense.status === "rejected" && (
          <span className="text-sm text-muted-foreground">Rejected by {expense.rejected_by}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Approve
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h4 className="font-medium">Expense Details</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <strong>Reference:</strong> {expense.reference_number}
                </p>
                <p>
                  <strong>Amount:</strong> {formatCurrency(expense.amount)}
                </p>
                <p>
                  <strong>Description:</strong> {expense.description}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="approve-comments">Comments (Optional)</Label>
              <Textarea
                id="approve-comments"
                placeholder="Add any comments about this approval..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={isApproving}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isApproving}>
                {isApproving ? "Approving..." : "Approve Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h4 className="font-medium">Expense Details</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <strong>Reference:</strong> {expense.reference_number}
                </p>
                <p>
                  <strong>Amount:</strong> {formatCurrency(expense.amount)}
                </p>
                <p>
                  <strong>Description:</strong> {expense.description}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="rejection-reason">Reason for Rejection *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a reason for rejecting this expense..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={isRejecting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={isRejecting || !rejectionReason.trim()}>
                {isRejecting ? "Rejecting..." : "Reject Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
