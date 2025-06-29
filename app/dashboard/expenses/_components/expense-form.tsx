"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { ExpenseHeadForm } from "@/components/expenses/expense-head-form"
import { useBranches } from "@/hooks/use-branches"
import { useCurrentUser } from "@/hooks/use-current-user"

interface ExpenseFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  editId: string | null
  setEditId: (id: string | null) => void
  refresh: () => void
}

interface ExpenseHead {
  id: string
  name: string
  category: string
  description: string | null
  is_active: boolean
}

export function ExpenseForm({ open, setOpen, editId, setEditId, refresh }: ExpenseFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([])
  const [loadingExpenseHeads, setLoadingExpenseHeads] = useState(false)
  const [date, setDate] = useState<Date>(new Date())
  const [showExpenseHeadForm, setShowExpenseHeadForm] = useState(false)

  // Get current user and branches
  const { user } = useCurrentUser()
  const { branches } = useBranches()

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    expense_head_id: "",
    payment_source: "cash",
    notes: "",
    branch_id: "",
  })

  // Set default branch_id when user is loaded
  useEffect(() => {
    if (user && !editId) {
      setFormData((prev) => ({
        ...prev,
        branch_id: user.branchId || "",
      }))
    }
  }, [user, editId])

  // Fetch expense heads
  const fetchExpenseHeads = async () => {
    setLoadingExpenseHeads(true)
    try {
      const response = await fetch("/api/expense-heads")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      console.log("Raw expense heads response:", text)

      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error("Failed to parse expense heads response as JSON:", parseError)
        throw new Error("Invalid JSON response from server")
      }

      console.log("Parsed expense heads response:", data)
      setExpenseHeads(data.expense_heads || [])
    } catch (error) {
      console.error("Error fetching expense heads:", error)
      toast({
        title: "Warning",
        description: "Failed to load expense heads. Using fallback data.",
        variant: "destructive",
      })
      // Set fallback expense heads
      setExpenseHeads([
        {
          id: "1",
          name: "Office Supplies",
          category: "Operational",
          description: "Stationery and office materials",
          is_active: true,
        },
        {
          id: "2",
          name: "Utilities",
          category: "Operational",
          description: "Electricity, water, internet bills",
          is_active: true,
        },
        {
          id: "3",
          name: "Travel & Transport",
          category: "Operational",
          description: "Business travel and transportation",
          is_active: true,
        },
      ])
    } finally {
      setLoadingExpenseHeads(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchExpenseHeads()
    }
  }, [open])

  // Fetch expense details if editing
  useEffect(() => {
    if (editId) {
      setLoading(true)
      fetch(`/api/expenses/${editId}`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
          }

          const text = await res.text()
          console.log("Raw expense details response:", text)

          try {
            return JSON.parse(text)
          } catch (parseError) {
            console.error("Failed to parse expense details response as JSON:", parseError)
            throw new Error("Invalid JSON response from server")
          }
        })
        .then((data) => {
          console.log("Parsed expense details:", data)
          if (data.success && data.expense) {
            const expense = data.expense
            setFormData({
              description: expense.description || "",
              amount: expense.amount?.toString() || "",
              expense_head_id: expense.expense_head_id || "",
              payment_source: expense.payment_source || "cash",
              notes: expense.notes || "",
              branch_id: expense.branch_id || "",
            })
            if (expense.expense_date) {
              setDate(new Date(expense.expense_date))
            }
          } else {
            throw new Error(data.error || "Failed to load expense details")
          }
        })
        .catch((error) => {
          console.error("Error fetching expense details:", error)
          toast({
            title: "Error",
            description: "Failed to load expense details: " + error.message,
            variant: "destructive",
          })
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      // Reset form for new expense
      setFormData({
        description: "",
        amount: "",
        expense_head_id: "",
        payment_source: "cash",
        notes: "",
        branch_id: user?.branchId || "",
      })
      setDate(new Date())
    }
  }, [editId, toast, user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("Form submission started with data:", formData)

    // Validation
    if (!formData.description || !formData.amount || !formData.expense_head_id) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    // Ensure branch_id is set
    const branchId = formData.branch_id || user?.branchId
    if (!branchId) {
      toast({
        title: "Validation Error",
        description: "Branch ID is required. Please contact support.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      const expenseData = {
        description: formData.description,
        amount: Number.parseFloat(formData.amount),
        expense_head_id: formData.expense_head_id,
        expense_date: date.toISOString().split("T")[0], // Format as YYYY-MM-DD
        payment_source: formData.payment_source,
        notes: formData.notes,
        branch_id: branchId,
        created_by: user?.id || "system",
      }

      console.log("Submitting expense data:", expenseData)

      const url = editId ? `/api/expenses/${editId}` : "/api/expenses"
      const method = editId ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      console.log("Raw response:", text)

      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError)
        throw new Error("Invalid JSON response from server")
      }

      console.log("Parsed response:", data)

      if (data.success) {
        toast({
          title: "Success",
          description: editId ? "Expense updated successfully" : "Expense created successfully",
        })
        setOpen(false)
        setEditId(null)
        refresh()
      } else {
        throw new Error(data.error || "Something went wrong")
      }
    } catch (error) {
      console.error("Error submitting expense:", error)
      toast({
        title: "Error",
        description: "Failed to save expense: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setEditId(null)
  }

  const handleExpenseHeadCreated = () => {
    setShowExpenseHeadForm(false)
    fetchExpenseHeads() // Refresh the expense heads list
    toast({
      title: "Success",
      description: "Expense head created successfully",
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Expense" : "Add New Expense"}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₵) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Branch Selection - only show for admin/finance users */}
              {user?.role === "admin" || user?.role === "finance" ? (
                <div className="space-y-2">
                  <Label htmlFor="branch_id">Branch *</Label>
                  <Select value={formData.branch_id} onValueChange={(value) => handleSelectChange("branch_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <input type="hidden" name="branch_id" value={formData.branch_id} />
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of expense"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="expense_head_id">Expense Head *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExpenseHeadForm(true)}
                    className="h-8 px-2"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New
                  </Button>
                </div>
                <Select
                  value={formData.expense_head_id}
                  onValueChange={(value) => handleSelectChange("expense_head_id", value)}
                  disabled={loadingExpenseHeads}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingExpenseHeads ? "Loading..." : "Select expense head"} />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseHeads.map((head) => (
                      <SelectItem key={head.id} value={head.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{head.name}</span>
                          <span className="text-xs text-muted-foreground">{head.category}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_source">Payment Source *</Label>
                <Select
                  value={formData.payment_source}
                  onValueChange={(value) => handleSelectChange("payment_source", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional details"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Add Expense Head Dialog */}
      <Dialog open={showExpenseHeadForm} onOpenChange={setShowExpenseHeadForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Expense Head</DialogTitle>
          </DialogHeader>
          <ExpenseHeadForm
            expenseHead={null}
            onSubmit={async (data) => {
              try {
                const response = await fetch("/api/expense-heads", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(data),
                })

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`)
                }

                const text = await response.text()
                let result
                try {
                  result = JSON.parse(text)
                } catch (parseError) {
                  throw new Error("Invalid JSON response from server")
                }

                if (result.success) {
                  handleExpenseHeadCreated()
                } else {
                  throw new Error(result.error || "Failed to create expense head")
                }
              } catch (error) {
                console.error("Error creating expense head:", error)
                toast({
                  title: "Error",
                  description:
                    "Failed to create expense head: " + (error instanceof Error ? error.message : "Unknown error"),
                  variant: "destructive",
                })
              }
            }}
            onCancel={() => setShowExpenseHeadForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
