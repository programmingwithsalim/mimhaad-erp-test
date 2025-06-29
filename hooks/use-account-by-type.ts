"use client"

import { useMemo } from "react"
import { useBranchFloatAccounts } from "./use-branch-float-accounts"

interface FloatAccount {
  id: string
  provider: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  branch_id: string
  is_active: boolean
  account_type: string
  account_number?: string
}

export function useAccountsByType(accountType: string) {
  const { accounts, loading, error, refetch, currentBranch, canViewAllBranches, isFiltered } = useBranchFloatAccounts()

  const filteredAccounts = useMemo(() => {
    if (!accounts || accounts.length === 0) return []

    return accounts.filter((account) => {
      const type = account.account_type?.toLowerCase() || ""
      const provider = account.provider?.toLowerCase() || ""

      switch (accountType.toLowerCase()) {
        case "momo":
          return (
            type === "momo" ||
            type === "mobile_money" ||
            provider.includes("momo") ||
            provider.includes("mobile") ||
            provider.includes("vodafone") ||
            provider.includes("airtel") ||
            provider.includes("mtn")
          )
        case "e-zwich":
        case "ezwich":
          return (
            type === "e-zwich" ||
            type === "ezwich" ||
            type === "e_zwich" ||
            provider.includes("e-zwich") ||
            provider.includes("ezwich") ||
            provider.includes("e_zwich")
          )
        case "power":
          return (
            type === "power" ||
            type === "electricity" ||
            provider.includes("power") ||
            provider.includes("electricity") ||
            provider.includes("ecg") ||
            provider.includes("nedco")
          )
        case "agency-banking":
        case "agency_banking":
          return (
            type === "agency-banking" ||
            type === "agency_banking" ||
            type === "bank" ||
            provider.includes("bank") ||
            provider.includes("agency")
          )
        case "cash":
          return (
            type === "cash" ||
            type === "cash_till" ||
            type === "cash-till" ||
            provider.includes("cash") ||
            provider.includes("till")
          )
        default:
          return type === accountType.toLowerCase()
      }
    })
  }, [accounts, accountType])

  return {
    accounts: filteredAccounts,
    allAccounts: accounts,
    loading,
    error,
    refetch,
    currentBranch,
    canViewAllBranches,
    isFiltered,
    accountType,
  }
}

// Specific hooks for each account type
export function useMoMoAccounts() {
  return useAccountsByType("momo")
}

export function useEZwichAccounts() {
  return useAccountsByType("e-zwich")
}

export function usePowerAccounts() {
  return useAccountsByType("power")
}

export function useAgencyBankingAccounts() {
  return useAccountsByType("agency-banking")
}

export function useCashAccounts() {
  return useAccountsByType("cash")
}
