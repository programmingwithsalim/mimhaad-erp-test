"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

interface FloatAccount {
  id: string
  branch_id: string
  branch_name?: string
  branchName?: string
  account_type: string
  provider: string
  account_number?: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface UseFloatAccountsResult {
  accounts: FloatAccount[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  statistics: {
    totalAccounts: number
    totalBalance: number
    criticalAccounts: number
    lowAccounts: number
  }
}

export function useFloatAccountsFixed(): UseFloatAccountsResult {
  const [accounts, setAccounts] = useState<FloatAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("Fetching float accounts...")

      // First, debug the current state
      const debugResponse = await fetch("/api/debug/float-accounts-debug")
      const debugData = await debugResponse.json()

      console.log("Debug data:", debugData)

      if (!debugData.success) {
        throw new Error(debugData.error || "Failed to debug float accounts")
      }

      if (!debugData.debug.tableExists) {
        // Try to initialize the table
        console.log("Float accounts table doesn't exist, trying to initialize...")

        const initResponse = await fetch("/api/db/init-float-accounts", {
          method: "POST",
        })

        if (!initResponse.ok) {
          throw new Error("Failed to initialize float accounts table")
        }

        toast({
          title: "Database Initialized",
          description: "Float accounts table has been created. Please add some accounts to get started.",
        })

        setAccounts([])
        return
      }

      // Now fetch the actual accounts
      const response = await fetch("/api/float-accounts")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("Float accounts response:", data)

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch accounts")
      }

      const fetchedAccounts = Array.isArray(data.accounts) ? data.accounts : []

      // Transform accounts to ensure consistent format
      const transformedAccounts = fetchedAccounts.map((account: any) => ({
        id: account.id,
        branch_id: account.branch_id,
        branch_name: account.branch_name || account.branchName || `Branch ${account.branch_id?.slice(-4) || "Unknown"}`,
        branchName: account.branch_name || account.branchName || `Branch ${account.branch_id?.slice(-4) || "Unknown"}`,
        account_type: account.account_type,
        provider: account.provider || "N/A",
        account_number: account.account_number,
        current_balance: Number(account.current_balance) || 0,
        min_threshold: Number(account.min_threshold) || 0,
        max_threshold: Number(account.max_threshold) || 0,
        is_active: Boolean(account.is_active),
        created_at: account.created_at,
        updated_at: account.updated_at,
      }))

      console.log("Transformed accounts:", transformedAccounts)
      setAccounts(transformedAccounts)

      if (transformedAccounts.length === 0) {
        toast({
          title: "No Float Accounts",
          description: "No float accounts found. Create your first account to get started.",
        })
      }
    } catch (err) {
      console.error("Error fetching float accounts:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(new Error(errorMessage))

      toast({
        title: "Error Loading Float Accounts",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  // Calculate statistics
  const statistics = {
    totalAccounts: accounts.length,
    totalBalance: accounts.reduce((sum, account) => sum + account.current_balance, 0),
    criticalAccounts: accounts.filter((account) => account.current_balance < account.min_threshold).length,
    lowAccounts: accounts.filter(
      (account) =>
        account.current_balance >= account.min_threshold && account.current_balance < account.min_threshold * 1.5,
    ).length,
  }

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    statistics,
  }
}
