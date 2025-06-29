"use client"

import { useState, useEffect } from "react"

interface CardBatch {
  id: string
  size: number
  createdAt: string
  status: string
  startCardNumber: string
  endCardNumber: string
  createdBy: string
  description: string
}

interface UseCardBatchesReturn {
  batches: CardBatch[] | null
  loading: boolean
  error: string | null
  fetchBatches: () => Promise<void>
  createBatch: (batchData: Partial<CardBatch>) => Promise<void>
}

export function useCardBatches(): UseCardBatchesReturn {
  const [batches, setBatches] = useState<CardBatch[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBatches = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/e-zwich/card-batches")
      if (!response.ok) {
        throw new Error("Failed to fetch card batches")
      }

      const data = await response.json()
      setBatches(data.batches)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const createBatch = async (batchData: Partial<CardBatch>) => {
    try {
      setError(null)

      const response = await fetch("/api/e-zwich/card-batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batchData),
      })

      if (!response.ok) {
        throw new Error("Failed to create card batch")
      }

      // Refresh the batches list
      await fetchBatches()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [])

  return {
    batches,
    loading,
    error,
    fetchBatches,
    createBatch,
  }
}
