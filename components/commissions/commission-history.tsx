"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Edit, Trash2, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EditCommissionDialog } from "./edit-commission-dialog"
import { DeleteCommissionDialog } from "./delete-commission-dialog"

interface Commission {
  id: string
  source: string
  sourceName: string
  reference: string
  month: string
  amount: number
  status: string
  createdAt: string
  updatedAt: string
  branchId: string
  branchName: string
  description?: string
  notes?: string
}

interface CommissionHistoryProps {
  commissions: Commission[]
  isLoading: boolean
  onRefresh: () => void
  onEdit: (commission: Commission) => void
  onDelete: (commission: Commission) => void
  onMarkPaid: (commission: Commission) => void
}

export function CommissionHistory({
  commissions,
  isLoading,
  onRefresh,
  onEdit,
  onDelete,
  onMarkPaid,
}: CommissionHistoryProps) {
  const { toast } = useToast()
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([])
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null)
  const [deletingCommission, setDeletingCommission] = useState<Commission | null>(null)
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [showBulkDelete, setShowBulkDelete] = useState(false)

  const handleEdit = (commission: Commission) => {
    setEditingCommission(commission)
  }

  const handleDelete = async (commission: Commission) => {
    setDeletingCommission(commission)
  }

  const handleMarkPaid = async (commission: Commission) => {
    try {
      await onMarkPaid(commission)
      toast({
        title: "Commission Updated",
        description: `Commission ${commission.reference} marked as paid.`,
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to mark commission as paid.",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>Loading commission data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commission History</CardTitle>
              <CardDescription>Manage and track all commission entries</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No commissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{commission.sourceName}</div>
                          <div className="text-sm text-muted-foreground">{commission.source}</div>
                        </div>
                      </TableCell>
                      <TableCell>{commission.reference}</TableCell>
                      <TableCell>
                        {new Date(commission.month).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{formatCurrency(commission.amount)}</TableCell>
                      <TableCell>{getStatusBadge(commission.status)}</TableCell>
                      <TableCell>{formatDate(commission.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(commission)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {commission.status !== "paid" && (
                            <Button variant="outline" size="sm" onClick={() => handleMarkPaid(commission)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(commission)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditCommissionDialog
        commission={editingCommission}
        open={!!editingCommission}
        onOpenChange={(open) => !open && setEditingCommission(null)}
        onSuccess={() => {
          setEditingCommission(null)
          onRefresh()
        }}
      />

      {/* Delete Dialog */}
      <DeleteCommissionDialog
        commission={deletingCommission}
        open={!!deletingCommission}
        onOpenChange={(open) => !open && setDeletingCommission(null)}
        onSuccess={() => {
          setDeletingCommission(null)
          onRefresh()
        }}
      />
    </>
  )
}
