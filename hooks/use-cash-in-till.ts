"use client"

import { useState, useEffect } from "react"

interface CashAccount {
  id: string
  accountName: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface UseCashInTillReturn {
  cashAccount: CashAccount | null
  isLoading: boolean
  error: Error | null
  updateCashBalance: (amount: number, description?: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useCashInTill(branchId: string): UseCashInTillReturn {
  const [cashAccount, setCashAccount] = useState<CashAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCashInTill = async () => {
    if (!branchId) {
      setError(new Error("No branch ID provided"))
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log("🔄 Fetching cash in till for branch:", branchId)

      const response = await fetch(`/api/branches/${branchId}/cash-in-till`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setCashAccount(data.cashAccount)
        console.log("✅ Cash in till data loaded:", data.cashAccount?.accountName || "No account")
      } else {
        throw new Error(data.error || "Failed to fetch cash in till")
      }
    } catch (err) {
      console.error("❌ Error fetching cash in till:", err)
      setError(err instanceof Error ? err : new Error("Unknown error"))
      setCashAccount(null)
    } finally {
      setIsLoading(false)
    }
  }

  const updateCashBalance = async (amount: number, description?: string) => {
    if (!branchId) {
      throw new Error("No branch ID provided")
    }

    try {
      const response = await fetch(`/api/branches/${branchId}/cash-in-till`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          description,
          userId: "system", // You might want to get this from auth context
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setCashAccount(data.cashAccount)
      } else {
        throw new Error(data.error || "Failed to update cash balance")
      }
    } catch (err) {
      console.error("❌ Error updating cash balance:", err)
      throw err
    }
  }

  const refetch = async () => {
    await fetchCashInTill()
  }

  useEffect(() => {
    fetchCashInTill()
  }, [branchId])

  return {
    cashAccount,
    isLoading,
    error,
    updateCashBalance,
    refetch,
  }
}
