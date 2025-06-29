"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Trash2, AlertTriangle } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user-fixed"

interface FloatAccount {
  id: string
  provider: string
  current_balance: number | string
  account_type: string
  branch_name?: string
  branchName?: string
}

interface DeleteAccountDialogProps {
  account: FloatAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (force?: boolean) => void
  isDeleting: boolean
}

export function DeleteAccountDialogFixed({
  account,
  open,
  onOpenChange,
  onDeleted,
  isDeleting,
}: DeleteAccountDialogProps) {
  const { user } = useCurrentUser()
  const [forceDelete, setForceDelete] = useState(false)

  const isAdmin = user?.role === "admin"
  const hasBalance = account ? Number(account.current_balance) > 0 : false

  const handleDelete = () => {
    if (onDeleted) {
      onDeleted(forceDelete)
    }
  }

  const handleCancel = () => {
    setForceDelete(false)
    onOpenChange(false)
  }

  if (!account) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {isAdmin ? "Delete Float Account" : "Deactivate Float Account"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {isAdmin
                ? `Are you sure you want to permanently delete the float account for ${account.provider}?`
                : `Are you sure you want to deactivate the float account for ${account.provider}?`}
            </p>

            {hasBalance && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  This account has a balance of GHS {Number(account.current_balance).toFixed(2)}
                </span>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <strong>Account Details:</strong>
              <br />
              Provider: {account.provider}
              <br />
              Type: {account.account_type}
              <br />
              Branch: {account.branchName || account.branch_name || "Unknown"}
              <br />
              Balance: GHS {Number(account.current_balance).toFixed(2)}
            </div>

            {isAdmin && hasBalance && (
              <div className="flex items-center space-x-2 mt-3">
                <input
                  type="checkbox"
                  id="force-delete"
                  checked={forceDelete}
                  onChange={(e) => setForceDelete(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="force-delete" className="text-sm text-destructive">
                  Force delete (ignore balance warning)
                </label>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              {isAdmin
                ? "This action cannot be undone."
                : "The account will be deactivated and can be reactivated later."}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || (hasBalance && !forceDelete && isAdmin)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isAdmin ? "Deleting..." : "Deactivating..."}
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {isAdmin ? "Delete Account" : "Deactivate Account"}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
