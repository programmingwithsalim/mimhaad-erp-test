"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useCashInTillEnhanced } from "@/hooks/use-cash-in-till-enhanced"
import { CreditCard, Loader2, Edit, Trash2, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

const formSchema = z.object({
  cardNumber: z.string().min(1, "Card number is required"),
  settlementAccountId: z.string().min(1, "Settlement account is required"),
  customerName: z.string().min(2, "Customer name is required"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  fee: z.coerce.number().min(0, "Fee cannot be negative"),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EZwichWithdrawal {
  id: string
  card_number: string
  settlement_account_id: string
  customer_name: string
  customer_phone: string
  amount: number
  fee: number
  notes?: string
  status: string
  reference: string
  created_at: string
  processed_by: string
}

interface EnhancedWithdrawalFormProps {
  onSuccess?: (data: any) => void
}

export function EnhancedWithdrawalForm({ onSuccess }: EnhancedWithdrawalFormProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ezwichAccounts, setEzwichAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [withdrawals, setWithdrawals] = useState<EZwichWithdrawal[]>([])
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false)
  const [editingWithdrawal, setEditingWithdrawal] = useState<EZwichWithdrawal | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [withdrawalToDelete, setWithdrawalToDelete] = useState<string | null>(null)

  // Current branch and user info
  const branchId = user?.branchId || ""
  const userId = user?.id || ""

  // Get cash-in-till for the current branch
  const {
    cashAccount,
    isLoading: isCashLoading,
    error: cashError,
    refetch: refreshCashTill,
  } = useCashInTillEnhanced(branchId)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cardNumber: "",
      settlementAccountId: "",
      customerName: "",
      customerPhone: "",
      amount: 0,
      fee: 5, // Default E-Zwich fee
      note: "",
    },
  })

  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  // Load E-Zwich settlement accounts
  const loadEzwichAccounts = async () => {
    if (!branchId) return

    setLoadingAccounts(true)
    try {
      const response = await fetch(`/api/float-accounts/ezwich-partners?branchId=${branchId}`)

      if (!response.ok) {
        throw new Error(`Failed to load E-Zwich accounts: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.accounts)) {
        setEzwichAccounts(data.accounts)
      } else {
        setEzwichAccounts([])
      }
    } catch (error) {
      console.error("Error loading E-Zwich accounts:", error)
      setEzwichAccounts([])
      toast({
        title: "Error",
        description: "Failed to load E-Zwich settlement accounts",
        variant: "destructive",
      })
    } finally {
      setLoadingAccounts(false)
    }
  }

  // Load withdrawal history
  const loadWithdrawals = async () => {
    if (!branchId) return

    setLoadingWithdrawals(true)
    try {
      const response = await fetch(`/api/e-zwich/withdrawals?branchId=${branchId}&limit=20`)

      if (!response.ok) {
        throw new Error(`Failed to load withdrawals: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.withdrawals)) {
        setWithdrawals(data.withdrawals)
      } else {
        setWithdrawals([])
      }
    } catch (error) {
      console.error("Error loading withdrawals:", error)
      setWithdrawals([])
    } finally {
      setLoadingWithdrawals(false)
    }
  }

  useEffect(() => {
    loadEzwichAccounts()
    loadWithdrawals()
  }, [branchId])

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to process withdrawals",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch("/api/e-zwich/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "withdrawal",
          card_number: values.cardNumber,
          settlement_account_id: values.settlementAccountId,
          customer_name: values.customerName,
          customer_phone: values.customerPhone,
          amount: values.amount,
          fee: values.fee,
          note: values.note,
          user_id: userId,
          branch_id: branchId,
          processed_by: user.email || user.username || user.name || "Unknown User",
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [E-ZWICH] API Error:", errorText)
        throw new Error(`Withdrawal failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Withdrawal Processed",
          description: `E-Zwich withdrawal of GHS ${values.amount.toFixed(2)} processed successfully`,
        })
        form.reset()
        loadWithdrawals() // Refresh withdrawal history
        refreshCashTill() // Refresh cash till balance
        if (onSuccess) {
          onSuccess(result.transaction)
        }
      } else {
        throw new Error(result.error || "Failed to process withdrawal")
      }
    } catch (error: any) {
      console.error("❌ [E-ZWICH] Withdrawal error:", error)
      toast({
        title: "Error",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditWithdrawal = async (values: FormValues) => {
    if (!editingWithdrawal) return

    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/e-zwich/withdrawals/${editingWithdrawal.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card_number: values.cardNumber,
          customer_name: values.customerName,
          customer_phone: values.customerPhone,
          amount: values.amount,
          fee: values.fee,
          notes: values.note,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update withdrawal")
      }

      toast({
        title: "Withdrawal Updated",
        description: "E-Zwich withdrawal has been successfully updated.",
      })

      setShowEditDialog(false)
      setEditingWithdrawal(null)
      loadWithdrawals() // Refresh withdrawal history
    } catch (error) {
      console.error("Update error:", error)
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update the withdrawal. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteWithdrawal = async (withdrawalId: string) => {
    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/e-zwich/withdrawals/${withdrawalId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete withdrawal")
      }

      toast({
        title: "Withdrawal Deleted",
        description: "E-Zwich withdrawal has been successfully deleted.",
      })

      setDeleteDialogOpen(false)
      setWithdrawalToDelete(null)
      loadWithdrawals() // Refresh withdrawal history
      refreshCashTill() // Refresh cash till balance
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete the withdrawal. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (withdrawal: EZwichWithdrawal) => {
    setEditingWithdrawal(withdrawal)
    editForm.reset({
      cardNumber: withdrawal.card_number,
      settlementAccountId: withdrawal.settlement_account_id,
      customerName: withdrawal.customer_name,
      customerPhone: withdrawal.customer_phone,
      amount: withdrawal.amount,
      fee: withdrawal.fee,
      note: withdrawal.notes || "",
    })
    setShowEditDialog(true)
  }

  const getAccountDisplayName = (account: any) => {
    const accountType = account.account_type || "Unknown"
    const provider = account.provider || "Unknown Provider"
    const balance = Number(account.current_balance || 0).toFixed(2)
    return `${accountType} - ${provider} (GHS ${balance})`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            E-Zwich Withdrawal
          </CardTitle>
          <CardDescription>Process E-Zwich card withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Zwich Card Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter card number" {...field} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settlementAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Settlement Account *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingAccounts}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingAccounts ? "Loading..." : "Select settlement account"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ezwichAccounts.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No E-Zwich settlement accounts found
                            </SelectItem>
                          ) : (
                            ezwichAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {getAccountDisplayName(account)}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., +233 24 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Withdrawal Amount (GHS) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Fee (GHS) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="5.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Any additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Withdrawal...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Process E-Zwich Withdrawal
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Cash in Till Display */}
      {cashAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cash in Till</span>
              <Button variant="outline" size="sm" onClick={refreshCashTill} disabled={isCashLoading}>
                <RefreshCw className={`h-4 w-4 ${isCashLoading ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              GHS {Number(cashAccount.current_balance || 0).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Available for E-Zwich transactions</p>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Withdrawals</span>
            <Button variant="outline" size="sm" onClick={loadWithdrawals} disabled={loadingWithdrawals}>
              <RefreshCw className={`h-4 w-4 ${loadingWithdrawals ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Card Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingWithdrawals ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-muted-foreground mt-2">Loading withdrawals...</p>
                  </TableCell>
                </TableRow>
              ) : withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No withdrawals found
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono">{withdrawal.card_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{withdrawal.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{withdrawal.customer_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>GHS {withdrawal.amount.toFixed(2)}</TableCell>
                    <TableCell>GHS {withdrawal.fee.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={withdrawal.status === "completed" ? "default" : "secondary"}>
                        {withdrawal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(withdrawal)}
                          disabled={isSubmitting}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setWithdrawalToDelete(withdrawal.id)
                            setDeleteDialogOpen(true)
                          }}
                          disabled={isSubmitting}
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit E-Zwich Withdrawal</DialogTitle>
            <DialogDescription>Update the withdrawal details below.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditWithdrawal)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter card number" {...field} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (GHS)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee (GHS)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="5.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Any additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Withdrawal"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Withdrawal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this E-Zwich withdrawal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false)
                setWithdrawalToDelete(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (withdrawalToDelete) {
                  handleDeleteWithdrawal(withdrawalToDelete)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
