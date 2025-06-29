"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ExpenseHeadForm } from "./expense-head-form"
import type { ExpenseHead } from "@/lib/expense-types"

export function ExpenseHeadList() {
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedHead, setSelectedHead] = useState<ExpenseHead | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Fetch expense heads
  const fetchExpenseHeads = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/expense-heads")
      const data = await response.json()
      setExpenseHeads(data.expense_heads || [])
    } catch (error) {
      console.error("Error fetching expense heads:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load expense heads on component mount
  useEffect(() => {
    fetchExpenseHeads()
  }, [])

  // Handle search
  const filteredHeads = expenseHeads.filter(
    (head) =>
      head.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      head.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      head.gl_code.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Handle edit
  const handleEdit = (head: ExpenseHead) => {
    setSelectedHead(head)
    setIsDialogOpen(true)
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense head?")) {
      try {
        const response = await fetch(`/api/expense-heads/${id}`, {
          method: "DELETE",
        })

        if (response.ok) {
          // Remove the deleted head from the state
          setExpenseHeads(expenseHeads.filter((head) => head.id !== id))
        } else {
          const data = await response.json()
          alert(`Failed to delete expense head: ${data.error || "Unknown error"}`)
        }
      } catch (error) {
        console.error("Error deleting expense head:", error)
        alert("An error occurred while deleting the expense head")
      }
    }
  }

  // Handle form submission
  const handleFormSubmit = async (formData: Partial<ExpenseHead>) => {
    try {
      if (selectedHead) {
        // Update existing head
        const response = await fetch(`/api/expense-heads/${selectedHead.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          const data = await response.json()
          // Update the head in the state
          setExpenseHeads(expenseHeads.map((head) => (head.id === selectedHead.id ? data.expense_head : head)))
        } else {
          const data = await response.json()
          alert(`Failed to update expense head: ${data.error || "Unknown error"}`)
        }
      } else {
        // Create new head
        const response = await fetch("/api/expense-heads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          const data = await response.json()
          // Add the new head to the state
          setExpenseHeads([...expenseHeads, data.expense_head])
        } else {
          const data = await response.json()
          alert(`Failed to create expense head: ${data.error || "Unknown error"}`)
        }
      }

      // Close the dialog and reset the selected head
      setIsDialogOpen(false)
      setSelectedHead(null)
    } catch (error) {
      console.error("Error submitting expense head form:", error)
      alert("An error occurred while submitting the form")
    }
  }

  // Format category for display
  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, " ")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Expense Categories</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedHead(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedHead ? "Edit" : "Add"} Expense Category</DialogTitle>
            </DialogHeader>
            <ExpenseHeadForm
              expenseHead={selectedHead}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expense categories..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">Loading expense categories...</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>GL Code</TableHead>
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
                      <TableCell>{head.gl_code}</TableCell>
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
                    <TableCell colSpan={5} className="h-24 text-center">
                      No expense categories found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
