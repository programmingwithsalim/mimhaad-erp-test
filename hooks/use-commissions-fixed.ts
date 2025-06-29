"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export interface Commission {
  id: string
  source: string
  sourceName: string
  reference: string
  month: string
  amount: number
  transactionVolume: number
  commissionRate: number
  description?: string
  notes?: string
  status: "pending" | "approved" | "paid" | "rejected"
  createdBy: string
  createdByName: string
  branchId: string
  branchName: string
  createdAt: string
  updatedAt: string
}

export interface CommissionFilters {
  source?: string | string[]
  status?: string | string[]
  startDate?: string
  endDate?: string
  branchId?: string
}

export interface CommissionStatistics {
  totalCommissions: number
  totalAmount: number
  pendingCount: number
  approvedCount: number
  paidCount: number
  rejectedCount: number
  averageAmount: number
  monthlyGrowth: number
}

export function useCommissions() {
  const { toast } = useToast()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [statistics, setStatistics] = useState<CommissionStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCommissions = async (filters: CommissionFilters = {}) => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()

      // Handle source filter - ensure it's properly formatted
      if (filters.source) {
        if (Array.isArray(filters.source)) {
          // If it's already an array, join it
          params.append("source", filters.source.join(","))
        } else if (typeof filters.source === "string") {
          // If it's a string, use it directly
          params.append("source", filters.source)
        }
      }

      // Handle status filter - ensure it's properly formatted
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          // If it's already an array, join it
          params.append("status", filters.status.join(","))
        } else if (typeof filters.status === "string") {
          // If it's a string, use it directly
          params.append("status", filters.status)
        }
      }

      // Handle date filters
      if (filters.startDate) {
        params.append("startDate", filters.startDate)
      }

      if (filters.endDate) {
        params.append("endDate", filters.endDate)
      }

      // Handle branch filter
      if (filters.branchId) {
        params.append("branchId", filters.branchId)
      }

      console.log("📝 [COMMISSIONS] Fetching with params:", params.toString())

      const response = await fetch(`/api/commissions?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("📝 [COMMISSIONS] Fetched data:", data)

      // Ensure data is an array
      const commissionsArray = Array.isArray(data) ? data : []
      setCommissions(commissionsArray)

      // Calculate statistics
      const stats = calculateStatistics(commissionsArray)
      setStatistics(stats)
    } catch (err) {
      console.error("Error fetching commissions:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch commissions"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createCommission = async (commissionData: Partial<Commission>) => {
    try {
      console.log("📝 [COMMISSIONS] Creating commission:", commissionData)

      const response = await fetch("/api/commissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commissionData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create commission")
      }

      if (!result.success) {
        throw new Error(result.error || "Commission creation failed")
      }

      console.log("✅ [COMMISSIONS] Commission created successfully:", result.commission)

      toast({
        title: "Success",
        description: "Commission created successfully",
      })

      // Refresh the commissions list
      await fetchCommissions()

      return result.commission
    } catch (err) {
      console.error("Error creating commission:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to create commission"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }

  const updateCommissionStatus = async (id: string, status: Commission["status"], notes?: string) => {
    try {
      const response = await fetch(`/api/commissions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, notes }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update commission")
      }

      toast({
        title: "Success",
        description: `Commission ${status} successfully`,
      })

      // Refresh the commissions list
      await fetchCommissions()

      return result.commission
    } catch (err) {
      console.error("Error updating commission:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to update commission"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }

  const deleteCommission = async (id: string) => {
    try {
      const response = await fetch(`/api/commissions/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete commission")
      }

      toast({
        title: "Success",
        description: "Commission deleted successfully",
      })

      // Refresh the commissions list
      await fetchCommissions()
    } catch (err) {
      console.error("Error deleting commission:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to delete commission"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }

  const calculateStatistics = (commissionsData: Commission[]): CommissionStatistics => {
    const totalCommissions = commissionsData.length
    const totalAmount = commissionsData.reduce((sum, commission) => sum + commission.amount, 0)
    const pendingCount = commissionsData.filter((c) => c.status === "pending").length
    const approvedCount = commissionsData.filter((c) => c.status === "approved").length
    const paidCount = commissionsData.filter((c) => c.status === "paid").length
    const rejectedCount = commissionsData.filter((c) => c.status === "rejected").length
    const averageAmount = totalCommissions > 0 ? totalAmount / totalCommissions : 0

    // Calculate monthly growth (simplified)
    const currentMonth = new Date().getMonth()
    const currentMonthCommissions = commissionsData.filter((c) => {
      const commissionMonth = new Date(c.createdAt).getMonth()
      return commissionMonth === currentMonth
    })
    const previousMonthCommissions = commissionsData.filter((c) => {
      const commissionMonth = new Date(c.createdAt).getMonth()
      return commissionMonth === currentMonth - 1
    })

    const currentMonthAmount = currentMonthCommissions.reduce((sum, c) => sum + c.amount, 0)
    const previousMonthAmount = previousMonthCommissions.reduce((sum, c) => sum + c.amount, 0)
    const monthlyGrowth =
      previousMonthAmount > 0 ? ((currentMonthAmount - previousMonthAmount) / previousMonthAmount) * 100 : 0

    return {
      totalCommissions,
      totalAmount,
      pendingCount,
      approvedCount,
      paidCount,
      rejectedCount,
      averageAmount,
      monthlyGrowth,
    }
  }

  // Load commissions on mount
  useEffect(() => {
    fetchCommissions()
  }, [])

  return {
    commissions,
    statistics,
    loading,
    error,
    fetchCommissions,
    createCommission,
    updateCommissionStatus,
    deleteCommission,
    refetch: () => fetchCommissions(),
  }
}
