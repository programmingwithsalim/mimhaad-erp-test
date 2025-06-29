"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Package, AlertCircle } from "lucide-react"

interface CardBatch {
  id: string
  batch_code: string
  quantity_received: number
  quantity_issued: number
  quantity_available: number
  card_type: string
  expiry_date?: string
  status: string
  created_by: string
  created_at: string
  notes?: string
}

export function EZwichBatchManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [batches, setBatches] = useState<CardBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingBatch, setIsAddingBatch] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [formData, setFormData] = useState({
    batch_code: "",
    quantity_received: "",
    card_type: "Standard",
    expiry_date: "",
    notes: "",
  })

  useEffect(() => {
    if (user?.branchId) {
      fetchBatches()
    }
  }, [user?.branchId])

  const fetchBatches = async () => {
    try {
      const response = await fetch(`/api/e-zwich/batches?branchId=${user?.branchId}`)
      const result = await response.json()

      if (result.success) {
        setBatches(result.data || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch card batches",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
      toast({
        title: "Error",
        description: "Failed to fetch card batches",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddBatch = async () => {
    if (!formData.batch_code || !formData.quantity_received) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setIsAddingBatch(true)

      const response = await fetch("/api/e-zwich/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          quantity_received: Number.parseInt(formData.quantity_received),
          branch_id: user?.branchId,
          created_by: user?.id,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Card batch added successfully",
        })
        setFormData({
          batch_code: "",
          quantity_received: "",
          card_type: "Standard",
          expiry_date: "",
          notes: "",
        })
        setShowAddDialog(false)
        fetchBatches()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add card batch",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding batch:", error)
      toast({
        title: "Error",
        description: "Failed to add card batch",
        variant: "destructive",
      })
    } finally {
      setIsAddingBatch(false)
    }
  }

  const totalAvailable = batches.reduce((sum, batch) => sum + batch.quantity_available, 0)
  const totalIssued = batches.reduce((sum, batch) => sum + batch.quantity_issued, 0)

  if (loading) {
    return <div>Loading card batches...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">E-Zwich Card Inventory</h2>
          <p className="text-muted-foreground">Manage card batches and inventory</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Card Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Card Batch</DialogTitle>
              <DialogDescription>Register a new batch of E-Zwich cards received</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="batch_code">Batch Code *</Label>
                <Input
                  id="batch_code"
                  value={formData.batch_code}
                  onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                  placeholder="e.g., EZ2024001"
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
                <Input
                  id="card_type"
                  value={formData.card_type}
                  onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
                  placeholder="e.g., Standard, Premium"
                />
              </div>
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
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
                  placeholder="Additional notes about this batch"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddBatch} disabled={isAddingBatch}>
                {isAddingBatch ? "Adding..." : "Add Batch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Cards</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cards Issued</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalIssued}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Warning */}
      {totalAvailable < 50 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-center space-x-2 pt-6">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">Low Card Stock Warning</p>
              <p className="text-sm text-orange-600">
                Only {totalAvailable} cards remaining. Consider ordering more cards.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Card Batches</CardTitle>
          <CardDescription>All registered card batches for this branch</CardDescription>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No card batches</h3>
              <p className="mt-1 text-sm text-gray-500">Add your first card batch to start issuing cards.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_code}</TableCell>
                    <TableCell>{batch.card_type}</TableCell>
                    <TableCell>{batch.quantity_received}</TableCell>
                    <TableCell>{batch.quantity_issued}</TableCell>
                    <TableCell>
                      <span className={batch.quantity_available < 10 ? "text-red-600 font-medium" : ""}>
                        {batch.quantity_available}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={batch.quantity_available > 0 ? "default" : "secondary"}>
                        {batch.quantity_available > 0 ? "Active" : "Depleted"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(batch.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
