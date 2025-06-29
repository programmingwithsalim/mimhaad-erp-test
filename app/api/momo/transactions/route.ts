import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const branchId = searchParams.get("branchId")
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!branchId) {
      return NextResponse.json({ success: false, error: "Branch ID is required" }, { status: 400 })
    }

    const offset = (page - 1) * limit

    console.log("Fetching MoMo transactions for branch:", branchId)

    // Ensure table exists with correct schema
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS momo_transactions (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          fee DECIMAL(10,2) DEFAULT 0,
          customer_name VARCHAR(255) NOT NULL,
          phone_number VARCHAR(20) NOT NULL,
          provider VARCHAR(100) NOT NULL,
          reference VARCHAR(100),
          status VARCHAR(20) DEFAULT 'completed',
          branch_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          gl_entry_id VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (tableError) {
      console.error("Error creating momo_transactions table:", tableError)
    }

    // Build WHERE clause
    let whereClause = "WHERE branch_id = $1"
    const params: any[] = [branchId]

    if (status) {
      whereClause += ` AND status = $${params.length + 1}`
      params.push(status)
    }

    if (type) {
      whereClause += ` AND type = $${params.length + 1}`
      params.push(type)
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${params.length + 1}`
      params.push(startDate)
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${params.length + 1}`
      params.push(endDate)
    }

    let transactions = []
    let totalCount = 0

    try {
      // Get transactions with pagination - using direct SQL query
      const transactionsResult = await sql`
        SELECT 
          id,
          type,
          amount,
          fee,
          customer_name,
          phone_number,
          provider,
          reference,
          status,
          branch_id,
          user_id,
          gl_entry_id,
          notes,
          created_at,
          updated_at
        FROM momo_transactions
        WHERE branch_id = ${branchId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      transactions = transactionsResult || []

      // Get total count
      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM momo_transactions
        WHERE branch_id = ${branchId}
      `

      totalCount = countResult[0]?.count || 0

      console.log(`Found ${transactions.length} MoMo transactions`)

      return NextResponse.json({
        success: true,
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: Number.parseFloat(t.amount || 0),
          fee: Number.parseFloat(t.fee || 0),
          customer_name: t.customer_name,
          phone_number: t.phone_number,
          provider: t.provider,
          reference: t.reference,
          status: t.status,
          branch_id: t.branch_id,
          user_id: t.user_id,
          gl_entry_id: t.gl_entry_id,
          notes: t.notes,
          created_at: t.created_at,
          updated_at: t.updated_at,
        })),
        pagination: {
          page,
          limit,
          total: Number.parseInt(totalCount),
          pages: Math.ceil(Number.parseInt(totalCount) / limit),
        },
      })
    } catch (queryError) {
      console.error("Error querying momo_transactions:", queryError)
      return NextResponse.json({
        success: true,
        transactions: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      })
    }
  } catch (error) {
    console.error("Error fetching MoMo transactions:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch MoMo transactions",
        transactions: [],
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Creating MoMo transaction:", body)

    const { type, amount, fee, customer_name, phone_number, provider, reference, branchId, userId, notes } = body

    // Validate required fields
    if (!type || !amount || !customer_name || !phone_number || !provider || !branchId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    const transactionId = `momo-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS momo_transactions (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        fee DECIMAL(10,2) DEFAULT 0,
        customer_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        provider VARCHAR(100) NOT NULL,
        reference VARCHAR(100),
        status VARCHAR(20) DEFAULT 'completed',
        branch_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        gl_entry_id VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create the transaction record
    await sql`
      INSERT INTO momo_transactions (
        id, type, amount, fee, customer_name, phone_number,
        provider, reference, status, branch_id, user_id, notes
      ) VALUES (
        ${transactionId}, ${type}, ${amount}, ${fee || 0},
        ${customer_name}, ${phone_number}, ${provider},
        ${reference || transactionId}, 'completed',
        ${branchId}, ${userId}, ${notes || null}
      )
    `

    // Create GL entries (non-blocking)
    try {
      // Import the GL service dynamically to avoid import issues
      const { GLPostingServiceEnhanced } = await import("@/lib/services/gl-posting-service-enhanced")

      const glResult = await GLPostingServiceEnhanced.createMoMoGLEntries({
        transactionId,
        type,
        amount: Number.parseFloat(amount),
        fee: Number.parseFloat(fee || 0),
        provider,
        phoneNumber: phone_number,
        customerName: customer_name,
        reference: reference || transactionId,
        processedBy: userId,
        branchId,
      })

      if (glResult.success && glResult.glTransactionId) {
        // Update transaction with GL entry ID
        await sql`
          UPDATE momo_transactions 
          SET gl_entry_id = ${glResult.glTransactionId}
          WHERE id = ${transactionId}
        `
        console.log("GL entries created successfully for MoMo transaction")
      } else {
        console.error("Failed to create GL entries:", glResult.error)
      }
    } catch (glError) {
      console.error("GL posting error (non-critical):", glError)
    }

    return NextResponse.json({
      success: true,
      message: "MoMo transaction created successfully",
      transactionId,
    })
  } catch (error) {
    console.error("Error creating MoMo transaction:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create MoMo transaction",
      },
      { status: 500 },
    )
  }
}
