"use client"

import { useState, useEffect, useCallback } from "react"
import type { Commission, CommissionFilters, CommissionStatistics } from "@/lib/commission-types"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"

export function useCommissions(filters?: CommissionFilters) {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [statistics, setStatistics] = useState<CommissionStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFiltered, setIsFiltered] = useState(false)
  const { toast } = useToast()
  const { user } = useCurrentUser()

  // Check if user can view all branches
  const canViewAllBranches = user?.role === "admin" || user?.role === "finance"

  const fetchCommissions = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("Fetching commissions with filters:", filters)

      // Build query parameters
      const params = new URLSearchParams()

      // Fix: Ensure filters.source is an array before calling join
      if (filters?.source && Array.isArray(filters.source) && filters.source.length > 0) {
        params.append("source", filters.source.join(","))
      }

      // Fix: Ensure filters.status is an array before calling join
      if (filters?.status && Array.isArray(filters.status) && filters.status.length > 0) {
        params.append("status", filters.status.join(","))
      }

      if (filters?.startDate) {
        params.append("startDate", filters.startDate)
      }

      if (filters?.endDate) {
        params.append("endDate", filters.endDate)
      }

      if (filters?.search) {
        params.append("search", filters.search)
      }

      if (filters?.branchId) {
        params.append("branchId", filters.branchId)
      }

      const url = `/api/commissions${params.toString() ? `?${params.toString()}` : ""}`
      console.log("Fetching from URL:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Add user context headers
          "x-user-id": user?.id || "admin-001",
          "x-user-name": user?.name || "System Administrator",
          "x-user-role": user?.role || "admin",
          "x-branch-id": user?.branchId || "branch-001",
          "x-branch-name": user?.branchName || "Main Branch",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Commissions received:", data)

      // Ensure data is an array
      if (Array.isArray(data)) {
        setCommissions(data)
      } else if (data.commissions && Array.isArray(data.commissions)) {
        setCommissions(data.commissions)
      } else {
        console.warn("Unexpected data format:", data)
        setCommissions([])
      }
    } catch (err) {
      console.error("Error fetching commissions:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch commissions")
      setCommissions([])
    } finally {
      setIsLoading(false)
    }
  }

  const updateFilters = useCallback(
    (newFilters: Partial<CommissionFilters>) => {
      fetchCommissions()
    },
    [filters],
  )

  const clearFilters = useCallback(() => {
    fetchCommissions()
  }, [])

  useEffect(() => {
    if (user) {
      fetchCommissions()
    }
  }, [user])

  return {
    commissions,
    statistics,
    isLoading,
    loading: isLoading, // Add alias for backward compatibility
    error,
    updateFilters,
    clearFilters,
    fetchCommissions,
    isFiltered,
    canViewAllBranches,
    userBranch: user?.branchId,
    userRole: user?.role,
    refetch: fetchCommissions,
    createCommission: async (data: any) => {
      try {
        console.log("Creating commission with data:", data)

        // Ensure status is set to pending if not provided
        if (!data.status) {
          data.status = "pending"
        }

        const response = await fetch("/api/commissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Error response:", errorText)
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || `Failed to create commission: ${response.status}`)
          } catch (e) {
            throw new Error(`Failed to create commission: ${response.status}`)
          }
        }

        const newCommission = await response.json()
        console.log("Commission created successfully:", newCommission)

        // Update local state
        setCommissions((prev) => [newCommission, ...prev])

        // Refresh statistics
        fetchCommissions()

        return newCommission
      } catch (err) {
        console.error("Error creating commission:", err)
        throw err
      }
    },
    updateCommission: async (id: string, data: any) => {
      try {
        console.log(`Updating commission ${id} with data:`, data)
        const response = await fetch(`/api/commissions/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Error response:", errorText)
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || `Failed to update commission: ${response.status}`)
          } catch (e) {
            throw new Error(`Failed to update commission: ${response.status}`)
          }
        }

        const updatedCommission = await response.json()
        console.log("Commission updated successfully:", updatedCommission)

        // Update local state
        setCommissions((prev) => prev.map((commission) => (commission.id === id ? updatedCommission : commission)))

        // Refresh statistics
        fetchCommissions()

        return updatedCommission
      } catch (err) {
        console.error("Error updating commission:", err)
        throw err
      }
    },
    deleteCommission: async (id: string) => {
      try {
        console.log(`Deleting commission ${id}`)
        const response = await fetch(`/api/commissions/${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Error response:", errorText)
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || `Failed to delete commission: ${response.status}`)
          } catch (e) {
            throw new Error(`Failed to delete commission: ${response.status}`)
          }
        }

        console.log("Commission deleted successfully")

        // Update local state
        setCommissions((prev) => prev.filter((commission) => commission.id !== id))

        // Refresh statistics
        fetchCommissions()

        return true
      } catch (err) {
        console.error("Error deleting commission:", err)
        throw err
      }
    },
    markCommissionPaid: async (id: string, paymentInfo: any) => {
      try {
        console.log("Marking commission as paid:", id, paymentInfo)

        const response = await fetch(`/api/commissions/${id}/mark-paid`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentInfo,
            userId: "current-user",
            userName: "Current User",
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Error response:", errorText)
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || "Failed to mark commission as paid")
          } catch (e) {
            throw new Error("Failed to mark commission as paid")
          }
        }

        const updatedCommission = await response.json()
        console.log("Commission marked as paid successfully:", updatedCommission)

        // Update local state immediately
        setCommissions((prev) => prev.map((commission) => (commission.id === id ? updatedCommission : commission)))

        // Refresh statistics
        fetchCommissions()

        return updatedCommission
      } catch (err) {
        console.error("Error marking commission as paid:", err)
        throw err
      }
    },
    addComment: async (commissionId: string, comment: string) => {
      try {
        const response = await fetch(`/api/commissions/${commissionId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: comment }),
        })

        if (!response.ok) {
          throw new Error("Failed to add comment")
        }

        const updatedCommission = await response.json()

        // Update local state
        setCommissions((prev) =>
          prev.map((commission) => (commission.id === commissionId ? updatedCommission : commission)),
        )

        return updatedCommission
      } catch (err) {
        console.error("Error adding comment:", err)
        throw err
      }
    },
  }
}
