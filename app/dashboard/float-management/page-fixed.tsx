"use client"

import { useState } from "react"
import { Plus, RefreshCw, Download, AlertTriangle, TrendingUp, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BranchIndicator } from "@/components/branch/branch-indicator"
import { FloatAllocationTable } from "@/components/float-management/float-allocation-table"
import { EnhancedCreateAccountForm } from "@/components/float-management/enhanced-create-account-form"
import { EditAccountModal } from "@/components/float-management/edit-account-modal"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useFloatAccountsFixed } from "@/hooks/use-float-accounts-fixed"
import { canManageFloat, canDeleteFloat, canViewAllBranches } from "@/lib/rbac-utils"

export default function FloatManagementFixed() {
  const { user } = useCurrentUser()
  const { accounts, loading, error, refetch, statistics } = useFloatAccountsFixed()

  // Check user permissions
  const canManageFloatAccounts = canManageFloat(user?.role)
  const canDeleteFloatAccounts = canDeleteFloat(user?.role)
  const canViewAllBranchesData = canViewAllBranches(user?.role)

  // State for modals and forms
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [groupBy, setGroupBy] = useState("none")

  // Filter accounts based on search and filters
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.account_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.branch_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = filterType === "all" || account.account_type === filterType
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && account.is_active) ||
      (filterStatus === "inactive" && !account.is_active)

    return matchesSearch && matchesType && matchesStatus
  })

  // Handle account edit
  const handleEditClick = (account) => {
    setSelectedAccount(account)
    setShowEditModal(true)
  }

  // Handle account deletion
  const handleAccountDeleted = () => {
    refetch()
  }

  // Handle account creation
  const handleAccountCreated = () => {
    refetch()
  }

  // Handle account update
  const handleAccountUpdated = () => {
    refetch()
    setShowEditModal(false)
    setSelectedAccount(null)
  }

  // Export accounts data
  const handleExport = () => {
    if (!filteredAccounts.length) return

    const csvData = filteredAccounts.map((account) => ({
      Branch: account.branch_name || "",
      "Service Type": account.account_type || "",
      Provider: account.provider || "",
      "Account Number": account.account_number || "",
      "Current Balance": account.current_balance || 0,
      "Min Threshold": account.min_threshold || 0,
      "Max Threshold": account.max_threshold || 0,
      Status: account.is_active ? "Active" : "Inactive",
      "Last Updated": account.updated_at || "",
    }))

    const csv = [Object.keys(csvData[0]).join(","), ...csvData.map((row) => Object.values(row).join(","))].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `float-accounts-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("")
    setFilterType("all")
    setFilterStatus("all")
    setGroupBy("none")
  }

  // Get unique service types for filter
  const serviceTypes = Array.from(new Set(accounts.map((account) => account.account_type)))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Float Management</h1>
            <p className="text-muted-foreground">Loading float accounts...</p>
          </div>
          <BranchIndicator />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Float Management</h1>
          <p className="text-muted-foreground">
            {canViewAllBranchesData
              ? "Manage float accounts and balances across all services and branches"
              : "Manage float accounts and balances for your branch across all services"}
          </p>
        </div>
        <BranchIndicator />
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading float accounts: {error.message}
            <Button variant="outline" size="sm" onClick={refetch} className="ml-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!loading && !error && accounts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Float Accounts Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first float account to manage balances across services.
            </p>
            {canManageFloatAccounts && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Account
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {accounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalAccounts}</div>
              <p className="text-xs text-muted-foreground">
                {filteredAccounts.length !== statistics.totalAccounts && `${filteredAccounts.length} filtered`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalBalance.toLocaleString("en-GH", {
                  style: "currency",
                  currency: "GHS",
                })}
              </div>
              <p className="text-xs text-muted-foreground">Combined float balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Accounts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statistics.criticalAccounts}</div>
              <p className="text-xs text-muted-foreground">Below minimum threshold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Accounts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{statistics.lowAccounts}</div>
              <p className="text-xs text-muted-foreground">Below 150% of minimum</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      {accounts.length > 0 && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="branch">By Branch</SelectItem>
                <SelectItem value="service">By Service</SelectItem>
              </SelectContent>
            </Select>

            {(filterType !== "all" || filterStatus !== "all" || searchQuery) && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            {canManageFloatAccounts && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Float Accounts Table */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Float Accounts</CardTitle>
            <CardDescription>Manage float accounts across all services and branches</CardDescription>
          </CardHeader>
          <CardContent>
            <FloatAllocationTable
              floatAccounts={filteredAccounts}
              onEditClick={canManageFloatAccounts ? handleEditClick : undefined}
              onAccountDeleted={handleAccountDeleted}
              groupBy={groupBy}
              canManageFloat={canManageFloatAccounts}
              canDeleteFloat={canDeleteFloatAccounts}
            />
          </CardContent>
        </Card>
      )}

      {/* Create Account Modal */}
      {canManageFloatAccounts && (
        <EnhancedCreateAccountForm
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={handleAccountCreated}
        />
      )}

      {/* Edit Account Modal */}
      {canManageFloatAccounts && (
        <EditAccountModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          account={selectedAccount}
          onSuccess={handleAccountUpdated}
        />
      )}
    </div>
  )
}
