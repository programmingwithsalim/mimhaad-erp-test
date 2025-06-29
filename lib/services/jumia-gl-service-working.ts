import { sql } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

export class JumiaGLServiceWorking {
  /**
   * Post Jumia transaction to GL using the same pattern as other working services
   */
  static async postJumiaTransactionToGL(
    transaction: {
      id: string
      amount: number
      transactionType: string
      description: string
      customerName?: string
      trackingId?: string
    },
    userId: string,
    branchId: string,
  ): Promise<{
    success: boolean
    glTransactionId?: string
    error?: string
  }> {
    try {
      console.log(`Posting Jumia transaction to GL: ${transaction.id}`)

      // Check if GL transaction already exists for this source transaction
      const existingGL = await sql`
        SELECT id FROM gl_transactions 
        WHERE source_module = 'jumia' 
        AND source_transaction_id = ${transaction.id}
      `

      if (existingGL.length > 0) {
        console.log(`GL transaction already exists for Jumia transaction ${transaction.id}`)
        return {
          success: true,
          glTransactionId: existingGL[0].id,
        }
      }

      // Generate GL transaction ID
      const glTransactionId = uuidv4()

      // Create GL transaction using the same pattern as other services
      const description = `Jumia ${transaction.transactionType.toUpperCase()}: ${transaction.description}`

      await sql`
        INSERT INTO gl_transactions (
          id,
          date,
          source_module,
          source_transaction_id,
          source_transaction_type,
          description,
          status,
          created_by,
          metadata
        ) VALUES (
          ${glTransactionId},
          CURRENT_DATE,
          'jumia',
          ${transaction.id},
          ${transaction.transactionType},
          ${description},
          'posted',
          ${userId},
          ${JSON.stringify({
            amount: transaction.amount,
            customerName: transaction.customerName,
            trackingId: transaction.trackingId,
            branchId: branchId,
          })}
        )
      `

      console.log(`✅ GL transaction created: ${glTransactionId}`)

      return {
        success: true,
        glTransactionId,
      }
    } catch (error) {
      console.error("Error posting Jumia transaction to GL:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Test GL posting using the working pattern
   */
  static async testGLPosting(
    userId: string,
    branchId: string,
  ): Promise<{
    success: boolean
    glTransactionId?: string
    error?: string
    details?: any
  }> {
    try {
      console.log("Testing Jumia GL posting with working pattern...")

      // Create a test transaction
      const testTransaction = {
        id: `test-jumia-${Date.now()}`,
        amount: 50.0,
        transactionType: "pod_collection",
        description: "Test POD Collection",
        customerName: "Test Customer",
        trackingId: "TEST123456",
      }

      const result = await this.postJumiaTransactionToGL(testTransaction, userId, branchId)

      if (result.success) {
        // Verify the transaction was created
        const verification = await sql`
          SELECT * FROM gl_transactions 
          WHERE id = ${result.glTransactionId}
        `

        return {
          success: true,
          glTransactionId: result.glTransactionId,
          details: {
            transaction: verification[0],
            message: "Test GL transaction created successfully using working pattern",
          },
        }
      } else {
        return result
      }
    } catch (error) {
      console.error("Error in test GL posting:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get GL transactions for Jumia
   */
  static async getJumiaGLTransactions(limit = 10): Promise<any[]> {
    try {
      const transactions = await sql`
        SELECT * FROM gl_transactions 
        WHERE source_module = 'jumia'
        ORDER BY created_at DESC
        LIMIT ${limit}
      `

      return transactions
    } catch (error) {
      console.error("Error getting Jumia GL transactions:", error)
      return []
    }
  }
}
