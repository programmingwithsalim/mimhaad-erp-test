"use client"

import { useState, useEffect, useCallback } from "react"
import { useCurrentUser } from "@/hooks/use-current-user"

interface BranchDataOptions {
  endpoint: string
  defaultParams?: Record<string, any>
  autoFetch?: boolean
}

export function useBranchData<T>({ endpoint, defaultParams = {}, autoFetch = true }: BranchDataOptions) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useCurrentUser()

  const getBranchFilter = useCallback(() => {
    const branchId = user?.branchId
    const canViewAllBranches = user?.role === "ADMIN" || user?.role === "MANAGER"

    if (canViewAllBranches) {
      return {} // No branch filter for admins
    }

    return branchId ? { branchId } : {}
  }, [user])

  const fetchData = useCallback(
    async (additionalParams: Record<string, any> = {}) => {
      setLoading(true)
      setError(null)

      try {
        // Combine branch filter with other parameters
        const branchFilter = getBranchFilter()
        const params = new URLSearchParams({
          ...defaultParams,
          ...branchFilter,
          ...additionalParams,
        })

        console.log(`Fetching ${endpoint} with params:`, Object.fromEntries(params))

        const response = await fetch(`${endpoint}?${params}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`HTTP ${response.status} error for ${endpoint}:`, errorText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await response.text()
          console.error(`Non-JSON response from ${endpoint}:`, responseText.substring(0, 200))
          throw new Error("Server returned non-JSON response")
        }

        const result = await response.json()
        setData(result)

        console.log(`Data fetched for ${endpoint}:`, {
          recordCount: Array.isArray(result.data) ? result.data.length : "N/A",
          branchFiltered: !!branchFilter.branchId,
          userBranch: user?.branchId,
        })
      } catch (err) {
        console.error(`Error fetching ${endpoint}:`, err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    },
    [endpoint, defaultParams, getBranchFilter, user],
  )

  useEffect(() => {
    if (autoFetch && user) {
      fetchData()
    }
  }, [fetchData, autoFetch, user])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    currentBranch: user?.branchId,
    canViewAllBranches: user?.role === "ADMIN" || user?.role === "MANAGER",
  }
}
