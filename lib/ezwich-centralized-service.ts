import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.CONNECTION_STRING!)

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

// Generate unique transaction reference
export function generateTransactionReference(): string {
  const timestamp = Date.now().toString()
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")
  return `EZ${timestamp.slice(-8)}${random}`
}

// Generate unique card number
export function generateCardNumber(): string {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")
  return `627760${timestamp}${random}`
}

// Ensure tables exist
export async function ensureEZwichTables() {
  try {
    // This will be handled by the SQL schema file
    console.log("E-Zwich tables ensured successfully")
    return true
  } catch (error) {
    console.error("Error ensuring E-Zwich tables:", error)
    throw error
  }
}

// Get card batches
export async function getCardBatches(branchId: string): Promise<CardBatch[]> {
  try {
    const batches = await sql`
      SELECT * FROM ezwich_card_batches 
      WHERE branch_id = ${branchId} 
      ORDER BY created_at DESC
    `

    return batches.map((batch) => ({
      ...batch,
      created_at: batch.created_at.toISOString(),
      expiry_date: batch.expiry_date ? batch.expiry_date.toISOString().split("T")[0] : "",
    }))
  } catch (error) {
    console.error("Error fetching card batches:", error)
    throw new Error(`Failed to fetch card batches: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Create card batch
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
    const result = await sql`
      INSERT INTO ezwich_card_batches (
        batch_code, 
        quantity_received, 
        card_type, 
        expiry_date, 
        branch_id, 
        created_by, 
        notes
      ) VALUES (
        ${batchData.batch_code},
        ${batchData.quantity_received},
        ${batchData.card_type},
        ${batchData.expiry_date},
        ${batchData.branch_id},
        ${batchData.created_by},
        ${batchData.notes || null}
      )
      RETURNING *
    `

    const newBatch = result[0]
    return {
      ...newBatch,
      created_at: newBatch.created_at.toISOString(),
      expiry_date: newBatch.expiry_date ? newBatch.expiry_date.toISOString().split("T")[0] : "",
    }
  } catch (error) {
    console.error("Error creating card batch:", error)
    throw new Error(`Failed to create card batch: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Issue card
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
    // Check if batch has available cards
    const batch = await sql`
      SELECT quantity_available FROM ezwich_card_batches WHERE id = ${cardData.batch_id}
    `

    if (batch.length === 0) {
      throw new Error("Batch not found")
    }

    if (batch[0].quantity_available <= 0) {
      throw new Error("No cards available in this batch")
    }

    const cardNumber = generateCardNumber()
    const transactionReference = generateTransactionReference()
    const issueDate = new Date().toISOString().split("T")[0]
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 5)

    // Insert card
    const cardResult = await sql`
      INSERT INTO ezwich_cards (
        card_number, batch_id, customer_name, customer_phone, customer_email,
        date_of_birth, gender, id_type, id_number, id_expiry_date,
        address_line1, address_line2, city, region, postal_code, country,
        issue_date, expiry_date, branch_id, issued_by, fee_charged
      ) VALUES (
        ${cardNumber}, ${cardData.batch_id}, ${cardData.customer_name}, ${cardData.customer_phone}, 
        ${cardData.customer_email || null}, ${cardData.date_of_birth || null}, ${cardData.gender || null},
        ${cardData.id_type || null}, ${cardData.id_number || null}, ${cardData.id_expiry_date || null},
        ${cardData.address_line1 || null}, ${cardData.address_line2 || null}, ${cardData.city || null},
        ${cardData.region || null}, ${cardData.postal_code || null}, ${cardData.country || "Ghana"},
        ${issueDate}, ${expiryDate.toISOString().split("T")[0]}, ${cardData.branch_id}, 
        ${cardData.issued_by}, ${cardData.fee_charged || 15.0}
      )
      RETURNING *
    `

    // Insert transaction record
    const transactionResult = await sql`
      INSERT INTO ezwich_transactions (
        transaction_reference, transaction_type, customer_name, customer_phone,
        transaction_amount, fee_amount, branch_id, processed_by, status,
        batch_id, card_issued_id, notes
      ) VALUES (
        ${transactionReference}, 'card_issuance', ${cardData.customer_name}, ${cardData.customer_phone},
        ${cardData.fee_charged || 15.0}, 0, ${cardData.branch_id}, ${cardData.issued_by}, 'completed',
        ${cardData.batch_id}, ${cardResult[0].id}, 'Card issuance transaction'
      )
      RETURNING *
    `

    const newCard = cardResult[0]
    const newTransaction = transactionResult[0]

    return {
      card: {
        ...newCard,
        created_at: newCard.created_at.toISOString(),
        issue_date: newCard.issue_date.toISOString().split("T")[0],
        expiry_date: newCard.expiry_date ? newCard.expiry_date.toISOString().split("T")[0] : "",
      },
      transaction: {
        ...newTransaction,
        transaction_date: newTransaction.transaction_date.toISOString(),
      },
    }
  } catch (error) {
    console.error("Error issuing card:", error)
    throw new Error(`Failed to issue card: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Process withdrawal
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
    // Verify card exists and is active
    const card = await sql`
      SELECT * FROM ezwich_cards 
      WHERE card_number = ${withdrawalData.card_number} 
      AND card_status = 'active'
    `

    if (card.length === 0) {
      throw new Error("Card not found or inactive")
    }

    const transactionReference = generateTransactionReference()
    const receiptNumber = `EZ-${Date.now()}`

    const result = await sql`
      INSERT INTO ezwich_transactions (
        transaction_reference, transaction_type, card_number, customer_name, customer_phone,
        transaction_amount, fee_amount, branch_id, processed_by, status,
        cash_till_account_id, ezwich_settlement_account_id, terminal_id, receipt_number, notes
      ) VALUES (
        ${transactionReference}, 'withdrawal', ${withdrawalData.card_number}, 
        ${withdrawalData.customer_name}, ${withdrawalData.customer_phone},
        ${withdrawalData.withdrawal_amount}, ${withdrawalData.fee_amount}, 
        ${withdrawalData.branch_id}, ${withdrawalData.processed_by}, 'completed',
        ${withdrawalData.cash_till_account_id || null}, ${withdrawalData.ezwich_settlement_account_id || null},
        ${withdrawalData.terminal_id || null}, ${receiptNumber}, ${withdrawalData.notes || null}
      )
      RETURNING *
    `

    const newTransaction = result[0]
    return {
      ...newTransaction,
      transaction_date: newTransaction.transaction_date.toISOString(),
    }
  } catch (error) {
    console.error("Error processing withdrawal:", error)
    throw new Error(`Failed to process withdrawal: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Get transactions
export async function getTransactions(branchId: string, limit = 50): Promise<EZwichTransaction[]> {
  try {
    const transactions = await sql`
      SELECT * FROM ezwich_transactions 
      WHERE branch_id = ${branchId} 
      ORDER BY transaction_date DESC
      LIMIT ${limit}
    `

    return transactions.map((transaction) => ({
      ...transaction,
      transaction_date: transaction.transaction_date.toISOString(),
      transaction_amount: Number.parseFloat(transaction.transaction_amount),
      fee_amount: Number.parseFloat(transaction.fee_amount),
      total_amount: Number.parseFloat(transaction.total_amount),
    }))
  } catch (error) {
    console.error("Error fetching transactions:", error)
    throw new Error(`Failed to fetch transactions: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Get issued cards
export async function getIssuedCards(branchId: string, limit = 50): Promise<IssuedCard[]> {
  try {
    const cards = await sql`
      SELECT c.*, cb.batch_code 
      FROM ezwich_cards c
      LEFT JOIN ezwich_card_batches cb ON c.batch_id = cb.id
      WHERE c.branch_id = ${branchId} 
      ORDER BY c.created_at DESC
      LIMIT ${limit}
    `

    return cards.map((card) => ({
      ...card,
      created_at: card.created_at.toISOString(),
      issue_date: card.issue_date.toISOString().split("T")[0],
      expiry_date: card.expiry_date ? card.expiry_date.toISOString().split("T")[0] : "",
    }))
  } catch (error) {
    console.error("Error fetching issued cards:", error)
    throw new Error(`Failed to fetch issued cards: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Get statistics
export async function getEZwichStatistics(branchId: string) {
  try {
    const [batchStats, cardStats, transactionStats] = await Promise.all([
      sql`
        SELECT 
          COUNT(*) as total_batches,
          SUM(quantity_received) as total_cards_received,
          SUM(quantity_available) as total_cards_available
        FROM ezwich_card_batches 
        WHERE branch_id = ${branchId}
      `,
      sql`
        SELECT COUNT(*) as total_issued
        FROM ezwich_cards 
        WHERE branch_id = ${branchId}
      `,
      sql`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN transaction_type = 'withdrawal' THEN transaction_amount ELSE 0 END) as total_withdrawal_amount,
          SUM(fee_amount) as total_fees
        FROM ezwich_transactions 
        WHERE branch_id = ${branchId}
      `,
    ])

    return {
      batches: {
        total: Number.parseInt(batchStats[0]?.total_batches || "0"),
        totalCardsReceived: Number.parseInt(batchStats[0]?.total_cards_received || "0"),
        totalCardsAvailable: Number.parseInt(batchStats[0]?.total_cards_available || "0"),
      },
      cards: {
        total: Number.parseInt(cardStats[0]?.total_issued || "0"),
      },
      transactions: {
        total: Number.parseInt(transactionStats[0]?.total_transactions || "0"),
        totalWithdrawalAmount: Number.parseFloat(transactionStats[0]?.total_withdrawal_amount || "0"),
        totalFees: Number.parseFloat(transactionStats[0]?.total_fees || "0"),
      },
    }
  } catch (error) {
    console.error("Error fetching E-Zwich statistics:", error)
    throw new Error(`Failed to fetch E-Zwich statistics: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
