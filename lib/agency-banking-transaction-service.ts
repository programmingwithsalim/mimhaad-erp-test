import { neon } from "@neondatabase/serverless"
import { v4 as uuidv4 } from "uuid"
import fs from "fs"
import path from "path"

// Define types
export type AgencyTransactionType = "deposit" | "withdrawal" | "interbank" | "commission"
export type AgencyTransactionStatus = "pending" | "completed" | "failed" | "reversed"

export interface AgencyBankingTransaction {
  id: string
  type: AgencyTransactionType
  amount: number
  fee: number
  customerName: string
  accountNumber: string
  partnerBank: string
  partnerBankCode: string
  partnerBankId: string
  reference?: string
  status: AgencyTransactionStatus
  date: string
  branchId: string
  userId: string
  cashTillAffected: number
  floatAffected: number
  glEntryId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateAgencyTransactionInput {
  type: AgencyTransactionType
  amount: number
  fee: number
  customerName: string
  accountNumber: string
  partnerBankId: string
  reference?: string
  branchId: string
  userId: string
}

export class AgencyBankingTransactionService {
  private sql: any
  private useMockData: boolean

  constructor() {
    this.useMockData = process.env.USE_MOCK_DATA === "true"

    if (!this.useMockData && process.env.DATABASE_URL) {
      this.sql = neon(process.env.DATABASE_URL)
    }
  }

