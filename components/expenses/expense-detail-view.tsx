"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Expense, ExpenseHead } from "@/lib/expense-types"

interface ExpenseDetailViewProps {
  expense: Expense
  expenseHeads: ExpenseHead[]
  onStatusChange?: () => void
}

export function ExpenseDetailView({ expense, expenseHeads, onStatusChange }: ExpenseDetailViewProps) {
  const { toast } = useToast()
  const [branchName, setBranchName] = useState<string>("Loading...")
  const [paymentAccountName, setPaymentAccountName] = useState<string>("Loading...")
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  // Fetch branch and payment account details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch branch details
        try {
          const branchResponse = await fetch(`/api/branches/${expense.branch_id}`)
          if (branchResponse.ok) {
            const branchData = await branchResponse.json()
            setBranchName(branchData.name || "Unknown")
          } else {
            setBranchName("Unknown Branch")
          }
        } catch (branchError) {
          console.error("Error fetching branch:", branchError)
          setBranchName("Unknown Branch")
        }

        // Fetch payment account details if available
        if (expense.payment_account_id) {
          try {
            const accountResponse = await fetch(`/api/float-accounts/${expense.payment_account_id}`)
            if (accountResponse.ok) {
              const accountData = await accountResponse.json()
              setPaymentAccountName(accountData.accountNumber || accountData.provider || "Unknown")
            } else {
              setPaymentAccountName("Unknown Account")
            }
          } catch (accountError) {
            console.error("Error fetching account:", accountError)
            setPaymentAccountName("Unknown Account")
          }
        } else {
          setPaymentAccountName("Not specified")
        }
      } catch (error) {
        console.error("Error fetching details:", error)
        setBranchName("Unknown")
        setPaymentAccountName("Unknown")
      }
    }

    fetchDetails()
  }, [expense.branch_id, expense.payment_account_id])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  // Get expense head name
  const getExpenseHeadName = (headId: string) => {
    const head = expenseHeads.find((h) => h.id === headId)
    return head ? head.name : "Unknown"
  }

  // Get payment source name
  const getPaymentSourceName = (source: string) => {
    switch (source) {
      case "cash":
        return "Cash in Till"
      case "momo":
        return "Mobile Money"
      case "bank":
        return "Bank Account"
      default:
        return source
    }
  }

  // Handle approve expense
  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const response = await fetch(`/api/expenses/${expense.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approver_id: "00000000-0000-0000-0000-000000000001",
          comments: "Approved via expense detail view",
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Expense approved successfully",
        })

        // Call the callback to refresh the parent component
        if (onStatusChange) {
          onStatusChange()
        }
      } else {
        throw new Error(data.error || "Failed to approve expense")
      }
    } catch (error) {
      console.error("Error approving expense:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve expense",
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  // Handle reject expense
  const handleReject = async () => {
    const reason = prompt("Please provide a reason for rejection:")
    if (!reason) return

    setIsRejecting(true)
    try {
      const response = await fetch(`/api/expenses/${expense.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approver_id: "00000000-0000-0000-0000-000000000001",
          reason: reason,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Expense rejected successfully",
        })

        // Call the callback to refresh the parent component
        if (onStatusChange) {
          onStatusChange()
        }
      } else {
        throw new Error(data.error || "Failed to reject expense")
      }
    } catch (error) {
      console.error("Error rejecting expense:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject expense",
        variant: "destructive",
      })
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Expense Category</h4>
          <p className="text-base font-medium">{getExpenseHeadName(expense.expense_head_id)}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Amount</h4>
          <p className="text-base font-medium">{formatCurrency(expense.amount)}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Date</h4>
          <p className="text-base">{format(new Date(expense.expense_date), "MMMM dd, yyyy")}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Branch</h4>
          <p className="text-base">{branchName}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Payment Source</h4>
          <p className="text-base">{getPaymentSourceName(expense.payment_source)}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Payment Account</h4>
          <p className="text-base">{paymentAccountName}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Reference Number</h4>
          <p className="text-base">{expense.reference_number}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
          <Badge
            variant={
              expense.status === "approved" ? "success" : expense.status === "rejected" ? "destructive" : "warning"
            }
            className="mt-1"
          >
            {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
          </Badge>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
        <p className="mt-1 text-base">{expense.description || "No description provided."}</p>
      </div>

      {expense.attachment_url && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Attachment</h4>
          <div className="mt-2">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href={expense.attachment_url} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4" />
                View Receipt
              </a>
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border p-4">
        <h4 className="mb-2 font-medium">Accounting Entries</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>DR: {getExpenseHeadName(expense.expense_head_id)}</span>
            <span>{formatCurrency(expense.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>CR: {getPaymentSourceName(expense.payment_source)}</span>
            <span>{formatCurrency(expense.amount)}</span>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>Created by: {expense.created_by}</p>
        <p>Created at: {format(new Date(expense.created_at), "MMM dd, yyyy HH:mm:ss")}</p>
        {expense.approved_by && (
          <p>
            {expense.status === "approved" ? "Approved" : "Rejected"} by: {expense.approved_by}
          </p>
        )}
        <p>Transaction ID: {expense.id}</p>
      </div>

      {expense.status === "pending" && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReject} disabled={isRejecting || isApproving} className="gap-2">
            {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            {isRejecting ? "Rejecting..." : "Reject"}
          </Button>
          <Button onClick={handleApprove} disabled={isApproving || isRejecting} className="gap-2">
            {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {isApproving ? "Approving..." : "Approve"}
          </Button>
        </div>
      )}
    </div>
  )
}
