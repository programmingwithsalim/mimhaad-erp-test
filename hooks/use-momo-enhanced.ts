"use client"

import { useState, useEffect, useCallback } from "react"
import { EnhancedMoMoService } from "@/lib/momo-database-service-enhanced"

export function useMoMoEnhanced() {
  const [transactionLimits, setTransactionLimits] = useState({
    dailyLimit: 50000,
    singleTransactionLimit: 10000,
    maintenanceMode: false,
  })
  const [loading, setLoading] = useState(false)

  const loadTransactionLimits = useCallback(async () => {
    try {
      setLoading(true)
      const limits = await EnhancedMoMoService.getTransactionLimits()
      setTransactionLimits(limits)
    } catch (error) {
      console.error("Error loading transaction limits:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const calculateFee = useCallback(async (amount: number, type: "cash-in" | "cash-out", provider: string) => {
    try {
      return await EnhancedMoMoService.calculateFee(amount, type, provider)
    } catch (error) {
      console.error("Error calculating fee:", error)
      throw error
    }
  }, [])

  const validateTransaction = useCallback(async (amount: number, userId: string, branchId?: string) => {
    try {
      return await EnhancedMoMoService.validateTransaction(amount, userId, branchId)
    } catch (error) {
      console.error("Error validating transaction:", error)
      throw error
    }
  }, [])

  useEffect(() => {
    loadTransactionLimits()
  }, [loadTransactionLimits])

  return {
    transactionLimits,
    loading,
    calculateFee,
    validateTransaction,
    refreshLimits: loadTransactionLimits,
  }
}
