"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ExpenseDetailView } from "./expense-detail-view"
import { ExpenseApprovalDialog } from "./expense-approval-dialog"
import type { Expense, ExpenseHead } from "@/lib/expense-types"
import { format } from "date-fns"

export function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Fetch expenses and expense heads
  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch expenses
      const expensesResponse = await fetch("/api/expenses")
      const expensesData = await expensesResponse.json()
      setExpenses(expensesData.expenses || [])

      // Fetch expense heads
      const headsResponse = await fetch("/api/expense-heads")
      const headsData = await headsResponse.json()
      setExpenseHeads(headsData.expense_heads || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || expense.status === statusFilter

    return matchesSearch && matchesStatus
  })

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

  // Handle view details
  const handleViewDetails = (expense: Expense) => {
    setSelectedExpense(expense)
    setIsDetailDialogOpen(true)
  }

  // Handle approval complete
  const handleApprovalComplete = () => {
    fetchData() // Refresh the data
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div>Loading expenses...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Expense Management</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search by reference number or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expenses Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.reference_number}</TableCell>
                    <TableCell>{getExpenseHeadName(expense.expense_head_id)}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{format(new Date(expense.expense_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          expense.status === "approved"
                            ? "default"
                            : expense.status === "rejected"
                              ? "destructive"
                              : expense.status === "paid"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(expense)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <ExpenseApprovalDialog expense={expense} onApprovalComplete={handleApprovalComplete} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No expenses found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Expense Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
            </DialogHeader>
            {selectedExpense && <ExpenseDetailView expense={selectedExpense} expenseHeads={expenseHeads} />}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
