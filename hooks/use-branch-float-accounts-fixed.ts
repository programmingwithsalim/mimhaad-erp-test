"use client"

import { useState, useEffect } from "react"
import { useCurrentUser } from "./use-current-user"

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
  account_number?: string
}

export function useBranchFloatAccountsFixed() {
  const [accounts, setAccounts] = useState<FloatAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useCurrentUser()

  const fetchAccounts = async () => {
    if (!user?.branchId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/float-accounts?branchId=${user.branchId}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status}`)
      }

      const data = await response.json()

      // Enhanced filtering to include ALL MoMo providers including Z-Pay
      const allAccounts = data.accounts || []

      // Debug log to see what accounts we're getting
      console.log("🔍 [DEBUG] All float accounts:", allAccounts)

      // Filter MoMo accounts with enhanced logic
      const momoAccounts = allAccounts.filter((account: FloatAccount) => {
        const provider = account.provider.toLowerCase()
        const accountType = account.account_type.toLowerCase()

        // Check if it's a MoMo account by multiple criteria
        const isMoMoByType = accountType === "momo" || accountType === "mobile-money"
        const isMoMoByProvider = [
          "mtn",
          "vodafone",
          "airteltigo",
          "telecel",
          "zpay",
          "z-pay",
          "z pay",
          "mobile money",
          "momo",
          "airtel",
          "tigo",
        ].some((keyword) => provider.includes(keyword))

        return account.is_active && (isMoMoByType || isMoMoByProvider)
      })

      console.log("📱 [DEBUG] Filtered MoMo accounts:", momoAccounts)

      setAccounts(allAccounts)
    } catch (err) {
      console.error("Error fetching float accounts:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch accounts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [user?.branchId])

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
  }
}
