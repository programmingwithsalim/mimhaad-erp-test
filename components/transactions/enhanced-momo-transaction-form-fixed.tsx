"use client"

import React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user-fixed"
import { Loader2, Smartphone, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const momoTransactionSchema = z.object({
  type: z.enum(["cash-in", "cash-out", "transfer", "payment"]),
  amount: z.number().min(1, "Amount must be greater than 0"),
  phone_number: z.string().min(10, "Phone number must be at least 10 digits"),
  customer_name: z.string().min(1, "Customer name is required"),
  float_account_id: z.string().min(1, "Float account is required"),
  reference: z.string().optional(),
})

type MomoTransactionFormData = z.infer<typeof momoTransactionSchema>

interface FloatAccount {
  id: string
  provider: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  account_type: string
  is_active: boolean
}

interface EnhancedMomoTransactionFormProps {
  onSuccess?: () => void
  momoFloats: FloatAccount[]
}

export function EnhancedMomoTransactionFormFixed({ onSuccess, momoFloats }: EnhancedMomoTransactionFormProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calculatedFee, setCalculatedFee] = useState<number>(0)
  const [selectedFloat, setSelectedFloat] = useState<FloatAccount | null>(null)

  const form = useForm<MomoTransactionFormData>({
    resolver: zodResolver(momoTransactionSchema),
    defaultValues: {
      type: "cash-in",
      amount: 0,
      phone_number: "",
      customer_name: "",
      float_account_id: "",
      reference: "",
    },
  })

  const watchedAmount = form.watch("amount")
  const watchedFloatId = form.watch("float_account_id")
  const watchedType = form.watch("type")

  // Calculate fee when amount or provider changes
  React.useEffect(() => {
    if (watchedAmount && selectedFloat) {
      calculateFee(watchedAmount, selectedFloat.provider, watchedType)
    }
  }, [watchedAmount, selectedFloat, watchedType])

  // Update selected float when float ID changes
  React.useEffect(() => {
    if (watchedFloatId) {
      const float = momoFloats.find((f) => f.id === watchedFloatId)
      setSelectedFloat(float || null)
    }
  }, [watchedFloatId, momoFloats])

  const calculateFee = async (amount: number, provider: string, type: string) => {
    try {
      const response = await fetch("/api/momo/calculate-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, provider, type }),
      })

      if (response.ok) {
        const data = await response.json()
        setCalculatedFee(data.fee || 0)
      }
    } catch (error) {
      console.error("Error calculating fee:", error)
      setCalculatedFee(0)
    }
  }

  const getFloatStatus = (current: number, min: number) => {
    if (current < min) return { label: "Critical", color: "destructive" }
    if (current < min * 1.5) return { label: "Low", color: "warning" }
    return { label: "Healthy", color: "success" }
  }

  const canProcessTransaction = (amount: number, type: string) => {
    if (!selectedFloat) return false

    if (type === "cash-in") {
      // For cash-in, we need enough cash in till
      return true // Assuming cash is available
    } else {
      // For cash-out, we need enough float balance
      const totalRequired = amount + calculatedFee
      return selectedFloat.current_balance >= totalRequired
    }
  }

  const onSubmit = async (data: MomoTransactionFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "User information not available. Please log in again.",
        variant: "destructive",
      })
      return
    }

    if (!selectedFloat) {
      toast({
        title: "Error",
        description: "Please select a MoMo provider.",
        variant: "destructive",
      })
      return
    }

    if (!canProcessTransaction(data.amount, data.type)) {
      toast({
        title: "Insufficient Balance",
        description: `This transaction cannot be processed due to insufficient float balance.`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const transactionData = {
        type: data.type,
        amount: data.amount,
        fee: calculatedFee,
        phone_number: data.phone_number,
        customer_name: data.customer_name,
        reference: data.reference || `MOMO-${Date.now()}`,
        float_account_id: data.float_account_id,
        provider: selectedFloat.provider,
        user_id: user.id, // Use actual user ID
        processed_by: user.id, // Use actual user ID, not username
        branch_id: user.branchId,
        username: user.username,
        branchName: user.branchName,
      }

      console.log("🔄 [MOMO] Submitting transaction:", transactionData)

      const response = await fetch("/api/momo/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-name": user.username,
          "x-user-role": user.role,
          "x-branch-id": user.branchId,
          "x-branch-name": user.branchName,
        },
        body: JSON.stringify(transactionData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: "MoMo transaction processed successfully",
        })
        form.reset()
        setCalculatedFee(0)
        setSelectedFloat(null)
        onSuccess?.()
      } else {
        throw new Error(result.error || "Failed to process transaction")
      }
    } catch (error) {
      console.error("Error processing MoMo transaction:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process transaction",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeMomoFloats = momoFloats.filter((f) => f.is_active && f.account_type === "momo")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transaction Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash-in">Cash In</SelectItem>
                    <SelectItem value="cash-out">Cash Out</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* MoMo Provider (Float Account) */}
          <FormField
            control={form.control}
            name="float_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MoMo Provider</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select MoMo provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeMomoFloats.map((float) => {
                      const status = getFloatStatus(float.current_balance, float.min_threshold)
                      return (
                        <SelectItem key={float.id} value={float.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{float.provider}</span>
                            <div className="flex items-center gap-2 ml-2">
                              <Badge variant={status.color as any} className="text-xs">
                                {status.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                GHS {float.current_balance.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (GHS)</FormLabel>
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

          {/* Phone Number */}
          <FormField
            control={form.control}
            name="phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="0241234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Customer Name */}
          <FormField
            control={form.control}
            name="customer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter customer name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Reference */}
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Auto-generated if empty" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Selected Float Info */}
        {selectedFloat && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Selected Provider:</span>
                <span className="font-bold">{selectedFloat.provider}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Available Balance:</span>
                <span className="font-bold">GHS {selectedFloat.current_balance.toFixed(2)}</span>
              </div>
              {calculatedFee > 0 && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Transaction Fee:</span>
                    <span className="font-bold">GHS {calculatedFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Total Required:</span>
                    <span className="text-lg font-bold text-primary">
                      GHS {(watchedAmount + calculatedFee).toFixed(2)}
                    </span>
                  </div>
                  {!canProcessTransaction(watchedAmount, watchedType) && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">Insufficient balance for this transaction</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !canProcessTransaction(watchedAmount, watchedType)}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Smartphone className="mr-2 h-4 w-4" />
              Process MoMo Transaction
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
