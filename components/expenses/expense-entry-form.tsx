"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, Upload, AlertCircle, Sparkles, Info } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import type { ExpenseHead } from "@/lib/expense-types"

// Define the form schema with validation
const formSchema = z.object({
  expense_head_id: z.string({
    required_error: "Please select an expense head",
  }),
  amount: z.coerce
    .number({
      required_error: "Please enter an amount",
      invalid_type_error: "Amount must be a number",
    })
    .positive({
      message: "Amount must be greater than 0",
    }),
  payment_source: z
    .string({
      required_error: "Please select a payment source",
    })
    .min(1, "Payment source is required"),
  payment_account_id: z.string().optional(),
  description: z.string().min(5, {
    message: "Description must be at least 5 characters",
  }),
  branch_id: z.string({
    required_error: "Please select a branch",
  }),
  expense_date: z.date({
    required_error: "Please select a date",
  }),
  reference_number: z.string().optional(),
  attachment_url: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Branch {
  id: string
  name: string
}

interface FloatAccount {
  id: string
  accountType: string
  branchId: string
  provider?: string
  accountNumber?: string
  currentBalance: number
}

interface ExpenseEntryFormProps {
  expenseHeads: ExpenseHead[]
  onSuccess?: () => void
}

// Smart defaults for payment sources
const PAYMENT_SOURCE_LABELS = {
  cash: "Cash in Till",
  momo: "Mobile Money",
  bank: "Bank Account",
  power: "Power Float",
}

export function ExpenseEntryForm({ expenseHeads, onSuccess }: ExpenseEntryFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [selectedPaymentSource, setSelectedPaymentSource] = useState<string>("")
  const [insufficientFunds, setInsufficientFunds] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [floatAccounts, setFloatAccounts] = useState<FloatAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedExpenseHead, setSelectedExpenseHead] = useState<ExpenseHead | null>(null)
  const router = useRouter()

  // Initialize the form with smart defaults
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expense_head_id: "",
      amount: 0,
      payment_source: "",
      payment_account_id: "",
      description: "",
      branch_id: "",
      expense_date: new Date(),
      reference_number: `EXP-${Date.now()}`,
    },
  })

  // Get current values
  const currentAmount = form.watch("amount") || 0
  const currentPaymentSource = form.watch("payment_source")
  const currentPaymentAccount = form.watch("payment_account_id")
  const currentBranchId = form.watch("branch_id")
  const currentExpenseHeadId = form.watch("expense_head_id")

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch branches
        const branchesResponse = await fetch("/api/branches")
        if (branchesResponse.ok) {
          const branchesData = await branchesResponse.json()
          setBranches(Array.isArray(branchesData) ? branchesData : branchesData.branches || [])
        }

        // Fetch ALL float accounts
        const accountsResponse = await fetch("/api/float-accounts")
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json()
          const accounts = accountsData.floatAccounts || accountsData.accounts || accountsData || []
          setFloatAccounts(Array.isArray(accounts) ? accounts : [])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setBranches([])
        setFloatAccounts([])
        toast({
          title: "Error",
          description: "Failed to load required data. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [])

  // Update selected expense head when expense head changes
  useEffect(() => {
    if (currentExpenseHeadId) {
      const expenseHead = expenseHeads.find((head) => head.id === currentExpenseHeadId)
      setSelectedExpenseHead(expenseHead || null)
    }
  }, [currentExpenseHeadId, expenseHeads])

  // Update account options when branch changes
  useEffect(() => {
    if (currentBranchId) {
      form.setValue("payment_account_id", "")
    }
  }, [currentBranchId, form])

  // Check for sufficient funds when amount or payment account changes
  useEffect(() => {
    if (!currentPaymentSource || !currentPaymentAccount || currentAmount <= 0 || !Array.isArray(floatAccounts)) {
      setInsufficientFunds(false)
      return
    }

    const account = floatAccounts.find((acc) => acc.id === currentPaymentAccount)
    const accountBalance = account?.currentBalance || 0
    setInsufficientFunds(accountBalance < currentAmount)
  }, [currentAmount, currentPaymentSource, currentPaymentAccount, floatAccounts])

  // Generate smart reference number
  const generateReference = () => {
    const expenseHead = selectedExpenseHead
    const prefix = expenseHead
      ? expenseHead.name
          .toUpperCase()
          .replace(/[^A-Z]/g, "")
          .slice(0, 3)
      : "EXP"
    const date = format(form.getValues("expense_date"), "yyyyMM")
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `${prefix}-${date}-${random}`
  }

  // Generate smart description
  const generateDescription = () => {
    const expenseHead = selectedExpenseHead
    const branch = branches.find((b) => b.id === currentBranchId)
    const date = format(form.getValues("expense_date"), "MMMM yyyy")

    if (expenseHead && branch) {
      const description = `${expenseHead.name} expense for ${branch.name} branch - ${date}`
      form.setValue("description", description)
      toast({
        title: "Description generated",
        description: "Smart description has been created based on your selections.",
      })
    }
  }

  // Auto-generate reference when expense head or date changes
  const handleAutoReference = () => {
    const newReference = generateReference()
    form.setValue("reference_number", newReference)
    toast({
      title: "Reference generated",
      description: `New reference: ${newReference}`,
    })
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      form.setValue("attachment_url", URL.createObjectURL(e.target.files[0]))
    }
  }

  // Handle payment source change
  const handlePaymentSourceChange = (value: string) => {
    console.log("Setting payment source:", value) // Debug log
    setSelectedPaymentSource(value)
    form.setValue("payment_source", value)
    form.setValue("payment_account_id", "")
    setInsufficientFunds(false)

    // Trigger validation
    form.trigger("payment_source")
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  // Get payment accounts based on selected source and branch
  const getPaymentAccounts = () => {
    if (!Array.isArray(floatAccounts) || floatAccounts.length === 0) {
      return []
    }

    if (!currentBranchId || !selectedPaymentSource) {
      return floatAccounts.map((account) => ({
        id: account.id,
        name: `${account.accountType} - ${account.provider || "N/A"} - ${formatCurrency(account.currentBalance)}`,
        balance: account.currentBalance,
        disabled: account.currentBalance <= 0,
      }))
    }

    const filteredAccounts = floatAccounts.filter((account) => {
      const matchesBranch = account.branchId === currentBranchId
      const matchesSource =
        (selectedPaymentSource === "cash" && account.accountType === "cash-in-till") ||
        (selectedPaymentSource === "momo" && account.accountType === "momo") ||
        (selectedPaymentSource === "bank" && account.accountType === "bank") ||
        (selectedPaymentSource === "power" && account.accountType === "power")

      return matchesBranch && matchesSource
    })

    return filteredAccounts.map((account) => ({
      id: account.id,
      name: `${account.accountType} - ${account.provider || "N/A"} - ${formatCurrency(account.currentBalance)}`,
      balance: account.currentBalance,
      disabled: account.currentBalance <= 0,
    }))
  }

  // Create a float transaction to debit the account
  const createFloatTransaction = async (
    floatAccountId: string,
    amount: number,
    expenseId: string,
    description: string,
  ) => {
    try {
      const account = floatAccounts.find((acc) => acc.id === floatAccountId)
      if (!account) {
        throw new Error(`Float account ${floatAccountId} not found`)
      }

      const transactionData = {
        floatAccountId,
        branchId: account.branchId,
        accountType: account.accountType,
        provider: account.provider,
        transactionType: "deduction" as const,
        amount,
        referenceId: expenseId,
        notes: `Expense: ${description}`,
        performedBy: "current-user",
      }

      const response = await fetch("/api/float-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create float transaction")
      }

      return true
    } catch (error) {
      console.error("Error creating float transaction:", error)
      throw error
    }
  }

  // Handle form submission
  const handleSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true)

      console.log("Form values being submitted:", values) // Debug log

      // Validate required fields before submission
      if (!values.payment_source) {
        toast({
          title: "Validation Error",
          description: "Please select a payment source.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Check for sufficient funds one more time before submission
      if (values.payment_account_id) {
        const account = floatAccounts.find((acc) => acc.id === values.payment_account_id)
        const accountBalance = account?.currentBalance || 0

        if (accountBalance < values.amount) {
          setInsufficientFunds(true)
          setIsLoading(false)
          return
        }
      }

      // Prepare the data for submission with all required fields
      const expenseData = {
        expense_head_id: values.expense_head_id,
        amount: values.amount,
        payment_source: values.payment_source,
        payment_account_id: values.payment_account_id || null,
        description: values.description,
        branch_id: values.branch_id,
        expense_date: values.expense_date.toISOString(),
        reference_number: values.reference_number || `EXP-${Date.now()}`,
        attachment_url: values.attachment_url || null,
        created_by: "00000000-0000-0000-0000-000000000001",
        status: "pending",
      }

      console.log("Expense data being sent:", expenseData) // Debug log

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      })

      const responseData = await response.json()
      console.log("API Response:", responseData) // Debug log

      if (response.ok && responseData.success) {
        const expenseId = responseData.expense.id

        // If a float account was used, debit it
        if (values.payment_account_id) {
          try {
            await createFloatTransaction(values.payment_account_id, values.amount, expenseId, values.description)
          } catch (error) {
            console.error("Error debiting float account:", error)
            toast({
              title: "Warning",
              description:
                "Expense was created but there was an issue updating the float account balance. Please check the float account.",
              variant: "destructive",
            })
          }
        }

        toast({
          title: "Success",
          description: "Expense has been created successfully.",
        })
        if (onSuccess) {
          onSuccess()
        } else {
          router.push("/dashboard/expenses")
        }
      } else {
        console.error("API Error:", responseData)
        toast({
          title: "Error",
          description: responseData.error || "Failed to create expense. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating expense:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Select an expense head and branch to auto-generate reference numbers and descriptions. Use the smart buttons
          to save time!
        </AlertDescription>
      </Alert>

      {insufficientFunds && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Insufficient funds in the selected account. Please choose another payment method or reduce the expense
            amount.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Expense Head */}
            <FormField
              control={form.control}
              name="expense_head_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Head</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expense head" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseHeads
                        .filter((head) => head.is_active)
                        .map((head) => (
                          <SelectItem key={head.id} value={head.id}>
                            {head.name} {head.category && `(${head.category})`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedExpenseHead && (
                      <span className="text-sm text-muted-foreground">
                        Category: {selectedExpenseHead.category || "General"}
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Branch */}
            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Select the branch for this expense</FormDescription>
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
                      placeholder="0.00"
                      {...field}
                      value={field.value === 0 ? "" : field.value}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : e.target.valueAsNumber
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormDescription>Enter the expense amount in Ghana Cedis</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="expense_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Date when the expense occurred</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Source */}
            <FormField
              control={form.control}
              name="payment_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Source *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      handlePaymentSourceChange(value)
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PAYMENT_SOURCE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Select where the payment was made from</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Account */}
            <FormField
              control={form.control}
              name="payment_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Account</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!selectedPaymentSource || !currentBranchId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedPaymentSource
                              ? "Select payment source first"
                              : !currentBranchId
                                ? "Select branch first"
                                : "Select account"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getPaymentAccounts().map((account) => (
                        <SelectItem key={account.id} value={account.id} disabled={account.disabled}>
                          {account.name}
                          {account.disabled && " (Insufficient funds)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {!selectedPaymentSource
                      ? "First select a payment source"
                      : !currentBranchId
                        ? "First select a branch"
                        : "Select the specific account to use"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference Number */}
            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="Auto-generated reference" {...field} className="flex-1" />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAutoReference}
                      disabled={isLoading || !selectedExpenseHead}
                      className="whitespace-nowrap"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  </div>
                  <FormDescription>Smart reference based on expense head and date</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachment */}
            <FormItem>
              <FormLabel>Receipt Attachment (Optional)</FormLabel>
              <div className="mt-2">
                <label
                  htmlFor="file-upload"
                  className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-input bg-background px-3 py-4 text-sm text-muted-foreground hover:bg-accent/50"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  <span>{file ? file.name : "Upload receipt"}</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept="image/*,.pdf"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              <FormDescription>Upload a receipt or supporting document (PDF or image)</FormDescription>
            </FormItem>
          </div>

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description / Purpose</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Textarea
                      placeholder="Enter a detailed description of this expense..."
                      className="min-h-[100px] flex-1"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateDescription}
                    disabled={isLoading || !selectedExpenseHead || !currentBranchId}
                    className="whitespace-nowrap self-start"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Generate
                  </Button>
                </div>
                <FormDescription>Provide details about the purpose of this expense</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/expenses")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || insufficientFunds}>
              {isLoading ? "Submitting..." : "Submit Expense"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
