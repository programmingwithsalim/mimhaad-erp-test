"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Branch {
  id: string
  name: string
}

interface FloatAccount {
  id: string
  branch_id: string
  branch_name?: string
  account_type: string
  provider?: string | null
  account_number?: string | null
  current_balance: number
  min_threshold: number
  max_threshold: number
  last_updated: string
  created_by: string
  created_at: string
}

interface EditFloatAccountFormProps {
  accountId: string
}

export function EditFloatAccountForm({ accountId }: EditFloatAccountFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [account, setAccount] = useState<FloatAccount | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [branchId, setBranchId] = useState("")
  const [provider, setProvider] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [currentBalance, setCurrentBalance] = useState("")
  const [minThreshold, setMinThreshold] = useState("")
  const [maxThreshold, setMaxThreshold] = useState("")

  // Account type options
  const accountTypes = [
    { value: "momo", label: "Mobile Money", hasProvider: true, hasAccountNumber: true },
    { value: "agency-banking", label: "Agency Banking", hasProvider: true, hasAccountNumber: true },
    { value: "cash-in-till", label: "Cash in Till", hasProvider: false, hasAccountNumber: false },
    { value: "e-zwich", label: "E-Zwich", hasProvider: false, hasAccountNumber: true },
    { value: "jumia", label: "Jumia", hasProvider: false, hasAccountNumber: true },
    { value: "power", label: "Power", hasProvider: true, hasAccountNumber: false },
  ]

  // Provider options based on account type
  const getProviderOptions = (type: string) => {
    switch (type) {
      case "momo":
        return [
          { value: "MTN", label: "MTN Mobile Money" },
          { value: "Vodafone", label: "Vodafone Cash" },
          { value: "AirtelTigo", label: "AirtelTigo Money" },
        ]
      case "agency-banking":
        return [
          { value: "Ecobank", label: "Ecobank" },
          { value: "GCB", label: "GCB Bank" },
          { value: "Absa", label: "Absa Bank" },
          { value: "Stanbic", label: "Stanbic Bank" },
        ]
      case "power":
        return [
          { value: "ECG", label: "Electricity Company of Ghana" },
          { value: "VRA", label: "Volta River Authority" },
          { value: "NEDCo", label: "Northern Electricity Distribution Company" },
        ]
      default:
        return []
    }
  }

  // Fetch float account and branches
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch float account
        const accountResponse = await fetch(`/api/float-accounts/${accountId}`)
        if (!accountResponse.ok) {
          throw new Error("Failed to fetch float account")
        }
        const accountData = await accountResponse.json()
        setAccount(accountData)

        // Set form values with safe defaults
        setBranchId(accountData.branch_id || "")
        setProvider(accountData.provider || "")
        setAccountNumber(accountData.account_number || "")

        // Safely convert numeric values to strings with fallbacks
        setCurrentBalance(accountData.current_balance != null ? accountData.current_balance.toString() : "0")
        setMinThreshold(accountData.min_threshold != null ? accountData.min_threshold.toString() : "0")
        setMaxThreshold(accountData.max_threshold != null ? accountData.max_threshold.toString() : "0")

        // Fetch branches
        const branchesResponse = await fetch("/api/branches")
        if (!branchesResponse.ok) {
          throw new Error("Failed to fetch branches")
        }
        const branchesData = await branchesResponse.json()
        setBranches(branchesData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: `Failed to load float account data: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId, toast])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!account) return

    try {
      setSaving(true)

      // Validate thresholds
      const minThresholdValue = Number.parseFloat(minThreshold || "0")
      const maxThresholdValue = Number.parseFloat(maxThreshold || "0")
      const currentBalanceValue = Number.parseFloat(currentBalance || "0")

      if (minThresholdValue >= maxThresholdValue) {
        toast({
          title: "Validation Error",
          description: "Minimum threshold must be less than maximum threshold",
          variant: "destructive",
        })
        return
      }

      if (currentBalanceValue < 0) {
        toast({
          title: "Validation Error",
          description: "Current balance cannot be negative",
          variant: "destructive",
        })
        return
      }

      // Prepare update data
      const updateData = {
        branch_id: branchId,
        current_balance: currentBalanceValue,
        min_threshold: minThresholdValue,
        max_threshold: maxThresholdValue,
      }

      // Add provider and account number if applicable
      const accountTypeInfo = accountTypes.find((t) => t.value === account.account_type)

      if (accountTypeInfo?.hasProvider) {
        updateData.provider = provider
      }

      if (accountTypeInfo?.hasAccountNumber) {
        updateData.account_number = accountNumber
      }

      // Send update request
      const response = await fetch(`/api/float-accounts/${accountId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update float account")
      }

      toast({
        title: "Success",
        description: "Float account updated successfully",
      })

      // Redirect back to accounts list
      router.push("/dashboard/float-management/accounts")
      router.refresh()
    } catch (error) {
      console.error("Error updating float account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update float account",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading account data...</span>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-2">Account Not Found</h2>
        <p className="mb-4">The float account you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => router.push("/dashboard/float-management/accounts")}>Back to Accounts</Button>
      </div>
    )
  }

  const accountTypeInfo = accountTypes.find((t) => t.value === account.account_type)
  const showProvider = accountTypeInfo?.hasProvider
  const showAccountNumber = accountTypeInfo?.hasAccountNumber

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Float Account</CardTitle>
        <CardDescription>
          Update the details for your {accountTypeInfo?.label || account.account_type} account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type</Label>
            <Input id="accountType" value={accountTypeInfo?.label || account.account_type} disabled />
            <p className="text-sm text-muted-foreground">Account type cannot be changed after creation</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger id="branchId">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showProvider && (
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {getProviderOptions(account.account_type).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showAccountNumber && (
            <div className="space-y-2">
              <Label htmlFor="accountNumber">
                {account.account_type === "momo" ? "Phone Number" : "Account Number"}
              </Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={account.account_type === "momo" ? "Enter phone number" : "Enter account number"}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentBalance">Current Balance (GHS)</Label>
            <Input
              id="currentBalance"
              type="number"
              step="0.01"
              min="0"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minThreshold">Minimum Threshold (GHS)</Label>
              <Input
                id="minThreshold"
                type="number"
                step="0.01"
                min="0"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Minimum balance before alerts are triggered</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxThreshold">Maximum Threshold (GHS)</Label>
              <Input
                id="maxThreshold"
                type="number"
                step="0.01"
                min="0"
                value={maxThreshold}
                onChange={(e) => setMaxThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Maximum recommended balance for this account</p>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/float-management/accounts")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
