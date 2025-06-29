"use client"

import { useState, useEffect } from "react"

interface Partner {
  source: string
  name: string
  type: string
  defaultGLAccount: string
  defaultGLAccountName: string
}

export function useCommissionPartners() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPartners()
  }, [])

  const fetchPartners = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/commissions/partners")

      if (!response.ok) {
        throw new Error("Failed to fetch partners")
      }

      const data = await response.json()
      setPartners(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Error fetching partners:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    partners,
    isLoading,
    error,
    refetch: fetchPartners,
  }
}
