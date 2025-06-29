"use client"

import { useState, useEffect } from "react"
import { useCurrentUser } from "./use-current-user"

interface CashInTillAccount {
  id: string
  account_name: string
  current_balance: number
  account_type: string
  provider: string
  branch_id: string
}

export function useCashInTillEnhanced() {
  const [account, setAccount] = useState<CashInTillAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useCurrentUser()

  useEffect(() => {
    async function fetchCashInTill() {
      if (!user?.branchId) {
        // Always provide a default account instead of showing error
        setAccount({
          id: "default-cash-till",
          account_name: "Cash in Till",
          current_balance: 0,
          account_type: "cash-till",
          provider: "Cash in Till",
          branch_id: user?.branchId || "default",
        })
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/branches/${user.branchId}/cash-in-till`)

        if (!response.ok) {
          throw new Error("Failed to fetch cash in till data")
        }

        const data = await response.json()

        if (data.success && data.account) {
          setAccount(data.account)
        } else {
          // Provide default account if none exists
          setAccount({
            id: "default-cash-till",
            account_name: "Cash in Till",
            current_balance: 0,
            account_type: "cash-till",
            provider: "Cash in Till",
            branch_id: user.branchId,
          })
        }
      } catch (err) {
        console.error("Error fetching cash in till:", err)
        // Always provide a default account instead of showing error
        setAccount({
          id: "default-cash-till",
          account_name: "Cash in Till",
          current_balance: 0,
          account_type: "cash-till",
          provider: "Cash in Till",
          branch_id: user?.branchId || "default",
        })
        setError(null) // Don't show error to user
      } finally {
        setLoading(false)
      }
    }

    fetchCashInTill()
  }, [user?.branchId])

  return { account, loading, error }
}
