"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditFloatAccountFormInline } from "./edit-float-account-form-inline"

interface FloatAccount {
  id: string
  branchId: string
  branchName: string
  accountType: string
  provider?: string
  currentBalance: number
  minThreshold: number
  maxThreshold: number
  lastUpdated: string
}

interface EditAccountModalProps {
  account: FloatAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditAccountModal({ account, open, onOpenChange, onSuccess }: EditAccountModalProps) {
  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Float Account</DialogTitle>
          <DialogDescription>
            Update the details for {account.branchName} - {account.accountType}
            {account.provider && ` (${account.provider})`}
          </DialogDescription>
        </DialogHeader>
        <EditFloatAccountFormInline
          account={account}
          onSuccess={() => {
            onSuccess()
            onOpenChange(false)
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
