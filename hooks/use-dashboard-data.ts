"use client"

import { useState, useEffect } from "react"
import type { DashboardData } from "@/lib/services/dashboard-service"

export function useDashboardData(userRole: string, branchId?: string) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers: Record<string, string> = {
        "x-user-role": userRole,
      }

      if (branchId) {
        headers["x-user-branch"] = branchId
      }

      const response = await fetch("/api/dashboard/multi-service", {
        headers,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch dashboard data")
      }

      setData(result.data)
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userRole, branchId])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}
