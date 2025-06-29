"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useBranches } from "@/hooks/use-branches"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface FloatAccount {
  id: string
  branchId: string
  branchName: string
  serviceType: string
  provider?: string
  currentBalance: number
  maxThreshold: number
  minThreshold: number
  lastUpdated: string
}

interface FloatAllocationFormProps {
  floatAccounts: FloatAccount[]
  onSubmit: (data: any) => void
  onCancel: () => void
  selectedAccountId?: string | null
}

export function FloatAllocationForm({
  floatAccounts,
  onSubmit,
  onCancel,
  selectedAccountId = null,
}: FloatAllocationFormProps) {
  const { toast } = useToast()
  const { branches, isLoading: branchesLoading } = useBranches()

  const [accountId, setAccountId] = useState(selectedAccountId || "")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedService, setSelectedService] = useState("")
  const [selectedProvider, setSelectedProvider] = useState("")
  const [filteredAccounts, setFilteredAccounts] = useState<FloatAccount[]>(floatAccounts)

  // Set initial values if an account is selected
  useEffect(() => {
    if (selectedAccountId) {
      setAccountId(selectedAccountId)
      const account = floatAccounts.find((a) => a.id === selectedAccountId)
      if (account) {
        setSelectedBranch(account.branchId)
        setSelectedService(account.serviceType)
        if (account.provider) {
          setSelectedProvider(account.provider)
        }
      }
    }
  }, [selectedAccountId, floatAccounts])

  // Filter accounts based on selected branch, service, and provider
  useEffect(() => {
    let filtered = [...floatAccounts]

    if (selectedBranch && selectedBranch !== "all") {
      filtered = filtered.filter((account) => account.branchId === selectedBranch)
    }

    if (selectedService && selectedService !== "all") {
      filtered = filtered.filter((account) => account.serviceType === selectedService)
    }

    if (selectedProvider && selectedProvider !== "all") {
      filtered = filtered.filter((account) => account.provider === selectedProvider)
    }

    setFilteredAccounts(filtered)

    // If the current accountId is not in the filtered list, reset it
    if (accountId && !filtered.some((account) => account.id === accountId)) {
      setAccountId("")
    }
  }, [selectedBranch, selectedService, selectedProvider, floatAccounts, accountId])

  // Get unique service types
  const serviceTypes = Array.from(new Set(floatAccounts.map((account) => account.serviceType)))

  // Get unique providers based on selected service
  const providers = Array.from(
    new Set(
      floatAccounts
        .filter((account) => !selectedService || selectedService === "all" || account.serviceType === selectedService)
        .map((account) => account.provider)
        .filter(Boolean) as string[],
    ),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!accountId) {
      toast({
        title: "Error",
        description: "Please select an account",
        variant: "destructive",
      })
      return
    }

    const amountValue = Number.parseFloat(amount)
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      })
      return
    }

    onSubmit({
      accountId,
      amount: amountValue,
      notes,
    })
  }

  const clearFilter = (filterType: "branch" | "service" | "provider") => {
    if (filterType === "branch") {
      setSelectedBranch("")
    } else if (filterType === "service") {
      setSelectedService("")
      // Reset provider when service is cleared
      setSelectedProvider("")
    } else if (filterType === "provider") {
      setSelectedProvider("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Active filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedBranch && selectedBranch !== "all" && (
          <Badge variant="outline" className="flex items-center gap-1">
            Branch: {branches?.find((b) => b.id === selectedBranch)?.name || selectedBranch}
            <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => clearFilter("branch")}>
              <X className="h-3 w-3" />
              <span className="sr-only">Remove branch filter</span>
            </Button>
          </Badge>
        )}
        {selectedService && selectedService !== "all" && (
          <Badge variant="outline" className="flex items-center gap-1">
            Service: {selectedService.charAt(0).toUpperCase() + selectedService.slice(1)}
            <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => clearFilter("service")}>
              <X className="h-3 w-3" />
              <span className="sr-only">Remove service filter</span>
            </Button>
          </Badge>
        )}
        {selectedProvider && selectedProvider !== "all" && (
          <Badge variant="outline" className="flex items-center gap-1">
            Provider: {selectedProvider}
            <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => clearFilter("provider")}>
              <X className="h-3 w-3" />
              <span className="sr-only">Remove provider filter</span>
            </Button>
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="branch">Branch</Label>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger id="branch" disabled={branchesLoading}>
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches?.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service">Service Type</Label>
        <Select
          value={selectedService}
          onValueChange={(value) => {
            setSelectedService(value)
            // Reset provider when service changes
            setSelectedProvider("")
          }}
        >
          <SelectTrigger id="service">
            <SelectValue placeholder="Select service type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {serviceTypes.map((service) => (
              <SelectItem key={service} value={service}>
                {service.charAt(0).toUpperCase() + service.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {providers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {providers.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="account">Float Account</Label>
        <Select value={accountId} onValueChange={setAccountId} required>
          <SelectTrigger id="account">
            <SelectValue placeholder="Select float account" />
          </SelectTrigger>
          <SelectContent>
            {filteredAccounts.length === 0 ? (
              <SelectItem value="none" disabled>
                No accounts match your filters
              </SelectItem>
            ) : (
              filteredAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.branchName} - {account.serviceType}
                  {account.provider ? ` (${account.provider})` : ""} -
                  {new Intl.NumberFormat("en-GH", {
                    style: "currency",
                    currency: "GHS",
                  }).format(account.currentBalance)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (GHS)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter any additional notes"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Allocate Float</Button>
      </div>
    </form>
  )
}
