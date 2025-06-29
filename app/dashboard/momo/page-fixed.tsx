"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, isValid, parseISO } from "date-fns"
import {
  Download,
  RefreshCw,
  Printer,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Building2,
  DollarSign,
  Edit,
  Trash2,
  Smartphone,
} from "lucide-react"

// Import the export utilities at the top
import { exportToCSV, formatTransactionForExport } from "@/lib/export-utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/currency"
import { useCurrentUser } from "@/hooks/use-current-user"
import { BranchIndicator } from "@/components/branch/branch-indicator"
import { useBranchFloatAccounts } from "@/hooks/use-branch-float-accounts"
import { useBranchTransactions } from "@/hooks/use-branch-transactions"
import { BranchFloatDisplay } from "@/components/shared/branch-float-display"
import { useCashInTillEnhanced } from "@/hooks/use-cash-in-till-enhanced"
import { EditMoMoTransactionDialog } from "@/components/transactions/edit-momo-transaction-dialog"

// Transaction interface
interface MoMoTransaction {
  id: string
  date: string
  customerName: string
  phoneNumber: string
  amount: number
  fee: number
  type: "cash-in" | "cash-out"
  provider: string
  reference?: string
  status: string
  branchId: string
  userId: string
  cashTillAffected: number
  floatAffected: number
}

// Transaction form schema
const transactionFormSchema = z.object({
  transactionType: z.enum(["cash-in", "cash-out"]),
  customerName: z.string().min(2, {
    message: "Customer name must be at least 2 characters.",
  }),
  phoneNumber: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }),
  amount: z.string().refine(
    (value) => {
      const num = Number(value)
      return !isNaN(num) && num > 0
    },
    {
      message: "Amount must be a valid number greater than zero.",
    },
  ),
  fee: z.string().optional(),
  provider: z.string().min(1, { message: "Provider is required" }),
  reference: z.string().optional(),
})

