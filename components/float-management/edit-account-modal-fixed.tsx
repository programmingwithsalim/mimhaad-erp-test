"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user-fixed"
import { Loader2, Edit } from "lucide-react"

const editAccountSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  current_balance: z.number().min(0, "Balance cannot be negative"),
  min_threshold: z.number().min(0, "Minimum threshold cannot be negative"),
  max_threshold: z.number().min(0, "Maximum threshold cannot be negative"),
  account_type: z.string().min(1, "Account type is required"),
  account_number: z.string().optional(),
  is_active: z.boolean(),
  isEzwichPartner: z.boolean().optional(),
})

type EditAccountFormData = z.infer<typeof editAccountSchema>

interface FloatAccount {
  id: string
  provider: string
  current_balance: number | string
  min_threshold: number | string
  max_threshold: number | string
  account_type: string
  account_number?: string
  is_active: boolean
  isEzwichPartner?: boolean
  branch_id: string
  branch_name?: string
  branchName?: string
}

interface EditAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: FloatAccount | null
  onSuccess: () => void
}

const accountTypes = [
  { value: "momo", label: "Mobile Money" },
  { value: "agency-banking", label: "Agency Banking" },
  { value: "e-zwich", label: "E-Zwich" },
  { value: "cash-in-till", label: "Cash in Till" },
  { value: "power", label: "Power/Electricity" },
  { value: "jumia", label: "Jumia" },
  { value: "gmoney", label: "G-Money" },
  { value: "zpay", label: "ZPay" },
]

export function EditAccountModalFixed({ open, onOpenChange, account, onSuccess }: EditAccountModalProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<EditAccountFormData>({
    resolver: zodResolver(editAccountSchema),
    defaultValues: {
      provider: "",
      current_balance: 0,
      min_threshold: 0,
      max_threshold: 0,
      account_type: "",
      account_number: "",
      is_active: true,
      isEzwichPartner: false,
    },
  })

  // Reset form when account changes
  useEffect(() => {
    if (account && open) {
      console.log("🔄 [EDIT MODAL] Setting form values for account:", account)
      form.reset({
        provider: account.provider || "",
        current_balance: Number(account.current_balance) || 0,
        min_threshold: Number(account.min_threshold) || 0,
        max_threshold: Number(account.max_threshold) || 0,
        account_type: account.account_type || "",
        account_number: account.account_number || "",
        is_active: account.is_active ?? true,
        isEzwichPartner: account.isEzwichPartner ?? false,
      })
    }
  }, [account, open, form])

  const onSubmit = async (data: EditAccountFormData) => {
    if (!account || !user) {
      toast({
        title: "Error",
        description: "Account or user information not available",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      console.log("🔄 [EDIT MODAL] Submitting update for account:", account.id)
      console.log("🔄 [EDIT MODAL] Update data:", data)

      const response = await fetch(`/api/float-accounts/${account.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-name": user.username,
          "x-user-role": user.role,
          "x-branch-id": user.branchId,
          "x-branch-name": user.branchName,
        },
        body: JSON.stringify({
          ...data,
          updated_by: user.id,
          updated_by_name: user.username,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        console.log("✅ [EDIT MODAL] Account updated successfully")
        toast({
          title: "Success",
          description: "Float account updated successfully",
        })
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error(result.error || "Failed to update account")
      }
    } catch (error) {
      console.error("❌ [EDIT MODAL] Error updating account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update account",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Float Account
          </DialogTitle>
          <DialogDescription>Update the details for {account.provider} float account</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider */}
            <div className="space-y-2">
              <Label htmlFor="provider">Provider *</Label>
              <Input id="provider" {...form.register("provider")} placeholder="Enter provider name" />
              {form.formState.errors.provider && (
                <p className="text-sm text-destructive">{form.formState.errors.provider.message}</p>
              )}
            </div>

            {/* Account Type */}
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type *</Label>
              <Select
                value={form.watch("account_type")}
                onValueChange={(value) => form.setValue("account_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.account_type && (
                <p className="text-sm text-destructive">{form.formState.errors.account_type.message}</p>
              )}
            </div>

            {/* Current Balance */}
            <div className="space-y-2">
              <Label htmlFor="current_balance">Current Balance (GHS) *</Label>
              <Input
                id="current_balance"
                type="number"
                step="0.01"
                min="0"
                {...form.register("current_balance", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.current_balance && (
                <p className="text-sm text-destructive">{form.formState.errors.current_balance.message}</p>
              )}
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input id="account_number" {...form.register("account_number")} placeholder="Enter account number" />
            </div>

            {/* Min Threshold */}
            <div className="space-y-2">
              <Label htmlFor="min_threshold">Minimum Threshold (GHS) *</Label>
              <Input
                id="min_threshold"
                type="number"
                step="0.01"
                min="0"
                {...form.register("min_threshold", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.min_threshold && (
                <p className="text-sm text-destructive">{form.formState.errors.min_threshold.message}</p>
              )}
            </div>

            {/* Max Threshold */}
            <div className="space-y-2">
              <Label htmlFor="max_threshold">Maximum Threshold (GHS) *</Label>
              <Input
                id="max_threshold"
                type="number"
                step="0.01"
                min="0"
                {...form.register("max_threshold", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.max_threshold && (
                <p className="text-sm text-destructive">{form.formState.errors.max_threshold.message}</p>
              )}
            </div>
          </div>

          {/* Switches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active Status</Label>
                <p className="text-sm text-muted-foreground">Enable or disable this float account</p>
              </div>
              <Switch
                id="is_active"
                checked={form.watch("is_active")}
                onCheckedChange={(checked) => form.setValue("is_active", checked)}
              />
            </div>

            {form.watch("account_type") === "e-zwich" && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isEzwichPartner">E-Zwich Partner</Label>
                  <p className="text-sm text-muted-foreground">Mark as E-Zwich partner account</p>
                </div>
                <Switch
                  id="isEzwichPartner"
                  checked={form.watch("isEzwichPartner") || false}
                  onCheckedChange={(checked) => form.setValue("isEzwichPartner", checked)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Account
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