  async getTransactions(
    branchId?: string,
    limit = 100,
    offset = 0,
    startDate?: string,
    endDate?: string,
    status?: AgencyTransactionStatus,
    type?: AgencyTransactionType,
    partnerBankCode?: string,
  ): Promise<AgencyBankingTransaction[]> {
    if (this.useMockData) {
      return this.getMockTransactions(branchId, limit, offset, startDate, endDate, status, type, partnerBankCode)
    }

    try {
      // Check if table exists
      const tableExists = await this.sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'agency_banking_transactions'
        ) as exists
      `

      if (!tableExists[0]?.exists) {
        console.log("Agency banking transactions table does not exist")
        return []
      }

      // Build where conditions dynamically
      const whereConditions = ["1=1"]

      if (branchId) {
        whereConditions.push(`t.branch_id = '${branchId}'`)
      }

      if (startDate) {
        whereConditions.push(`t.date >= '${startDate}'`)
      }

      if (endDate) {
        whereConditions.push(`t.date <= '${endDate} 23:59:59'`)
      }

      if (status) {
        whereConditions.push(`t.status = '${status}'`)
      }

      if (type) {
        whereConditions.push(`t.type = '${type}'`)
      }

      if (partnerBankCode) {
        whereConditions.push(`t.partner_bank_code = '${partnerBankCode}'`)
      }

      const whereClause = whereConditions.join(" AND ")

      const result = await this.sql`
        SELECT t.*, 
               COALESCE(t.partner_bank, 'Unknown Bank') as partner_bank,
               COALESCE(t.partner_bank_code, 'UNK') as partner_bank_code
        FROM agency_banking_transactions t
        WHERE ${this.sql.unsafe(whereClause)}
        ORDER BY t.date DESC 
        LIMIT ${limit} OFFSET ${offset}
      `

      return result.map((row: any) => this.mapRowToTransaction(row))
    } catch (error) {
      console.error("Error fetching agency banking transactions:", error)
      return []
    }
  }

  async getTransactionById(id: string): Promise<AgencyBankingTransaction | null> {
    if (this.useMockData) {
      return this.getMockTransactionById(id)
    }

    try {
      const result = await this.sql`
        SELECT t.*, 
               COALESCE(t.partner_bank, 'Unknown Bank') as partner_bank,
               COALESCE(t.partner_bank_code, 'UNK') as partner_bank_code
        FROM agency_banking_transactions t
        WHERE t.id = ${id}
      `

      if (result.length === 0) {
        return null
      }

      return this.mapRowToTransaction(result[0])
    } catch (error) {
      console.error(`Error fetching agency banking transaction with ID ${id}:`, error)
      return null
    }
  }

  async createTransaction(input: CreateAgencyTransactionInput): Promise<AgencyBankingTransaction | null> {
    if (this.useMockData) {
      return this.createMockTransaction(input)
    }

    try {
      console.log(`Creating agency banking transaction for partner bank ID: ${input.partnerBankId}`)

      // Get partner bank details from database
      let bank
      try {
        // First try to get the bank from the database
        const bankResult = await this.sql`
          SELECT * FROM partner_banks WHERE id = ${input.partnerBankId}
        `

        if (bankResult.length > 0) {
          bank = {
            id: bankResult[0].id,
            name: bankResult[0].name,
            code: bankResult[0].code || bankResult[0].name.substring(0, 3).toUpperCase(),
          }
          console.log(`Found bank in database: ${bank.name} (${bank.code})`)
        }
      } catch (dbError) {
        console.warn("Error fetching partner bank from database:", dbError)
      }

      // If not found in database, use hardcoded values as fallback
      if (!bank) {
        // Hardcoded partner banks as fallback
        const partnerBanks = [
          { id: "cal-001", name: "Cal Bank", code: "CAL" },
          { id: "eco-001", name: "Ecobank Ghana", code: "ECO" },
          { id: "gcb-001", name: "Ghana Commercial Bank", code: "GCB" },
          { id: "stb-001", name: "Stanbic Bank", code: "STB" },
          { id: "zen-001", name: "Zenith Bank", code: "ZEN" },
        ]

        bank = partnerBanks.find((b) => b.id === input.partnerBankId)

        if (!bank) {
          // If still not found, try to match by name or code
          const bankId = input.partnerBankId.toLowerCase()
          bank = partnerBanks.find(
            (b) =>
              b.name.toLowerCase().includes(bankId) ||
              bankId.includes(b.name.toLowerCase()) ||
              b.code.toLowerCase().includes(bankId) ||
              bankId.includes(b.code.toLowerCase()),
          )
        }

        if (bank) {
          console.log(`Using hardcoded bank: ${bank.name} (${bank.code})`)
        }
      }

      if (!bank) {
        throw new Error(`Partner bank with ID ${input.partnerBankId} not found`)
      }

      const id = `abt-${uuidv4().substring(0, 8)}`
      const now = new Date().toISOString()

      // Calculate cash till and float effects based on transaction type
      let cashTillAffected = 0
      let floatAffected = 0

      switch (input.type) {
        case "deposit":
          cashTillAffected = input.amount
          floatAffected = -input.amount
          break
        case "withdrawal":
          cashTillAffected = -input.amount
          floatAffected = input.amount
          break
        case "interbank":
          cashTillAffected = input.amount + input.fee
          floatAffected = -input.amount
          break
        case "commission":
          floatAffected = input.amount
          break
      }

      console.log(`Inserting transaction with ID: ${id}`)

      const result = await this.sql`
        INSERT INTO agency_banking_transactions (
          id, type, amount, fee, customer_name, account_number, 
          partner_bank, partner_bank_code, partner_bank_id, 
          reference, status, date, branch_id, user_id, 
          cash_till_affected, float_affected, created_at, updated_at
        )
        VALUES (
          ${id}, ${input.type}, ${input.amount}, ${input.fee}, 
          ${input.customerName}, ${input.accountNumber}, 
          ${bank.name}, ${bank.code}, ${bank.id}, 
          ${input.reference || null}, 'completed', ${now}, 
          ${input.branchId}, ${input.userId}, 
          ${cashTillAffected}, ${floatAffected}, ${now}, ${now}
        )
        RETURNING *
      `

      if (result.length === 0) {
        throw new Error("Failed to insert transaction into database")
      }

      console.log(`Transaction created successfully: ${result[0].id}`)

      return this.mapRowToTransaction(result[0])
    } catch (error) {
      console.error("Error creating agency banking transaction:", error)
      throw error // Re-throw to preserve the original error message
    }
  }

  async updateTransactionStatus(id: string, status: AgencyTransactionStatus): Promise<boolean> {
    if (this.useMockData) {
      return this.updateMockTransactionStatus(id, status)
    }

    try {
      const result = await this.sql`
        UPDATE agency_banking_transactions
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id
      `

      return result.length > 0
    } catch (error) {
      console.error(`Error updating status for transaction ${id}:`, error)
      return false
    }
  }

  // Helper methods for mapping database rows to TypeScript objects
  private mapRowToTransaction(row: any): AgencyBankingTransaction {
    return {
      id: row.id,
      type: row.type,
      amount: Number.parseFloat(row.amount),
      fee: Number.parseFloat(row.fee),
      customerName: row.customer_name,
      accountNumber: row.account_number,
      partnerBank: row.partner_bank,
      partnerBankCode: row.partner_bank_code,
      partnerBankId: row.partner_bank_id,
      reference: row.reference,
      status: row.status,
      date: new Date(row.date).toISOString(),
      branchId: row.branch_id,
      userId: row.user_id,
      cashTillAffected: Number.parseFloat(row.cash_till_affected || 0),
      floatAffected: Number.parseFloat(row.float_affected || 0),
      glEntryId: row.gl_entry_id,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }
  }

  // Mock data methods remain the same...
  private getMockTransactions(
    branchId?: string,
    limit = 100,
    offset = 0,
    startDate?: string,
    endDate?: string,
    status?: AgencyTransactionStatus,
    type?: AgencyTransactionType,
    partnerBankCode?: string,
  ): Promise<AgencyBankingTransaction[]> {
    try {
      const filePath = path.join(process.cwd(), "data/agency-banking-sample.json")
      const fileData = fs.readFileSync(filePath, "utf8")
      const data = JSON.parse(fileData)

      let transactions = data.transactions || []

      // Apply filters
      if (branchId) {
        transactions = transactions.filter((t: any) => t.branchId === branchId)
      }

      if (startDate) {
        const start = new Date(startDate)
        transactions = transactions.filter((t: any) => new Date(t.date) >= start)
      }

      if (endDate) {
        const end = new Date(endDate)
        transactions = transactions.filter((t: any) => new Date(t.date) <= end)
      }

      if (status) {
        transactions = transactions.filter((t: any) => t.status === status)
      }

      if (type) {
        transactions = transactions.filter((t: any) => t.type === type)
      }

      if (partnerBankCode) {
        transactions = transactions.filter((t: any) => t.partnerBankCode === partnerBankCode)
      }

      // Sort by date descending
      transactions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Apply pagination
      transactions = transactions.slice(offset, offset + limit)

      return Promise.resolve(transactions)
    } catch (error) {
      console.error("Error fetching mock agency banking transactions:", error)
      return Promise.resolve([])
    }
  }

  private getMockTransactionById(id: string): Promise<AgencyBankingTransaction | null> {
    try {
      const filePath = path.join(process.cwd(), "data/agency-banking-sample.json")
      const fileData = fs.readFileSync(filePath, "utf8")
      const data = JSON.parse(fileData)

      const transaction = (data.transactions || []).find((t: any) => t.id === id)

      return Promise.resolve(transaction || null)
    } catch (error) {
      console.error(`Error fetching mock agency banking transaction with ID ${id}:`, error)
      return Promise.resolve(null)
    }
  }

  private createMockTransaction(input: CreateAgencyTransactionInput): Promise<AgencyBankingTransaction | null> {
    try {
      const filePath = path.join(process.cwd(), "data/agency-banking-sample.json")
      const fileData = fs.readFileSync(filePath, "utf8")
      const data = JSON.parse(fileData)

      // Find the partner bank
      const partnerBanks = [
        { id: "cal-001", name: "Cal Bank", code: "CAL" },
        { id: "eco-001", name: "Ecobank Ghana", code: "ECO" },
        { id: "gcb-001", name: "Ghana Commercial Bank", code: "GCB" },
        { id: "stb-001", name: "Stanbic Bank", code: "STB" },
        { id: "zen-001", name: "Zenith Bank", code: "ZEN" },
      ]

      let bank = partnerBanks.find((b) => b.id === input.partnerBankId)

      if (!bank) {
        // If not found by ID, try to match by name or code
        const bankId = input.partnerBankId.toLowerCase()
        bank = partnerBanks.find(
          (b) =>
            b.name.toLowerCase().includes(bankId) ||
            bankId.includes(b.name.toLowerCase()) ||
            b.code.toLowerCase().includes(bankId) ||
            bankId.includes(b.code.toLowerCase()),
        )
      }

      if (!bank) {
        return Promise.resolve(null)
      }

      const id = `abt-${Math.random().toString(36).substring(2, 10)}`
      const now = new Date().toISOString()

      // Calculate cash till and float effects based on transaction type
      let cashTillAffected = 0
      let floatAffected = 0

      switch (input.type) {
        case "deposit":
          cashTillAffected = input.amount
          floatAffected = -input.amount
          break
        case "withdrawal":
          cashTillAffected = -input.amount
          floatAffected = input.amount
          break
        case "interbank":
          cashTillAffected = input.amount + input.fee
          floatAffected = -input.amount
          break
        case "commission":
          floatAffected = input.amount
          break
      }

      const newTransaction: AgencyBankingTransaction = {
        id,
        type: input.type,
        amount: input.amount,
        fee: input.fee,
        customerName: input.customerName,
        accountNumber: input.accountNumber,
        partnerBank: bank.name,
        partnerBankCode: bank.code,
        partnerBankId: bank.id,
        reference: input.reference,
        status: "pending",
        date: now,
        branchId: input.branchId,
        userId: input.userId,
        cashTillAffected,
        floatAffected,
        createdAt: now,
        updatedAt: now,
      }

      // Add to the mock data
      data.transactions = [...(data.transactions || []), newTransaction]

      // Write back to the file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

      return Promise.resolve(newTransaction)
    } catch (error) {
      console.error("Error creating mock agency banking transaction:", error)
      return Promise.resolve(null)
    }
  }

  private updateMockTransactionStatus(id: string, status: AgencyTransactionStatus): Promise<boolean> {
    try {
      const filePath = path.join(process.cwd(), "data/agency-banking-sample.json")
      const fileData = fs.readFileSync(filePath, "utf8")
      const data = JSON.parse(fileData)

      const transactions = data.transactions || []
      const index = transactions.findIndex((t: any) => t.id === id)

      if (index === -1) {
        return Promise.resolve(false)
      }

      // Update the transaction
      transactions[index].status = status
      transactions[index].updatedAt = new Date().toISOString()

      // Write back to the file
      data.transactions = transactions
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

      return Promise.resolve(true)
    } catch (error) {
      console.error(`Error updating status for mock transaction ${id}:`, error)
      return Promise.resolve(false)
    }
  }
}

export const agencyBankingTransactionService = new AgencyBankingTransactionService()
