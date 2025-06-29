"use client"

import { useState, useEffect, useCallback } from "react"
import { useCurrentUser } from "@/hooks/use-current-user"

interface Transaction {
  id: string
  customer_name: string
  phone_number: string
  amount: number
  fee: number
  type: string
  status: string
  reference: string
  provider: string
  created_at: string
  branch_id: string
  processed_by: string
  service_type: string
}

interface TransactionFilters {
  search: string
  service: string
  status: string
  type: string
  dateFrom: string
  dateTo: string
  branchId: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
  limit: number
}

export function useAllTransactions() {
  const { user } = useCurrentUser()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 50,
  })

  const [filters, setFilters] = useState<TransactionFilters>({
    search: "",
    service: "",
    status: "",
    type: "",
    dateFrom: "",
    dateTo: "",
    branchId: "",
  })

  // Check if user can view all branches
  const canViewAllBranches = user?.role === "admin" || user?.role === "finance"
  const isFiltered = !canViewAllBranches && !!user?.branchId

  const fetchTransactions = useCallback(
    async (page = 1) => {
      try {
        setLoading(true)
        setError(null)

        // Build query parameters
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
        })

        // Add filters to params
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            params.append(key, value)
          }
        })

        // Always add branch filter if user is not admin or finance
        if (!canViewAllBranches && user?.branchId) {
          params.append("branchId", user.branchId)
        }

        console.log("Fetching transactions with params:", params.toString())
        console.log("User role:", user?.role, "Branch ID:", user?.branchId)

        const response = await fetch(`/api/transactions/all?${params.toString()}`, {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setTransactions(data.data || [])
          setPagination({
            ...pagination,
            currentPage: page,
            totalPages: data.pagination?.totalPages || 0,
            totalCount: data.pagination?.totalCount || 0,
            hasNextPage: data.pagination?.hasNextPage || false,
            hasPrevPage: data.pagination?.hasPrevPage || false,
          })
        } else {
          throw new Error(data.error || "Failed to fetch transactions")
        }
      } catch (err) {
        console.error("Error fetching transactions:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
        setTransactions([])
      } finally {
        setLoading(false)
      }
    },
    [filters, pagination.limit, user, canViewAllBranches],
  )

  const updateFilters = useCallback((newFilters: Partial<TransactionFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      service: "",
      status: "",
      type: "",
      dateFrom: "",
      dateTo: "",
      branchId: "",
    })
  }, [])

  const goToPage = useCallback(
    (page: number) => {
      fetchTransactions(page)
    },
    [fetchTransactions],
  )

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      goToPage(pagination.currentPage + 1)
    }
  }, [pagination.hasNextPage, pagination.currentPage, goToPage])

  const prevPage = useCallback(() => {
    if (pagination.hasPrevPage) {
      goToPage(pagination.currentPage - 1)
    }
  }, [pagination.hasPrevPage, pagination.currentPage, goToPage])

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchTransactions(1)
    }
  }, [filters, fetchTransactions, user])

  return {
    transactions,
    loading,
    error,
    pagination,
    filters,
    updateFilters,
    clearFilters,
    refetch: () => fetchTransactions(pagination.currentPage),
    goToPage,
    nextPage,
    prevPage,
    canViewAllBranches,
    isFiltered,
    currentUserBranch: user?.branchId,
  }
}