export default function MoMoPageFixed() {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTransaction, setCurrentTransaction] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("new")
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedTransactionForEdit, setSelectedTransactionForEdit] = useState(null)
  const [feeCalculation, setFeeCalculation] = useState(null)

  // Get current authenticated user
  const { user: currentUser, isLoading: isLoadingUser, error: userError } = useCurrentUser()

  // Use branch-aware hooks
  const {
    accounts: floatAccounts,
    loading: isLoadingFloatAccounts,
    error: floatAccountsError,
    refetch: refreshFloatAccounts,
  } = useBranchFloatAccounts()

  const {
    transactions,
    stats: momoStats,
    loading: isLoadingTransactions,
    error: transactionsError,
    refetch: fetchTransactions,
  } = useBranchTransactions("momo")

  const {
    cashAccount,
    isLoading: isCashLoading,
    error: cashError,
    refreshCashTill,
  } = useCashInTillEnhanced(currentUser?.branchId)

  // Filter MoMo accounts - FIXED to include all MoMo providers including Z-Pay
  const momoAccounts = useMemo(() => {
    return floatAccounts.filter(
      (account) =>
        account.account_type === "momo" &&
        account.is_active &&
        (["mtn", "vodafone", "airteltigo", "telecel", "zpay", "z-pay", "momo"].some((provider) =>
          account.provider.toLowerCase().includes(provider),
        ) ||
          account.provider.toLowerCase().includes("mobile") ||
          account.provider.toLowerCase().includes("money")),
    )
  }, [floatAccounts])

  // Form initialization
  const form = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      transactionType: "cash-in",
      customerName: "",
      phoneNumber: "",
      amount: "",
      fee: "",
      provider: "",
      reference: "",
    },
  })

  const watchTransactionType = form.watch("transactionType")
  const watchProvider = form.watch("provider")
  const watchAmount = form.watch("amount")

  // Get the selected MoMo account based on provider
  const selectedMoMoAccount = useMemo(() => {
    return momoAccounts.find((account) => account.provider.toLowerCase() === watchProvider.toLowerCase()) || null
  }, [watchProvider, momoAccounts])

  // Auto-calculate fee when amount or transaction type changes
  useEffect(() => {
    const calculateFee = async () => {
      if (!watchAmount || !watchTransactionType || !watchProvider) {
        form.setValue("fee", "")
        setFeeCalculation(null)
        return
      }

      const amount = Number(watchAmount)
      if (isNaN(amount) || amount <= 0) {
        form.setValue("fee", "")
        setFeeCalculation(null)
        return
      }

      try {
        const response = await fetch("/api/momo/calculate-fee", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            transactionType: watchTransactionType,
            provider: watchProvider,
          }),
        })

        if (response.ok) {
          const feeCalc = await response.json()
          setFeeCalculation(feeCalc)
          form.setValue("fee", feeCalc.fee.toString(), { shouldValidate: true })
        } else {
          // Fallback calculation
          const calculatedFee = calculateFallbackFee(amount, watchTransactionType)
          form.setValue("fee", calculatedFee.toString(), { shouldValidate: true })
        }
      } catch (error) {
        console.error("Error calculating fee:", error)
        // Fallback calculation
        const calculatedFee = calculateFallbackFee(amount, watchTransactionType)
        form.setValue("fee", calculatedFee.toString(), { shouldValidate: true })
      }
    }

    calculateFee()
  }, [watchAmount, watchTransactionType, watchProvider, form])

  // Fallback fee calculation
  const calculateFallbackFee = (amount: number, transactionType: string) => {
    // Standard MoMo fees
    if (transactionType === "cash-out") {
      if (amount <= 100) return 1
      if (amount <= 500) return 2
      if (amount <= 1000) return 5
      return Math.min(amount * 0.01, 20) // 1% max 20 GHS
    }
    return 0 // No fee for cash-in by default
  }

  // Refresh all data
  const refreshAllBalances = useCallback(() => {
    refreshFloatAccounts()
    fetchTransactions()
    refreshCashTill()
  }, [refreshFloatAccounts, fetchTransactions, refreshCashTill])

  // Process transaction - FIXED error handling
  const onSubmit = async (data: any) => {
    setIsProcessing(true)

    try {
      const amount = Number(data.amount)
      const fee = data.fee ? Number(data.fee) : 0

      console.log("🏦 Processing MoMo Transaction:", {
        type: data.transactionType,
        amount,
        fee,
        customerName: data.customerName,
        phoneNumber: data.phoneNumber,
        provider: data.provider,
        branchId: currentUser?.branchId,
      })

      // Prepare transaction data for API call
      const selectedAccount = momoAccounts.find((acc) => acc.provider === data.provider)
      if (!selectedAccount) {
        throw new Error("Selected MoMo provider not found")
      }

      const transactionData = {
        type: data.transactionType,
        amount: amount,
        fee: fee,
        phone_number: data.phoneNumber,
        customer_name: data.customerName,
        reference: data.reference || `MOMO-${Date.now()}`,
        float_account_id: selectedAccount.id, // Use the actual account ID
        provider: selectedAccount.provider,
        user_id: currentUser?.id,
        processed_by: currentUser?.id,
        branch_id: currentUser?.branchId,
        username: currentUser?.username,
        branchName: currentUser?.branchName,
      }

      // Create transaction via API
      const response = await fetch("/api/momo/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      })

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("❌ [MOMO] Non-JSON response:", textResponse)
        throw new Error("Server returned an invalid response. Please try again.")
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to process transaction")
      }

      if (!result.success) {
        throw new Error(result.error || "Transaction failed")
      }

      const transaction = result.transaction
      setCurrentTransaction(transaction)

      // Refresh transactions to get updated stats
      fetchTransactions()

      // Show receipt dialog
      setShowReceiptDialog(true)

      // Reset form
      form.reset({
        transactionType: "cash-in",
        customerName: "",
        phoneNumber: "",
        amount: "",
        fee: "",
        provider: "",
        reference: "",
      })

      toast({
        title: "Transaction Successful",
        description: `${data.transactionType.charAt(0).toUpperCase() + data.transactionType.slice(1)} of ${formatCurrency(amount)} processed successfully.`,
      })

      // Switch to history tab after successful transaction
      setActiveTab("history")
    } catch (error) {
      console.error("Error processing transaction:", error)

      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to process transaction",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Helper function to safely format dates
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "N/A"
      const date = parseISO(dateString)
      if (!isValid(date)) return "Invalid date"
      return format(date, "MMM d, yyyy h:mm a")
    } catch (error) {
      console.error("Date formatting error:", error)
      return "Invalid date"
    }
  }

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case "cash-in":
        return <Badge className="bg-green-100 text-green-800">Cash In</Badge>
      case "cash-out":
        return <Badge className="bg-blue-100 text-blue-800">Cash Out</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  const printReceipt = (transaction: any) => {
    setCurrentTransaction(transaction)
    setShowReceiptDialog(true)
  }

  const handleEditTransaction = useCallback((transaction) => {
    setSelectedTransactionForEdit(transaction)
    setShowEditDialog(true)
  }, [])

  const handleDeleteTransaction = useCallback(
    async (transaction) => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this transaction? This will restore the float balance.",
      )

      if (!confirmed) return

      try {
        const response = await fetch(`/api/momo/transactions/${transaction.id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to delete transaction")
        }

        toast({
          title: "Transaction Deleted",
          description: "Transaction has been deleted and float balance restored.",
        })

        refreshAllBalances()
      } catch (error) {
        console.error("Delete error:", error)
        toast({
          title: "Delete Failed",
          description: error instanceof Error ? error.message : "Failed to delete the transaction. Please try again.",
          variant: "destructive",
        })
      }
    },
    [refreshAllBalances, toast],
  )

  const handleEditSuccess = useCallback(() => {
    setShowEditDialog(false)
    setSelectedTransactionForEdit(null)
    refreshAllBalances()
  }, [refreshAllBalances])

  // Add safety check for momoStats
  const safeMomoStats = momoStats || {
    totalTransactions: 0,
    totalVolume: 0,
    totalCommission: 0,
  }

  // Replace the exportTransactions function with:
  const exportTransactions = () => {
    try {
      if (transactions.length === 0) {
        toast({
          title: "No Data",
          description: "No transactions available to export",
          variant: "destructive",
        })
        return
      }

      const exportData = transactions.map(formatTransactionForExport)
      exportToCSV(exportData, "momo-transactions")

      toast({
        title: "Export Successful",
        description: "Transaction history has been exported to CSV",
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export transaction history",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-8 w-8" />
            Mobile Money (MoMo) - Fixed
          </h1>
          <p className="text-muted-foreground">Process mobile money transactions and view transaction history</p>
        </div>
        <BranchIndicator />
      </div>

      {/* Error displays */}
      {cashError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 mb-4">
          <div className="flex items-center">
            <AlertTriangle className="mr-2 h-4 w-4" />
            <span>Error loading cash-in-till data: {cashError}</span>
          </div>
        </div>
      )}

      {floatAccountsError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 mb-4">
          <div className="flex items-center">
            <AlertTriangle className="mr-2 h-4 w-4" />
            <span>Error loading MoMo accounts: {floatAccountsError.message}</span>
          </div>
        </div>
      )}

      {momoAccounts.length === 0 && !isLoadingFloatAccounts && (
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 mb-4">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              <span className="font-medium">No MoMo accounts found</span>
            </div>
            <p>Please contact your administrator to set up MoMo accounts for this branch.</p>
          </div>
        </div>
      )}

      {/* Debug info for MoMo accounts */}
      {process.env.NODE_ENV === "development" && (
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 mb-4">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              <span className="font-medium">Debug: MoMo Accounts Found</span>
            </div>
            <p>Total Float Accounts: {floatAccounts.length}</p>
            <p>MoMo Accounts: {momoAccounts.length}</p>
            <div className="text-xs">
              {momoAccounts.map((acc) => (
                <div key={acc.id}>
                  {acc.provider} - {acc.account_type} - Active: {acc.is_active ? "Yes" : "No"}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeMomoStats?.totalTransactions || 0}</div>
            <p className="text-xs text-muted-foreground">Volume: {formatCurrency(safeMomoStats?.totalVolume || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(safeMomoStats?.totalCommission || 0)}</div>
            <p className="text-xs text-muted-foreground">Today's earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{momoAccounts.filter((acc) => acc.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              {selectedMoMoAccount ? `Selected: ${selectedMoMoAccount.provider}` : "None selected"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total MoMo Float</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(momoAccounts.reduce((total, acc) => total + (acc.current_balance || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Combined float balance</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="new">New Transaction</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Transaction Form */}
            <Card>
              <CardHeader>
                <CardTitle>New MoMo Transaction</CardTitle>
                <CardDescription>Process a new mobile money transaction</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionType">Transaction Type</Label>
                    <Select
                      onValueChange={(value) => {
                        form.setValue("transactionType", value as "cash-in" | "cash-out")
                      }}
                      defaultValue={form.getValues("transactionType")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash-in">Cash In</SelectItem>
                        <SelectItem value="cash-out">Cash Out</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.transactionType && (
                      <p className="text-sm text-red-500">{form.formState.errors.transactionType.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider">MoMo Provider</Label>
                    <Select
                      onValueChange={(value) => {
                        form.setValue("provider", value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select MoMo provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingFloatAccounts ? (
                          <SelectItem value="loading" disabled>
                            Loading providers...
                          </SelectItem>
                        ) : momoAccounts.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No MoMo accounts available
                          </SelectItem>
                        ) : (
                          momoAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.provider}>
                              <div className="flex items-center justify-between w-full">
                                <span>{account.provider}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  {formatCurrency(account.current_balance)}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.provider && (
                      <p className="text-sm text-red-500">{form.formState.errors.provider.message}</p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input id="customerName" placeholder="Enter customer name" {...form.register("customerName")} />
                      {form.formState.errors.customerName && (
                        <p className="text-sm text-red-500">{form.formState.errors.customerName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input id="phoneNumber" placeholder="Enter phone number" {...form.register("phoneNumber")} />
                      {form.formState.errors.phoneNumber && (
                        <p className="text-sm text-red-500">{form.formState.errors.phoneNumber.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (GHS)</Label>
                      <Input id="amount" type="number" step="0.01" placeholder="0.00" {...form.register("amount")} />
                      {form.formState.errors.amount && (
                        <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fee">Fee (GHS)</Label>
                      <Input
                        id="fee"
                        type="number"
                        step="0.01"
                        placeholder="Auto-calculated"
                        {...form.register("fee")}
                      />
                      {feeCalculation && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {feeCalculation.feeSource === "database" ? "Database fee" : "Calculated fee"} (
                          {feeCalculation.feeType})
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Optional. Will be auto-calculated based on transaction type and amount.
                      </p>
                      {form.formState.errors.fee && (
                        <p className="text-sm text-red-500">{form.formState.errors.fee.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference/Note</Label>
                    <Textarea
                      id="reference"
                      placeholder="Enter transaction reference or notes"
                      className="resize-none"
                      {...form.register("reference")}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      isProcessing ||
                      !watchProvider ||
                      momoAccounts.length === 0 ||
                      isLoadingFloatAccounts ||
                      isLoadingUser ||
                      !currentUser
                    }
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Process Transaction"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Balance Cards */}
            <div className="flex flex-col gap-6">
              {/* Cash in Till Card */}
              <BranchFloatDisplay
                title="Cash in Till"
                description="Available cash for transactions"
                serviceType="cash-in-till"
                accounts={cashAccount ? [cashAccount] : []}
                isLoading={isCashLoading}
                error={cashError}
                onRefresh={refreshAllBalances}
                branchName={currentUser?.branchName || "Main Branch"}
              />

              {/* Selected Provider Float Card */}
              <BranchFloatDisplay
                title={selectedMoMoAccount ? `${selectedMoMoAccount.provider} Float` : "MoMo Float"}
                description={
                  selectedMoMoAccount
                    ? `Available float for ${selectedMoMoAccount.provider} transactions`
                    : "Select a provider to view float balance"
                }
                serviceType="momo"
                accounts={selectedMoMoAccount ? [selectedMoMoAccount] : momoAccounts}
                selectedAccount={selectedMoMoAccount}
                isLoading={isLoadingFloatAccounts}
                error={floatAccountsError}
                onRefresh={refreshAllBalances}
                branchName={currentUser?.branchName || "Main Branch"}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Today's transaction summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{safeMomoStats?.totalTransactions || 0}</div>
                      <div className="text-sm text-muted-foreground">Today's Transactions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatCurrency(safeMomoStats?.totalVolume || 0)}</div>
                      <div className="text-sm text-muted-foreground">Transaction Volume</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatCurrency(safeMomoStats?.totalCommission || 0)}</div>
                      <div className="text-sm text-muted-foreground">Commission Earned</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Input placeholder="Search transactions..." className="max-w-sm" />
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={refreshAllBalances}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={exportTransactions}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTransactions ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      <div className="flex justify-center items-center">
                        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                        <span>Loading transactions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      <span className="text-sm text-muted-foreground">
                        No transactions available. Create a new transaction or try refreshing.
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(tx.date)}</TableCell>
                      <TableCell>{tx.customerName}</TableCell>
                      <TableCell>{tx.phoneNumber}</TableCell>
                      <TableCell>{getTransactionTypeBadge(tx.type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{tx.provider}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(tx.fee)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.status === "completed"
                              ? "default"
                              : tx.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => printReceipt(tx)} title="Print Receipt">
                            <Printer className="h-4 w-4" />
                          </Button>
                          {tx.status === "completed" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTransaction(tx)}
                                title="Edit Transaction"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTransaction(tx)}
                                title="Delete Transaction"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
            <DialogDescription>Transaction details for printing</DialogDescription>
          </DialogHeader>
          {currentTransaction && (
            <div id="receipt-content" className="space-y-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <img src="/logo.png" alt="Mimhaad Financial Services Logo" className="w-12 h-12 rounded-full" />
                </div>
                <h3 className="text-lg font-bold">MIMHAAD FINANCIAL SERVICES</h3>
                <p className="text-sm">{currentTransaction.branchName || "Main Branch"}</p>
                <p className="text-sm">Tel: 0241378880</p>
                <p className="text-sm">{formatDate(currentTransaction.date)}</p>
              </div>
              <div className="border-t border-b py-2">
                <div className="flex justify-between text-sm py-1">
                  <span>Transaction ID:</span>
                  <span>{currentTransaction.id}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span>Customer:</span>
                  <span>{currentTransaction.customerName}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span>Phone Number:</span>
                  <span>{currentTransaction.phoneNumber}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span>Transaction Type:</span>
                  <span>{currentTransaction.type}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span>Provider:</span>
                  <span>{currentTransaction.provider}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span>Amount:</span>
                  <span>{formatCurrency(currentTransaction.amount)}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span>Fee:</span>
                  <span>{formatCurrency(currentTransaction.fee)}</span>
                </div>
                <div className="flex justify-between text-sm py-1 font-medium">
                  <span>Total:</span>
                  <span>
                    {formatCurrency(
                      currentTransaction.amount + (currentTransaction.type === "cash-in" ? 0 : currentTransaction.fee),
                    )}
                  </span>
                </div>
                {currentTransaction.reference && (
                  <div className="flex justify-between text-sm py-1">
                    <span>Reference:</span>
                    <span>{currentTransaction.reference}</span>
                  </div>
                )}
              </div>
              <div className="text-center text-xs">
                <p>Thank you for using our service!</p>
                <p>For inquiries, please call our customer service at 0241378880</p>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                window.print()
                setShowReceiptDialog(false)
              }}
            >
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <EditMoMoTransactionDialog
        transaction={selectedTransactionForEdit}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
