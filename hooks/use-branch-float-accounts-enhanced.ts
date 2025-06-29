"use client"

import { useState, useEffect, useCallback } from "react"
import { useCurrentUser } from "@/hooks/use-current-user"

interface FloatAccount {
  id: string
  branch_id: string
  branch_name?: string
  branchName?: string
  account_type: string
  provider: string
  account_number: string
  current_balance: number | string
  min_threshold: number | string
  max_threshold: number | string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useBranchFloatAccountsEnhanced() {
  const { user } = useCurrentUser()
  const [accounts, setAccounts] = useState<FloatAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [currentBranch, setCurrentBranch] = useState<string | null>(null)
  const [isFiltered, setIsFiltered] = useState(false)

  // Check if user can view all branches
  const canViewAllBranches = user?.role === "admin" || user?.role === "finance"

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()

      // Always add branch filter if user is not admin or finance
      if (!canViewAllBranches && user?.branchId) {
        params.append("branchId", user.branchId)
        setIsFiltered(true)
        setCurrentBranch(user.branchId)
      } else {
        setIsFiltered(false)
      }

      console.log("Fetching float accounts with params:", params.toString())
      console.log("User role:", user?.role, "Branch ID:", user?.branchId)

      const response = await fetch(`/api/float-accounts?${params.toString()}`, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch float accounts: ${response.status}`)
      }

      const data = await response.json()

      // Ensure we have an array of accounts
      const accountsArray = Array.isArray(data) ? data : []

      // Process accounts to ensure consistent property names and types
      const processedAccounts = accountsArray.map((account) => ({
        ...account,
        branchName: account.branch_name || account.branchName || "Unknown Branch",
        current_balance:
          typeof account.current_balance === "string"
            ? Number.parseFloat(account.current_balance)
            : account.current_balance || 0,
        min_threshold:
          typeof account.min_threshold === "string"
            ? Number.parseFloat(account.min_threshold)
            : account.min_threshold || 0,
        max_threshold:
          typeof account.max_threshold === "string"
            ? Number.parseFloat(account.max_threshold)
            : account.max_threshold || 0,
      }))

      setAccounts(processedAccounts)
    } catch (err) {
      console.error("Error fetching float accounts:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [user, canViewAllBranches])

  // Fetch accounts when user changes
  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user, fetchAccounts])

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    currentBranch,
    isFiltered,
    canViewAllBranches,
  }
}
