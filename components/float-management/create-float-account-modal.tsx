"use client"

import type React from "react"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Loader2, Plus } from "lucide-react"

const createAccountSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  account_type: z.string().min(1, "Account type is required"),
  current_balance: z.string().min(0, "Balance must be positive"),
  min_threshold: z.string().min(0, "Minimum threshold must be positive"),
  max_threshold: z.string().min(0, "Maximum threshold must be positive"),
  is_active: z.boolean().default(true),
  isEzwichPartner: z.boolean().default(false),
})

type CreateAccountForm = z.infer<typeof createAccountSchema>

interface CreateFloatAccountModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  branchId?: string
  trigger?: React.ReactNode
}

export function CreateFloatAccountModal({
  open,
  onOpenChange,
  onSuccess,
  branchId,
  trigger,
}: CreateFloatAccountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useCurrentUser()

  const form = useForm<CreateAccountForm>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      provider: "",
      account_type: "",
      current_balance: "0",
      min_threshold: "1000",
      max_threshold: "50000",
      is_active: true,
      isEzwichPartner: false,
    },
  })

  const handleSubmit = async (data: CreateAccountForm) => {
    // Use provided branchId or user's branchId or generate a default one
    const targetBranchId = branchId || user?.branchId || "550e8400-e29b-41d4-a716-446655440000"

    setIsSubmitting(true)

    try {
      const requestBody = {
        provider: data.provider,
        account_type: data.account_type,
        current_balance: Number.parseFloat(data.current_balance),
        min_threshold: Number.parseFloat(data.min_threshold),
        max_threshold: Number.parseFloat(data.max_threshold),
        is_active: data.is_active,
        isEzwichPartner: data.isEzwichPartner,
        branch_id: targetBranchId,
      }

      console.log("Creating float account with data:", requestBody)

      const response = await fetch("/api/float-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create account`)
      }

      const result = await response.json()
      console.log("Float account created successfully:", result)

      toast({
        title: "Account Created",
        description: "Float account has been created successfully.",
      })

      form.reset()
      if (onOpenChange) {
        onOpenChange(false)
      } else {
        setIsOpen(false)
      }

      onSuccess?.()
    } catch (error) {
      console.error("Error creating account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalOpen = open !== undefined ? open : isOpen
  const setModalOpen = onOpenChange || setIsOpen

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Float Account</DialogTitle>
          <DialogDescription>Create a new float account for managing service balances.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., MTN, Vodafone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="momo">Mobile Money</SelectItem>
                        <SelectItem value="agency-banking">Agency Banking</SelectItem>
                        <SelectItem value="e-zwich">E-Zwich</SelectItem>
                        <SelectItem value="cash-in-till">Cash in Till</SelectItem>
                        <SelectItem value="power">Power</SelectItem>
                        <SelectItem value="jumia">Jumia</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="current_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Balance (GHS)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="min_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Threshold (GHS)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="1000.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Threshold (GHS)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="50000.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <div className="text-sm text-muted-foreground">Enable this account for transactions</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isEzwichPartner"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>E-Zwich Partner</FormLabel>
                      <div className="text-sm text-muted-foreground">Mark as E-Zwich partner account</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
