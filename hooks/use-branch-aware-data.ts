"use client"

import { useState, useEffect } from "react"
import { useCurrentUser } from "@/hooks/use-current-user"

interface BranchAwareOptions {
  dataType: "transactions" | "commissions" | "expenses" | "float-accounts"
  filters?: Record<string, any>
}

export function useBranchAwareData<T>({ dataType, filters = {} }: BranchAwareOptions) {
  const { user } = useCurrentUser()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Determine if user can view all branches (only admin and finance can)
  const canViewAllBranches = user?.role === "admin" || user?.role === "finance"
  const isFiltered = !canViewAllBranches && !!user?.branchId

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })

      // Add branch filter if user cannot view all branches
      if (!canViewAllBranches && user?.branchId) {
        params.append("branchId", user.branchId)
      }

      const response = await fetch(`/api/${dataType}?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch ${dataType}`)
      }

      const result = await response.json()
      setData(Array.isArray(result) ? result : result.data || [])
    } catch (err) {
      console.error(`Error fetching ${dataType}:`, err)
      setError(err instanceof Error ? err.message : `Failed to fetch ${dataType}`)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, JSON.stringify(filters)])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    canViewAllBranches,
    isFiltered,
    userBranch: user?.branchId,
    userRole: user?.role,
  }
}
