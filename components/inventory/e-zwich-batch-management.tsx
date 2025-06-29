"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { Plus, MoreHorizontal, Pencil, Trash2, Package, AlertTriangle, RefreshCw } from "lucide-react"
import { format } from "date-fns"

interface CardBatch {
  id: string
  batch_code: string
  quantity_received: number
  quantity_available: number
  quantity_issued: number
  card_type: string
  expiry_date: string
  status: string
  display_status: string
  branch_id: string
  created_by: string
  notes?: string
  created_at: string
  updated_at: string
}

export default function EZwichBatchManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [batches, setBatches] = useState<CardBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<CardBatch | null>(null)
  const [formData, setFormData] = useState({
    batch_code: "",
    quantity_received: "",
    card_type: "standard",
    expiry_date: "",
    status: "active",
    notes: "",
  })

  const branchId = user?.branchId || "branch-1"
  const userId = user?.id || "admin"
  const userName = user ? `${user.firstName} ${user.lastName}` : "Unknown User"

  const fetchBatches = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/e-zwich/batches?branchId=${branchId}&userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        setBatches(result.data || [])
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to fetch batches",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
      toast({
        title: "Error",
        description: "Failed to fetch batches",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBatch = async () => {
    try {
      if (!formData.batch_code || !formData.quantity_received || !formData.expiry_date) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/e-zwich/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity_received: Number.parseInt(formData.quantity_received),
          userId,
          branchId,
          created_by: userId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Card batch created successfully with GL entries posted",
        })
        setIsCreateDialogOpen(false)
        setFormData({
          batch_code: "",
          quantity_received: "",
          card_type: "standard",
          expiry_date: "",
          status: "active",
          notes: "",
        })
        fetchBatches()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create batch",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating batch:", error)
      toast({
        title: "Error",
        description: "Failed to create batch",
        variant: "destructive",
      })
    }
  }

  const handleEditBatch = async () => {
    if (!selectedBatch) return

    try {
      const response = await fetch(`/api/e-zwich/batches/${selectedBatch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity_received: Number.parseInt(formData.quantity_received),
          userId,
          branchId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Card batch updated successfully with GL adjustments posted",
        })
        setIsEditDialogOpen(false)
        setSelectedBatch(null)
        fetchBatches()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update batch",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating batch:", error)
      toast({
        title: "Error",
        description: "Failed to update batch",
        variant: "destructive",
      })
    }
  }

  const handleDeleteBatch = async () => {
    if (!selectedBatch) return

    try {
      const response = await fetch(`/api/e-zwich/batches/${selectedBatch.id}?userId=${userId}&branchId=${branchId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Card batch deleted successfully with GL reversal entries posted",
        })
        setIsDeleteDialogOpen(false)
        setSelectedBatch(null)
        fetchBatches()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete batch",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting batch:", error)
      toast({
        title: "Error",
        description: "Failed to delete batch",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (batch: CardBatch) => {
    setSelectedBatch(batch)
    setFormData({
      batch_code: batch.batch_code,
      quantity_received: batch.quantity_received.toString(),
      card_type: batch.card_type,
      expiry_date: batch.expiry_date,
      status: batch.status,
      notes: batch.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (batch: CardBatch) => {
    setSelectedBatch(batch)
    setIsDeleteDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      low_stock: { variant: "secondary" as const, label: "Low Stock" },
      depleted: { variant: "destructive" as const, label: "Depleted" },
      expired: { variant: "destructive" as const, label: "Expired" },
      inactive: { variant: "outline" as const, label: "Inactive" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  useEffect(() => {
    fetchBatches()
  }, [branchId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Card Batch Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
            <div className="text-muted-foreground">Loading batches...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Card Batch Management
              </CardTitle>
              <CardDescription>
                Manage E-Zwich card inventory batches with full audit logging and GL integration
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchBatches}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Batch
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Card Batch</DialogTitle>
                    <DialogDescription>
                      Add a new batch of E-Zwich cards to inventory. This will create GL entries and audit logs.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="batch_code">Batch Code *</Label>
                      <Input
                        id="batch_code"
                        value={formData.batch_code}
                        onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                        placeholder="e.g., BATCH-2024-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quantity_received">Quantity Received *</Label>
                      <Input
                        id="quantity_received"
                        type="number"
                        value={formData.quantity_received}
                        onChange={(e) => setFormData({ ...formData, quantity_received: e.target.value })}
                        placeholder="e.g., 1000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="card_type">Card Type</Label>
                      <Select
                        value={formData.card_type}
                        onValueChange={(value) => setFormData({ ...formData, card_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="corporate">Corporate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="expiry_date">Expiry Date *</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes about this batch..."
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateBatch}>Create Batch</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No card batches found</h3>
              <p className="text-muted-foreground mb-4">Create your first card batch to get started</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Batch
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_code}</TableCell>
                    <TableCell className="capitalize">{batch.card_type}</TableCell>
                    <TableCell>{batch.quantity_received.toLocaleString()}</TableCell>
                    <TableCell>{batch.quantity_available.toLocaleString()}</TableCell>
                    <TableCell>{batch.quantity_issued.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(batch.display_status)}</TableCell>
                    <TableCell>{format(new Date(batch.expiry_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(batch)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteDialog(batch)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Card Batch</DialogTitle>
            <DialogDescription>
              Update batch information. Changes will be audited and GL adjustments will be posted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_batch_code">Batch Code *</Label>
              <Input
                id="edit_batch_code"
                value={formData.batch_code}
                onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground mt-1">Batch code cannot be changed</p>
            </div>
            <div>
              <Label htmlFor="edit_quantity_received">Quantity Received *</Label>
              <Input
                id="edit_quantity_received"
                type="number"
                value={formData.quantity_received}
                onChange={(e) => setFormData({ ...formData, quantity_received: e.target.value })}
              />
              {selectedBatch && (
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum: {selectedBatch.quantity_issued} (cards already issued)
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit_card_type">Card Type</Label>
              <Select
                value={formData.card_type}
                onValueChange={(value) => setFormData({ ...formData, card_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_expiry_date">Expiry Date *</Label>
              <Input
                id="edit_expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditBatch}>Update Batch</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Card Batch
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete batch "{selectedBatch?.batch_code}"?
              {selectedBatch && selectedBatch.quantity_issued > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This batch has {selectedBatch.quantity_issued} cards already issued.
                </span>
              )}
              <span className="block mt-2 text-sm">
                This action will:
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Permanently delete the batch record</li>
                  <li>Create GL reversal entries</li>
                  <li>Log the deletion in audit trail</li>
                </ul>
              </span>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
