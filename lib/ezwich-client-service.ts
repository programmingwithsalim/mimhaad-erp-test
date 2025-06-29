export interface CardBatch {
  id: string
  batch_code: string
  quantity_received: number
  quantity_issued: number
  quantity_available: number
  card_type: string
  expiry_date: string
  status: string
  branch_id: string
  created_by: string
  created_at: string
  notes?: string
}

export interface IssuedCard {
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
  id_expiry_date?: string
  address_line1?: string
  address_line2?: string
  city?: string
  region?: string
  postal_code?: string
  country?: string
  card_status: string
  issue_date: string
  expiry_date?: string
  branch_id: string
  issued_by: string
  fee_charged: number
  created_at: string
}

export interface EZwichTransaction {
  id: string
  transaction_reference: string
  transaction_type: string
  card_number?: string
  customer_name: string
  customer_phone: string
  transaction_amount: number
  fee_amount: number
  total_amount: number
  branch_id: string
  processed_by: string
  status: string
  transaction_date: string
  notes?: string
  batch_id?: string
  card_issued_id?: string
}

// Helper function to handle API responses
async function handleApiResponse(response: Response) {
  const data = await response.json()

  if (!response.ok) {
    const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`
    throw new Error(errorMessage)
  }

  if (!data.success) {
    const errorMessage = data.error || data.message || "API request failed"
    throw new Error(errorMessage)
  }

  return data
}

// Client-side API calls
export async function getCardBatches(branchId: string): Promise<CardBatch[]> {
  try {
    const response = await fetch(`/api/e-zwich/batches?branchId=${branchId}`)
    const data = await handleApiResponse(response)
    return data.data || []
  } catch (error) {
    console.error("Error fetching card batches:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch card batches")
  }
}

export async function createCardBatch(batchData: {
  batch_code: string
  quantity_received: number
  card_type: string
  expiry_date: string
  branch_id: string
  created_by: string
  notes?: string
}): Promise<CardBatch> {
  try {
    const response = await fetch("/api/e-zwich/batches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batchData),
    })

    const data = await handleApiResponse(response)
    return data.data
  } catch (error) {
    console.error("Error creating card batch:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to create card batch")
  }
}

export async function issueCard(cardData: {
  batch_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  date_of_birth?: string
  gender?: string
  id_type?: string
  id_number?: string
  id_expiry_date?: string
  address_line1?: string
  address_line2?: string
  city?: string
  region?: string
  postal_code?: string
  country?: string
  branch_id: string
  issued_by: string
  fee_charged?: number
}): Promise<{ card: IssuedCard; transaction: EZwichTransaction }> {
  try {
    const response = await fetch("/api/e-zwich/cards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardData),
    })

    const data = await handleApiResponse(response)
    return data.data
  } catch (error) {
    console.error("Error issuing card:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to issue card")
  }
}

export async function processWithdrawal(withdrawalData: {
  card_number: string
  customer_name: string
  customer_phone: string
  withdrawal_amount: number
  fee_amount: number
  branch_id: string
  processed_by: string
  cash_till_account_id?: string
  ezwich_settlement_account_id?: string
  terminal_id?: string
  notes?: string
}): Promise<EZwichTransaction> {
  try {
    const response = await fetch("/api/e-zwich/withdrawals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(withdrawalData),
    })

    const data = await handleApiResponse(response)
    return data.data
  } catch (error) {
    console.error("Error processing withdrawal:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to process withdrawal")
  }
}

export async function getTransactions(branchId: string, limit = 50): Promise<EZwichTransaction[]> {
  try {
    const response = await fetch(`/api/e-zwich/transactions?branchId=${branchId}&limit=${limit}`)
    const data = await handleApiResponse(response)
    return data.data || []
  } catch (error) {
    console.error("Error fetching transactions:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch transactions")
  }
}

export async function getIssuedCards(branchId: string, limit = 50): Promise<IssuedCard[]> {
  try {
    const response = await fetch(`/api/e-zwich/cards?branchId=${branchId}&limit=${limit}`)
    const data = await handleApiResponse(response)
    return data.data || []
  } catch (error) {
    console.error("Error fetching issued cards:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch issued cards")
  }
}

export async function getEZwichStatistics(branchId: string) {
  try {
    const response = await fetch(`/api/e-zwich/statistics?branchId=${branchId}`)
    const data = await handleApiResponse(response)
    return (
      data.data || {
        batches: { total: 0, totalCardsReceived: 0, totalCardsAvailable: 0 },
        cards: { total: 0 },
        transactions: { total: 0, totalWithdrawalAmount: 0, totalFees: 0 },
      }
    )
  } catch (error) {
    console.error("Error fetching E-Zwich statistics:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch statistics")
  }
}
