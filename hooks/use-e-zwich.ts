"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"

export interface CardBatch {
  id: string
  batch_code: string
  quantity_received: number
  quantity_issued: number
  quantity_available: number
  card_type: string
  expiry_date: string
  status: string
  display_status: string
  branch_id: string
  created_by: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CardIssuance {
  id: string
  card_number: string
  batch_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  date_of_birth?: string
  gender?: string
  id_type?: string
  id_number?: string
  card_status: string
  issue_date: string
  expiry_date: string
  branch_id: string
  issued_by: string
  fee_charged: number
  batch_number?: string
  card_type?: string
  created_at: string
}

export interface WithdrawalTransaction {
  id: string
  card_number: string
  amount: number
  transaction_type: string
  status: string
  processed_by: string
  branch_id: string
  transaction_date: string
  created_at: string
}

// Safe JSON parsing function
function safeJsonParse(response: Response): Promise<any> {
  return response.text().then((text) => {
    try {
      return JSON.parse(text)
    } catch (error) {
      console.error("Failed to parse JSON:", text)
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`)
    }
  })
}

export function useCardBatches() {
  const { user } = useAuth()
  const [batches, setBatches] = useState<CardBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const branchId = user?.branchId || "branch-1"
  const userId = user?.id || "admin"
  const userName = user ? `${user.firstName} ${user.lastName}` : "Unknown User"

  const fetchBatches = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`📖 Fetching batches for branch: ${branchId}, user: ${userName}`)

      const response = await fetch(`/api/e-zwich/batches?branchId=${branchId}&userId=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log(`Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log("API Response:", result)

      if (result.success) {
        setBatches(result.data || [])
        console.log(`✅ Successfully loaded ${result.data?.length || 0} batches`)
      } else {
        const errorMsg = result.details || result.error || "Failed to fetch batches"
        console.error("API returned error:", errorMsg)
        setError(errorMsg)
        setBatches([])
      }
    } catch (err) {
      console.error("❌ Error fetching batches:", err)
      const errorMsg = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMsg)
      setBatches([])
    } finally {
      setLoading(false)
    }
  }

  const createBatch = async (batchData: {
    quantity_received: number
    card_type: string
    expiry_date: string
    notes?: string
  }) => {
    try {
      // Generate a unique batch code if not provided
      const batchCode = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

      const completeData = {
        batch_code: batchCode,
        quantity_received: batchData.quantity_received,
        card_type: batchData.card_type,
        expiry_date: batchData.expiry_date,
        notes: batchData.notes || "",
        branch_id: branchId,
        created_by: userId,
        userId: userId, // For audit logging
      }

      console.log("🆕 Creating batch with data:", completeData)

      const response = await fetch("/api/e-zwich/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeData),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Create batch HTTP error! status: ${response.status}, body: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log("Create batch result:", result)

      if (result.success) {
        console.log("✅ Batch created successfully")
        await fetchBatches() // Refresh the list
        return result.data
      } else {
        throw new Error(result.error || "Failed to create batch")
      }
    } catch (err) {
      console.error("❌ Error creating batch:", err)
      throw err
    }
  }

  const updateBatch = async (
    batchId: string,
    batchData: {
      batch_code: string
      quantity_received: number
      card_type: string
      expiry_date: string
      notes?: string
    },
  ) => {
    try {
      const completeData = {
        ...batchData,
        branchId: branchId,
        userId: userId, // For audit logging
      }

      console.log("📝 Updating batch with data:", completeData)

      const response = await fetch(`/api/e-zwich/batches/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Update batch HTTP error! status: ${response.status}, body: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        console.log("✅ Batch updated successfully with audit logging and GL adjustments")
        await fetchBatches() // Refresh the list
        return result.data
      } else {
        throw new Error(result.error || "Failed to update batch")
      }
    } catch (err) {
      console.error("❌ Error updating batch:", err)
      throw err
    }
  }

  const deleteBatch = async (batchId: string) => {
    try {
      console.log("🗑️ Deleting batch:", batchId)

      const response = await fetch(`/api/e-zwich/batches/${batchId}?userId=${userId}&branchId=${branchId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`

        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          // If response is not JSON, use the text as error message
          errorMessage = errorText || errorMessage
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (result.success) {
        console.log("✅ Batch deleted successfully with audit logging and GL reversal")
        await fetchBatches() // Refresh the list
        return true
      } else {
        throw new Error(result.error || "Failed to delete batch")
      }
    } catch (err) {
      console.error("❌ Error deleting batch:", err)
      throw err
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [branchId])

  return { batches, loading, error, fetchBatches, createBatch, updateBatch, deleteBatch }
}

export function useIssuedCards() {
  const { user } = useAuth()
  const [cards, setCards] = useState<CardIssuance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const branchId = user?.branchId || "branch-1"
  const userId = user?.id || "admin"

  const fetchCards = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/e-zwich/cards?branchId=${branchId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await safeJsonParse(response)

      if (result.success) {
        setCards(result.data || [])
      } else {
        setError(result.details || result.error || "Failed to fetch cards")
      }
    } catch (err) {
      console.error("Error fetching cards:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setCards([])
    } finally {
      setLoading(false)
    }
  }

  const issueCard = async (cardData: any) => {
    try {
      const completeData = {
        ...cardData,
        branch_id: branchId,
        issued_by: userId || "635844ab-029a-43f8-8523-d7882915266a", // Use default if no user
      }

      const response = await fetch("/api/e-zwich/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await safeJsonParse(response)

      if (result.success) {
        await fetchCards() // Refresh the list
        return result.data
      } else {
        throw new Error(result.details || result.error || "Failed to issue card")
      }
    } catch (err) {
      console.error("Error issuing card:", err)
      throw err
    }
  }

  useEffect(() => {
    if (user) {
      fetchCards()
    }
  }, [branchId, user])

  return { cards, loading, error, fetchCards, issueCard }
}

export function useWithdrawals() {
  const { user } = useAuth()
  const [withdrawals, setWithdrawals] = useState<WithdrawalTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const branchId = user?.branchId || "branch-1"
  const userId = user?.id || "admin"

  const fetchWithdrawals = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/e-zwich/withdrawals?branchId=${branchId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await safeJsonParse(response)

      if (result.success) {
        setWithdrawals(result.data || [])
      } else {
        setError(result.details || result.error || "Failed to fetch withdrawals")
      }
    } catch (err) {
      console.error("Error fetching withdrawals:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setWithdrawals([])
    } finally {
      setLoading(false)
    }
  }

  const processWithdrawal = async (withdrawalData: any) => {
    try {
      const completeData = {
        ...withdrawalData,
        branch_id: branchId,
        processed_by: userId || "635844ab-029a-43f8-8523-d7882915266a", // Use default if no user
      }

      const response = await fetch("/api/e-zwich/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await safeJsonParse(response)

      if (result.success) {
        await fetchWithdrawals() // Refresh the list
        return result.data
      } else {
        throw new Error(result.details || result.error || "Failed to process withdrawal")
      }
    } catch (err) {
      console.error("Error processing withdrawal:", err)
      throw err
    }
  }

  const updateWithdrawal = async (withdrawalId: string, updateData: any) => {
    try {
      const response = await fetch(`/api/e-zwich/withdrawals/${withdrawalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await safeJsonParse(response)

      if (result.success) {
        await fetchWithdrawals() // Refresh the list
        return result.data
      } else {
        throw new Error(result.details || result.error || "Failed to update withdrawal")
      }
    } catch (err) {
      console.error("Error updating withdrawal:", err)
      throw err
    }
  }

  const deleteWithdrawal = async (withdrawalId: string) => {
    try {
      const response = await fetch(`/api/e-zwich/withdrawals/${withdrawalId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await safeJsonParse(response)

      if (result.success) {
        await fetchWithdrawals() // Refresh the list
        return true
      } else {
        throw new Error(result.details || result.error || "Failed to delete withdrawal")
      }
    } catch (err) {
      console.error("Error deleting withdrawal:", err)
      throw err
    }
  }

  useEffect(() => {
    if (user) {
      fetchWithdrawals()
    }
  }, [branchId, user])

  return { withdrawals, loading, error, fetchWithdrawals, processWithdrawal, updateWithdrawal, deleteWithdrawal }
}

export function useEZwichStatistics() {
  const { user } = useAuth()
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const branchId = user?.branchId || "branch-1"

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/e-zwich/statistics?branchId=${branchId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await safeJsonParse(response)

      if (result.success) {
        setStatistics(result.data)
      } else {
        setError(result.details || result.error || "Failed to fetch statistics")
      }
    } catch (err) {
      console.error("Error fetching statistics:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setStatistics(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchStatistics()
    }
  }, [branchId, user])

  return { statistics, loading, error, fetchStatistics }
}
