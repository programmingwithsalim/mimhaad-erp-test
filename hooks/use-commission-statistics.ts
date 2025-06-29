"use client"

import { useState, useEffect } from "react"
import type { CommissionStatistics } from "@/lib/commission-types"

export function useCommissionStatistics() {
  const [statistics, setStatistics] = useState<CommissionStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStatistics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("Fetching commission statistics...")

      const response = await fetch("/api/commissions/statistics", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Add any user context headers if available
          "x-user-role": "manager", // Default role for now
        },
      })

      console.log("Statistics API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Statistics API error response:", errorText)
        throw new Error(`Failed to fetch statistics: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.error("Non-JSON response received:", responseText.substring(0, 200))
        throw new Error("Server returned non-JSON response")
      }

      const data = await response.json()
      console.log("Statistics data received:", data)

      setStatistics(data)
    } catch (err) {
      console.error("Error fetching commission statistics:", err)
      setError(err instanceof Error ? err : new Error("Unknown error"))

      // Set default statistics on error
      setStatistics({
        totalAmount: 0,
        totalCount: 0,
        pendingAmount: 0,
        pendingCount: 0,
        paidAmount: 0,
        paidCount: 0,
        bySource: {},
        byMonth: {},
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [])

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics,
  }
}
