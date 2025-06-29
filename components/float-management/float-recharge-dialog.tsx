"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Loader2, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

const rechargeSchema = z.object({
  amount: z.number().min(1, "Amount must be greater than 0"),
  recharge_method: z.enum(["manual", "bank_transfer", "cash_deposit"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

type RechargeFormData = z.infer<typeof rechargeSchema>

interface FloatRechargeDialogProps {
  account: {
    id: string
    provider: string
    account_type: string
    current_balance: number
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function FloatRechargeDialog({ account, open, onOpenChange, onSuccess }: FloatRechargeDialogProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RechargeFormData>({
    resolver: zodResolver(rechargeSchema),
    defaultValues: {
      amount: 0,
      recharge_method: "manual",
      reference: "",
      notes: "",
    },
  })

  const onSubmit = async (data: RechargeFormData) => {
    if (!account || !user) {
      toast({
        title: "Error",
        description: "Account or user information missing",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/float-accounts/${account.id}/recharge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: data.amount,
          recharge_method: data.recharge_method,
          reference: data.reference || `RECHARGE-${Date.now()}`,
          notes: data.notes,
          user_id: user.id,
          processed_by: user.username || user.name || "Unknown",
          branch_id: user.branchId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Recharge Successful",
          description: `${formatCurrency(data.amount)} added to ${account.provider} float account`,
        })
        form.reset()
        onOpenChange(false)
        onSuccess()
      } else {
        throw new Error(result.error || "Failed to recharge account")
      }
    } catch (error) {
      console.error("Recharge error:", error)
      toast({
        title: "Recharge Failed",
        description: error instanceof Error ? error.message : "Failed to recharge account",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recharge Float Account</DialogTitle>
          <DialogDescription>
            Add funds to {account?.provider} ({account?.account_type}) float account
          </DialogDescription>
        </DialogHeader>

        {account && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Balance:</span>
              <span className="font-bold">{formatCurrency(account.current_balance)}</span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recharge Amount (GHS)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recharge_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recharge Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recharge method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash_deposit">Cash Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter reference number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter any additional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Recharge Account
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
