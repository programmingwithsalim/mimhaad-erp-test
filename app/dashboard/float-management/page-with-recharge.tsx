"use client"

import { useState, useCallback, useEffect } from "react"
import { Plus, RefreshCw, AlertTriangle, TrendingUp, DollarSign, Activity, Edit, Trash2, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/currency"
import { useCurrentUser } from "@/hooks/use-current-user"
import { BranchIndicator } from "@/components/shared/branch-indicator"
import { useBranchFloatAccountsFixed } from "@/hooks/use-branch-float-accounts-fixed"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateFloatAccountModal } from "@/components/float-management/create-float-account-modal"
import { EditFloatAccountModal } from "@/components/float-management/edit-float-account-modal"
import { DeleteAccountDialog } from "@/components/float-management/delete-account-dialog"
import { FloatRechargeDialog } from "@/components/float-management/float-recharge-dialog"

interface FloatAccount {
  id: string
  provider: string
  account_type: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  is_active: boolean
  branch_id: string
  last_updated: string
  created_at: string
  isEzwichPartner?: boolean
}

interface FloatStatistics {
  totalBalance: number
  totalAccounts: number
  activeAccounts: number
  lowBalanceAccounts: number
  totalAllocated: number
  totalAvailable: number
}

// Safe number formatting function
const safeFormatCurrency = (value: any): string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "0.00"
  }
  return formatCurrency(Number(value))
}

