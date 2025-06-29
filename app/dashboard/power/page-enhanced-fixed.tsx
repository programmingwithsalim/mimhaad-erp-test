"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RefreshCw, Zap, TrendingUp, Activity, Wallet, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useBranchFloatAccountsFixed } from "@/hooks/use-branch-float-accounts-fixed"
import { formatCurrency } from "@/lib/currency"
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

export default function PowerPageEnhancedFixed() {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calculatedFee, setCalculatedFee] = useState<number>(0)
  const [statistics, setStatistics] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])

  const {
    accounts: floatAccounts,
    loading: isLoadingAccounts,
    refetch: refreshAccounts,
  } = useBranchFloatAccountsFixed()

  // Filter power accounts
  const powerFloats = floatAccounts.filter(
    (account) =>
      account.is_active &&
      (account.account_type === "power" ||
        account.provider.toLowerCase().includes("power") ||
        account.provider.toLowerCase().includes("electricity")),
  )

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
  useEffect(() => {
    const calculateFee = async () => {
      if (watchedAmount && watchedAmount > 0) {
        try {
          const selectedFloat = powerFloats.find((f) => f.id === watchedFloatId)
          const response = await fetch("/api/power/calculate-fee", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: watchedAmount,
              provider: selectedFloat?.provider || "ECG",
            }),
          })

          if (response.ok) {
            const data = await response.json()
            setCalculatedFee(data.fee || 0)
          } else {
            // Fallback calculation
            setCalculatedFee(Math.min(watchedAmount * 0.02, 10)) // 2% max 10 GHS
          }
        } catch (error) {
          console.error("Error calculating fee:", error)
          setCalculatedFee(Math.min(watchedAmount * 0.02, 10))
        }
      } else {
        setCalculatedFee(0)
      }
    }

    calculateFee()
  }, [watchedAmount, watchedFloatId, powerFloats])

  const onSubmit = async (data: PowerTransactionFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "User information not available. Please log in again.",
        variant: "destructive",
      })
      return
    }

    const selectedFloat = powerFloats.find((f) => f.id === data.floatAccountId)
    if (!selectedFloat) {
      toast({
        title: "Error",
        description: "Please select a power provider.",
        variant: "destructive",
      })
      return
    }

    const totalRequired = data.amount + calculatedFee
    if (selectedFloat.current_balance < totalRequired) {
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

      const response = await fetch("/api/power/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process transaction")
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Power transaction processed successfully",
        })
        form.reset()
        setCalculatedFee(0)
        refreshAccounts()
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

  const getFloatStatus = (current: number, min: number) => {
    if (current < min) return { label: "Critical", color: "destructive" }
    if (current < min * 1.5) return { label: "Low", color: "warning" }
    return { label: "Healthy", color: "success" }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8" />
            Power Services - Fixed
          </h1>
          <p className="text-muted-foreground">Manage electricity bill payments and power services</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAccounts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{powerFloats.length}</div>
            <p className="text-xs text-muted-foreground">Available power providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Float Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(powerFloats.reduce((sum, acc) => sum + acc.current_balance, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Combined power float</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Processed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GHS 0.00</div>
            <p className="text-xs text-muted-foreground">Fees collected</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">New Transaction</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transaction Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Process Power Transaction</CardTitle>
                  <CardDescription>Process electricity bill payments for customers</CardDescription>
                </CardHeader>
                <CardContent>
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

                        {/* Power Provider */}
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
                                  {powerFloats.map((float) => {
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
                                              {formatCurrency(float.current_balance)}
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
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                      {/* Fee Display */}
                      {calculatedFee > 0 && (
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Transaction Fee:</span>
                            <span className="font-bold">{formatCurrency(calculatedFee)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm font-medium">Total Required:</span>
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(watchedAmount + calculatedFee)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Submit Button */}
                      <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
                </CardContent>
              </Card>
            </div>

            {/* Float Balances Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Power Float Balances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAccounts ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : powerFloats.length > 0 ? (
                    <div className="space-y-3">
                      {powerFloats.map((float) => {
                        const status = getFloatStatus(float.current_balance, float.min_threshold)
                        return (
                          <div key={float.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{float.provider}</span>
                              <Badge variant={status.color as any} className="text-xs">
                                {status.label}
                              </Badge>
                            </div>
                            <div className="text-lg font-bold">{formatCurrency(float.current_balance)}</div>
                            <div className="text-xs text-muted-foreground">
                              Min: {formatCurrency(float.min_threshold)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No power floats found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View and manage power transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions found. Process your first power transaction to see history here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
