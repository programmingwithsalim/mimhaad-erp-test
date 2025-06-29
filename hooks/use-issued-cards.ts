"use client"

import { useState, useEffect } from "react"

interface IssuedCard {
  cardNumber: string
  issueDate: string
  status: string
  customerName: string
  branchId: string
  branchName: string
  expiryDate: string
  cardType: string
}

interface UseIssuedCardsReturn {
  cards: IssuedCard[] | null
  loading: boolean
  error: string | null
  fetchCards: () => Promise<void>
  issueCard: (cardData: Partial<IssuedCard>) => Promise<void>
}

export function useIssuedCards(): UseIssuedCardsReturn {
  const [cards, setCards] = useState<IssuedCard[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCards = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/e-zwich/issued-cards")
      if (!response.ok) {
        throw new Error("Failed to fetch issued cards")
      }

      const data = await response.json()
      setCards(data.cards)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const issueCard = async (cardData: Partial<IssuedCard>) => {
    try {
      setError(null)

      const response = await fetch("/api/e-zwich/issued-cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cardData),
      })

      if (!response.ok) {
        throw new Error("Failed to issue card")
      }

      // Refresh the cards list
      await fetchCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    }
  }

  useEffect(() => {
    fetchCards()
  }, [])

  return {
    cards,
    loading,
    error,
    fetchCards,
    issueCard,
  }
}
