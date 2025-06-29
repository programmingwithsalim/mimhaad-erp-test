"use client"

import { useState } from "react"
import { JumiaGLServiceEnhanced } from "@/lib/services/jumia-gl-service-enhanced"

export function useJumiaGL() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const testGLPosting = async (userId: string, branchId?: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/test-jumia-gl-posting-enhanced", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          branchId: branchId || "default-branch",
        }),
      })

      const data = await response.json()
      setResult(data)

      if (!data.success) {
        setError(data.error || "Unknown error")
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const postJumiaTransactionToGL = async (
    transaction: {
      id: string
      amount: number
      transactionType: string
      description: string
    },
    userId: string,
    branchId?: string,
  ) => {
    setLoading(true)
    setError(null)

    try {
      const result = await JumiaGLServiceEnhanced.postJumiaTransactionToGL(
        transaction,
        userId,
        branchId || "default-branch",
      )

      setResult(result)

      if (!result.success) {
        setError(result.error || "Unknown error")
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    result,
    testGLPosting,
    postJumiaTransactionToGL,
  }
}
