"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ArrowDownLeft, Building2 } from "lucide-react"

const formSchema = z.object({
  cardNumber: z
    .string()
    .min(1, "Card number is required")
    .max(10, "Card number cannot exceed 10 digits")
    .regex(/^\d+$/, "Card number must contain only digits"),
  partnerFloat: z.string().min(1, "Partner float account is required"),
  customerName: z.string().min(3, "Customer name must be at least 3 characters"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 characters"),
  withdrawalAmount: z.coerce.number().min(1, "Amount must be greater than 0"),
  fee: z.coerce.number().min(0, "Fee must be 0 or greater").optional(),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EnhancedWithdrawalFormVerticalProps {
  onSuccess?: (data: any) => void
  onCancel?: () => void
}

export function EnhancedWithdrawalFormVertical({ onSuccess, onCancel }: EnhancedWithdrawalFormVerticalProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ezwichPartnerAccounts, setEzwichPartnerAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [feeConfig, setFeeConfig] = useState<any>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cardNumber: "",
      partnerFloat: "",
      customerName: "",
      customerPhone: "",
      withdrawalAmount: 0,
      fee: 0,
      note: "",
    },
  })

  const watchAmount = form.watch("withdrawalAmount")

  // Load E-Zwich partner accounts
  const loadEzwichPartnerAccounts = async () => {
    if (!user?.branchId) return

    setLoadingAccounts(true)
    try {
      const response = await fetch(`/api/float-accounts/ezwich-partners?branchId=${user.branchId}`)
      if (response.ok) {
        const data = await response.json()
        setEzwichPartnerAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error("Error loading E-Zwich partner accounts:", error)
      setEzwichPartnerAccounts([])
    } finally {
      setLoadingAccounts(false)
    }
  }

  // Load fee configuration and calculate fee
  const loadFeeConfig = async (amount: number) => {
    try {
      const response = await fetch("/api/settings/fee-config/e-zwich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          transactionType: "withdrawal",
        }),
      })

      if (response.ok) {
        const config = await response.json()
        setFeeConfig(config)

        let calculatedFee = 0
        if (config.fee_type === "fixed") {
          calculatedFee = Number(config.fee_value)
        } else if (config.fee_type === "percentage") {
          calculatedFee = (amount * Number(config.fee_value)) / 100
          if (config.minimum_fee) calculatedFee = Math.max(calculatedFee, Number(config.minimum_fee))
          if (config.maximum_fee) calculatedFee = Math.min(calculatedFee, Number(config.maximum_fee))
        }

        form.setValue("fee", calculatedFee)
      } else {
        // Fallback fee calculation
        const fallbackFee = Math.min(amount * 0.01, 5) // 1% max 5 GHS
        form.setValue("fee", fallbackFee)
      }
    } catch (error) {
      console.error("Error loading fee config:", error)
      // Fallback fee calculation
      const fallbackFee = Math.min(amount * 0.01, 5) // 1% max 5 GHS
      form.setValue("fee", fallbackFee)
    }
  }

  useEffect(() => {
    loadEzwichPartnerAccounts()
  }, [user?.branchId])

  // Auto-calculate fee when amount changes
  useEffect(() => {
    if (watchAmount && watchAmount > 0) {
      loadFeeConfig(watchAmount)
    } else {
      form.setValue("fee", 0)
      setFeeConfig(null)
    }
  }, [watchAmount, form])

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to process withdrawals",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch("/api/e-zwich/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "withdrawal",
          card_number: values.cardNumber,
          partner_float_id: values.partnerFloat,
          customer_name: values.customerName,
          customer_phone: values.customerPhone,
          amount: values.withdrawalAmount,
          fee: values.fee || 0,
          note: values.note || "",
          user_id: user.id,
          branch_id: user.branchId,
          processed_by: user.email || user.username || "Unknown User",
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Withdrawal Processed",
          description: `GHS ${values.withdrawalAmount} withdrawal processed for card ${values.cardNumber}`,
        })
        form.reset()
        if (onSuccess) {
          onSuccess(result.transaction)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process withdrawal",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownLeft className="h-5 w-5" />
          E-Zwich Withdrawal
        </CardTitle>
        <CardDescription>Process a cash withdrawal from E-Zwich card</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Card Number - Full Width */}
            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Zwich Card Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter card number"
                      {...field}
                      maxLength={10}
                      className="font-mono"
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Partner Float Account - Full Width */}
            <FormField
              control={form.control}
              name="partnerFloat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Partner Float Account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingAccounts}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={loadingAccounts ? "Loading accounts..." : "Select E-Zwich partner account"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ezwichPartnerAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>
                              {account.provider} - {account.account_number}
                              (Balance: GHS {Number(account.current_balance).toFixed(2)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Information - Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., +233 24 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Withdrawal Amount - Full Width */}
            <FormField
              control={form.control}
              name="withdrawalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Withdrawal Amount (GHS)</FormLabel>
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

            {/* Fee - Full Width with Dynamic Info */}
            <FormField
              control={form.control}
              name="fee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee (GHS)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  {feeConfig && (
                    <p className="text-xs text-muted-foreground">
                      {feeConfig.fee_type === "fixed"
                        ? `Fixed fee: GHS ${feeConfig.fee_value}`
                        : `${feeConfig.fee_value}% fee`}
                      {feeConfig.minimum_fee && ` (Min: GHS ${feeConfig.minimum_fee})`}
                      {feeConfig.maximum_fee && ` (Max: GHS ${feeConfig.maximum_fee})`}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note - Full Width */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter any additional notes" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Withdrawal...
                  </>
                ) : (
                  <>
                    <ArrowDownLeft className="mr-2 h-4 w-4" />
                    Process Withdrawal
                  </>
                )}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// Export with the correct name
export { EnhancedWithdrawalFormVertical as EnhancedWithdrawalForm }
