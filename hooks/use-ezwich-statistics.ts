"use client"

import { useState, useEffect } from "react"

interface EZwichStatistics {
  totalIssuedCards: number
  activeCards: number
  inactiveCards: number
  blockedCards: number
  totalBatches: number
  cardsInStock: number
  monthlyIssuance: Record<string, number>
  cardTypeDistribution: Record<string, number>
  branchDistribution: Record<string, number>
  totalWithdrawals: number
  totalWithdrawalAmount: number
  totalWithdrawalFees: number
}

interface UseEZwichStatisticsReturn {
  statistics: EZwichStatistics | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useEZwichStatistics(): UseEZwichStatisticsReturn {
  const [statistics, setStatistics] = useState<EZwichStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/e-zwich/statistics")
      if (!response.ok) {
        throw new Error("Failed to fetch E-Zwich statistics")
      }

      const data = await response.json()

      // Map the response to match expected structure
      const mappedStats = {
        totalIssuedCards: data.statistics?.issuances?.total || 0,
        activeCards: data.statistics?.issuances?.total || 0,
        inactiveCards: 0,
        blockedCards: 0,
        totalBatches: data.statistics?.batches?.total || 0,
        cardsInStock: data.statistics?.batches?.totalCardsAvailable || 0,
        monthlyIssuance: {},
        cardTypeDistribution: {},
        branchDistribution: {},
        totalWithdrawals: data.statistics?.withdrawals?.total || 0,
        totalWithdrawalAmount: data.statistics?.withdrawals?.totalAmount || 0,
        totalWithdrawalFees: data.statistics?.withdrawals?.totalFees || 0,
      }

      setStatistics(mappedStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [])

  return {
    statistics,
    loading,
    error,
    refetch: fetchStatistics,
  }
}
