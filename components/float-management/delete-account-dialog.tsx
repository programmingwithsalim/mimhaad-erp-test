"use client"

import { useState } from "react"
import { useCurrentUser } from "@/hooks/use-current-user"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, Trash2, EyeOff } from "lucide-react"

interface FloatAccount {
  id: string
  provider?: string
  account_type: string
  current_balance: number | string
  branch_name?: string
}

interface DeleteAccountDialogProps {
  account: FloatAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (force?: boolean) => void
}

export function DeleteAccountDialog({ account, open, onOpenChange, onSuccess }: DeleteAccountDialogProps) {
  const { user } = useCurrentUser()
  const [isDeleting, setIsDeleting] = useState(false)

  const isAdmin = user?.role === "admin"
  const canForceDelete = isAdmin
  const canSoftDelete = ["admin", "manager", "finance"].includes(user?.role || "")

  const handleSoftDelete = async () => {
    if (!account) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/float-accounts/${account.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deactivate",
          is_active: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to deactivate account")
      }

      onSuccess(false)
    } catch (error) {
      console.error("Error deactivating account:", error)
      throw error
    } finally {
      setIsDeleting(false)
    }
  }

  const handleForceDelete = async () => {
    if (!account) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/float-accounts/${account.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete account")
      }

      onSuccess(true)
    } catch (error) {
      console.error("Error deleting account:", error)
      throw error
    } finally {
      setIsDeleting(false)
    }
  }

  if (!account) return null

  const accountLabel = `${account.account_type}${account.provider ? ` (${account.provider})` : ""}`
  const balance = Number(account.current_balance || 0)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {isAdmin ? "Delete Account" : "Deactivate Account"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                {isAdmin
                  ? "Are you sure you want to delete this float account?"
                  : "Are you sure you want to deactivate this float account?"}
              </p>

              {/* Account Details */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Account:</span>
                  <span>{accountLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Branch:</span>
                  <span>{account.branch_name || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Balance:</span>
                  <span className={balance > 0 ? "text-green-600 font-medium" : ""}>GHS {balance.toFixed(2)}</span>
                </div>
              </div>

              {/* Balance Warning */}
              {balance > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Balance Warning</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    This account has a positive balance. Consider transferring funds before deletion.
                  </p>
                </div>
              )}

              {/* Action Explanation */}
              <div className="text-sm text-muted-foreground">
                {isAdmin ? (
                  <p>
                    <strong>Deactivate:</strong> Account will be hidden but data preserved.
                    <br />
                    <strong>Delete:</strong> Account and related data will be permanently removed.
                  </p>
                ) : (
                  <p>
                    The account will be deactivated and hidden from the interface, but all data will be preserved. Only
                    administrators can permanently delete accounts.
                  </p>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>

          {/* Soft Delete Button (Deactivate) */}
          {canSoftDelete && (
            <Button
              variant="outline"
              onClick={handleSoftDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
              Deactivate
            </Button>
          )}

          {/* Force Delete Button (Admin Only) */}
          {canForceDelete && (
            <Button
              onClick={handleForceDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Permanently
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
