"use client"

import { useState } from "react"
import { ArrowUpDown, ChevronDown, ChevronRight, Trash2, Edit, Ban } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DeleteAccountDialogFixed } from "./delete-account-dialog-fixed"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useToast } from "@/hooks/use-toast"
import { canManageFloat, canDeleteFloat } from "@/lib/rbac-utils"

interface FloatAccount {
  id: string
  provider: string
  current_balance: number | string
  min_threshold: number | string
  max_threshold: number | string
  branch_id: string
  branch_name?: string
  branchName?: string
  is_active: boolean
  account_type: string
  account_number?: string
  isEzwichPartner?: boolean
  created_at?: string
  updated_at?: string
}

interface FloatAllocationTableProps {
  floatAccounts: FloatAccount[]
  onEditClick?: (account: FloatAccount) => void
  onAccountDeleted?: () => void
  groupBy: "none" | "branch" | "service"
  canManageFloat?: boolean
  canDeleteFloat?: boolean
}

export function FloatAllocationTable({
  floatAccounts,
  onEditClick,
  onAccountDeleted,
  groupBy = "none",
  canManageFloat: canManageFloatProp = true,
  canDeleteFloat: canDeleteFloatProp = true,
}: FloatAllocationTableProps) {
  const { user } = useCurrentUser()
  const { toast } = useToast()
  const [sortBy, setSortBy] = useState<string>("branchName")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [accountToDelete, setAccountToDelete] = useState<FloatAccount | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Use the utility functions to check permissions
  const actualCanManage = canManageFloat(user?.role)
  const actualCanDelete = canDeleteFloat(user?.role)
  const isAdmin = user?.role === "admin"

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const handleEditClick = (account: FloatAccount) => {
    console.log("Edit button clicked for account:", account.id)
    if (onEditClick && actualCanManage) {
      // Pass the full account object to the edit handler
      onEditClick(account)
    } else {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit accounts",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (account: FloatAccount) => {
    console.log("Delete button clicked for account:", account.id)
    if (isAdmin) {
      // Admin can delete permanently
      setAccountToDelete(account)
      setDeleteDialogOpen(true)
    } else if (actualCanManage) {
      // Manager/Finance can only deactivate
      handleDeactivateAccount(account)
    } else {
      toast({
        title: "Access Denied",
        description: "You don't have permission to modify accounts",
        variant: "destructive",
      })
    }
  }

  const handleDeactivateAccount = async (account: FloatAccount) => {
    try {
      const response = await fetch(`/api/float-accounts/${account.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to deactivate account")
      }

      toast({
        title: "Account Deactivated",
        description: "The account has been deactivated successfully",
      })

      if (onAccountDeleted) {
        onAccountDeleted()
      }
    } catch (error) {
      console.error("Deactivate error:", error)
      toast({
        title: "Deactivation Failed",
        description: error instanceof Error ? error.message : "Failed to deactivate the account",
        variant: "destructive",
      })
    }
  }

  const handleDeleteConfirm = async (force = false) => {
    if (!accountToDelete) return

    setIsDeleting(true)
    try {
      const url = `/api/float-accounts/${accountToDelete.id}${force ? "?force=true" : ""}`
      const response = await fetch(url, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account")
      }

      toast({
        title: "Success",
        description: data.message || "Account deleted successfully",
      })

      // Close dialog and reset state
      setDeleteDialogOpen(false)
      setAccountToDelete(null)

      // Refresh the table
      if (onAccountDeleted) {
        onAccountDeleted()
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete the account",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  // Sort accounts
  const sortedAccounts = [...floatAccounts].sort((a, b) => {
    const aValue = a[sortBy as keyof FloatAccount]
    const bValue = b[sortBy as keyof FloatAccount]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  // Group accounts if needed
  const groupedAccounts = (() => {
    if (groupBy === "none") {
      return { "": sortedAccounts }
    }

    return sortedAccounts.reduce<Record<string, FloatAccount[]>>((groups, account) => {
      const groupKey =
        groupBy === "branch"
          ? account.branchName || account.branch_name || "Unknown"
          : getServiceLabel(account.account_type, account.provider)

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }

      groups[groupKey].push(account)
      return groups
    }, {})
  })()

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Invalid date"
      return date.toLocaleDateString("en-GH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "Invalid date"
    }
  }

  const getFloatStatus = (current: number, min: number, max: number) => {
    if (current < min) {
      return { label: "Critical", color: "destructive", percentage: (current / max) * 100 }
    } else if (current < min * 1.5) {
      return { label: "Low", color: "warning", percentage: (current / max) * 100 }
    } else if (current > max) {
      return { label: "Excess", color: "secondary", percentage: 100 }
    } else {
      return { label: "Healthy", color: "success", percentage: (current / max) * 100 }
    }
  }

  const getServiceLabel = (serviceType: string, provider?: string | null) => {
    switch (serviceType?.toLowerCase()) {
      case "momo":
        return `Mobile Money${provider ? ` (${provider})` : ""}`
      case "agency-banking":
        return `Agency Banking${provider ? ` (${provider})` : ""}`
      case "ezwich":
      case "e-zwich":
        return "E-Zwich"
      case "cash-in-till":
        return "Cash in Till"
      case "jumia":
        return "Jumia"
      case "power":
        return `Power${provider ? ` (${provider})` : ""}`
      case "gmoney":
        return `G-Money${provider ? ` (${provider})` : ""}`
      case "zpay":
        return `ZPay${provider ? ` (${provider})` : ""}`
      default:
        return serviceType ? serviceType.charAt(0).toUpperCase() + serviceType.slice(1).replace(/-/g, " ") : "Unknown"
    }
  }

  const transformAccount = (account: FloatAccount) => {
    return {
      id: account.id,
      provider: account.provider,
      currentBalance: Number.parseFloat(String(account.current_balance)) || 0,
      minThreshold: Number.parseFloat(String(account.min_threshold)) || 0,
      maxThreshold: Number.parseFloat(String(account.max_threshold)) || 0,
      branchId: account.branch_id,
      branchName: account.branchName || account.branch_name || `Branch ${account.branch_id?.slice(-4) || "Unknown"}`,
      isActive: account.is_active,
      accountType: account.account_type,
      createdAt: account.created_at,
      lastUpdated: account.updated_at,
      accountNumber: account.account_number,
      isEzwichPartner: account.isEzwichPartner,
    }
  }

  function renderAccountRow(account: FloatAccount) {
    const transformedAccount = transformAccount(account)
    const floatStatus = getFloatStatus(
      transformedAccount.currentBalance,
      transformedAccount.minThreshold,
      transformedAccount.maxThreshold,
    )
    const floatPercentage = Math.round(floatStatus.percentage)
    const isCashInTill = transformedAccount.accountType === "cash-in-till"

    return (
      <TableRow key={transformedAccount.id} className={groupBy !== "none" ? "bg-background" : undefined}>
        {groupBy !== "none" && <TableCell></TableCell>}
        <TableCell className={`font-medium ${groupBy === "branch" ? "hidden" : ""}`}>
          <div className="flex flex-col">
            <span>{transformedAccount.branchName}</span>
            {transformedAccount.isEzwichPartner && (
              <Badge variant="outline" className="text-xs w-fit mt-1">
                E-Zwich Partner
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className={groupBy === "service" ? "hidden" : ""}>
          {getServiceLabel(transformedAccount.accountType, transformedAccount.provider)}
        </TableCell>
        <TableCell>{isCashInTill ? "-" : transformedAccount.provider || "-"}</TableCell>
        <TableCell className="text-right">
          {transformedAccount.currentBalance.toLocaleString("en-GH", { style: "currency", currency: "GHS" })}
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Badge variant={floatStatus.color as any}>{floatStatus.label}</Badge>
              <span className="text-xs font-medium">{floatPercentage}%</span>
            </div>
            <Progress value={floatPercentage} className="h-2" />
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Badge variant={transformedAccount.isActive ? "default" : "secondary"}>
              {transformedAccount.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span className="text-xs text-muted-foreground">{formatDate(transformedAccount.lastUpdated)}</span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            {actualCanManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditClick(account)}
                className="h-8 w-8 p-0"
                title="Edit Account"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}

            {/* Show different buttons based on role */}
            {isAdmin ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(account)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Delete Account (Admin Only)"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : actualCanManage ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(account)}
                className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                title="Deactivate Account"
                disabled={!transformedAccount.isActive}
              >
                <Ban className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="h-8 w-8 p-0 text-muted-foreground"
                title="No Permission"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {groupBy !== "none" && <TableHead className="w-[30px]"></TableHead>}
              <TableHead className={groupBy === "branch" ? "hidden" : "w-[180px]"}>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("branchName")}
                  className="flex items-center gap-1 p-0 hover:bg-transparent"
                >
                  Branch
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className={groupBy === "service" ? "hidden" : ""}>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("serviceType")}
                  className="flex items-center gap-1 p-0 hover:bg-transparent"
                >
                  Service Type
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Provider</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("currentBalance")}
                  className="flex items-center gap-1 p-0 hover:bg-transparent"
                >
                  Current Balance
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active Status</TableHead>
              <TableHead className="text-right">Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedAccounts).length === 0 ? (
              <TableRow>
                <TableCell colSpan={groupBy !== "none" ? 9 : 8} className="h-24 text-center">
                  No float accounts found
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedAccounts).map(([groupName, accounts]) => {
                if (groupBy === "none") {
                  return accounts.map((account) => renderAccountRow(account))
                }

                const isExpanded = expandedGroups[groupName] ?? true

                return (
                  <Collapsible key={groupName} open={isExpanded} onOpenChange={() => {}}>
                    <TableRow className="bg-muted/50 hover:bg-muted">
                      <TableCell>
                        <CollapsibleTrigger asChild onClick={() => toggleGroup(groupName)}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell colSpan={2} className="font-medium">
                        {groupName} ({accounts.length} {accounts.length === 1 ? "account" : "accounts"})
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-medium">
                        {accounts
                          .reduce((sum, acc) => sum + (Number.parseFloat(String(acc.current_balance)) || 0), 0)
                          .toLocaleString("en-GH", { style: "currency", currency: "GHS" })}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <>{accounts.map((account) => renderAccountRow(account))}</>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteAccountDialogFixed
        account={accountToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  )
}
