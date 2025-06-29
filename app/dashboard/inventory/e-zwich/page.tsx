"use client"

import { useState } from "react"
import {
  Plus,
  Package,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { useCardBatches, useIssuedCards, useEZwichStatistics, useWithdrawals } from "@/hooks/use-e-zwich"
import { EZwichAddStockForm } from "@/components/inventory/e-zwich-add-stock-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { EZwichEditBatchForm } from "@/components/inventory/e-zwich-edit-batch-form"

export default function EZwichInventoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { batches, loading: batchesLoading, error: batchesError, fetchBatches, deleteBatch } = useCardBatches()
  const { cards, loading: cardsLoading, error: cardsError, fetchCards } = useIssuedCards()
  const { statistics, loading: statsLoading, error: statsError, fetchStatistics } = useEZwichStatistics()
  const { withdrawals, loading: withdrawalsLoading, error: withdrawalsError, fetchWithdrawals } = useWithdrawals()

  const [addStockOpen, setAddStockOpen] = useState(false)
  const [editStockOpen, setEditStockOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Calculate inventory metrics
  const totalBatches = batches?.length || 0
  const totalCardsReceived = batches?.reduce((sum, batch) => sum + batch.quantity_received, 0) || 0
  const totalCardsAvailable = batches?.reduce((sum, batch) => sum + batch.quantity_available, 0) || 0

  // Cards issued should be the actual count of issued cards, not calculated from batches
  const totalCardsIssued = cards?.length || 0

  // Total withdrawals from actual withdrawal transactions
  const totalWithdrawals = withdrawals?.length || 0
  const totalWithdrawalAmount = withdrawals?.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0) || 0

  // Calculate low stock batches (less than 10% remaining)
  const lowStockBatches =
    batches?.filter((batch) => {
      const utilization = (batch.quantity_received - batch.quantity_available) / batch.quantity_received
      return utilization > 0.9 && batch.quantity_available > 0
    }) || []

  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchBatches(), fetchCards(), fetchStatistics(), fetchWithdrawals()])
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleEditBatch = (batch: any) => {
    setSelectedBatch(batch)
    setEditStockOpen(true)
  }

  const handleDeleteBatch = (batch: any) => {
    setSelectedBatch(batch)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteBatch = async () => {
    if (!selectedBatch) return

    setIsDeleting(true)
    try {
      await deleteBatch(selectedBatch.id)
      toast({
        title: "Success",
        description: "Card batch deleted successfully",
      })
      setDeleteDialogOpen(false)
      setSelectedBatch(null)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete batch",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>
      case "low_stock":
        return <Badge variant="secondary">Low Stock</Badge>
      case "depleted":
        return <Badge variant="destructive">Depleted</Badge>
      case "expired":
        return <Badge variant="destructive">Expired</Badge>
      case "inactive":
        return <Badge variant="outline">Inactive</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const isLoading = batchesLoading || cardsLoading || statsLoading || withdrawalsLoading

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">E-Zwich Card Inventory</h1>
            <p className="text-muted-foreground">Manage card batches, stock levels, and issuance</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshAll} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={addStockOpen} onOpenChange={setAddStockOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setAddStockOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Card Batch</DialogTitle>
                <DialogDescription>Add a new batch of E-Zwich cards to inventory</DialogDescription>
              </DialogHeader>
              <EZwichAddStockForm onSuccess={() => setAddStockOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {batchesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalBatches}</div>
                <p className="text-xs text-muted-foreground">Active card batches</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cards in Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {batchesLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{totalCardsAvailable.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Available for issuance</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cards Issued</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {cardsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : cardsError ? (
              <div className="text-sm text-red-600">Error loading</div>
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">{totalCardsIssued.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total issued cards</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {withdrawalsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : withdrawalsError ? (
              <div className="text-sm text-red-600">Error loading</div>
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">{totalWithdrawals.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">GHS {totalWithdrawalAmount.toLocaleString()} total</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error States */}
      {(batchesError || cardsError || statsError || withdrawalsError) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Data Loading Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {batchesError && <div className="text-sm text-red-700">Batches: {batchesError}</div>}
            {cardsError && <div className="text-sm text-red-700">Cards: {cardsError}</div>}
            {statsError && <div className="text-sm text-red-700">Statistics: {statsError}</div>}
            {withdrawalsError && <div className="text-sm text-red-700">Withdrawals: {withdrawalsError}</div>}
            <Button variant="outline" size="sm" onClick={handleRefreshAll} className="mt-2">
              Retry Loading
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alerts */}
      {lowStockBatches.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Low Stock Alert
            </CardTitle>
            <CardDescription className="text-orange-700">
              The following batches are running low on stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <div className="font-medium">{batch.batch_code}</div>
                    <div className="text-sm text-muted-foreground">
                      {batch.quantity_available} of {batch.quantity_received} remaining
                    </div>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    {Math.round((batch.quantity_available / batch.quantity_received) * 100)}% left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Card Batches</CardTitle>
          <CardDescription>Manage and track all card batches</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : batchesError ? (
            <div className="text-center py-8 text-red-600">Error loading batches: {batchesError}</div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No card batches found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by adding your first batch of E-Zwich cards
              </p>
              <Button onClick={() => setAddStockOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Batch
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Code</TableHead>
                    <TableHead>Card Type</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.batch_code}</TableCell>
                      <TableCell className="capitalize">{batch.card_type}</TableCell>
                      <TableCell>{batch.quantity_received.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {batch.quantity_available.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-blue-600">
                        {(batch.quantity_received - batch.quantity_available).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>
                        {batch.expiry_date ? format(new Date(batch.expiry_date), "MMM dd, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell>{format(new Date(batch.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBatch(batch)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteBatch(batch)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Batch Dialog */}
      <Dialog open={editStockOpen} onOpenChange={setEditStockOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Card Batch</DialogTitle>
            <DialogDescription>Update the details of the selected card batch</DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <EZwichEditBatchForm
              batch={selectedBatch}
              onSuccess={() => {
                setEditStockOpen(false)
                setSelectedBatch(null)
              }}
              onCancel={() => {
                setEditStockOpen(false)
                setSelectedBatch(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Card Batch
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the batch "{selectedBatch?.batch_code}"?
              {selectedBatch && selectedBatch.quantity_received - selectedBatch.quantity_available > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800 font-medium">Warning</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">
                    This batch has {selectedBatch.quantity_received - selectedBatch.quantity_available} cards already
                    issued. Deleting this batch may affect your inventory records.
                  </p>
                </div>
              )}
              <p className="mt-2 text-sm text-muted-foreground">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBatch}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Batch"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
