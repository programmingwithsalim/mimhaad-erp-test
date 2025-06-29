"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Zap } from "lucide-react"

const formSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  meterNumber: z.string().min(1, "Meter number is required"),
  customerName: z.string().min(3, "Customer name must be at least 3 characters"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 characters"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  commission: z.coerce.number().min(0, "Commission must be 0 or greater"),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PowerTransactionFormProps {
  onSuccess?: (data: any) => void
  onCancel?: () => void
}

export function PowerTransactionFormSimple({ onSuccess, onCancel }: PowerTransactionFormProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [powerFloats, setPowerFloats] = useState<any[]>([])
  const [loadingFloats, setLoadingFloats] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: "",
      meterNumber: "",
      customerName: "",
      customerPhone: "",
      amount: 0,
      commission: 0,
      notes: "",
    },
  })

  const watchAmount = form.watch("amount")

  // Calculate commission when amount changes
  useEffect(() => {
    if (watchAmount > 0) {
      const calculatedCommission = watchAmount * 0.02 // 2% commission
      form.setValue("commission", Number(calculatedCommission.toFixed(2)))
    }
  }, [watchAmount, form])

  // Load power float accounts
  useEffect(() => {
    const loadPowerFloats = async () => {
      if (!user?.branchId) return

      setLoadingFloats(true)
      try {
        const response = await fetch(`/api/float-accounts?branchId=${user.branchId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const powerAccounts = data.accounts.filter((acc: any) => acc.account_type === "power" && acc.is_active)
            setPowerFloats(powerAccounts)
          }
        }
      } catch (error) {
        console.error("Error loading power floats:", error)
        setPowerFloats([])
      } finally {
        setLoadingFloats(false)
      }
    }

    loadPowerFloats()
  }, [user?.branchId])

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to process power transactions",
        variant: "destructive",
      })
      return
    }

    if (powerFloats.length === 0) {
      toast({
        title: "No Power Float Account",
        description: "No active power float account found for this branch",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const powerFloat = powerFloats.find((acc) => acc.provider === values.provider) || powerFloats[0]

      const response = await fetch("/api/power/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "sale",
          provider: values.provider || powerFloat.provider,
          meter_number: values.meterNumber,
          customer_name: values.customerName,
          customer_phone: values.customerPhone,
          amount: values.amount,
          commission: values.commission,
          notes: values.notes,
          float_account_id: powerFloat.id,
          user_id: user.id,
          branch_id: user.branchId,
          processed_by: user.email || user.username || "Unknown User",
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [POWER] API Error:", errorText)
        throw new Error(`Transaction failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Power Transaction Successful",
          description: `GHS ${values.amount} power sale processed for meter ${values.meterNumber}`,
        })
        form.reset()
        if (onSuccess) {
          onSuccess(result.transaction)
        }
      } else {
        throw new Error(result.error || "Failed to process power transaction")
      }
    } catch (error: any) {
      console.error("❌ [POWER] Transaction error:", error)
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
          <Zap className="h-5 w-5 text-yellow-500" />
          Power Transaction
        </CardTitle>
        <CardDescription>Process a power sale transaction</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Power Provider</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ecg">ECG (Electricity Company of Ghana)</SelectItem>
                        <SelectItem value="nedco">NEDCo (Northern Electricity Distribution)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission (GHS)</FormLabel>
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
                    <FormDescription>Automatically calculated at 2% of amount</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {loadingFloats && <div className="text-sm text-muted-foreground">Loading power float accounts...</div>}

            {!loadingFloats && powerFloats.length === 0 && (
              <div className="text-sm text-destructive">
                No active power float accounts found. Please contact your administrator.
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting || powerFloats.length === 0}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Process Sale
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
