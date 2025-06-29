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
import { Loader2, Zap, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const powerTransactionSchema = z.object({
  meterNumber: z.string().min(1, "Meter number is required"),
  floatAccountId: z.string().min(1, "Power provider is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  reference: z.string().optional(),
})

type PowerTransactionFormData = z.infer<typeof powerTransactionSchema>

interface FloatAccount {
  id: string
  provider: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  account_type: string
  is_active: boolean
}

interface PowerTransactionFormEnhancedProps {
  onSuccess?: () => void
  powerFloats: FloatAccount[]
}

export function PowerTransactionFormEnhanced({ onSuccess, powerFloats }: PowerTransactionFormEnhancedProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calculatedFee, setCalculatedFee] = useState<number>(0)
  const [selectedFloat, setSelectedFloat] = useState<FloatAccount | null>(null)

  const form = useForm<PowerTransactionFormData>({
    resolver: zodResolver(powerTransactionSchema),
    defaultValues: {
      meterNumber: "",
      floatAccountId: "",
      amount: 0,
      customerName: "",
      customerPhone: "",
      reference: "",
    },
  })

  const watchedAmount = form.watch("amount")
  const watchedFloatId = form.watch("floatAccountId")

  // Calculate fee when amount or provider changes
  React.useEffect(() => {
    if (watchedAmount && selectedFloat) {
      calculateFee(watchedAmount, selectedFloat.provider)
    }
  }, [watchedAmount, selectedFloat])

  // Update selected float when float ID changes
  React.useEffect(() => {
    if (watchedFloatId) {
      const float = powerFloats.find((f) => f.id === watchedFloatId)
      setSelectedFloat(float || null)
    }
  }, [watchedFloatId, powerFloats])

  const calculateFee = async (amount: number, provider: string) => {
    try {
      const response = await fetch("/api/power/calculate-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, provider }),
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

  const canProcessTransaction = (amount: number) => {
    if (!selectedFloat) return false
    const totalRequired = amount + calculatedFee
    return selectedFloat.current_balance >= totalRequired
  }

  const onSubmit = async (data: PowerTransactionFormData) => {
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
        description: "Please select a power provider.",
        variant: "destructive",
      })
      return
    }

    const totalRequired = data.amount + calculatedFee
    if (!canProcessTransaction(data.amount)) {
      toast({
        title: "Insufficient Float Balance",
        description: `This transaction requires GHS ${totalRequired.toFixed(2)} but the float only has GHS ${selectedFloat.current_balance.toFixed(2)}.`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const transactionData = {
        meterNumber: data.meterNumber,
        provider: selectedFloat.provider,
        amount: data.amount,
        fee: calculatedFee,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        reference: data.reference || `PWR-${Date.now()}`,
        floatAccountId: data.floatAccountId,
        userId: user.id,
        branchId: user.branchId,
        processedBy: user.name || user.username,
        username: user.username,
        branchName: user.branchName,
      }

      console.log("🔄 [POWER] Submitting transaction:", transactionData)

      const response = await fetch("/api/power/transactions", {
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
          description: "Power transaction processed successfully",
        })
        form.reset()
        setCalculatedFee(0)
        setSelectedFloat(null)
        onSuccess?.()
      } else {
        throw new Error(result.error || "Failed to process transaction")
      }
    } catch (error) {
      console.error("Error processing power transaction:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process transaction",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const activePowerFloats = powerFloats.filter((f) => {
    if (!f.is_active) return false

    // Check if it's specifically a power account
    const isPowerType = f.account_type?.toLowerCase() === "power"
    const isPowerProvider =
      f.provider &&
      ["ecg", "ned", "power", "electricity", "prepaid"].some((keyword) =>
        f.provider.toLowerCase().includes(keyword.toLowerCase()),
      )

    return isPowerType || isPowerProvider
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meter Number */}
          <FormField
            control={form.control}
            name="meterNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meter Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter meter number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Power Provider (Float Account) */}
          <FormField
            control={form.control}
            name="floatAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Power Provider</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select power provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activePowerFloats.map((float) => {
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

          {/* Customer Name */}
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter customer name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Customer Phone */}
          <FormField
            control={form.control}
            name="customerPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Phone (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter customer phone" {...field} />
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
                  {!canProcessTransaction(watchedAmount) && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">Insufficient float balance for this transaction</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isSubmitting || !canProcessTransaction(watchedAmount)} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Process Power Transaction
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
