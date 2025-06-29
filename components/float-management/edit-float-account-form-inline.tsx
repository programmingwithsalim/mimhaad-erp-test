"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface FloatAccount {
  id: string
  branchId: string
  branchName: string
  accountType: string
  provider?: string
  accountNumber?: string
  currentBalance: number
  minThreshold: number
  maxThreshold: number
  lastUpdated: string
  isEzwichPartner?: boolean
}

interface EditFloatAccountFormInlineProps {
  account: FloatAccount
  onSuccess: () => void
  onCancel: () => void
}

export function EditFloatAccountFormInline({ account, onSuccess, onCancel }: EditFloatAccountFormInlineProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    provider: account.provider || "",
    accountNumber: account.accountNumber || "",
    currentBalance: (account.currentBalance ?? 0).toString(),
    minThreshold: (account.minThreshold ?? 0).toString(),
    maxThreshold: (account.maxThreshold ?? 0).toString(),
    isEzwichPartner: account.isEzwichPartner || false,
  })

  const accountTypes = [
    { value: "cash-in-till", label: "Cash in Till", hasProvider: false, hasAccountNumber: false },
    { value: "e-zwich", label: "E-Zwich Settlement", hasProvider: false, hasAccountNumber: true },
    { value: "power", label: "Electric Power", hasProvider: true, hasAccountNumber: false },
    { value: "momo", label: "Mobile Money", hasProvider: true, hasAccountNumber: true },
    { value: "agency-banking", label: "Agency Banking", hasProvider: true, hasAccountNumber: true },
    { value: "jumia", label: "Jumia", hasProvider: false, hasAccountNumber: true },
  ]

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
          { value: "Cal Bank", label: "Cal Bank" },
          { value: "Zenith Bank", label: "Zenith Bank" },
          { value: "Fidelity Bank", label: "Fidelity Bank" },
          { value: "Access Bank", label: "Access Bank" },
          { value: "UBA", label: "UBA" },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate thresholds
    const minThreshold = Number(formData.minThreshold)
    const maxThreshold = Number(formData.maxThreshold)
    const currentBalance = Number(formData.currentBalance)

    if (minThreshold < 0 || maxThreshold < minThreshold) {
      toast({
        title: "Validation Error",
        description: "Invalid threshold values",
        variant: "destructive",
      })
      return
    }

    if (currentBalance < 0) {
      toast({
        title: "Validation Error",
        description: "Current balance cannot be negative",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const accountTypeInfo = accountTypes.find((t) => t.value === account.accountType)

      const requestBody: any = {
        current_balance: currentBalance,
        min_threshold: minThreshold,
        max_threshold: maxThreshold,
      }

      // Add provider if applicable
      if (accountTypeInfo?.hasProvider) {
        requestBody.provider = formData.provider
      }

      // Add account number if applicable
      if (accountTypeInfo?.hasAccountNumber) {
        requestBody.account_number = formData.accountNumber
      }

      // Add isEzwichPartner for agency-banking accounts
      if (account.accountType === "agency-banking") {
        requestBody.isEzwichPartner = formData.isEzwichPartner
      }

      const response = await fetch(`/api/float-accounts/${account.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update float account")
      }

      toast({
        title: "Success",
        description: "Float account updated successfully",
      })

      onSuccess()
    } catch (error) {
      console.error("Error updating float account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update float account",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const accountTypeInfo = accountTypes.find((t) => t.value === account.accountType)
  const providerOptions = getProviderOptions(account.accountType)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="accountType">Account Type</Label>
        <Input id="accountType" value={accountTypeInfo?.label || account.accountType} disabled />
        <p className="text-sm text-muted-foreground">Account type cannot be changed after creation</p>
      </div>

      {accountTypeInfo?.hasProvider && (
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select
            value={formData.provider}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, provider: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providerOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {accountTypeInfo?.hasAccountNumber && (
        <div className="space-y-2">
          <Label htmlFor="accountNumber">{account.accountType === "momo" ? "Phone Number" : "Account Number"}</Label>
          <Input
            id="accountNumber"
            value={formData.accountNumber}
            onChange={(e) => setFormData((prev) => ({ ...prev, accountNumber: e.target.value }))}
            placeholder={account.accountType === "momo" ? "Enter phone number" : "Enter account number"}
          />
        </div>
      )}

      {/* E-Zwich Partner Checkbox - only show for agency-banking accounts */}
      {account.accountType === "agency-banking" && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isEzwichPartner"
            checked={formData.isEzwichPartner}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isEzwichPartner: !!checked }))}
          />
          <Label
            htmlFor="isEzwichPartner"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            E-Zwich Partner Account
          </Label>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="currentBalance">Current Balance (GHS)</Label>
        <Input
          id="currentBalance"
          type="number"
          step="0.01"
          min="0"
          value={formData.currentBalance}
          onChange={(e) => setFormData((prev) => ({ ...prev, currentBalance: e.target.value }))}
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
            value={formData.minThreshold}
            onChange={(e) => setFormData((prev) => ({ ...prev, minThreshold: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxThreshold">Maximum Threshold (GHS)</Label>
          <Input
            id="maxThreshold"
            type="number"
            step="0.01"
            min="0"
            value={formData.maxThreshold}
            onChange={(e) => setFormData((prev) => ({ ...prev, maxThreshold: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Account"
          )}
        </Button>
      </div>
    </form>
  )
}
