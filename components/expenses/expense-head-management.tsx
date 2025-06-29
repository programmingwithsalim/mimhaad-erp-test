"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import type { ExpenseHead } from "@/lib/expense-head-service"

interface ExpenseHeadFormProps {
  expenseHead: ExpenseHead | null
  onSubmit: (data: Partial<ExpenseHead>) => Promise<void>
  onCancel: () => void
}

// Simple form component for expense heads
function ExpenseHeadForm({ expenseHead, onSubmit, onCancel }: ExpenseHeadFormProps) {
  const [formData, setFormData] = useState<Partial<ExpenseHead>>({
    name: expenseHead?.name || "",
    category: expenseHead?.category || "",
    description: expenseHead?.description || "",
    is_active: expenseHead?.is_active ?? true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter expense head name"
            required
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="">Select a category</option>
            <option value="operational">Operational</option>
            <option value="administrative">Administrative</option>
            <option value="financial">Financial</option>
            <option value="capital">Capital</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="grid gap-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="is_active" className="text-sm font-medium">
            Active
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : expenseHead ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  )
}

interface ExpenseHeadManagementProps {
  expenseHeads?: ExpenseHead[]
  onUpdate?: () => void
}

export function ExpenseHeadManagement({ expenseHeads: initialExpenseHeads, onUpdate }: ExpenseHeadManagementProps) {
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>(initialExpenseHeads || [])
  const [loading, setLoading] = useState(!initialExpenseHeads)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedHead, setSelectedHead] = useState<ExpenseHead | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  // Fetch expense heads if not provided as props
  useEffect(() => {
    const fetchExpenseHeads = async () => {
      if (initialExpenseHeads) {
        setExpenseHeads(initialExpenseHeads)
        return
      }

      try {
        setLoading(true)
        setError(null)
        console.log("Fetching expense heads...")

        const response = await fetch("/api/expense-heads")
        console.log("Response status:", response.status)

        if (!response.ok) {
          throw new Error(`Failed to fetch expense heads: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log("Received data:", data)

        setExpenseHeads(data.expense_heads || [])
      } catch (error) {
        console.error("Error fetching expense heads:", error)
        setError(error instanceof Error ? error.message : "An unknown error occurred")
        toast({
          title: "Error",
          description: "Failed to load expense heads. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchExpenseHeads()
  }, [initialExpenseHeads, toast])

  // Handle search
  const filteredHeads = expenseHeads.filter(
    (head) =>
      head.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      head.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Handle add button click
  const handleAddClick = () => {
    setSelectedHead(null)
    setIsDialogOpen(true)
  }

  // Handle edit
  const handleEdit = (head: ExpenseHead) => {
    setSelectedHead(head)
    setIsDialogOpen(true)
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense head?")) {
      try {
        console.log(`Deleting expense head ${id}`)

        const response = await fetch(`/api/expense-heads/${id}`, {
          method: "DELETE",
        })

        console.log("Delete response status:", response.status)

        if (response.ok) {
          // Remove the deleted head from the state immediately
          setExpenseHeads(expenseHeads.filter((head) => head.id !== id))
          toast({
            title: "Success",
            description: "Expense head deleted successfully.",
          })
          if (onUpdate) onUpdate()
        } else {
          const errorData = await response.json()
          console.error("Delete error:", errorData)
          toast({
            title: "Error",
            description: `Failed to delete expense head: ${errorData.error || "Unknown error"}`,
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error deleting expense head:", error)
        toast({
          title: "Error",
          description: "An error occurred while deleting the expense head",
          variant: "destructive",
        })
      }
    }
  }

  // Handle form submission
  const handleFormSubmit = async (formData: Partial<ExpenseHead>) => {
    try {
      console.log("Submitting form data:", formData)

      if (selectedHead) {
        // Update existing head
        console.log(`Updating expense head ${selectedHead.id}`)

        const response = await fetch(`/api/expense-heads/${selectedHead.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })

        console.log("Update response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("Update response data:", data)

          // Update the head in the state immediately
          setExpenseHeads(expenseHeads.map((head) => (head.id === selectedHead.id ? data.expense_head : head)))
          toast({
            title: "Success",
            description: "Expense head updated successfully.",
          })
          if (onUpdate) onUpdate()
          setIsDialogOpen(false)
          setSelectedHead(null)
        } else {
          const errorData = await response.json()
          console.error("Update error:", errorData)
          toast({
            title: "Error",
            description: `Failed to update expense head: ${errorData.error || "Unknown error"}`,
            variant: "destructive",
          })
        }
      } else {
        // Create new head
        console.log("Creating new expense head")

        const response = await fetch("/api/expense-heads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })

        console.log("Create response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("Create response data:", data)

          // Add the new head to the state immediately
          setExpenseHeads([...expenseHeads, data.expense_head])
          toast({
            title: "Success",
            description: "Expense head created successfully.",
          })
          if (onUpdate) onUpdate()
          setIsDialogOpen(false)
          setSelectedHead(null)
        } else {
          const errorData = await response.json()
          console.error("Create error:", errorData)
          toast({
            title: "Error",
            description: `Failed to create expense head: ${errorData.error || "Unknown error"}`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error submitting expense head form:", error)
      toast({
        title: "Error",
        description: "An error occurred while submitting the form",
        variant: "destructive",
      })
    }
  }

  // Format category for display
  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, " ")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Expense Heads</CardTitle>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense Head
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expense heads..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">Loading expense heads...</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHeads.length > 0 ? (
                  filteredHeads.map((head) => (
                    <TableRow key={head.id}>
                      <TableCell className="font-medium">{head.name}</TableCell>
                      <TableCell>{formatCategory(head.category)}</TableCell>
                      <TableCell>
                        <Badge variant={head.is_active ? "outline" : "secondary"}>
                          {head.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(head)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(head.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No expense heads found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog for adding/editing expense heads */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedHead ? "Edit" : "Add"} Expense Head</DialogTitle>
              <DialogDescription>
                {selectedHead
                  ? "Update the expense head details below."
                  : "Create a new expense head by filling out the form below."}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-grow pr-4">
              <div className="p-1">
                <ExpenseHeadForm
                  expenseHead={selectedHead}
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
