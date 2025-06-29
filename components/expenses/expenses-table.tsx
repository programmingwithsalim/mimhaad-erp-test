"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  X,
  RefreshCw,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import type { Expense, ExpenseHead } from "@/lib/expense-types"

interface Branch {
  id: string
  name: string
  location: string
  manager_id: string
  status: string
  created_at: string
  updated_at: string
}

interface ExpensesTableProps {
  expenses?: Expense[]
  expenseHeads?: ExpenseHead[]
}

export function ExpensesTable({ expenses: initialExpenses, expenseHeads: initialExpenseHeads }: ExpensesTableProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses || [])
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>(initialExpenseHeads || [])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [expenseHeadFilter, setExpenseHeadFilter] = useState<string | null>(null)
  const [branchFilter, setBranchFilter] = useState<string | null>(null)
  const [paymentSourceFilter, setPaymentSourceFilter] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10
  const { toast } = useToast()

  // Fetch data if not provided as props
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch branches first
        const branchesResponse = await fetch("/api/branches")
        if (!branchesResponse.ok) {
          throw new Error(`Failed to fetch branches: ${branchesResponse.status} ${branchesResponse.statusText}`)
        }
        const branchesData = await branchesResponse.json()

        // Ensure branches is an array
        if (Array.isArray(branchesData)) {
          setBranches(branchesData)
        } else if (branchesData && typeof branchesData === "object" && Array.isArray(branchesData.branches)) {
          // If the response is an object with a branches array property
          setBranches(branchesData.branches)
        } else {
          console.error("Branches data is not in expected format:", branchesData)
          setBranches([])
        }

        // If expenses and expense heads are provided as props, use them
        if (initialExpenses && initialExpenseHeads) {
          setExpenses(initialExpenses)
          setExpenseHeads(initialExpenseHeads)
        } else {
          // Otherwise, fetch them from the API
          const [expensesResponse, headsResponse] = await Promise.all([
            fetch("/api/expenses"),
            fetch("/api/expense-heads"),
          ])

          if (!expensesResponse.ok) {
            throw new Error(`Failed to fetch expenses: ${expensesResponse.status} ${expensesResponse.statusText}`)
          }
          if (!headsResponse.ok) {
            throw new Error(`Failed to fetch expense heads: ${headsResponse.status} ${headsResponse.statusText}`)
          }

          const expensesData = await expensesResponse.json()
          const headsData = await headsResponse.json()

          setExpenses(expensesData.expenses || [])
          setExpenseHeads(headsData.expense_heads || [])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError(error instanceof Error ? error.message : "An unknown error occurred")
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [initialExpenses, initialExpenseHeads, toast])

  // Handle refresh data
  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all data
      const [branchesResponse, expensesResponse, headsResponse] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/expenses"),
        fetch("/api/expense-heads"),
      ])

      if (!branchesResponse.ok) {
        throw new Error(`Failed to fetch branches: ${branchesResponse.status} ${branchesResponse.statusText}`)
      }
      if (!expensesResponse.ok) {
        throw new Error(`Failed to fetch expenses: ${expensesResponse.status} ${expensesResponse.statusText}`)
      }
      if (!headsResponse.ok) {
        throw new Error(`Failed to fetch expense heads: ${headsResponse.status} ${headsResponse.statusText}`)
      }

      const branchesData = await branchesResponse.json()
      const expensesData = await expensesResponse.json()
      const headsData = await headsResponse.json()

      // Ensure branches is an array
      if (Array.isArray(branchesData)) {
        setBranches(branchesData)
      } else if (branchesData && typeof branchesData === "object" && Array.isArray(branchesData.branches)) {
        setBranches(branchesData.branches)
      } else {
        console.error("Branches data is not in expected format:", branchesData)
        setBranches([])
      }

      setExpenses(expensesData.expenses || [])
      setExpenseHeads(headsData.expense_heads || [])

      toast({
        title: "Success",
        description: "Data refreshed successfully.",
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter expenses based on search query and filters
  const filteredExpenses = expenses.filter((expense) => {
    // Search functionality
    const searchLower = searchQuery.toLowerCase()
    const expenseHead = expenseHeads.find((head) => head.id === expense.expense_head_id)
    const expenseHeadName = expenseHead ? expenseHead.name.toLowerCase() : ""
    const branch = branches.find((b) => b.id === expense.branch_id)
    const branchName = branch ? branch.name.toLowerCase() : ""

    const userMatchesSearch =
      expense.description.toLowerCase().includes(searchLower) ||
      expenseHeadName.includes(searchLower) ||
      branchName.includes(searchLower) ||
      expense.id.toLowerCase().includes(searchLower) ||
      (expense.reference_number && expense.reference_number.toLowerCase().includes(searchLower))

    // Filter by expense head
    const headMatches = expenseHeadFilter ? expense.expense_head_id === expenseHeadFilter : true

    // Filter by branch
    const branchMatches = branchFilter ? expense.branch_id === branchFilter : true

    // Filter by payment source
    const sourceMatches = paymentSourceFilter ? expense.payment_source === paymentSourceFilter : true

    // Filter by date range
    const expenseDate = new Date(expense.expense_date)
    const dateMatches =
      (!dateRange.from || expenseDate >= dateRange.from) && (!dateRange.to || expenseDate <= dateRange.to)

    return userMatchesSearch && headMatches && branchMatches && sourceMatches && dateMatches
  })

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage)
  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  // Reset filters
  const resetFilters = () => {
    setExpenseHeadFilter(null)
    setBranchFilter(null)
    setPaymentSourceFilter(null)
    setDateRange({ from: undefined, to: undefined })
    setSearchQuery("")
  }

  // View expense details
  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  // Get expense head name
  const getExpenseHeadName = (headId: string) => {
    const head = expenseHeads.find((h) => h.id === headId)
    return head ? head.name : "Unknown"
  }

  // Get branch name
  const getBranchName = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId)
    return branch ? branch.name : "Unknown"
  }

  // Get payment source name
  const getPaymentSourceName = (sourceId: string) => {
    const sources = [
      { id: "cash", name: "Cash in Till" },
      { id: "momo", name: "Mobile Money" },
      { id: "bank", name: "Bank Account" },
    ]

    const source = sources.find((s) => s.id === sourceId)
    return source ? source.name : "Unknown"
  }

  // Get payment account name
  const getPaymentAccountName = (accountId: string | null, sourceId: string) => {
    if (!accountId) return "Not specified"

    // Cash accounts
    if (sourceId === "cash") {
      if (accountId === "cash-main") return "Cash in Till"
      return accountId
    }

    // MoMo accounts
    if (sourceId === "momo") {
      switch (accountId) {
        case "momo-mtn":
          return "MTN MoMo"
        case "momo-vodafone":
          return "Vodafone Cash"
        case "momo-airtel":
          return "AirtelTigo Money"
        default:
          return accountId
      }
    }

    // Bank accounts
    if (sourceId === "bank") {
      switch (accountId) {
        case "bank-gbc":
          return "GCB Bank - Main Account"
        case "bank-eco":
          return "Ecobank - Operations"
        case "bank-absa":
          return "Absa - Expenses Account"
        default:
          return accountId
      }
    }

    return accountId
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-2" onClick={handleRefresh}>
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={expenseHeadFilter || ""}
                onValueChange={(value) => {
                  setExpenseHeadFilter(value === "all" ? null : value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Expense Head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Expense Heads</SelectLabel>
                    <SelectItem value="all">All Heads</SelectItem>
                    {expenseHeads.map((head) => (
                      <SelectItem key={head.id} value={head.id}>
                        {head.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                value={branchFilter || ""}
                onValueChange={(value) => {
                  setBranchFilter(value === "all" ? null : value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Branches</SelectLabel>
                    <SelectItem value="all">All Branches</SelectItem>
                    {Array.isArray(branches) ? (
                      branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-branches">No branches available</SelectItem>
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                value={paymentSourceFilter || ""}
                onValueChange={(value) => {
                  setPaymentSourceFilter(value === "all" ? null : value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Payment Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Payment Sources</SelectLabel>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="cash">Cash in Till</SelectItem>
                    <SelectItem value="momo">Mobile Money</SelectItem>
                    <SelectItem value="bank">Bank Account</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Date Range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range || { from: undefined, to: undefined })
                      setCurrentPage(1)
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="icon" onClick={resetFilters} title="Reset filters">
                <X className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh data">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Expense Head</TableHead>
              <TableHead className="hidden md:table-cell">Branch</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="hidden md:table-cell">Payment Source</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading expenses...
                </TableCell>
              </TableRow>
            ) : paginatedExpenses.length > 0 ? (
              paginatedExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.expense_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{getExpenseHeadName(expense.expense_head_id)}</TableCell>
                  <TableCell className="hidden md:table-cell">{getBranchName(expense.branch_id)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell className="hidden md:table-cell">{getPaymentSourceName(expense.payment_source)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewExpense(expense)}>
                      <FileText className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No expenses found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredExpenses.length)} to{" "}
            {Math.min(currentPage * rowsPerPage, filteredExpenses.length)} of {filteredExpenses.length} expenses
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Expense Details Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>Complete information about this expense.</DialogDescription>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Expense Head</h4>
                  <p className="text-base font-medium">{getExpenseHeadName(selectedExpense.expense_head_id)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Amount</h4>
                  <p className="text-base font-medium">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Date</h4>
                  <p className="text-base">{format(new Date(selectedExpense.expense_date), "MMMM dd, yyyy")}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Branch</h4>
                  <p className="text-base">{getBranchName(selectedExpense.branch_id)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Payment Source</h4>
                  <p className="text-base">{getPaymentSourceName(selectedExpense.payment_source)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Payment Account</h4>
                  <p className="text-base">
                    {selectedExpense.payment_account_id
                      ? getPaymentAccountName(selectedExpense.payment_account_id, selectedExpense.payment_source)
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                  <Badge
                    variant={
                      selectedExpense.status === "approved"
                        ? "success"
                        : selectedExpense.status === "rejected"
                          ? "destructive"
                          : "warning"
                    }
                    className="mt-1"
                  >
                    {selectedExpense.status.charAt(0).toUpperCase() + selectedExpense.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Reference Number</h4>
                  <p className="text-base">{selectedExpense.reference_number || "Not specified"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                <p className="mt-1 text-base">{selectedExpense.description}</p>
              </div>

              {selectedExpense.attachment_url && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Attachment</h4>
                  <div className="mt-2">
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href={selectedExpense.attachment_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4" />
                        View Receipt
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-md border p-4">
                <h4 className="mb-2 font-medium">Accounting Entries</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>DR: {getExpenseHeadName(selectedExpense.expense_head_id)}</span>
                    <span>{formatCurrency(selectedExpense.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      CR: {getPaymentAccountName(selectedExpense.payment_account_id, selectedExpense.payment_source)}
                    </span>
                    <span>{formatCurrency(selectedExpense.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>Created by: {selectedExpense.created_by}</p>
                <p>Created at: {format(new Date(selectedExpense.created_at), "MMM dd, yyyy HH:mm:ss")}</p>
                {selectedExpense.approved_by && (
                  <p>
                    {selectedExpense.status === "approved" ? "Approved" : "Rejected"} by: {selectedExpense.approved_by}
                  </p>
                )}
                <p>Transaction ID: {selectedExpense.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
