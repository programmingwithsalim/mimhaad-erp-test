"use client"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, Plus, TrendingDown, TrendingUp, Trash } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useState, useEffect } from "react"
import { ExpenseForm } from "./_components/expense-form"
import { DeleteExpenseDialog } from "./_components/delete-expense-dialog"
import { format, isValid, parseISO } from "date-fns"
import { currencyFormatter } from "@/lib/utils"
import { BranchIndicator } from "@/components/branch/branch-indicator"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useToast } from "@/components/ui/use-toast"

interface Expense {
  id: string
  reference_number: string
  branch_id: string
  expense_head_id: string
  amount: number
  description: string
  expense_date: string
  payment_source: string
  status: "pending" | "approved" | "rejected" | "paid"
  created_by: string
  expense_head_name?: string
  expense_head_category?: string
  created_at: string
}

interface ExpenseStats {
  total_expenses: number
  total_amount: number
  pending_count: number
  pending_amount: number
  approved_count: number
  approved_amount: number
  paid_count: number
  paid_amount: number
}

// Safe date formatting function
function formatExpenseDate(dateString: string | Date): string {
  try {
    let date: Date

    if (typeof dateString === "string") {
      date = parseISO(dateString)
      if (!isValid(date)) {
        date = new Date(dateString)
      }
    } else {
      date = dateString
    }

    if (!isValid(date)) {
      console.warn("Invalid date:", dateString)
      return "Invalid Date"
    }

    return format(date, "MMM dd, yyyy")
  } catch (error) {
    console.error("Error formatting date:", dateString, error)
    return "Invalid Date"
  }
}

export default function ExpensesPage() {
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<ExpenseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user } = useCurrentUser()
  const { toast } = useToast()

  const fetchExpenses = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError(null)

      console.log("Fetching expenses from API...")
      const response = await fetch("/api/expenses", {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch expenses: ${response.status}`)
      }

      const data = await response.json()
      console.log("Expenses API response:", data)

      if (data.success) {
        setExpenses(data.expenses || [])
      } else {
        throw new Error(data.error || "Failed to fetch expenses")
      }
    } catch (err) {
      console.error("Error fetching expenses:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const fetchStats = async () => {
    try {
      console.log("Fetching expense statistics...")
      const response = await fetch("/api/expenses-statistics", {
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Statistics API response:", data)

        if (data.success) {
          setStats(data.statistics)
        } else {
          console.error("Failed to fetch statistics:", data.error)
        }
      } else {
        console.error("Statistics request failed:", response.status)
      }
    } catch (err) {
      console.error("Error fetching expense statistics:", err)
    }
  }

  useEffect(() => {
    fetchExpenses()
    fetchStats()
  }, [])

  const refreshExpenses = async () => {
    console.log("Refreshing expenses and statistics...")
    setError(null)
    await Promise.all([fetchExpenses(false), fetchStats()])
    console.log("Refresh completed")
  }

  const onEdit = (id: string) => {
    setEditId(id)
    setOpen(true)
  }

  const onDelete = (id: string) => {
    setDeleteId(id)
  }

  // Safe stats access with fallbacks
  const safeStats = {
    totalExpenses: stats?.total_expenses || 0,
    totalAmount: stats?.total_amount || 0,
    pendingCount: stats?.pending_count || 0,
    pendingAmount: stats?.pending_amount || 0,
    approvedCount: stats?.approved_count || 0,
    approvedAmount: stats?.approved_amount || 0,
    paidCount: stats?.paid_count || 0,
    paidAmount: stats?.paid_amount || 0,
  }

  const isFiltered = user?.role !== "Admin" && user?.role !== "Finance"

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses Management</h1>
          <p className="text-muted-foreground">
            {isFiltered
              ? "Track and manage business expenses for your branch"
              : "Track and manage business expenses across all branches"}
          </p>
          {isFiltered && (
            <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700">
              Showing expenses for your branch only
            </Badge>
          )}
        </div>
        <BranchIndicator />
      </div>
      <Separator className="my-4" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-6 w-20" /> : error ? "Error" : currencyFormatter(safeStats.totalAmount)}
            </div>
            <p className="text-sm text-muted-foreground">{safeStats.totalExpenses} total expenses</p>
            <p className="text-sm text-muted-foreground">{isFiltered ? "Your branch only" : "All branches"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : error ? (
                "Error"
              ) : (
                currencyFormatter(safeStats.pendingAmount)
              )}
            </div>
            <p className="text-sm text-muted-foreground">{safeStats.pendingCount} pending expenses</p>
            <p className="text-sm text-muted-foreground">{isFiltered ? "Your branch only" : "All branches"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : error ? (
                "Error"
              ) : (
                currencyFormatter(safeStats.approvedAmount)
              )}
            </div>
            <p className="text-sm text-muted-foreground">{safeStats.approvedCount} approved expenses</p>
            <p className="text-sm text-muted-foreground">{isFiltered ? "Your branch only" : "All branches"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-6 w-20" /> : error ? "Error" : currencyFormatter(safeStats.paidAmount)}
            </div>
            <p className="text-sm text-muted-foreground">{safeStats.paidCount} paid expenses</p>
            <p className="text-sm text-muted-foreground">{isFiltered ? "Your branch only" : "All branches"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Expenses List</h2>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>
        <Separator className="my-2" />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && error && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-red-500">Error loading expenses: {error}</div>
                  <Button variant="outline" onClick={refreshExpenses} className="mt-2">
                    Try Again
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && (!expenses || expenses.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-muted-foreground">
                    No expenses found. Click "Add Expense" to create your first expense.
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              !error &&
              expenses &&
              expenses.length > 0 &&
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{formatExpenseDate(expense.expense_date)}</TableCell>
                  <TableCell>{expense.description || "No description"}</TableCell>
                  <TableCell>{expense.expense_head_category || expense.expense_head_name || "Uncategorized"}</TableCell>
                  <TableCell className="text-right">{currencyFormatter(expense.amount)}</TableCell>
                  <TableCell className="text-center">
                    {expense.status === "pending" ? (
                      <Badge variant="secondary">Pending</Badge>
                    ) : expense.status === "approved" ? (
                      <Badge variant="default">Approved</Badge>
                    ) : expense.status === "rejected" ? (
                      <Badge variant="destructive">Rejected</Badge>
                    ) : expense.status === "paid" ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unknown</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => onEdit(expense.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => onDelete(expense.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <ExpenseForm open={open} setOpen={setOpen} editId={editId} setEditId={setEditId} refresh={refreshExpenses} />
      <DeleteExpenseDialog id={deleteId} setDeleteId={setDeleteId} refresh={refreshExpenses} />
    </div>
  )
}
