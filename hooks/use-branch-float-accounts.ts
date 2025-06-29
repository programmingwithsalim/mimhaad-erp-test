"use client"

import { useState, useEffect, useCallback } from "react"
import { useCurrentUser } from "./use-current-user"

interface FloatAccount {
  id: string
  provider: string
  account_type: string
  account_number?: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  is_active: boolean
  branch_id: string
  created_at: string
  last_updated: string
  isEzwichPartner?: boolean
}

interface UseBranchFloatAccountsReturn {
  accounts: FloatAccount[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useBranchFloatAccounts(): UseBranchFloatAccountsReturn {
  const [accounts, setAccounts] = useState<FloatAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useCurrentUser()

  const fetchAccounts = useCallback(async () => {
    if (!user?.branchId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [FLOAT-ACCOUNTS] Fetching accounts for branch:", user.branchId)

      const response = await fetch(`/api/float-accounts?branchId=${user.branchId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch float accounts")
      }

      console.log(`✅ [FLOAT-ACCOUNTS] Loaded ${data.accounts?.length || 0} accounts`)

      // Enhanced filtering for MoMo accounts to include ALL providers with null safety
      const processedAccounts = (data.accounts || []).map((account: any) => ({
        ...account,
        // Ensure proper typing and null safety
        provider: account.provider || "Unknown",
        account_type: account.account_type || "unknown",
        current_balance: Number(account.current_balance || 0),
        min_threshold: Number(account.min_threshold || 0),
        max_threshold: Number(account.max_threshold || 0),
        is_active: Boolean(account.is_active),
        isEzwichPartner: Boolean(account.isEzwichPartner || account.isezwichpartner),
      }))

      // Debug: Log all accounts to see what we have
      console.log(
        "🔍 [FLOAT-ACCOUNTS] All accounts:",
        processedAccounts.map((acc) => ({
          id: acc.id,
          provider: acc.provider,
          account_type: acc.account_type,
          is_active: acc.is_active,
        })),
      )

      // Debug: Log MoMo accounts specifically with null safety
      const momoAccounts = processedAccounts.filter((account: FloatAccount) => {
        // Null safety checks
        if (!account.provider || !account.account_type) {
          console.warn("⚠️ [FLOAT-ACCOUNTS] Account missing provider or account_type:", account)
          return false
        }

        const isMomoType = account.account_type.toLowerCase() === "momo"
        const isMomoProvider = ["mtn", "vodafone", "airteltigo", "telecel", "zpay", "z-pay", "z pay", "momo"].some(
          (provider) => account.provider.toLowerCase().includes(provider.toLowerCase()),
        )
        return account.is_active && (isMomoType || isMomoProvider)
      })

      console.log(
        "🔍 [FLOAT-ACCOUNTS] MoMo accounts found:",
        momoAccounts.map((acc) => ({
          provider: acc.provider,
          account_type: acc.account_type,
        })),
      )

      setAccounts(processedAccounts)
    } catch (err) {
      console.error("❌ [FLOAT-ACCOUNTS] Error fetching accounts:", err)
      setError(err instanceof Error ? err : new Error("Unknown error occurred"))
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [user?.branchId])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const refetch = useCallback(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return {
    accounts,
    loading,
    error,
    refetch,
  }
}
