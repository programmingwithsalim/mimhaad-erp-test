"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreateAccountForm } from "./create-account-form"

interface CreateAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateAccountModal({ open, onOpenChange, onSuccess }: CreateAccountModalProps) {
  const handleSuccess = () => {
    onOpenChange(false)
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Float Account</DialogTitle>
          <DialogDescription>Add a new float account with the appropriate type and details.</DialogDescription>
        </DialogHeader>
        <CreateAccountForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
