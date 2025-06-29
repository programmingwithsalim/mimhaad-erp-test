"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Plus, RefreshCw, Edit, Trash2, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { FloatRechargeDialog } from "@/components/float-management/float-recharge-dialog"
import { CreateFloatAccountModal } from "@/components/float-management/create-float-account-modal"
import { EditFloatAccountModal } from "@/components/float-management/edit-float-account-modal"
import { DeleteAccountDialog } from "@/components/float-management/delete-account-dialog"

interface FloatAccount {
  id: string
  account_type: string
  provider: string
  account_number?: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  is_active: boolean
  branch_name: string
  created_at: string
}

export default function FloatManagementPage() {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [floatAccounts, setFloatAccounts] = useState<FloatAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<FloatAccount | null>(null)
  const [isRechargeDialogOpen, setIsRechargeDialogOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const fetchFloatAccounts = async () => {
    try {
      setLoading(true)
      const url = user?.branchId ? `/api/float-accounts?branchId=${user.branchId}` : "/api/float-accounts"

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setFloatAccounts(data.accounts || [])
        }
      }
    } catch (error) {
      console.error("Error fetching float accounts:", error)
      toast({
        title: "Error",
        description: "Failed to load float accounts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFloatAccounts()
  }, [user?.branchId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount || 0)
  }

  const getAccountTypeLabel = (accountType: string, provider?: string) => {
    switch (accountType?.toLowerCase()) {
      case "momo":
        return `Mobile Money${provider ? ` (${provider})` : ""}`
      case "agency-banking":
        return `Agency Banking${provider ? ` (${provider})` : ""}`
      case "e-zwich":
        return "E-Zwich"
      case "cash-in-till":
        return "Cash in Till"
      case "power":
        return `Power${provider ? ` (${provider})` : ""}`
      default:
        return accountType || "Unknown"
    }
  }

  const getBalanceStatus = (account: FloatAccount) => {
    if (account.current_balance <= account.min_threshold) {
      return { status: "low", color: "destructive" }
    } else if (account.current_balance >= account.max_threshold) {
      return { status: "high", color: "warning" }
    }
    return { status: "normal", color: "default" }
  }

  const canRecharge = (accountType: string) => {
    return ["power"].includes(accountType?.toLowerCase())
  }

  const canDeposit = (accountType: string) => {
    return ["momo", "agency-banking", "cash-in-till"].includes(accountType?.toLowerCase())
  }

  const handleRecharge = (account: FloatAccount) => {
    setSelectedAccount(account)
    setIsRechargeDialogOpen(true)
  }

  const handleEdit = (account: FloatAccount) => {
    setSelectedAccount(account)
    setIsEditModalOpen(true)
  }

  const handleDelete = (account: FloatAccount) => {
    setSelectedAccount(account)
    setIsDeleteDialogOpen(true)
  }

  const handleSuccess = () => {
    fetchFloatAccounts()
    setIsRechargeDialogOpen(false)
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsDeleteDialogOpen(false)
    setSelectedAccount(null)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading float accounts...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Float Management</h1>
          <p className="text-muted-foreground">Manage your service float accounts and balances</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchFloatAccounts} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {floatAccounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No float accounts found</p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {floatAccounts.map((account) => {
            const balanceStatus = getBalanceStatus(account)
            return (
              <Card key={account.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {getAccountTypeLabel(account.account_type, account.provider)}
                      </CardTitle>
                      <CardDescription>{account.branch_name}</CardDescription>
                    </div>
                    <Badge variant={account.is_active ? "default" : "secondary"}>
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Current Balance</span>
                      <div className="flex items-center gap-1">
                        {account.current_balance <= account.min_threshold ? (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        ) : account.current_balance >= account.max_threshold ? (
                          <TrendingUp className="h-4 w-4 text-warning" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-green-600" />
                        )}
                        <span
                          className={`font-bold text-lg ${
                            balanceStatus.status === "low"
                              ? "text-destructive"
                              : balanceStatus.status === "high"
                                ? "text-warning"
                                : "text-green-600"
                          }`}
                        >
                          {formatCurrency(account.current_balance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Min: {formatCurrency(account.min_threshold)}</span>
                      <span className="text-muted-foreground">Max: {formatCurrency(account.max_threshold)}</span>
                    </div>

                    {account.account_number && (
                      <div className="text-sm text-muted-foreground">Account: {account.account_number}</div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {canRecharge(account.account_type) && (
                      <Button size="sm" variant="outline" onClick={() => handleRecharge(account)} className="flex-1">
                        <Plus className="h-4 w-4 mr-1" />
                        Recharge
                      </Button>
                    )}

                    {canDeposit(account.account_type) && (
                      <Button size="sm" variant="outline" onClick={() => handleRecharge(account)} className="flex-1">
                        <Plus className="h-4 w-4 mr-1" />
                        Deposit
                      </Button>
                    )}

                    <Button size="sm" variant="ghost" onClick={() => handleEdit(account)}>
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(account)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      <FloatRechargeDialog
        account={selectedAccount}
        open={isRechargeDialogOpen}
        onOpenChange={setIsRechargeDialogOpen}
        onSuccess={handleSuccess}
      />

      <CreateFloatAccountModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} onSuccess={handleSuccess} />

      <EditFloatAccountModal
        account={selectedAccount}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={handleSuccess}
      />

      <DeleteAccountDialog
        account={selectedAccount}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
