"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Loader2, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { formatCurrency } from "@/lib/currency"

const rechargeSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  source: z.enum(["cash", "bank_transfer", "head_office"], {
    required_error: "Please select a recharge source",
  }),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

type RechargeFormValues = z.infer<typeof rechargeSchema>

interface FloatRechargeButtonProps {
  account: {
    id: string
    provider: string
    account_type: string
    current_balance: number
  }
  onSuccess?: () => void
}

export function FloatRechargeButton({ account, onSuccess }: FloatRechargeButtonProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RechargeFormValues>({
    resolver: zodResolver(rechargeSchema),
    defaultValues: {
      amount: 0,
      source: "cash",
      reference: "",
      notes: "",
    },
  })

  const onSubmit = async (values: RechargeFormValues) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to recharge float accounts",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/float-accounts/${account.id}/refill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: values.amount,
          source: values.source,
          reference: values.reference || `RECHARGE-${Date.now()}`,
          notes: values.notes,
          user_id: user.id,
          branch_id: user.branchId,
          processed_by: user.username || user.email || "Unknown User",
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Recharge Successful",
          description: `${formatCurrency(values.amount)} added to ${account.provider} float account`,
        })
        form.reset()
        setOpen(false)
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to recharge float account",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error recharging float account:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700">
          <Plus className="h-4 w-4 mr-1" />
          Deposit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recharge Float Account
          </DialogTitle>
          <DialogDescription>
            Add funds to {account.provider} ({account.account_type})
            <br />
            Current Balance: {formatCurrency(account.current_balance)}
          </DialogDescription>
        </DialogHeader>
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
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recharge Source</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="cash">Cash Deposit</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="head_office">Head Office Transfer</option>
                    </select>
                  </FormControl>
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
                    <Textarea placeholder="Enter any additional notes" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
