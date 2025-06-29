"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Filter, Eye, CheckCircle, XCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { ExpenseDetailView } from "@/components/expenses/expense-detail-view"
import { useToast } from "@/hooks/use-toast"
import type { Expense, ExpenseHead } from "@/lib/expense-types"

export default function ExpenseApprovalsPage() {
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      setLoading(true)

      // Build query parameters
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (branchFilter !== "all") params.append("branchId", branchFilter)
      if (searchTerm) params.append("search", searchTerm)

      console.log("Fetching expenses with params:", params.toString())

      const response = await fetch(`/api/expenses?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch expenses: ${response.status}`)
      }

      const data = await response.json()
      console.log("Expenses API response:", data)

      // Handle different response formats
      const expensesData = Array.isArray(data) ? data : data.expenses || []

      setExpenses(expensesData)
      console.log(`Loaded ${expensesData.length} expenses`)
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast({
        title: "Error",
        description: "Failed to load expenses. Please try again.",
        variant: "destructive",
      })

      // Set fallback data for testing
      setExpenses([
        {
          id: "exp-001",
          reference_number: "EXP-2024-001",
          expense_head_id: "head-001",
          amount: 150.0,
          expense_date: new Date().toISOString(),
          description: "Office supplies purchase",
          status: "pending",
          created_by: "user-001",
          created_by_name: "John Doe",
          branch_id: "branch-001",
          branch_name: "Main Branch",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Fetch expense heads
  const fetchExpenseHeads = async () => {
    try {
      const response = await fetch("/api/expense-heads")

      if (response.ok) {
        const data = await response.json()
        const headsData = Array.isArray(data) ? data : data.expense_heads || []
        setExpenseHeads(headsData)
      } else {
        console.warn("Failed to fetch expense heads, using fallback")
        setExpenseHeads([
          {
            id: "head-001",
            name: "Office Supplies",
            description: "General office supplies",
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "head-002",
            name: "Travel & Transport",
            description: "Travel and transportation expenses",
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
      }
    } catch (error) {
      console.error("Error fetching expense heads:", error)
      setExpenseHeads([])
    }
  }

  useEffect(() => {
    fetchExpenses()
    fetchExpenseHeads()
  }, [statusFilter, branchFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "") {
        fetchExpenses()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleViewDetails = (expense: Expense) => {
    setSelectedExpense(expense)
    setDetailDialogOpen(true)
  }

  const handleStatusChange = () => {
    setDetailDialogOpen(false)
    setSelectedExpense(null)
    fetchExpenses() // Refresh the list
    toast({
      title: "Success",
      description: "Expense status updated successfully",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const getExpenseHeadName = (headId: string) => {
    const head = expenseHeads.find((h) => h.id === headId)
    return head ? head.name : "Unknown Category"
  }

  // Filter expenses based on search term
  const filteredExpenses = expenses.filter((expense) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      expense.description?.toLowerCase().includes(searchLower) ||
      expense.reference_number?.toLowerCase().includes(searchLower) ||
      getExpenseHeadName(expense.expense_head_id).toLowerCase().includes(searchLower)
    )
  })

  // Calculate summary stats
  const pendingCount = expenses.filter((e) => e.status === "pending").length
  const approvedCount = expenses.filter((e) => e.status === "approved").length
  const rejectedCount = expenses.filter((e) => e.status === "rejected").length
  const totalPendingAmount = expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expense Approvals</h1>
        <p className="text-muted-foreground">Review and approve pending expense requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalPendingAmount)} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
            <p className="text-xs text-muted-foreground">All statuses</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter expenses by status, branch, or search term</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="branch-001">Main Branch</SelectItem>
                <SelectItem value="branch-002">Secondary Branch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Requests</CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : `${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? "s" : ""} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading expenses...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No expenses found matching your criteria</p>
              <Button variant="outline" onClick={fetchExpenses} className="mt-2">
                Refresh
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.expense_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="font-mono text-sm">{expense.reference_number}</TableCell>
                      <TableCell>{getExpenseHeadName(expense.expense_head_id)}</TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description || "No description"}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>{getStatusBadge(expense.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(expense)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <ExpenseDetailView
              expense={selectedExpense}
              expenseHeads={expenseHeads}
              onStatusChange={handleStatusChange}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