export default function FloatManagementPageWithRecharge() {
  const { toast } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<FloatAccount | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<FloatAccount | null>(null)
  const [rechargingAccount, setRechargingAccount] = useState<FloatAccount | null>(null)
  const [statistics, setStatistics] = useState<FloatStatistics | null>(null)

  // Get current user info
  const { user } = useCurrentUser()
  const branchId = user?.branchId || ""

  // Use hooks for account data
  const {
    accounts: floatAccounts,
    loading: isLoadingAccounts,
    error: accountsError,
    refetch: refreshAccounts,
  } = useBranchFloatAccountsFixed()

  // Calculate statistics from accounts
  useEffect(() => {
    if (floatAccounts.length > 0) {
      const stats: FloatStatistics = {
        totalBalance: floatAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0),
        totalAccounts: floatAccounts.length,
        activeAccounts: floatAccounts.filter((acc) => acc.is_active).length,
        lowBalanceAccounts: floatAccounts.filter((acc) => acc.current_balance < acc.min_threshold && acc.is_active)
          .length,
        totalAllocated: floatAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0),
        totalAvailable: floatAccounts.reduce((sum, acc) => (acc.is_active ? sum + (acc.current_balance || 0) : sum), 0),
      }
      setStatistics(stats)
    }
  }, [floatAccounts])

  // Refresh all data
  const refreshData = useCallback(() => {
    refreshAccounts()
  }, [refreshAccounts])

  // Handle account creation success
  const handleAccountCreated = () => {
    setShowCreateModal(false)
    refreshData()
    toast({
      title: "Account Created",
      description: "Float account has been created successfully.",
    })
  }

  // Handle account update success
  const handleAccountUpdated = () => {
    setEditingAccount(null)
    refreshData()
    toast({
      title: "Account Updated",
      description: "Float account has been updated successfully.",
    })
  }

  // Handle account deletion success
  const handleAccountDeleted = () => {
    setDeletingAccount(null)
    refreshData()
    toast({
      title: "Account Deleted",
      description: "Float account has been deleted successfully.",
    })
  }

  // Handle recharge success
  const handleRechargeSuccess = () => {
    setRechargingAccount(null)
    refreshData()
  }

  // Handle edit button click
  const handleEditClick = (account: FloatAccount) => {
    setEditingAccount(account)
  }

  // Handle delete button click
  const handleDeleteClick = (account: FloatAccount) => {
    setDeletingAccount(account)
  }

  // Handle recharge button click
  const handleRechargeClick = (account: FloatAccount) => {
    setRechargingAccount(account)
  }

  // Statistics cards data
  const statsCards = [
    {
      title: "Total Balance",
      value: safeFormatCurrency(statistics?.totalBalance || 0),
      icon: DollarSign,
      description: "Across all accounts",
      trend: statistics?.totalBalance && statistics.totalBalance > 0 ? "up" : "neutral",
    },
    {
      title: "Active Accounts",
      value: `${statistics?.activeAccounts || 0}/${statistics?.totalAccounts || 0}`,
      icon: Activity,
      description: "Currently active",
      trend: "neutral",
    },
    {
      title: "Low Balance Alerts",
      value: statistics?.lowBalanceAccounts || 0,
      icon: AlertTriangle,
      description: "Below minimum threshold",
      trend: statistics?.lowBalanceAccounts && statistics.lowBalanceAccounts > 0 ? "down" : "neutral",
    },
    {
      title: "Available Balance",
      value: safeFormatCurrency(statistics?.totalAvailable || 0),
      icon: TrendingUp,
      description: "Ready for allocation",
      trend: "up",
    },
  ]

  // Show loading or error state if user info is not available
  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Skeleton className="h-8 w-48 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading user information...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!branchId) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Branch Information Missing
              </CardTitle>
            </CardHeader>
            <CardContent className="text-red-700">
              <p>Your user account is not associated with a branch. Please contact your administrator.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Float Management - With Recharge</h1>
          <p className="text-muted-foreground">Manage and monitor float account balances with recharge functionality</p>
        </div>
        <div className="flex items-center gap-2">
          <BranchIndicator />
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {accountsError && (
        <div className="mb-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Account Loading Error
              </CardTitle>
            </CardHeader>
            <CardContent className="text-red-700">
              <p className="text-sm">{accountsError}</p>
              <Button variant="outline" size="sm" onClick={refreshData} className="mt-2">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Float Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Float Accounts</CardTitle>
          <CardDescription>
            {floatAccounts.length} account{floatAccounts.length !== 1 ? "s" : ""} in your branch
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAccounts ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : floatAccounts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Float Accounts</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created any float accounts yet. Create your first account to get started.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Account
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Current Balance</TableHead>
                    <TableHead>Min Threshold</TableHead>
                    <TableHead>Max Threshold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {floatAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{account.provider}</div>
                          {account.isEzwichPartner && (
                            <Badge variant="secondary" className="text-xs">
                              E-Zwich Partner
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{account.account_type.replace("-", " ")}</TableCell>
                      <TableCell>
                        <div className="font-bold">GHS {safeFormatCurrency(account.current_balance)}</div>
                        {account.current_balance < account.min_threshold && (
                          <Badge variant="destructive" className="text-xs">
                            Low Balance
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>GHS {safeFormatCurrency(account.min_threshold)}</TableCell>
                      <TableCell>GHS {safeFormatCurrency(account.max_threshold)}</TableCell>
                      <TableCell>
                        <Badge variant={account.is_active ? "default" : "secondary"}>
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Recharge Button for MoMo, Agency Banking, and Power */}
                          {(account.account_type === "momo" ||
                            account.account_type === "agency-banking" ||
                            account.account_type === "power") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRechargeClick(account)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(account)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(account)}
                            className="text-red-600 hover:text-red-700"
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

      {/* Modals */}
      <CreateFloatAccountModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleAccountCreated}
      />

      {editingAccount && (
        <EditFloatAccountModal
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          account={editingAccount}
          onSuccess={handleAccountUpdated}
        />
      )}

      {deletingAccount && (
        <DeleteAccountDialog
          open={!!deletingAccount}
          onOpenChange={(open) => !open && setDeletingAccount(null)}
          account={deletingAccount}
          onSuccess={handleAccountDeleted}
        />
      )}

      {rechargingAccount && (
        <FloatRechargeDialog
          account={rechargingAccount}
          open={!!rechargingAccount}
          onOpenChange={(open) => !open && setRechargingAccount(null)}
          onSuccess={handleRechargeSuccess}
        />
      )}
    </div>
  )
}
