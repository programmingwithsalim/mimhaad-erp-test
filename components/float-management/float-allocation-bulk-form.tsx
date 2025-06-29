"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Filter, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FloatAllocation {
  id: string
  branchId: string
  serviceType: string
  provider?: string
  currentBalance: number
  maxThreshold: number
  minThreshold: number
  lastUpdated: string
}

interface FloatAllocationBulkFormProps {
  onSubmit: (allocations: any[]) => void
  onCancel: () => void
  floatAccounts: FloatAllocation[]
}

export function FloatAllocationBulkForm({ onSubmit, onCancel, floatAccounts }: FloatAllocationBulkFormProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [filterBranch, setFilterBranch] = useState<string>("all")
  const [filterService, setFilterService] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [allocations, setAllocations] = useState<Record<string, { amount: string; notes: string }>>({})
  const [bulkAmount, setBulkAmount] = useState<string>("")
  const [bulkNotes, setBulkNotes] = useState<string>("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get unique branches
  const branches = Array.from(new Set(floatAccounts.map((a) => a.branchId)))

  // Get unique services
  const services = Array.from(new Set(floatAccounts.map((a) => a.serviceType)))

  // Filter accounts
  const filteredAccounts = floatAccounts.filter((account) => {
    if (filterBranch !== "all" && account.branchId !== filterBranch) return false
    if (filterService !== "all" && account.serviceType !== filterService) return false

    if (filterStatus === "low") {
      return account.currentBalance < account.minThreshold
    } else if (filterStatus === "high") {
      return account.currentBalance > account.maxThreshold
    } else if (filterStatus === "normal") {
      return account.currentBalance >= account.minThreshold && account.currentBalance <= account.maxThreshold
    }

    return true
  })

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAccounts(filteredAccounts.map((a) => a.id))
    } else {
      setSelectedAccounts([])
    }
  }

  // Handle individual selection
  const handleSelectAccount = (accountId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts((prev) => [...prev, accountId])
    } else {
      setSelectedAccounts((prev) => prev.filter((id) => id !== accountId))
    }
  }

  // Handle allocation amount change
  const handleAllocationChange = (accountId: string, value: string) => {
    setAllocations((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        amount: value,
      },
    }))

    // Clear error if exists
    if (errors[accountId]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[accountId]
        return newErrors
      })
    }
  }

  // Handle allocation notes change
  const handleNotesChange = (accountId: string, value: string) => {
    setAllocations((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        notes: value,
      },
    }))
  }

  // Apply bulk values to selected accounts
  const applyBulkValues = () => {
    if (!bulkAmount) return

    const newAllocations = { ...allocations }

    selectedAccounts.forEach((accountId) => {
      newAllocations[accountId] = {
        amount: bulkAmount,
        notes: bulkNotes || newAllocations[accountId]?.notes || "",
      }
    })

    setAllocations(newAllocations)
  }

  // Handle form submission
  const handleSubmit = () => {
    // Validate allocations
    const newErrors: Record<string, string> = {}
    let hasErrors = false

    selectedAccounts.forEach((accountId) => {
      const allocation = allocations[accountId]

      if (!allocation || !allocation.amount) {
        newErrors[accountId] = "Amount is required"
        hasErrors = true
        return
      }

      const amount = Number.parseFloat(allocation.amount)
      if (isNaN(amount) || amount <= 0) {
        newErrors[accountId] = "Amount must be a positive number"
        hasErrors = true
      }
    })

    if (hasErrors) {
      setErrors(newErrors)
      return
    }

    // Prepare data for submission
    const allocationData = selectedAccounts.map((accountId) => {
      const allocation = allocations[accountId]
      return {
        accountId,
        amount: Number.parseFloat(allocation.amount),
        notes: allocation.notes || "",
      }
    })

    console.log("Submitting bulk allocations:", allocationData)
    onSubmit(allocationData)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-GH", { style: "currency", currency: "GHS" })
  }

  // Get account status
  const getAccountStatus = (account: FloatAllocation) => {
    if (account.currentBalance < account.minThreshold) {
      return { label: "Low", variant: "destructive" }
    } else if (account.currentBalance > account.maxThreshold) {
      return { label: "Excess", variant: "secondary" }
    } else {
      return { label: "Normal", variant: "default" }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="space-y-2 flex-1">
          <Label htmlFor="bulkAmount">Bulk Amount (GHS)</Label>
          <Input
            id="bulkAmount"
            type="number"
            step="0.01"
            min="0"
            value={bulkAmount}
            onChange={(e) => setBulkAmount(e.target.value)}
            placeholder="Enter amount to apply to all selected accounts"
          />
        </div>

        <div className="space-y-2 flex-1">
          <Label htmlFor="bulkNotes">Bulk Notes</Label>
          <div className="flex gap-2">
            <Input
              id="bulkNotes"
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              placeholder="Notes to apply to all selected accounts"
            />
            <Button type="button" onClick={applyBulkValues} disabled={!bulkAmount}>
              Apply
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {services.map((service) => (
              <SelectItem key={service} value={service}>
                {service}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="low">Low Float</SelectItem>
            <SelectItem value="normal">Normal Float</SelectItem>
            <SelectItem value="high">Excess Float</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedAccounts.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {selectedAccounts.length} account{selectedAccounts.length !== 1 ? "s" : ""} selected for allocation
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={filteredAccounts.length > 0 && selectedAccounts.length === filteredAccounts.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Current Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Allocation Amount</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No accounts found matching the filters
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => {
                const status = getAccountStatus(account)
                const isSelected = selectedAccounts.includes(account.id)

                return (
                  <TableRow key={account.id} className={isSelected ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectAccount(account.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>{account.branchId}</TableCell>
                    <TableCell>{account.serviceType}</TableCell>
                    <TableCell>{account.provider || "-"}</TableCell>
                    <TableCell>{formatCurrency(account.currentBalance)}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant as any}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-[120px]">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={allocations[account.id]?.amount || ""}
                          onChange={(e) => handleAllocationChange(account.id, e.target.value)}
                          disabled={!isSelected}
                          className={errors[account.id] ? "border-red-500" : ""}
                        />
                        {errors[account.id] && <p className="text-xs text-red-500 mt-1">{errors[account.id]}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        <Input
                          value={allocations[account.id]?.notes || ""}
                          onChange={(e) => handleNotesChange(account.id, e.target.value)}
                          disabled={!isSelected}
                          className="w-[200px]"
                        />
                        {isSelected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSelectAccount(account.id, false)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            console.log("Bulk allocate button clicked", selectedAccounts.length, "accounts selected")
            handleSubmit()
          }}
          disabled={selectedAccounts.length === 0}
        >
          Allocate to {selectedAccounts.length} Account{selectedAccounts.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  )
}
