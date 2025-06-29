"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpensesTable } from "./expenses-table"
import { ExpenseHeadManagement } from "./expense-head-management"
import { ExpenseEntryForm } from "./expense-entry-form"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Expense, ExpenseHead } from "@/lib/expense-types"

export default function ExpensesManagementDashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const { toast } = useToast()

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch expenses with error handling
      let expensesData
      try {
        const expensesResponse = await fetch("/api/expenses")
        if (!expensesResponse.ok) {
          throw new Error(`Failed to fetch expenses: ${expensesResponse.status} ${expensesResponse.statusText}`)
        }
        expensesData = await expensesResponse.json()
      } catch (error) {
        console.error("Error fetching expenses:", error)
        // Use mock data if API fails
        expensesData = { expenses: getMockExpenses() }
        toast({
          title: "Warning",
          description: "Using mock expense data due to API error.",
          variant: "warning",
        })
      }

      // Fetch expense heads with error handling
      let headsData
      try {
        const headsResponse = await fetch("/api/expense-heads")
        if (!headsResponse.ok) {
          throw new Error(`Failed to fetch expense heads: ${headsResponse.status} ${headsResponse.statusText}`)
        }
        headsData = await headsResponse.json()
      } catch (error) {
        console.error("Error fetching expense heads:", error)
        // Use mock data if API fails
        headsData = { expense_heads: getMockExpenseHeads() }
        toast({
          title: "Warning",
          description: "Using mock expense head data due to API error.",
          variant: "warning",
        })
      }

      setExpenses(expensesData.expenses || [])
      setExpenseHeads(headsData.expense_heads || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: "Failed to load expenses data. Using mock data instead.",
        variant: "destructive",
      })

      // Use mock data as fallback
      setExpenses(getMockExpenses())
      setExpenseHeads(getMockExpenseHeads())
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  // Handle refresh data
  const handleRefresh = () => {
    fetchData()
  }

  // Handle add expense
  const handleAddExpense = () => {
    setIsAddExpenseOpen(true)
  }

  // Handle expense added
  const handleExpenseAdded = () => {
    setIsAddExpenseOpen(false)
    fetchData()
    toast({
      title: "Success",
      description: "Expense added successfully.",
    })
  }

  // Mock data for fallback
  const getMockExpenses = (): Expense[] => {
    return [
      {
        id: "exp-001",
        type: "operational",
        amount: 1500,
        description: "Office supplies",
        date: new Date().toISOString(),
        status: "approved",
        userId: "user-001",
        expenseHeadId: "head-001",
      },
      {
        id: "exp-002",
        type: "utility",
        amount: 2500,
        description: "Electricity bill",
        date: new Date().toISOString(),
        status: "pending",
        userId: "user-002",
        expenseHeadId: "head-002",
      },
      {
        id: "exp-003",
        type: "travel",
        amount: 5000,
        description: "Business trip to Accra",
        date: new Date().toISOString(),
        status: "paid",
        userId: "user-001",
        branchId: "branch-001",
        expenseHeadId: "head-003",
      },
    ]
  }

  const getMockExpenseHeads = (): ExpenseHead[] => {
    return [
      {
        id: "head-001",
        name: "Office Supplies",
        description: "General office supplies and stationery",
        category: "operational",
        active: true,
      },
      {
        id: "head-002",
        name: "Utilities",
        description: "Electricity, water, and other utility bills",
        category: "utility",
        active: true,
      },
      {
        id: "head-003",
        name: "Travel",
        description: "Business travel expenses",
        category: "travel",
        active: true,
      },
    ]
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="warning">
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-2" onClick={handleRefresh}>
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expense Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleAddExpense}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="heads">Expense Heads</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="space-y-4">
          <ExpensesTable expenses={expenses} expenseHeads={expenseHeads} isLoading={loading} />
        </TabsContent>
        <TabsContent value="heads" className="space-y-4">
          <ExpenseHeadManagement expenseHeads={expenseHeads} onUpdate={handleRefresh} isLoading={loading} />
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 sticky top-0 bg-background z-10">
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(85vh-80px)] overflow-auto">
            <div className="px-6 pb-6">
              <ExpenseEntryForm expenseHeads={expenseHeads} onSuccess={handleExpenseAdded} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
